import type { GameState } from './types'
import { GOAL_HEIGHT_RATIO } from './physics'

const PLAYER_COLORS = ['#3b9eff', '#ff5e5e'] as const
const PUCK_COLOR     = '#f0f0f0'
const ICE_COLOR      = '#0d1a2e'
const LINE_COLOR     = 'rgba(255,255,255,0.15)'
const WINNING_SCORE  = 4
const FIRE_THRESHOLD = 2400   // px/s — above this the puck ignites

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
): void {
  ctx.clearRect(0, 0, W, H)

  drawField(ctx, W, H)
  drawGoals(ctx, W, H)
  drawPaddle(ctx, state.paddle1, PLAYER_COLORS[0])
  drawPaddle(ctx, state.paddle2, PLAYER_COLORS[1])
  drawPuck(ctx, state)
  drawScore(ctx, state, W, H)

  if (state.phase === 'countdown') {
    drawCountdown(ctx, state, W, H)
  } else if (state.phase === 'goal') {
    drawGoalFlash(ctx, state, W, H)
  } else if (state.phase === 'won') {
    drawWinScreen(ctx, state, W, H)
  }
}

// ─── field ────────────────────────────────────────────────────────────────────

function drawField(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  // Background
  ctx.fillStyle = ICE_COLOR
  ctx.fillRect(0, 0, W, H)

  // Centre circle
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(W / 2, H / 2, H * 0.2, 0, Math.PI * 2)
  ctx.stroke()

  // Centre dot
  ctx.fillStyle = LINE_COLOR
  ctx.beginPath()
  ctx.arc(W / 2, H / 2, 4, 0, Math.PI * 2)
  ctx.fill()

  // Centre line
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = 2
  ctx.setLineDash([12, 8])
  ctx.beginPath()
  ctx.moveTo(W / 2, 0)
  ctx.lineTo(W / 2, H)
  ctx.stroke()
  ctx.setLineDash([])
}

// ─── goals ────────────────────────────────────────────────────────────────────

function drawGoals(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const goalHalf = (H * GOAL_HEIGHT_RATIO) / 2
  const depth = W * 0.025
  const cy = H / 2

  // Left goal (P1 defends)
  ctx.fillStyle = `rgba(59, 158, 255, 0.12)`
  ctx.fillRect(0, cy - goalHalf, depth, goalHalf * 2)

  // Right goal (P2 defends)
  ctx.fillStyle = `rgba(255, 94, 94, 0.12)`
  ctx.fillRect(W - depth, cy - goalHalf, depth, goalHalf * 2)

  // Goal posts
  const postR = 6
  ;[
    [0,     cy - goalHalf],
    [0,     cy + goalHalf],
    [W,     cy - goalHalf],
    [W,     cy + goalHalf],
  ].forEach(([x, y]) => {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, postR, 0, Math.PI * 2)
    ctx.fill()
  })

  // Goal lines
  ctx.strokeStyle = `rgba(255,255,255,0.4)`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, cy - goalHalf)
  ctx.lineTo(0, cy + goalHalf)
  ctx.moveTo(W, cy - goalHalf)
  ctx.lineTo(W, cy + goalHalf)
  ctx.stroke()

  // Field boundary
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = 3
  ctx.strokeRect(2, 2, W - 4, H - 4)
}

// ─── paddle ───────────────────────────────────────────────────────────────────

function drawPaddle(ctx: CanvasRenderingContext2D, paddle: { pos: { x: number; y: number }; radius: number }, color: string): void {
  const { pos, radius } = paddle

  // Glow
  const grd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 1.6)
  grd.addColorStop(0,   color + '55')
  grd.addColorStop(1,   color + '00')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, radius * 1.6, 0, Math.PI * 2)
  ctx.fill()

  // Body
  const grad = ctx.createRadialGradient(pos.x - radius * 0.3, pos.y - radius * 0.3, radius * 0.1, pos.x, pos.y, radius)
  grad.addColorStop(0, lighten(color, 0.4))
  grad.addColorStop(1, color)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
  ctx.fill()

  // Rim
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, radius - 1, 0, Math.PI * 2)
  ctx.stroke()

  // Handle nub
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, radius * 0.22, 0, Math.PI * 2)
  ctx.fill()
}

// ─── puck ─────────────────────────────────────────────────────────────────────

