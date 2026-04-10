import { Game } from './game'

// Lock to landscape on supported browsers (mostly Android; iOS ignores this)
if (screen.orientation && (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock) {
  const lock = (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock
  lock?.('landscape').catch(() => {/* iOS silently fails, we handle via CSS */})
}

// Prevent default scroll/zoom on the canvas
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false })

const canvas = document.getElementById('canvas') as HTMLCanvasElement
new Game(canvas)
