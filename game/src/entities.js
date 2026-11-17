// The things that live in the arena: the keeper, the shades, the bolts, the
// dark orbs, the embers and the sparks. This file owns how each one moves,
// fights and dies; waves.js decides when they appear, render.js draws them.
import { ARENA, PLAYER, SHADES, LANTERN } from './config.js';
import { edgePoint, range } from './random.js';

let nextId = 1;

export function makePlayer() {
  return {
    x: ARENA.width / 2,
    y: ARENA.height / 2 + 130,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    hearts: PLAYER.maxHearts,
    maxHearts: PLAYER.maxHearts,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    invulnerable: 0,
    alive: true,
  };
}

export function spawnShade(rng, kind, wave, state) {
  const def = SHADES[kind];
  const p = edgePoint(rng, ARENA.width, ARENA.height, 40);
  const hpScale = 1 + (wave - 1) * 0.12;
  const speedScale = 1 + (wave - 1) * 0.03;
  const shade = {
    id: nextId,
    kind,
    x: p.x,
    y: p.y,
    radius: def.radius,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * speedScale * range(rng, 0.9, 1.1),
    flameDamage: def.flameDamage,
    touchDamage: def.touchDamage,
    score: def.score,
    embers: def.embers,
    color: def.color,
    ranged: !!def.ranged,
    spitTimer: range(rng, 1, def.spitInterval || 2),
    wobble: range(rng, 0, Math.PI * 2),
    flash: 0,
  };
  nextId += 1;
  state.shades.push(shade);
  return shade;
}

export function spawnBolt(state, x, y, angle, opts) {
  state.bolts.push({
    x, y,
    vx: Math.cos(angle) * PLAYER.boltSpeed,
    vy: Math.sin(angle) * PLAYER.boltSpeed,
    radius: PLAYER.boltRadius,
    damage: opts.damage,
    pierce: opts.pierce,
    life: 1.4,
  });
}

export function spawnEmber(state, x, y, rng) {
  state.embers.push({
    x: x + range(rng, -8, 8),
    y: y + range(rng, -8, 8),
    vx: range(rng, -40, 40),
    vy: range(rng, -40, 40),
    radius: 6,
    life: 14,
    bob: range(rng, 0, Math.PI * 2),
  });
}

export function spawnParticles(state, x, y, color, count, speed) {
  const rng = state.rng || Math.random;
  for (let i = 0; i < count; i += 1) {
    const a = rng() * Math.PI * 2;
    const s = speed * (0.3 + rng() * 0.7);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      radius: 1 + rng() * 3,
      color,
      life: 0.4 + rng() * 0.4,
      maxLife: 0.8,
    });
  }
}

