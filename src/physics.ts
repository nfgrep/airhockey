import type { Vec2, Circle, GameState } from './types'

// ─── vector helpers ────────────────────────────────────────────────────────────

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

// ─── circle vs circle collision ───────────────────────────────────────────────

/**
 * Resolves puck vs paddle. Modifies puck velocity in place.
 * The paddle is treated as infinitely massive (immovable).
 */
export function resolveCircleCollision(puck: Circle, paddle: Circle): boolean {
  const dx = puck.pos.x - paddle.pos.x
  const dy = puck.pos.y - paddle.pos.y
  const d = Math.sqrt(dx * dx + dy * dy)
  const minDist = puck.radius + paddle.radius

  if (d >= minDist || d === 0) return false

  // Normal pointing from paddle centre → puck centre
  const nx = dx / d
  const ny = dy / d

  // Push puck out of overlap
  const overlap = minDist - d
  puck.pos.x += nx * overlap
  puck.pos.y += ny * overlap

  // Relative velocity along normal
  const paddleVelAlongNormal = dot(paddle.vel, { x: nx, y: ny })
  const puckVelAlongNormal   = dot(puck.vel,   { x: nx, y: ny })

  // Only resolve if objects are approaching
  if (puckVelAlongNormal - paddleVelAlongNormal >= 0) return false

  // Elastic-ish: reflect puck velocity + transfer paddle momentum
  const restitution = 1.1    // slight energy boost for snappiness
  const impulse = (1 + restitution) * (paddleVelAlongNormal - puckVelAlongNormal)

  puck.vel.x += nx * impulse
  puck.vel.y += ny * impulse

  // Speed cap
  const MAX_PUCK_SPEED = 4200
  const speed = Math.sqrt(puck.vel.x ** 2 + puck.vel.y ** 2)
  if (speed > MAX_PUCK_SPEED) {
    puck.vel.x = (puck.vel.x / speed) * MAX_PUCK_SPEED
    puck.vel.y = (puck.vel.y / speed) * MAX_PUCK_SPEED
  }

  return true
}

// ─── wall bouncing + goal detection ──────────────────────────────────────────

export type GoalResult = 'none' | 'p1scored' | 'p2scored'

const GOAL_HEIGHT_RATIO = 0.38  // goal opening as fraction of field height

export function stepPhysics(state: GameState, dt: number, W: number, H: number): GoalResult {
  const puck = state.puck
  const goalHalf = (H * GOAL_HEIGHT_RATIO) / 2

  // Move puck
  puck.pos.x += puck.vel.x * dt
  puck.pos.y += puck.vel.y * dt

  // Top / bottom walls
  if (puck.pos.y - puck.radius < 0) {
    puck.pos.y = puck.radius
    puck.vel.y = Math.abs(puck.vel.y) * 0.98
  }
  if (puck.pos.y + puck.radius > H) {
    puck.pos.y = H - puck.radius
    puck.vel.y = -Math.abs(puck.vel.y) * 0.98
  }

  // Left wall — goal or bounce
  if (puck.pos.x - puck.radius < 0) {
    const inGoal = Math.abs(puck.pos.y - H / 2) < goalHalf
    if (inGoal) {
      return 'p2scored'
    } else {
      puck.pos.x = puck.radius
      puck.vel.x = Math.abs(puck.vel.x) * 0.98
    }
  }

  // Right wall — goal or bounce
  if (puck.pos.x + puck.radius > W) {
    const inGoal = Math.abs(puck.pos.y - H / 2) < goalHalf
    if (inGoal) {
      return 'p1scored'
    } else {
      puck.pos.x = W - puck.radius
      puck.vel.x = -Math.abs(puck.vel.x) * 0.98
    }
  }

  // Drag — slows puck gradually but never below MIN_PUCK_SPEED
  const MIN_PUCK_SPEED = 220   // px/s — puck always keeps drifting
  const DRAG = 160             // px/s² deceleration
  const currentSpeed = Math.sqrt(puck.vel.x ** 2 + puck.vel.y ** 2)
  if (currentSpeed > MIN_PUCK_SPEED) {
    const targetSpeed = Math.max(currentSpeed - DRAG * dt, MIN_PUCK_SPEED)
    const scale = targetSpeed / currentSpeed
    puck.vel.x *= scale
    puck.vel.y *= scale
  }

  // Resolve paddle collisions
  resolveCircleCollision(puck, state.paddle1)
  resolveCircleCollision(puck, state.paddle2)

  return 'none'
}

// ─── paddle constraint ────────────────────────────────────────────────────────

export function clampPaddle(paddle: Circle, side: 'left' | 'right', W: number, H: number): void {
  const r = paddle.radius

  // Half of field per player
  const xMin = side === 'left'  ? r : W / 2 + r
  const xMax = side === 'left'  ? W / 2 - r : W - r

  paddle.pos.x = Math.max(xMin, Math.min(xMax, paddle.pos.x))
  paddle.pos.y = Math.max(r,     Math.min(H - r, paddle.pos.y))
}

export { GOAL_HEIGHT_RATIO }
