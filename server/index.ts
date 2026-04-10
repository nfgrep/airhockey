import express from 'express'
import path from 'path'

const app  = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
const DIST = path.resolve(__dirname, '../dist')

app.use(express.static(DIST, {
  maxAge: '1d',
  setHeaders(res, filePath) {
    // Service worker must not be cached aggressively
    if (filePath.endsWith('sw.js') || filePath.endsWith('workbox-') ) {
      res.setHeader('Cache-Control', 'no-cache')
    }
  },
}))

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Air Hockey server running on http://localhost:${PORT}`)
})
