// LUMENFALL — the game itself: the state machine, the fixed-step loop and the
// wiring between input, rules, sound and drawing. The rules live in
// entities.js and waves.js; this file only decides which phase runs and when.
import { ARENA, STEP, LANTERN, WAVES } from './config.js';
import { makeRandom } from './random.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { makePlayer, updatePlayer, updateShades, updateBolts, updateOrbs, updateParticles } from './entities.js';
import { startWave, updateSpawning, applyBoon, snapshotStats } from './waves.js';
import {
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_DRAFT, SCREEN_PAUSE, SCREEN_OVER, SCREEN_WIN,
  drawBackground, drawLantern, drawKeeper, drawShade, drawBolts, drawOrbs,
  drawEmbers, drawParticles, drawFloaters, drawHud, drawTitle, drawDraft,
  drawPause, drawGameOver, drawVictory,
} from './render.js';
import { stageShot, autopilot } from './shots.js';

// The draft cards are laid out in render.js; these numbers must match it, so
// clicks land on the card the player sees.
const DRAFT = { cardW: 220, cardH: 190, gap: 26, y: 232 };

function draftCardRect(index) {
  const total = 3 * DRAFT.cardW + 2 * DRAFT.gap;
  const x0 = (ARENA.width - total) / 2;
  return { x: x0 + index * (DRAFT.cardW + DRAFT.gap), y: DRAFT.y, w: DRAFT.cardW, h: DRAFT.cardH };
}

// The input the autopilot drives in screenshot mode: the same shape as Input,
// fed by shots.js instead of the keyboard and mouse.
class ScriptedInput {
  constructor() {
    this.mouseX = ARENA.width / 2;
    this.mouseY = ARENA.height / 2;
    this.mouseDown = false;
    this.moveX = 0;
    this.moveY = 0;
  }
  down() { return false; }
  wasPressed() { return false; }
  wasClicked() { return false; }
  moveVector() { return { x: this.moveX, y: this.moveY }; }
  endFrame() {}
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = new SoundEngine();
    this.input = new Input(canvas);
    this.best = 0;
    try {
      this.best = Number(window.localStorage.getItem('lumenfall-best') || 0) || 0;
    } catch (err) {
      this.best = 0;
    }
    this.reset();
    this.acc = 0;
    this.last = 0;
    this.shotMode = null;

    const unlock = () => this.sound.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  reset(rng) {
    this.state = {
      phase: 'title',
      screen: SCREEN_TITLE,
      time: 0,
      sound: this.sound,
      rng: rng || makeRandom((Date.now() % 2147483647) || 1),
      player: makePlayer(),
      shades: [],
      bolts: [],
      orbs: [],
      embers: [],
      particles: [],
      floaters: [],
      flame: LANTERN.maxFlame,
      score: 0,
      best: this.best,
      wave: 0,
      spawnQueue: [],
      spawnTimer: 0,
      waveActive: false,
      banner: '',
      bannerTimer: 0,
      breatherTimer: 0,
      streak: 0,
      streakTimer: 0,
      kills: 0,
      shotsFired: 0,
      shotsHit: 0,
      embersCollected: 0,
      boons: {},
      novaCooldown: 0,
      novaFlash: 0,
      flameFlash: 0,
      shake: 0,
      draft: null,
      overStats: null,
      victoryStats: null,
      bestSaved: false,
      shot: false,
      shotInput: new ScriptedInput(),
    };
  }

  startGame() {
    const wasShot = this.state.shot;
    this.reset(this.state.rng);
    this.state.shot = wasShot;
    this.state.phase = 'play';
    this.state.screen = SCREEN_PLAY;
    this.state.best = this.best;
    startWave(this.state, 1);
  }

  saveBest() {
    if (this.state.score > this.best) {
      this.best = this.state.score;
      this.state.best = this.best;
      try {
        window.localStorage.setItem('lumenfall-best', String(this.best));
      } catch (err) {
        // Best score is a nicety; the game plays on without it.
      }
    }
  }

  // One fixed step of the rules. Returns nothing; the state is the game.
  step(dt) {
    const s = this.state;
    s.time += dt;
    if (s.bannerTimer > 0) s.bannerTimer -= dt;
    if (s.flameFlash > 0) s.flameFlash -= dt;
    if (s.novaFlash > 0) s.novaFlash -= dt;
    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 26);
    if (s.streakTimer > 0) {
      s.streakTimer -= dt;
      if (s.streakTimer <= 0) s.streak = 0;
    }

