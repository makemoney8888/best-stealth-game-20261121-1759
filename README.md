[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/makemoney8888/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/makemoney8888/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Lantern's Shadow

A top-down 2D stealth game, written from scratch in plain Canvas 2D with no
libraries and no network requests. You are a lantern-bearer sneaking through
a night garden: slip past patrolling guards, stay out of their vision cones,
hide in bushes and shadow, collect lantern shards, and reach the glowing exit
before the third alarm wakes the garden.

## How to play

- **Move:** WASD / arrow keys, or click on the ground to walk there.
- **Goal:** reach the glowing exit on each of the 3 levels. 3 alarms, or being
  caught by an alerted guard, ends the run.
- **Stealth:** guards patrol with visible vision cones. Being seen fills their
  suspicion meter — a full meter raises an alarm and the guard gives chase.
  Bushes hide you unless a guard is very close; standing in shadow shortens
  how far a guard can see you.
- **Extras:** lantern shards are optional pickups; P pauses, M mutes, Enter
  confirms on menus. Sound effects are synthesized with WebAudio — no audio
  files.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no dependencies. `game/` is the whole game (ES modules under
`game/src/`); `screenshots/` holds real renders taken with
`?shot=title|stealth|caught|win`.

## License

MIT — see [LICENSE](LICENSE).
