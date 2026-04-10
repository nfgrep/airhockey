import type { Vec2 } from './types'

interface TrackedTouch {
  player: 0 | 1   // 0 = P1 (left), 1 = P2 (right)
  pos: Vec2
}

/**
 * Tracks multi-touch and maps each touch to a player based on
 * which half of the screen the touch *started* in.
 */
export class InputManager {
  private touches = new Map<number, TrackedTouch>()

  // Desired paddle positions (null = no active touch for that player)
  public target: [Vec2 | null, Vec2 | null] = [null, null]

  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener('touchstart',  this.onStart,  { passive: false })
    canvas.addEventListener('touchmove',   this.onMove,   { passive: false })
    canvas.addEventListener('touchend',    this.onEnd,    { passive: false })
    canvas.addEventListener('touchcancel', this.onEnd,    { passive: false })
  }

  private onStart = (e: TouchEvent): void => {
    e.preventDefault()
    const W = this.canvas.clientWidth
    for (const t of Array.from(e.changedTouches)) {
      const player: 0 | 1 = t.clientX < W / 2 ? 0 : 1
      const pos = this.touchPos(t)
      this.touches.set(t.identifier, { player, pos })
      this.target[player] = pos
    }
  }

  private onMove = (e: TouchEvent): void => {
    e.preventDefault()
    for (const t of Array.from(e.changedTouches)) {
      const tracked = this.touches.get(t.identifier)
      if (!tracked) continue
      tracked.pos = this.touchPos(t)
      this.target[tracked.player] = tracked.pos
    }
  }

  private onEnd = (e: TouchEvent): void => {
    e.preventDefault()
    for (const t of Array.from(e.changedTouches)) {
      const tracked = this.touches.get(t.identifier)
      if (!tracked) continue
      this.touches.delete(t.identifier)
      // Only clear target if no other touch exists for that player
      const stillActive = Array.from(this.touches.values()).some(
        (tr) => tr.player === tracked.player
      )
      if (!stillActive) this.target[tracked.player] = null
    }
  }

  private touchPos(t: Touch): Vec2 {
    const rect = this.canvas.getBoundingClientRect()
    // Scale from CSS pixels to canvas pixels
    const scaleX = this.canvas.width  / rect.width
    const scaleY = this.canvas.height / rect.height
    return {
      x: (t.clientX - rect.left) * scaleX,
      y: (t.clientY - rect.top)  * scaleY,
    }
  }

  destroy(): void {
    this.canvas.removeEventListener('touchstart',  this.onStart)
    this.canvas.removeEventListener('touchmove',   this.onMove)
    this.canvas.removeEventListener('touchend',    this.onEnd)
    this.canvas.removeEventListener('touchcancel', this.onEnd)
  }
}
