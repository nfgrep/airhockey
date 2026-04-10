/**
 * Generates minimal valid PNG icons without any dependencies.
 * Uses a 1x1 pixel PNG expanded via width/height in the manifest.
 * Actually creates a proper simple PNG using raw bytes.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import zlib from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '../public')
mkdirSync(publicDir, { recursive: true })

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.concat([typeBytes, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, typeBytes, data, crc])
}

function makePNG(size, r, g, b) {
  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)  // width
  ihdr.writeUInt32BE(size, 4)  // height
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type: RGB
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  // Raw image data: each row is [filter_byte, R, G, B, R, G, B, ...]
  const rowSize = 1 + size * 3
  const raw = Buffer.alloc(size * rowSize)
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const off = y * rowSize + 1 + x * 3
      // Dark background with a simple puck shape
      const cx = x - size / 2
      const cy = y - size / 2
      const dist = Math.sqrt(cx * cx + cy * cy)
      const puckR = size * 0.18

      if (dist < puckR) {
        raw[off]     = 220
        raw[off + 1] = 220
        raw[off + 2] = 220
      } else if (dist < puckR + 2) {
        raw[off]     = 160
        raw[off + 1] = 160
        raw[off + 2] = 160
      } else {
        raw[off]     = r
        raw[off + 1] = g
        raw[off + 2] = b
      }
    }
  }

  const idat = zlib.deflateSync(raw)

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  const png = makePNG(size, 10, 26, 46)   // dark navy background
  writeFileSync(join(publicDir, `icon-${size}.png`), png)
  console.log(`Written public/icon-${size}.png (${size}x${size})`)
}