    if (s.phase === 'play' || s.phase === 'breather') {
      if (s.phase === 'breather') {
        s.breatherTimer -= dt;
        if (s.breatherTimer <= 0) s.phase = 'play';
      }
      const input = s.shot ? s.shotInput : this.input;
      updatePlayer(s, dt, input, s.boons);
      updateShades(s, dt, s.rng);
      updateBolts(s, dt);
      updateOrbs(s, dt);
      updateParticles(s, dt);
      updateSpawning(s, dt, s.rng);

      if (s.phase === 'victory' && !s.bestSaved) {
        s.bestSaved = true;
        this.saveBest();
        if (s.victoryStats) s.victoryStats.best = s.best;
      }

      if (s.phase === 'play' || s.phase === 'breather') {
        if (s.flame <= 0 || !s.player.alive) {
          s.phase = 'over';
          s.screen = SCREEN_OVER;
          s.overStats = snapshotStats(s);
          this.saveBest();
          s.sound.defeat();
        }
      }
    }
    this.input.endFrame();
  }

  // One step driven by the autopilot, for the screenshot scenes.
  stepShot() {
    autopilot(this.state);
    this.step(STEP);
    // The draft would wait for a click forever; the autopilot takes the
    // first boon and keeps playing.
    if (this.state.phase === 'draft' && this.state.draft) {
      applyBoon(this.state, this.state.draft[0]);
    }
  }

  handleKeys() {
    const s = this.state;
    const input = this.input;
    if (input.wasPressed('KeyM')) {
      const muted = this.sound.toggleMute();
      s.floaters.push({ x: ARENA.width / 2, y: 80, text: muted ? 'SOUND OFF' : 'SOUND ON', color: '#f2ecff', life: 0.9 });
    }
    if (s.phase === 'title') {
      if (input.wasPressed('Enter') || input.wasClicked()) this.startGame();
    } else if (s.phase === 'play' || s.phase === 'breather') {
      if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
        s.phase = 'pause';
        s.screen = SCREEN_PAUSE;
      }
    } else if (s.phase === 'pause') {
      if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasClicked()) {
        s.phase = 'play';
        s.screen = SCREEN_PLAY;
      }
    } else if (s.phase === 'draft') {
      if (input.wasPressed('Digit1') && s.draft[0]) applyBoon(s, s.draft[0]);
      else if (input.wasPressed('Digit2') && s.draft[1]) applyBoon(s, s.draft[1]);
      else if (input.wasPressed('Digit3') && s.draft[2]) applyBoon(s, s.draft[2]);
      else if (input.wasClicked()) {
        for (let i = 0; i < s.draft.length; i += 1) {
          const r = draftCardRect(i);
          if (input.clickX > r.x && input.clickX < r.x + r.w && input.clickY > r.y && input.clickY < r.y + r.h) {
            applyBoon(s, s.draft[i]);
            break;
          }
        }
      }
    } else if (s.phase === 'over' || s.phase === 'victory') {
      if (input.wasPressed('KeyR') || input.wasClicked()) this.startGame();
    }
  }

  render() {
    const s = this.state;
    const ctx = this.ctx;
    ctx.save();
    if (s.shake > 0.5) {
      // The shake jitters from the seeded generator in shot mode, so a
      // staged frame is the same every time; live play uses Math.random.
      const jx = s.shot ? s.rng() - 0.5 : Math.random() - 0.5;
      const jy = s.shot ? s.rng() - 0.5 : Math.random() - 0.5;
      ctx.translate(jx * s.shake, jy * s.shake);
    }
    drawBackground(ctx, s.time, s.flame);
    drawLantern(ctx, s.time, s.flame, s.flameFlash);
    for (const e of s.embers) drawEmbers(ctx, [e], s.time);
    for (const sh of s.shades) drawShade(ctx, sh, s.time);
    drawBolts(ctx, s.bolts);
    drawOrbs(ctx, s.orbs, s.time);
    drawKeeper(ctx, s.player, s.time, s.boons);
    drawParticles(ctx, s.particles);
    drawFloaters(ctx, s.floaters);
    if (s.novaFlash > 0) {
      ctx.globalAlpha = s.novaFlash * 2;
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(s.player.x, s.player.y, 190 * (1 - s.novaFlash), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    const mouse = { x: this.input.mouseX, y: this.input.mouseY };
    if (s.phase === 'play' || s.phase === 'breather') {
      drawHud(ctx, s);
    } else if (s.phase === 'title') {
      drawTitle(ctx, s, s.time, mouse);
    } else if (s.phase === 'draft') {
      drawHud(ctx, s);
      drawDraft(ctx, s, mouse);
    } else if (s.phase === 'pause') {
      drawHud(ctx, s);
      drawPause(ctx, s);
    } else if (s.phase === 'over') {
      drawGameOver(ctx, s, mouse);
    } else if (s.phase === 'victory') {
      drawVictory(ctx, s, mouse);
    }
  }

  frame(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000 || 0);
    this.last = now;
    this.handleKeys();
    this.acc += dt;
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }
    this.render();
    window.requestAnimationFrame((t) => this.frame(t));
  }

  run() {
    this.last = performance.now();
    window.requestAnimationFrame((t) => this.frame(t));
  }
}

// Boot: ?shot=start|play|end stages a deterministic scene and signals
// readiness; otherwise the game runs live for a player.
export function boot(canvas) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const game = new Game(canvas);
  window.__game = game;
  if (shot) {
    const seed = Number(params.get('seed') || 1);
    game.state.rng = makeRandom(seed);
    game.state.shot = true;
    const { screen } = stageShot(shot, game);
    game.state.screen = screen;
    game.render();
    window.__shotReady = true;
    window.__shotScreen = screen;
    return game;
  }
  game.run();
  return game;
}