function drawPuck(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { puck } = state
  const { pos, vel, radius } = puck
  const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2)
  const onFire = speed > FIRE_THRESHOLD
  // 0→1 as speed goes from FIRE_THRESHOLD to max
  const fireT = onFire ? Math.min((speed - FIRE_THRESHOLD) / 2000, 1) : 0

  if (onFire) {
    drawFire(ctx, pos, vel, radius, speed, fireT)
  } else if (speed > 200) {
    // Normal motion trail
    const trailLen = Math.min(speed * 0.04, 40)
    const nx = vel.x / speed
    const ny = vel.y / speed
    const trailGrd = ctx.createLinearGradient(
      pos.x + nx * trailLen, pos.y + ny * trailLen,
      pos.x - nx * trailLen, pos.y - ny * trailLen,
    )
    trailGrd.addColorStop(0, 'rgba(240,240,240,0)')
    trailGrd.addColorStop(1, 'rgba(240,240,240,0.25)')
    ctx.fillStyle = trailGrd
    ctx.beginPath()
    ctx.ellipse(
      pos.x - nx * trailLen / 2, pos.y - ny * trailLen / 2,
      radius * 0.7, radius + trailLen / 2,
      Math.atan2(vel.y, vel.x) + Math.PI / 2,
      0, Math.PI * 2,
    )
    ctx.fill()
  }

  // Puck shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(pos.x + 3, pos.y + 3, radius, radius * 0.85, 0, 0, Math.PI * 2)
  ctx.fill()

  // Puck body — tints orange when on fire
  const grad = ctx.createRadialGradient(pos.x - radius * 0.3, pos.y - radius * 0.4, 1, pos.x, pos.y, radius)
  if (onFire) {
    const r = Math.round(255)
    const g = Math.round(220 - fireT * 160)
    const b = Math.round(80  - fireT * 80)
    grad.addColorStop(0,   `rgb(255,${g + 40},${b + 40})`)
    grad.addColorStop(0.5, `rgb(${r},${g},${b})`)
    grad.addColorStop(1,   `rgb(200,${Math.max(g - 60, 0)},0)`)
  } else {
    grad.addColorStop(0,   '#ffffff')
    grad.addColorStop(0.5, PUCK_COLOR)
    grad.addColorStop(1,   '#999')
  }
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
  ctx.fill()
}