export function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color: color || '#f2ecff', life: 0.9 });
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// One fixed step of the keeper: move, dash, aim, fire, and pick up embers.
export function updatePlayer(state, dt, input, boons) {
  const p = state.player;
  if (!p.alive) return;
  const move = input.moveVector();
  const speed = PLAYER.speed * (1 + 0.15 * (boons.swift || 0));
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
  } else {
    p.x += move.x * speed * dt;
    p.y += move.y * speed * dt;
  }
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.invulnerable > 0) p.invulnerable -= dt;

  // The keeper never leaves the arena.
  p.x = Math.max(PLAYER.radius, Math.min(ARENA.width - PLAYER.radius, p.x));
  p.y = Math.max(PLAYER.radius, Math.min(ARENA.height - PLAYER.radius, p.y));

  p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);

  // Dash: a short burst in the direction the keeper is already moving.
  if (boons.dash > 0 && input.wasPressed('ShiftLeft') && p.dashCooldown <= 0 && (move.x !== 0 || move.y !== 0)) {
    p.dashTimer = PLAYER.dashTime;
    p.dashCooldown = Math.max(0.7, PLAYER.dashCooldown - 0.25 * (boons.dash - 1));
    p.vx = move.x * PLAYER.dashSpeed;
    p.vy = move.y * PLAYER.dashSpeed;
    state.shake = Math.max(state.shake, 3);
    state.sound.dash();
  }
  if (p.dashTimer > 0) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = Math.max(PLAYER.radius, Math.min(ARENA.width - PLAYER.radius, p.x));
    p.y = Math.max(PLAYER.radius, Math.min(ARENA.height - PLAYER.radius, p.y));
  }

  // Fire toward the mouse while the button is held (or Space).
  p.fireTimer -= dt;
  const firing = input.mouseDown || input.down('Space');
  if (firing && p.fireTimer <= 0) {
    const interval = PLAYER.fireInterval / (1 + 0.25 * (boons.rapid || 0));
    p.fireTimer = interval;
    const damage = PLAYER.boltDamage + (boons.heavy || 0);
    const count = boons.triple > 0 ? 3 : boons.twin > 0 ? 2 : 1;
    const spread = 0.16;
    for (let i = 0; i < count; i += 1) {
      const off = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
      const sx = p.x + Math.cos(p.angle) * 18;
      const sy = p.y + Math.sin(p.angle) * 18;
      spawnBolt(state, sx, sy, p.angle + off, { damage, pierce: boons.pierce || 0 });
    }
    state.shotsFired += count;
    state.sound.shoot();
  }

  // Nova: a ring of light that banishes shades close to the keeper.
  if (boons.nova > 0 && input.wasPressed('KeyE') && state.novaCooldown <= 0) {
    state.novaCooldown = 6;
    state.novaFlash = 0.35;
    state.shake = Math.max(state.shake, 8);
    state.sound.nova();
    for (const shade of state.shades) {
      const d = Math.hypot(shade.x - p.x, shade.y - p.y);
      if (d < 190) {
        damageShade(state, shade, 6, true);
      }
    }
    spawnParticles(state, p.x, p.y, '#ffd76a', 40, 320);
  }
  if (state.novaCooldown > 0) state.novaCooldown -= dt;

  // Embers drift to the keeper when close, and feed the flame in tens.
  const pickup = PLAYER.pickupRadius * (boons.magnet > 0 ? 1 + boons.magnet : 1);
  for (let i = state.embers.length - 1; i >= 0; i -= 1) {
    const e = state.embers[i];
    e.life -= dt;
    e.bob += dt * 4;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < pickup + 60) {
      const pull = 420 * (1 - d / (pickup + 60));
      e.x += ((p.x - e.x) / (d || 1)) * pull * dt;
      e.y += ((p.y - e.y) / (d || 1)) * pull * dt;
    }
    if (d < pickup) {
      state.embers.splice(i, 1);
      state.embersCollected += 1;
      state.score += 5;
      state.sound.ember();
      if (state.embersCollected % LANTERN.embersPerMend === 0 && state.flame < LANTERN.maxFlame) {
        state.flame = Math.min(LANTERN.maxFlame, state.flame + LANTERN.mendAmount);
        state.sound.mend();
        addFloater(state, ARENA.lanternX, ARENA.lanternY - 50, `+${LANTERN.mendAmount} FLAME`, '#7dffb0');
      }
    } else if (e.life <= 0) {
      state.embers.splice(i, 1);
    }
  }
}

// A bolt hits a shade: damage, flash, and death drops embers and score.
export function damageShade(state, shade, amount, silent) {
  shade.hp -= amount;
  shade.flash = 0.08;
  if (!silent) state.sound.hit();
  if (shade.hp > 0) return false;
  state.shades.splice(state.shades.indexOf(shade), 1);
  state.kills += 1;
  state.score += shade.score;
  state.streak += 1;
  state.streakTimer = 2.5;
  if (state.streak >= 5 && state.streak % 5 === 0) {
    addFloater(state, shade.x, shade.y - 20, `RADIANT x${state.streak}`, '#ffd76a');
    state.score += 25;
  } else {
    addFloater(state, shade.x, shade.y - 14, `+${shade.score}`, '#f2ecff');
  }
  spawnParticles(state, shade.x, shade.y, shade.color, 16, 220);
  spawnParticles(state, shade.x, shade.y, '#ffd76a', 8, 160);
  for (let i = 0; i < shade.embers; i += 1) spawnEmber(state, shade.x, shade.y, state.rng || Math.random);
  state.sound.kill();
  return true;
}

