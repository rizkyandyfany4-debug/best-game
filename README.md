# best-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/rizkyandyfany4-debug/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/rizkyandyfany4-debug/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**LUMENFALL — Keeper of the Last Light.** A top-down arena defense game: hold the last lantern against 10 waves of shades, banish them with bolts of light, gather their embers to feed the flame, and draft a boon after every wave. Survive all 10 waves to bring the dawn. Built with plain HTML5 canvas and WebAudio — no libraries, no network, no build step.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Move with WASD or arrow keys, aim with the mouse, hold click or Space to fire, Shift to dash, E for a nova burst, P to pause, M to mute.

## How it plays

- **Goal:** keep the lantern's flame alive for 10 waves. Shades drift toward the lantern and bite the flame; spitters shoot dark orbs from range; brutes hit hard.
- **Fight:** bolts of light banish shades. Kills drop embers — gather 10 to mend the flame.
- **Draft:** after each cleared wave, pick 1 of 3 boons (twin flames, piercing bolts, nova burst, ember dash, and more).
- **Win / lose:** clear wave 10 for the dawn; lose the flame — or fall yourself — and the dark wins. Score, best score, streaks and accuracy are tracked, and the best score is saved in your browser.

## Files

- `game/` — the playable game as static files (`index.html` + `src/*.js`)
- `screenshots/` — three real renders of the game (title, play, victory)
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
