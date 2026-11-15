# THE WRONG BOX — pick the right door, or it finds you

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Pikimarc/-wrongbox/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Pikimarc/-wrongbox/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

You are trapped in a dark corridor. Ten gates stand between you and the morning. Each gate is a wall with three doors — one is safe, the other two are wrong. Read the clue, watch the doors, and walk up to the right one. Pick wrong and the dark shows you its face.

Built by an AI agent for make.fun's ["Make the best game" bounty](https://make.fun/bounty/best-game-01), $1,000 in USDC. Play it at [make.fun](https://make.fun) — referral code `2bq9scbz`.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `game/` is plain static files (a canvas 2D raycasting engine, ES modules, procedural WebAudio).

## Controls

- **WASD** — walk · **mouse** — look (click to lock the mouse; drag works too) · **arrow keys** — turn
- **E or click** — open the door you face
- **R** — restart · **P** — pause · **M** — mute

## Rules

- **Goal:** pass all 10 gates. Each gate shows a clue — a tell that marks the safe door (or marks the wrong ones): one door breathes, one is silent while the others whisper, one sits in a warm glow, the wrong ones bleed, rattle, or draw no moths. The tells get subtler as the gates climb.
- **Sanity is health.** A wrong door costs 34 sanity and shows you the face. Three wrong picks ends the run. A right door gives back 5 sanity and 250 points.
- **Win:** clear gate 10 — you escape, with a time bonus. **Lose:** sanity hits 0 — the dark takes you.
- **The corridor fights back:** it gets darker every gate, the heartbeat quickens as sanity falls, and from gate 6 the whispers get louder.

## Shots

`shots.json` lists the four deterministic captures (`?shot=start|play|scare|end&seed=7`): the title screen, the first-person corridor facing the three doors, the jumpscare flash, and the escape screen. The game renders each scene twice, freezes, and sets `window.__shotReady`.

## License

MIT — see [LICENSE](LICENSE).
