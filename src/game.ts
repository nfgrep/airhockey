import type { GameState, Vec2 } from './types'
import { stepPhysics, clampPaddle } from './physics'
import { InputManager } from './input'
import { render } from './renderer'

const WINNING_SCORE  = 4
const COUNTDOWN_SECS = 3
const GOAL_PAUSE_SECS = 2.2

export class Game {
  private canvas: CanvasRenderingContext2D
  private input: InputManager
  private state!: GameState
  private lastTime = 0
  private rafId = 0

  // Canvas logical size (actual device pixels via devicePixelRatio)
  private W = 0
  private H = 0

  // Paddle velocity tracking (for momentum transfer)
  private paddlePrevPos: [Vec2, Vec2] = [{ x: 0, y: 0 }, { x: 0, y: 0 }]

  constructor(private canvasEl: HTMLCanvasElement) {
    const ctx = canvasEl.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2D context')
    this.canvas = ctx
    this.input = new InputManager(canvasEl)

    this.resize()
    window.addEventListener('resize', this.resize)

    // Tap to restart from win screen
    canvasEl.addEventListener('touchstart', this.onTapRestart, { passive: false })

    this.reset()
    this.loop(0)
  }

  // ─── resize ──────────────────────────────────────────────────────────────────

  private resize = (): void => {
    const dpr = window.devicePixelRatio || 1
    this.W = window.innerWidth  * dpr
    this.H = window.innerHeight * dpr
    this.canvasEl.width  = this.W
    this.canvasEl.height = this.H
    this.canvasEl.style.width  = `${window.innerWidth}px`
    this.canvasEl.style.height = `${window.innerHeight}px`

    if (this.state) this.repositionAfterResize()
  }

  private repositionAfterResize(): void {
    // Keep paddles in valid positions after orientation/size change
    clampPaddle(this.state.paddle1, 'left',  this.W, this.H)
    clampPaddle(this.state.paddle2, 'right', this.W, this.H)
  }

  // ─── state factory ────────────────────────────────────────────────────────────

  private puckRadius():   number { return this.H * 0.045 }
  private paddleRadius(): number { return this.H * 0.11  }

  private reset(keepScore = false): void {
    const W = this.W, H = this.H
    const pr = this.puckRadius()
    const dr = this.paddleRadius()

    const prevScore: [number, number] = keepScore && this.state
      ? [this.state.score[0], this.state.score[1]]
      : [0, 0]

    this.state = {
      puck: {
        pos: { x: W / 2, y: H / 2 },
        vel: { x: 0, y: 0 },
        radius: pr,
      },
      paddle1: {
        pos: { x: W * 0.18, y: H / 2 },
        vel: { x: 0, y: 0 },
        radius: dr,
      },
      paddle2: {
        pos: { x: W * 0.82, y: H / 2 },
        vel: { x: 0, y: 0 },
        radius: dr,
      },
      score: prevScore,
      phase: 'countdown',
      phaseTimer: COUNTDOWN_SECS,
      lastScorer: null,
    }

    this.paddlePrevPos = [
      { ...this.state.paddle1.pos },
      { ...this.state.paddle2.pos },
    ]
  }

  // ─── tap to restart ───────────────────────────────────────────────────────────

  private onTapRestart = (_e: TouchEvent): void => {
    if (this.state.phase === 'won') {
      this.reset(false)
    }
  }

  // ─── main loop ────────────────────────────────────────────────────────────────

  private loop = (timestamp: number): void => {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05)  // cap at 50ms
    this.lastTime = timestamp

    this.update(dt)
    render(this.canvas, this.state, this.W, this.H)

    this.rafId = requestAnimationFrame(this.loop)
  }

  private update(dt: number): void {
    const { state } = this

    // ── countdown ──────────────────────────────────────────────────────────────
    if (state.phase === 'countdown') {
      state.phaseTimer -= dt
      if (state.phaseTimer <= 0) {
        state.phase = 'playing'
        // Give the puck a small random kick
        const angle = (Math.random() * Math.PI * 0.5 + Math.PI * 0.25) *
          (Math.random() < 0.5 ? 1 : -1)
        const speed = 650
        state.puck.vel.x = Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1)
        state.puck.vel.y = Math.sin(angle) * speed
      }
      this.movePaddles(dt)
      return
    }

    // ── goal pause ─────────────────────────────────────────────────────────────
    if (state.phase === 'goal') {
      state.phaseTimer -= dt
      if (state.phaseTimer <= 0) {
        if (state.score[0] >= WINNING_SCORE || state.score[1] >= WINNING_SCORE) {
          state.phase = 'won'
          state.phaseTimer = 0
        } else {
          this.reset(true)
        }
      }
      return
    }

    // ── won screen ─────────────────────────────────────────────────────────────
    if (state.phase === 'won') return

    // ── playing ────────────────────────────────────────────────────────────────
    this.movePaddles(dt)

    const goal = stepPhysics(state, dt, this.W, this.H)
    if (goal !== 'none') {
      if (goal === 'p1scored') state.score[0]++
      else                     state.score[1]++
      state.lastScorer = goal === 'p1scored' ? 0 : 1
      state.phase      = 'goal'
      state.phaseTimer = GOAL_PAUSE_SECS

      // Freeze puck
      state.puck.vel.x = 0
      state.puck.vel.y = 0
    }
  }

  private movePaddles(dt: number): void {
    const targets = this.input.target
    const paddles = [this.state.paddle1, this.state.paddle2] as const
    const sides   = ['left', 'right'] as const

    paddles.forEach((paddle, i) => {
      const target = targets[i]
      if (target) {
        // Lerp toward touch at high speed (feels direct but avoids teleporting)
        const SPEED = 5000   // px/s
        const dx = target.x - paddle.pos.x
        const dy = target.y - paddle.pos.y
        const d  = Math.sqrt(dx * dx + dy * dy)
        if (d > 1) {
          const move = Math.min(d, SPEED * dt)
          paddle.pos.x += (dx / d) * move
          paddle.pos.y += (dy / d) * move
        }
      }

      // Compute velocity from position delta (for momentum transfer)
      paddle.vel.x = (paddle.pos.x - this.paddlePrevPos[i].x) / dt
      paddle.vel.y = (paddle.pos.y - this.paddlePrevPos[i].y) / dt

      this.paddlePrevPos[i] = { ...paddle.pos }

      clampPaddle(paddle, sides[i], this.W, this.H)
    })
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this.resize)
    this.input.destroy()
  }
}