// Shades drift toward the lantern, spit from range, and bite the flame when
// they arrive. Brutes shove the keeper aside if they touch them.
export function updateShades(state, dt, rng) {
  const p = state.player;
  for (let i = state.shades.length - 1; i >= 0; i -= 1) {
    const s = state.shades[i];
    if (s.flash > 0) s.flash -= dt;
    s.wobble += dt * 2;
    const dx = ARENA.lanternX - s.x;
    const dy = ARENA.lanternY - s.y;
    const dLantern = Math.hypot(dx, dy) || 1;
    const wob = Math.sin(s.wobble) * 12;

    if (s.ranged && dLantern < 260 && dLantern > 150) {
      // Spitters hold their distance and spit dark orbs at the lantern.
      s.spitTimer -= dt;
      if (s.spitTimer <= 0) {
        s.spitTimer = SHADES.spit.spitInterval;
        const a = Math.atan2(dy, dx);
        state.orbs.push({
          x: s.x, y: s.y,
          vx: Math.cos(a) * SHADES.spit.spitSpeed,
          vy: Math.sin(a) * SHADES.spit.spitSpeed,
          radius: 7, damage: SHADES.spit.orbDamage, life: 6,
        });
        state.sound.spit();
      }
      // Strafe slowly while spitting.
      s.x += (-dy / dLantern) * wob * dt;
      s.y += (dx / dLantern) * wob * dt;
    } else {
      s.x += (dx / dLantern) * s.speed * dt + Math.cos(s.wobble) * 6 * dt;
      s.y += (dy / dLantern) * s.speed * dt + Math.sin(s.wobble) * 6 * dt;
    }

    // A shade that reaches the lantern bites the flame and dies.
    if (dLantern < ARENA.lanternRadius + s.radius) {
      state.shades.splice(i, 1);
      state.flame = Math.max(0, state.flame - s.flameDamage);
      state.flameFlash = 0.4;
      state.shake = Math.max(state.shake, 7);
      state.sound.flameHit();
      spawnParticles(state, ARENA.lanternX, ARENA.lanternY, '#ff5d5d', 14, 200);
      continue;
    }

    // A shade that touches the keeper hurts them and is knocked back.
    if (p.alive && p.invulnerable <= 0) {
      const dKeeper = Math.hypot(s.x - p.x, s.y - p.y);
      if (dKeeper < s.radius + PLAYER.radius) {
        p.hearts -= s.touchDamage;
        p.invulnerable = PLAYER.invulnerableTime;
        state.shake = Math.max(state.shake, 9);
        state.sound.hurt();
        spawnParticles(state, p.x, p.y, '#ff5d5d', 18, 260);
        const ka = Math.atan2(p.y - s.y, p.x - s.x);
        p.x += Math.cos(ka) * 30;
        p.y += Math.sin(ka) * 30;
        if (p.hearts <= 0) {
          p.alive = false;
          spawnParticles(state, p.x, p.y, '#ffd76a', 40, 300);
        }
      }
    }
  }
}

export function updateBolts(state, dt) {
  for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
    const b = state.bolts[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < -20 || b.x > ARENA.width + 20 || b.y < -20 || b.y > ARENA.height + 20;
    if (!dead) {
      for (let j = state.shades.length - 1; j >= 0; j -= 1) {
        const s = state.shades[j];
        if (dist2(b.x, b.y, s.x, s.y) < (b.radius + s.radius) * (b.radius + s.radius)) {
          state.shotsHit += 1;
          damageShade(state, s, b.damage);
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            dead = true;
          }
          break;
        }
      }
    }
    if (dead) state.bolts.splice(i, 1);
  }
}

export function updateOrbs(state, dt) {
  const p = state.player;
  for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
    const o = state.orbs[i];
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.life -= dt;
    let dead = o.life <= 0 || o.x < -20 || o.x > ARENA.width + 20 || o.y < -20 || o.y > ARENA.height + 20;
    const dLantern = Math.hypot(o.x - ARENA.lanternX, o.y - ARENA.lanternY);
    if (dLantern < ARENA.lanternRadius + o.radius) {
      state.flame = Math.max(0, state.flame - o.damage);
      state.flameFlash = 0.4;
      state.shake = Math.max(state.shake, 6);
      state.sound.flameHit();
      spawnParticles(state, o.x, o.y, '#c65df0', 10, 180);
      dead = true;
    }
    if (!dead && p.alive && p.invulnerable <= 0) {
      const dKeeper = Math.hypot(o.x - p.x, o.y - p.y);
      if (dKeeper < o.radius + PLAYER.radius) {
        p.hearts -= 1;
        p.invulnerable = PLAYER.invulnerableTime;
        state.shake = Math.max(state.shake, 8);
        state.sound.hurt();
        if (p.hearts <= 0) {
          p.alive = false;
          spawnParticles(state, p.x, p.y, '#ffd76a', 40, 300);
        }
        dead = true;
      }
    }
    if (dead) state.orbs.splice(i, 1);
  }
}

export function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.96;
    pt.vy *= 0.96;
    pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.y -= 34 * dt;
    f.life -= dt;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }
}
