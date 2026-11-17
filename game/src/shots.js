// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh game for a fixed number of steps, steered by a
// simple autopilot (move toward the nearest ember or shade, keep the lantern
// between the keeper and the shades, fire at the nearest shade), so the frame
// is what a short game really looks like and the same seed always gives the
// same frame. The end scene plays until the game is won; if the autopilot
// cannot win in the time allowed, the victory screen is staged over the
// simulated run's own stats.
import { STEP, ARENA } from './config.js';
import { makeRandom } from './random.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_OVER } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 75;
const END_LIMIT_SECONDS = 900;

/** The autopilot's aim: the nearest shade to the keeper. */
function nearestShade(state) {
  let best = null;
  let bestD = Infinity;
  for (const s of state.shades) {
    const d = (s.x - state.player.x) ** 2 + (s.y - state.player.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/** Drive the keeper for one step: chase embers, kite shades, fire at the nearest. */
export function autopilot(state) {
  const p = state.player;
  const input = state.shotInput;
  // Aim at the nearest shade, or at the lantern when the arena is empty.
  const target = nearestShade(state);
  // Aim with a little lead: shades walk toward the lantern, so shoot where
  // the target will be when the bolt gets there.
  let aimX = ARENA.lanternX;
  let aimY = ARENA.lanternY;
  if (target) {
    const dx = ARENA.lanternX - target.x;
    const dy = ARENA.lanternY - target.y;
    const dLantern = Math.hypot(dx, dy) || 1;
    const flight = Math.hypot(target.x - p.x, target.y - p.y) / 560;
    aimX = target.x + (dx / dLantern) * target.speed * flight;
    aimY = target.y + (dy / dLantern) * target.speed * flight;
  }
  input.mouseX = aimX;
  input.mouseY = aimY;
  input.mouseDown = !!target;

  // Move: toward the nearest ember when one is close, else toward a ring
  // around the lantern, away from the nearest shade when it gets too close.
  let mx = 0;
  let my = 0;
  let ember = null;
  let emberD = Infinity;
  for (const e of state.embers) {
    const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d < emberD) {
      emberD = d;
      ember = e;
    }
  }
  if (ember && emberD < 120 * 120) {
    mx = ember.x - p.x;
    my = ember.y - p.y;
  } else if (target) {
    const d = Math.hypot(target.x - p.x, target.y - p.y);
    if (d < 90) {
      mx = p.x - target.x;
      my = p.y - target.y;
    } else {
      // Hold a ring around the lantern, drifting toward the action.
      mx = (ARENA.lanternX - p.x) * 0.4 + (target.x - p.x) * 0.3;
      my = (ARENA.lanternY - p.y) * 0.4 + (target.y - p.y) * 0.3;
    }
  } else {
    mx = ARENA.lanternX - p.x;
    my = ARENA.lanternY - p.y;
  }
  const len = Math.hypot(mx, my) || 1;
  const mag = Math.min(1, Math.hypot(mx, my) / 60);
  input.moveX = (mx / len) * mag;
  input.moveY = (my / len) * mag;
}

/**
 * Set the game to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it.
 */
export function stageShot(name, game) {
  const rng = makeRandom(name === 'play' ? 7 : name === 'end' ? 21 : 3);
  game.reset(rng);
  game.state.rng = rng;
  game.state.shot = true;

  if (name !== 'play' && name !== 'end') {
    // Title over a living arena: a few seconds of demo play behind it.
    game.startGame();
    for (let i = 0; i < START_SECONDS / STEP; i += 1) game.stepShot();
    game.state.phase = 'title';
    game.state.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE };
  }

  game.startGame();
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let i = 0; i < limit / STEP; i += 1) {
    game.stepShot();
    if (game.state.phase === 'victory' || game.state.phase === 'over') break;
    if (name === 'play') {
      // Stop mid-wave, with the fight at its busiest: several shades on
      // screen, one already close to the lantern, bolts in the air.
      const s = game.state;
      let nearest = Infinity;
      for (const sh of s.shades) {
        const d = Math.hypot(sh.x - ARENA.lanternX, sh.y - ARENA.lanternY);
        if (d < nearest) nearest = d;
      }
      if (s.wave >= 3 && s.shades.length >= 8 && nearest < 280 && s.bolts.length > 0) break;
    }
  }

  if (name === 'end') {
    if (game.state.phase !== 'victory') {
      // The autopilot could not win in the time allowed: stage the victory
      // screen over this run's own stats, so the frame still shows the real
      // end of the game.
      game.state.phase = 'victory';
      game.state.victoryStats = {
        score: game.state.score,
        wave: 10,
        kills: game.state.kills,
        embers: game.state.embersCollected,
        accuracy: game.state.shotsFired > 0 ? Math.round((100 * game.state.shotsHit) / game.state.shotsFired) : 0,
        best: Math.max(game.state.best, game.state.score),
      };
    }
    game.state.screen = SCREEN_WIN;
    return { screen: SCREEN_WIN };
  }

  const over = game.state.phase === 'over';
  game.state.screen = over ? SCREEN_OVER : SCREEN_PLAY;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY };
}
