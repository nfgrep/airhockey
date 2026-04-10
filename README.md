# Air Hockey PWA

Two-player air hockey on a single phone/tablet. Lay the device flat on a table — each player moves their paddle with one finger.

## How to play

- **Landscape only** — rotate the phone; both players face the screen from opposite ends
- **P1** (blue) defends the left goal, controls the left paddle with one finger
- **P2** (red) defends the right goal, controls the right paddle with one finger
- First to **7 goals** wins
- Paddles are constrained to their own half of the field
- The puck transfers paddle momentum on collision — whip it!

## Dev

```bash
npm install
npm run dev              # Vite dev server at localhost:5173 (auto-opens)
# or to expose on LAN so you can test on a real phone:
npx vite --host
```

## Production

```bash
npm run build:all        # builds frontend (dist/) and server (dist-server/)
npm run serve            # Express static server on port 3000
PORT=8080 npm run serve  # custom port
```

## PWA install (iOS Safari)
1. Open the app in Safari
2. Share → **Add to Home Screen**
3. Launch from home screen — runs fullscreen, landscape-locked

## Project structure

```
src/
  main.ts        entry point, orientation lock
  game.ts        game loop, state machine, paddle movement
  physics.ts     puck movement, circle-circle collision, wall/goal detection
  renderer.ts    Canvas 2D rendering (field, paddles, puck, overlays)
  input.ts       multi-touch tracker — maps touches to players by screen half
  types.ts       shared types
server/
  index.ts       minimal Express static server for production
public/
  icon-192.png   PWA icon
  icon-512.png   PWA icon
scripts/
  gen-icons-simple.mjs  regenerate icons without dependencies
```