function drawFire(
  ctx: CanvasRenderingContext2D,
  pos: { x: number; y: number },
  vel: { x: number; y: number },
  radius: number,
  speed: number,
  fireT: number,
): void {
  const nx = vel.x / speed
  const ny = vel.y / speed
  const angle = Math.atan2(vel.y, vel.x)
  const t = performance.now() / 80

  // Flicker multiplier — compound sin waves
  const flicker = 0.88 + Math.sin(t * 6.7) * 0.07 + Math.sin(t * 14.3) * 0.05

  const trailLen = (radius * 3.5 + speed * 0.06) * flicker * (0.7 + fireT * 0.6)

  // ── flame layers (back → front) ──────────────────────────────────────────
  const layers = [
    { scale: 1.4,  alpha: 0.18, r: 255, g: 60,  b: 0   },  // outer red haze
    { scale: 1.1,  alpha: 0.35, r: 255, g: 120, b: 0   },  // orange mid
    { scale: 0.75, alpha: 0.55, r: 255, g: 200, b: 0   },  // yellow core
    { scale: 0.4,  alpha: 0.7,  r: 255, g: 240, b: 160 },  // bright tip
  ]

  for (const layer of layers) {
    const len = trailLen * layer.scale
    const cx = pos.x - nx * len * 0.5
    const cy = pos.y - ny * len * 0.5
    const halfW = radius * (0.5 + layer.scale * 0.4) * flicker
    const halfH = len * 0.55

    const grd = ctx.createLinearGradient(
      pos.x, pos.y,
      pos.x - nx * len, pos.y - ny * len,
    )
    grd.addColorStop(0,   `rgba(${layer.r},${layer.g},${layer.b},${layer.alpha})`)
    grd.addColorStop(0.6, `rgba(${layer.r},${layer.g},${layer.b},${layer.alpha * 0.4})`)
    grd.addColorStop(1,   `rgba(${layer.r},${layer.g},${layer.b},0)`)

    ctx.save()
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.ellipse(cx, cy, halfW, halfH, angle + Math.PI / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // ── outer glow halo ───────────────────────────────────────────────────────
  const glowR = radius * (1.8 + fireT * 1.2) * flicker
  const halo = ctx.createRadialGradient(pos.x, pos.y, radius * 0.4, pos.x, pos.y, glowR)
  halo.addColorStop(0,   `rgba(255,180,0,${0.45 * fireT * flicker})`)
  halo.addColorStop(0.5, `rgba(255,80,0,${0.25 * fireT})`)
  halo.addColorStop(1,   'rgba(255,40,0,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2)
  ctx.fill()

  // ── sparks ────────────────────────────────────────────────────────────────
  const sparkCount = Math.round(4 + fireT * 5)
  for (let i = 0; i < sparkCount; i++) {
    // Deterministic-ish positions that shift over time (no state needed)
    const st = t * 0.9 + i * 2.399   // golden-angle-ish offset
    const sparkDist = radius * (1.1 + ((Math.sin(st * 1.7) * 0.5 + 0.5)) * trailLen * 0.8)
    const spreadAngle = angle + Math.PI + Math.sin(st * 3.1) * 0.7
    const sx = pos.x + Math.cos(spreadAngle) * sparkDist
    const sy = pos.y + Math.sin(spreadAngle) * sparkDist
    const sr = (1.5 + Math.sin(st * 5) * 1) * flicker

    ctx.fillStyle = `rgba(255,${Math.round(160 + Math.sin(st) * 80)},0,${0.6 * flicker})`
    ctx.beginPath()
    ctx.arc(sx, sy, Math.max(sr, 0.5), 0, Math.PI * 2)
    ctx.fill()
  }
}

// ─── score ────────────────────────────────────────────────────────────────────

function drawScore(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number): void {
  const cy = H / 2
  const fontSize = Math.round(H * 0.18)
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`
  ctx.textBaseline = 'middle'

  // P1 score (left)
  ctx.fillStyle = 'rgba(59,158,255,0.18)'
  ctx.textAlign = 'right'
  ctx.fillText(String(state.score[0]), W / 2 - W * 0.06, cy)

  // P2 score (right)
  ctx.fillStyle = 'rgba(255,94,94,0.18)'
  ctx.textAlign = 'left'
  ctx.fillText(String(state.score[1]), W / 2 + W * 0.06, cy)

  // Winning score indicator (small dots)
  const dotR = 5
  const dotSpacing = 14
  for (let i = 0; i < WINNING_SCORE; i++) {
    const filled = i < state.score[0]
    ctx.fillStyle = filled ? PLAYER_COLORS[0] : 'rgba(59,158,255,0.2)'
    ctx.beginPath()
    const x = W / 2 - (WINNING_SCORE - 1) * dotSpacing / 2 + i * dotSpacing - W * 0.08
    ctx.arc(x, H * 0.06, dotR, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < WINNING_SCORE; i++) {
    const filled = i < state.score[1]
    ctx.fillStyle = filled ? PLAYER_COLORS[1] : 'rgba(255,94,94,0.2)'
    ctx.beginPath()
    const x = W / 2 - (WINNING_SCORE - 1) * dotSpacing / 2 + i * dotSpacing + W * 0.08
    ctx.arc(x, H * 0.06, dotR, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ─── overlays ─────────────────────────────────────────────────────────────────

function drawCountdown(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number): void {
  const secs = Math.ceil(state.phaseTimer)
  const label = secs > 0 ? String(secs) : 'GO!'

  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(H * 0.35)}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, W / 2, H / 2)
}

function drawGoalFlash(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number): void {
  const scorer = state.lastScorer
  if (scorer === null) return

  const alpha = Math.min(state.phaseTimer / 1.5, 1) * 0.5
  ctx.fillStyle = scorer === 0
    ? `rgba(59,158,255,${alpha})`
    : `rgba(255,94,94,${alpha})`
  ctx.fillRect(0, 0, W, H)

  const label = scorer === 0 ? '← GOAL!' : 'GOAL! →'
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(H * 0.18)}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, W / 2, H / 2)

  const sub = scorer === 0 ? `P1  ${state.score[0]} – ${state.score[1]}` : `${state.score[0]} – ${state.score[1]}  P2`
  ctx.font = `${Math.round(H * 0.07)}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText(sub, W / 2, H / 2 + H * 0.18)
}

function drawWinScreen(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number): void {
  const winner = state.score[0] >= WINNING_SCORE ? 0 : 1
  const color  = PLAYER_COLORS[winner]

  ctx.fillStyle = 'rgba(0,0,0,0.72)'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = color
  ctx.font = `bold ${Math.round(H * 0.2)}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`P${winner + 1} WINS!`, W / 2, H * 0.38)

  ctx.fillStyle = '#ffffff'
  ctx.font = `${Math.round(H * 0.07)}px system-ui, sans-serif`
  ctx.fillText(`${state.score[0]} – ${state.score[1]}`, W / 2, H * 0.55)

  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = `${Math.round(H * 0.055)}px system-ui, sans-serif`
  ctx.fillText('tap anywhere to play again', W / 2, H * 0.72)
}

// ─── util ─────────────────────────────────────────────────────────────────────

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount))
  const g = Math.min(255, ((num >>  8) & 0xff) + Math.round(255 * amount))
  const b = Math.min(255, ((num >>  0) & 0xff) + Math.round(255 * amount))
  return `rgb(${r},${g},${b})`
}
