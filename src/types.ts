export interface Vec2 {
  x: number
  y: number
}

export interface Circle {
  pos: Vec2
  vel: Vec2
  radius: number
}

export type GamePhase = 'countdown' | 'playing' | 'goal' | 'won'

export interface GameState {
  puck: Circle
  paddle1: Circle   // left side — P1
  paddle2: Circle   // right side — P2
  score: [number, number]
  phase: GamePhase
  phaseTimer: number   // seconds remaining in current phase
  lastScorer: 0 | 1 | null
}
