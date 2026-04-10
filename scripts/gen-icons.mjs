/**
 * Generates simple PNG icons using the Canvas API via @napi-rs/canvas.
 * If that's not available, falls back to writing tiny placeholder PNGs.
 * Run once: node scripts/gen-icons.mjs
 */
import { createCanvas } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '../public')
mkdirSync(publicDir, { recursive: true })

function makeIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0a0a1a'
  ctx.fillRect(0, 0, size, size)

  // Rink
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.lineWidth = size * 0.03
  ctx.strokeRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84)

  // Centre circle
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.22, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.stroke()

  // Puck
  ctx.fillStyle = '#e0e0e0'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.12, 0, Math.PI * 2)
  ctx.fill()

  // P1 paddle (blue)
  ctx.fillStyle = '#3b9eff'
  ctx.beginPath()
  ctx.arc(size * 0.25, size / 2, size * 0.1, 0, Math.PI * 2)
  ctx.fill()

  // P2 paddle (red)
  ctx.fillStyle = '#ff5e5e'
  ctx.beginPath()
  ctx.arc(size * 0.75, size / 2, size * 0.1, 0, Math.PI * 2)
  ctx.fill()

  return canvas.toBuffer('image/png')
}

for (const size of [192, 512]) {
  const buf = makeIcon(size)
  const out = join(publicDir, `icon-${size}.png`)
  writeFileSync(out, buf)
  console.log(`Written ${out}`)
}
