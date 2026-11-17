// Waves and the draft. A wave is a trickle of shades from the wave table;
// clearing one opens the draft, where the keeper picks one of three boons
// before the next wave's horn sounds.
import { WAVES, WAVE_TABLE, BOONS, SHADES } from './config.js';
import { spawnShade } from './entities.js';
import { shuffle } from './random.js';

export function waveComposition(state) {
  const table = WAVE_TABLE[Math.min(state.wave - 1, WAVE_TABLE.length - 1)];
  const list = [];
  for (const [kind, count] of Object.entries(table)) {
    for (let i = 0; i < count; i += 1) list.push(kind);
  }
  return shuffle(state.rng || Math.random, list);
}

// Queue the wave's shades and return the spawn schedule.
export function startWave(state, wave) {
  state.wave = wave;
  state.spawnQueue = waveComposition(state);
  state.spawnTimer = 0.6;
  state.waveActive = true;
  state.banner = wave === 1 ? 'WAVE 1 — THE FIRST DARK' : `WAVE ${wave}`;
  state.bannerTimer = 2.2;
  state.sound.horn();
}

export function updateSpawning(state, dt, rng) {
  if (!state.waveActive) return;
  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = Math.max(0.3, WAVES.spawnInterval - state.wave * 0.04);
      const kind = state.spawnQueue.shift();
      spawnShade(rng, kind, state.wave, state);
    }
  } else if (state.shades.length === 0 && state.orbs.length === 0) {
    // The wave is clear: score bonus, then the draft (or victory).
    state.waveActive = false;
    const bonus = 50 * state.wave + Math.round(state.flame);
    state.score += bonus;
    if (state.wave >= WAVES.total) {
      state.phase = 'victory';
      state.victoryStats = snapshotStats(state);
      state.sound.victory();
    } else {
      state.phase = 'draft';
      state.draft = rollDraft(state, rng);
      state.sound.draft();
    }
  }
}

// Three boons the keeper has not maxed out (and whose requirement they hold).
export function rollDraft(state, rng) {
  const owned = state.boons;
  const pool = BOONS.filter((b) => {
    const have = owned[b.id] || 0;
    if (have >= b.max) return false;
    if (b.needs && !(owned[b.needs] > 0)) return false;
    return true;
  });
  const picks = shuffle(rng, pool).slice(0, 3);
  return picks.map((b, i) => ({ ...b, key: String(i + 1) }));
}

export function applyBoon(state, boon) {
  state.boons[boon.id] = (state.boons[boon.id] || 0) + 1;
  if (boon.id === 'mend') {
    state.flame = Math.min(100, state.flame + 35);
    state.sound.mend();
  }
  if (boon.id === 'heart') {
    state.player.maxHearts += 1;
    state.player.hearts = Math.min(state.player.maxHearts, state.player.hearts + 1);
    state.sound.mend();
  }
  state.draft = null;
  state.phase = 'breather';
  state.breatherTimer = WAVES.breather;
  startWave(state, state.wave + 1);
}

export function snapshotStats(state) {
  const accuracy = state.shotsFired > 0 ? Math.round((100 * state.shotsHit) / state.shotsFired) : 0;
  return {
    score: state.score,
    wave: state.wave,
    kills: state.kills,
    embers: state.embersCollected,
    accuracy,
    best: Math.max(state.best, state.score),
  };
}
