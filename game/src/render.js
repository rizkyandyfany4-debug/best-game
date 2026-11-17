// Every pixel LUMENFALL draws: the arena, the lantern, the keeper, the shades,
// the HUD and every screen. Nothing here changes the game state; main.js owns
// the state machine and calls one of these draws per frame.
import { ARENA, PALETTE, WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ring(ctx, x, y, r, width) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = width;
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.font = `${weight || 700} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(10, 12, 28, ${alpha ?? 0.82})`;
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
}

function button(ctx, x, y, w, h, label, hot) {
  ctx.fillStyle = hot ? 'rgba(255, 179, 71, 0.9)' : 'rgba(255, 179, 71, 0.16)';
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 1, 17, hot ? '#1a1206' : '#ffe9b0', 'center', 800);
}

export function drawBackground(ctx, time, flame) {
  const g = ctx.createRadialGradient(ARENA.lanternX, ARENA.lanternY, 40, ARENA.lanternX, ARENA.lanternY, 520);
  g.addColorStop(0, 'rgba(255, 179, 71, 0.14)');
  g.addColorStop(0.5, 'rgba(40, 48, 96, 0.25)');
  g.addColorStop(1, PALETTE.bgEdge);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  // Faint floor grid so movement reads at a glance.
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  for (let x = 60; x < ARENA.width; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA.height); ctx.stroke();
  }
  for (let y = 60; y < ARENA.height; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA.width, y); ctx.stroke();
  }

  // The lantern's halo breathes with the flame.
  const pulse = 0.75 + 0.25 * Math.sin(time * 2.2);
  const halo = ctx.createRadialGradient(ARENA.lanternX, ARENA.lanternY, 10, ARENA.lanternX, ARENA.lanternY, 150 * pulse * (0.5 + flame / 200));
  halo.addColorStop(0, 'rgba(255, 201, 90, 0.30)');
  halo.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(ARENA.lanternX - 170, ARENA.lanternY - 170, 340, 340);
}

export function drawLantern(ctx, time, flame, flash) {
  const cx = ARENA.lanternX;
  const cy = ARENA.lanternY;
  const flicker = 1 + 0.08 * Math.sin(time * 9) + 0.05 * Math.sin(time * 23);
  const r = ARENA.lanternRadius * flicker;

  // Iron frame.
  ctx.fillStyle = '#2a2f4a';
  ctx.fillRect(cx - 6, cy - r - 14, 12, 10);
  ring(ctx, cx, cy, r + 6, 4);
  ctx.strokeStyle = '#2a2f4a';
  ctx.fillStyle = '#1b1e33';
  circle(ctx, cx, cy, r + 2);
  // The flame inside: bright when full, guttering when low.
  const flameR = Math.max(6, r * 0.62 * (0.4 + (flame / 100) * 0.6));
  const fg = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy, flameR * 1.6);
  fg.addColorStop(0, '#fff6d8');
  fg.addColorStop(0.5, PALETTE.lanternGlow);
  fg.addColorStop(1, flash > 0 ? '#ff5d5d' : 'rgba(255, 120, 40, 0.25)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2, flameR * 0.75, flameR, 0, 0, Math.PI * 2);
  ctx.fill();
  // Flame bar under the lantern.
  const w = 84;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(cx - w / 2, cy + r + 12, w, 8);
  ctx.fillStyle = flame > 30 ? PALETTE.lanternGlow : PALETTE.danger;
  ctx.fillRect(cx - w / 2 + 1, cy + r + 13, (w - 2) * (flame / 100), 6);
  text(ctx, 'THE LANTERN', cx, cy + r + 32, 10, PALETTE.textDim, 'center', 700);
}

export function drawKeeper(ctx, p, time, boons) {
  const blink = p.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
  if (!p.alive) return;
  if (blink) return;
  const ctx2 = ctx;
  // Dash trail.
  if (p.dashTimer > 0) {
    ctx2.globalAlpha = 0.35;
    ctx2.fillStyle = '#ffd76a';
    circle(ctx2, p.x - p.vx * 0.03, p.y - p.vy * 0.03, 14);
    ctx2.globalAlpha = 1;
  }
  // Glow.
  const glow = ctx2.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34);
  glow.addColorStop(0, 'rgba(255, 215, 106, 0.5)');
  glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
  ctx2.fillStyle = glow;
  circle(ctx2, p.x, p.y, 34);
  // Body: a little wisp with a bright core and a cloak.
  ctx2.fillStyle = '#ffe9b0';
  ctx2.beginPath();
  ctx2.ellipse(p.x, p.y, 13, 15, 0, 0, Math.PI * 2);
  ctx2.fill();
  ctx2.fillStyle = '#ffb347';
  ctx2.beginPath();
  ctx2.ellipse(p.x, p.y + 4, 9, 10, 0, 0, Math.PI);
  ctx2.fill();
  // Eyes and the aim wand.
  const ex = Math.cos(p.angle);
  const ey = Math.sin(p.angle);
  ctx2.fillStyle = '#1a1206';
  circle(ctx2, p.x + ex * 4 - ey * 4, p.y + ey * 4 + ex * 4 - 2, 2);
  circle(ctx2, p.x + ex * 4 + ey * 4, p.y + ey * 4 - ex * 4 - 2, 2);
  ctx2.strokeStyle = '#ffd76a';
  ctx2.lineWidth = 3;
  ctx2.beginPath();
  ctx2.moveTo(p.x + ex * 12, p.y + ey * 12);
  ctx2.lineTo(p.x + ex * 24, p.y + ey * 24);
  ctx2.stroke();
  circle(ctx2, p.x + ex * 26, p.y + ey * 26, 4);
  if (boons.nova > 0) {
    ctx2.strokeStyle = 'rgba(255, 215, 106, 0.5)';
    ctx2.lineWidth = 1.5;
    ring(ctx2, p.x, p.y, 20 + 3 * Math.sin(time * 4), 1.5);
  }
}

export function drawShade(ctx, s, time) {
  const flash = s.flash > 0;
  ctx.save();
  ctx.translate(s.x, s.y);
  // Shadow glow.
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, s.radius * 2.2);
  glow.addColorStop(0, flash ? 'rgba(255,255,255,0.5)' : 'rgba(143, 123, 255, 0.22)');
  glow.addColorStop(1, 'rgba(143, 123, 255, 0)');
  ctx.fillStyle = glow;
  circle(ctx, 0, 0, s.radius * 2.2);
  // Wobbling body.
  ctx.fillStyle = flash ? '#ffffff' : s.color;
  const wob = 1 + 0.08 * Math.sin(s.wobble * 2);
  ctx.beginPath();
  ctx.ellipse(0, 0, s.radius * wob, s.radius / wob, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eyes: two pale dots that face the lantern.
  const a = Math.atan2(ARENA.lanternY - s.y, ARENA.lanternX - s.x);
  ctx.fillStyle = '#f2ecff';
  circle(ctx, Math.cos(a) * 5 - Math.sin(a) * 4, Math.sin(a) * 5 + Math.cos(a) * 4, 2.4);
  circle(ctx, Math.cos(a) * 5 + Math.sin(a) * 4, Math.sin(a) * 5 - Math.cos(a) * 4, 2.4);
  if (s.kind === 'brute') {
    ctx.strokeStyle = 'rgba(255, 93, 93, 0.8)';
    ctx.lineWidth = 2;
    ring(ctx, 0, 0, s.radius + 4, 2);
  }
  if (s.kind === 'spit') {
    ctx.fillStyle = '#ff7ad9';
    circle(ctx, 0, -s.radius * 0.55, 3);
  }
  // Health bar for tough shades.
  if (s.maxHp > 3 && s.hp < s.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-16, -s.radius - 12, 32, 5);
    ctx.fillStyle = '#ff5d5d';
    ctx.fillRect(-15, -s.radius - 11, 30 * (s.hp / s.maxHp), 3);
  }
  ctx.restore();
}

export function drawBolts(ctx, bolts) {
  for (const b of bolts) {
    ctx.strokeStyle = PALETTE.bolt;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = PALETTE.boltCore;
    circle(ctx, b.x, b.y, 3);
  }
}

export function drawOrbs(ctx, orbs, time) {
  for (const o of orbs) {
    const pulse = 1 + 0.2 * Math.sin(time * 10 + o.x);
    ctx.fillStyle = '#c65df0';
    circle(ctx, o.x, o.y, o.radius * pulse);
    ctx.fillStyle = '#2a0a3a';
    circle(ctx, o.x, o.y, o.radius * 0.5);
  }
}

export function drawEmbers(ctx, embers, time) {
  for (const e of embers) {
    const bob = Math.sin(e.bob) * 2;
    ctx.fillStyle = PALETTE.ember;
    circle(ctx, e.x, e.y + bob, e.radius);
    ctx.fillStyle = '#fff6d8';
    circle(ctx, e.x - 1.5, e.y + bob - 1.5, 2);
  }
}

export function drawParticles(ctx, particles) {
  for (const pt of particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    circle(ctx, pt.x, pt.y, pt.radius);
  }
  ctx.globalAlpha = 1;
}

export function drawFloaters(ctx, floaters) {
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, f.life / 0.9);
    text(ctx, f.text, f.x, f.y, 14, f.color, 'center', 800);
  }
  ctx.globalAlpha = 1;
}

export function drawHud(ctx, state) {
  // Top bar.
  ctx.fillStyle = 'rgba(7, 9, 18, 0.72)';
  ctx.fillRect(0, 0, ARENA.width, 46);
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.25)';
  ctx.beginPath(); ctx.moveTo(0, 46); ctx.lineTo(ARENA.width, 46); ctx.stroke();
  text(ctx, `WAVE ${state.wave} / ${WAVES.total}`, 90, 24, 16, PALETTE.text, 'center', 800);
  text(ctx, `SCORE ${state.score}`, 250, 24, 16, PALETTE.text, 'center', 800);
  text(ctx, `BEST ${state.best}`, 400, 24, 13, PALETTE.textDim, 'center', 700);
  // Hearts.
  for (let i = 0; i < state.player.maxHearts; i += 1) {
    const x = 520 + i * 26;
    ctx.fillStyle = i < state.player.hearts ? '#ff5d7a' : 'rgba(255,93,122,0.25)';
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.bezierCurveTo(x - 9, 20, x - 16, 28, x, 36);
    ctx.bezierCurveTo(x + 16, 28, x + 9, 20, x, 30);
    ctx.fill();
  }
  // Flame bar.
  text(ctx, 'FLAME', 640, 24, 12, PALETTE.textDim, 'left', 800);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(700, 16, 130, 14);
  ctx.fillStyle = state.flame > 30 ? PALETTE.lanternGlow : PALETTE.danger;
  ctx.fillRect(701, 17, 128 * (state.flame / 100), 12);
  text(ctx, `${Math.ceil(state.flame)}`, 838, 24, 13, PALETTE.text, 'left', 800);
  // Embers and shades left.
  text(ctx, `◆ ${state.embersCollected}`, 900, 24, 15, PALETTE.ember, 'center', 800);
  const left = state.spawnQueue.length + state.shades.length;
  if (state.waveActive) text(ctx, `${left} shades left`, ARENA.width / 2, 66, 13, PALETTE.textDim, 'center', 700);
  // Nova cooldown.
  if (state.boons.nova > 0) {
    text(ctx, state.novaCooldown > 0 ? `NOVA ${Math.ceil(state.novaCooldown)}s` : 'NOVA ready [E]', 90, 570, 13, state.novaCooldown > 0 ? PALETTE.textDim : PALETTE.good, 'left', 700);
  }
  if (state.boons.dash > 0) {
    text(ctx, state.player.dashCooldown > 0 ? `DASH ${state.player.dashCooldown.toFixed(1)}s` : 'DASH ready [Shift]', 90, 590, 13, state.player.dashCooldown > 0 ? PALETTE.textDim : PALETTE.good, 'left', 700);
  }
  // Wave banner.
  if (state.bannerTimer > 0) {
    ctx.globalAlpha = Math.min(1, state.bannerTimer);
    text(ctx, state.banner, ARENA.width / 2, 120, 34, '#ffe9b0', 'center', 800);
    ctx.globalAlpha = 1;
  }
  // Low flame warning.
  if (state.flame <= 25 && state.phase === 'play') {
    const a = 0.25 + 0.2 * Math.sin(state.time * 6);
    ctx.fillStyle = `rgba(255, 93, 93, ${a * 0.25})`;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    text(ctx, 'THE LANTERN IS DYING — GATHER EMBERS!', ARENA.width / 2, 92, 16, '#ff8a8a', 'center', 800);
  }
  // Streak.
  if (state.streak >= 5 && state.streakTimer > 0) {
    text(ctx, `RADIANT x${state.streak}`, ARENA.width - 90, 66, 15, '#ffd76a', 'center', 800);
  }
}

function drawControlsHint(ctx) {
  text(ctx, 'WASD / Arrows — move      Mouse — aim      Hold Click / Space — fire      Shift — dash      E — nova      P — pause      M — mute', ARENA.width / 2, ARENA.height - 22, 13, PALETTE.textDim, 'center', 600);
}

export function drawTitle(ctx, state, time, mouse) {
  text(ctx, 'LUMENFALL', ARENA.width / 2, 150, 64, '#ffe9b0', 'center', 800);
  text(ctx, 'K E E P E R   O F   T H E   L A S T   L I G H T', ARENA.width / 2, 196, 16, PALETTE.lanternGlow, 'center', 700);
  panel(ctx, ARENA.width / 2 - 300, 232, 600, 132, 0.8);
  text(ctx, 'The dark is coming for the last lantern. Hold the light for 10 waves.', ARENA.width / 2, 258, 16, PALETTE.text, 'center', 700);
  text(ctx, 'Banish shades with bolts of light. Gather their embers to feed the flame.', ARENA.width / 2, 284, 14, PALETTE.textDim, 'center', 600);
  text(ctx, 'If the flame dies — or you fall — the dark wins.', ARENA.width / 2, 308, 14, PALETTE.textDim, 'center', 600);
  text(ctx, 'Clear a wave to choose a boon. Survive all 10 waves to win.', ARENA.width / 2, 334, 14, PALETTE.textDim, 'center', 600);
  const pulse = 0.7 + 0.3 * Math.sin(time * 3);
  ctx.globalAlpha = pulse;
  text(ctx, state.best > 0 ? `BEST SCORE ${state.best}  —  CLICK OR PRESS ENTER TO BEGIN` : 'CLICK OR PRESS ENTER TO BEGIN', ARENA.width / 2, 408, 18, '#ffd76a', 'center', 800);
  ctx.globalAlpha = 1;
  button(ctx, ARENA.width / 2 - 90, 440, 180, 44, 'BEGIN THE WATCH', mouse.x > ARENA.width / 2 - 90 && mouse.x < ARENA.width / 2 + 90 && mouse.y > 440 && mouse.y < 484);
  drawControlsHint(ctx);
}

export function drawDraft(ctx, state, mouse) {
  ctx.fillStyle = 'rgba(5, 6, 14, 0.72)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  text(ctx, `WAVE ${state.wave} CLEARED`, ARENA.width / 2, 120, 30, '#ffe9b0', 'center', 800);
  text(ctx, `Wave bonus +${50 * state.wave + Math.round(state.flame)}   •   Score ${state.score}`, ARENA.width / 2, 152, 15, PALETTE.textDim, 'center', 700);
  text(ctx, 'CHOOSE A BOON  —  click a card, or press 1, 2, 3', ARENA.width / 2, 196, 17, PALETTE.text, 'center', 800);
  const w = 220;
  const h = 190;
  const gap = 26;
  const total = 3 * w + 2 * gap;
  const x0 = (ARENA.width - total) / 2;
  state.draft.forEach((boon, i) => {
    const x = x0 + i * (w + gap);
    const y = 232;
    const hot = mouse.x > x && mouse.x < x + w && mouse.y > y && mouse.y < y + h;
    panel(ctx, x, y, w, h, hot ? 0.95 : 0.82);
    if (hot) {
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.stroke();
    }
    text(ctx, `[${boon.key}]`, x + w / 2, y + 30, 13, PALETTE.textDim, 'center', 700);
    text(ctx, boon.name, x + w / 2, y + 62, 19, '#ffe9b0', 'center', 800);
    // Word-wrap the blurb.
    const words = boon.blurb.split(' ');
    let line = '';
    let ly = y + 100;
    ctx.font = '600 14px "Trebuchet MS", Verdana, sans-serif';
    for (const word of words) {
      if (ctx.measureText(`${line} ${word}`.trim()).width > w - 28 && line) {
        text(ctx, line, x + w / 2, ly, 14, PALETTE.text, 'center', 600);
        line = word;
        ly += 20;
      } else {
        line = `${line} ${word}`.trim();
      }
    }
    if (line) text(ctx, line, x + w / 2, ly, 14, PALETTE.text, 'center', 600);
    const have = state.boons[boon.id] || 0;
    if (have > 0) text(ctx, `Owned x${have}`, x + w / 2, y + h - 24, 12, PALETTE.good, 'center', 700);
  });
  drawControlsHint(ctx);
}

export function drawPause(ctx, state) {
  ctx.fillStyle = 'rgba(5, 6, 14, 0.7)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  text(ctx, 'PAUSED', ARENA.width / 2, 250, 44, '#ffe9b0', 'center', 800);
  text(ctx, 'Press P or click to keep the watch', ARENA.width / 2, 300, 16, PALETTE.textDim, 'center', 600);
  drawControlsHint(ctx);
}

function drawStats(ctx, stats, y0) {
  const rows = [
    ['Final score', `${stats.score}`],
    ['Waves held', `${stats.wave} / ${WAVES.total}`],
    ['Shades banished', `${stats.kills}`],
    ['Embers gathered', `${stats.embers}`],
    ['Bolt accuracy', `${stats.accuracy}%`],
  ];
  rows.forEach(([label, value], i) => {
    const y = y0 + i * 30;
    text(ctx, label, ARENA.width / 2 - 140, y, 16, PALETTE.textDim, 'left', 600);
    text(ctx, value, ARENA.width / 2 + 140, y, 16, PALETTE.text, 'right', 800);
  });
}

export function drawGameOver(ctx, state, mouse) {
  ctx.fillStyle = 'rgba(10, 4, 10, 0.78)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  text(ctx, 'THE LIGHT HAS GONE OUT', ARENA.width / 2, 130, 38, '#ff8a8a', 'center', 800);
  text(ctx, state.flame <= 0 ? 'The lantern died. The dark takes the arena.' : 'The keeper has fallen. The lantern burns alone.', ARENA.width / 2, 168, 16, PALETTE.textDim, 'center', 600);
  panel(ctx, ARENA.width / 2 - 220, 200, 440, 190, 0.85);
  drawStats(ctx, state.overStats, 232);
  text(ctx, `BEST ${state.best}`, ARENA.width / 2, 420, 16, PALETTE.lanternGlow, 'center', 800);
  button(ctx, ARENA.width / 2 - 110, 448, 220, 46, 'PLAY AGAIN  (R)', mouse.x > ARENA.width / 2 - 110 && mouse.x < ARENA.width / 2 + 110 && mouse.y > 448 && mouse.y < 494);
  drawControlsHint(ctx);
}

export function drawVictory(ctx, state, mouse) {
  ctx.fillStyle = 'rgba(6, 10, 6, 0.72)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  text(ctx, 'DAWN BREAKS', ARENA.width / 2, 110, 46, '#7dffb0', 'center', 800);
  text(ctx, 'Ten waves held. The last lantern burns on — and so do you.', ARENA.width / 2, 150, 16, PALETTE.textDim, 'center', 600);
  text(ctx, '★  ★  ★', ARENA.width / 2, 186, 26, '#ffd76a', 'center', 800);
  panel(ctx, ARENA.width / 2 - 220, 214, 440, 190, 0.85);
  drawStats(ctx, state.victoryStats, 246);
  text(ctx, `BEST ${state.best}`, ARENA.width / 2, 434, 16, PALETTE.lanternGlow, 'center', 800);
  button(ctx, ARENA.width / 2 - 110, 462, 220, 46, 'PLAY AGAIN  (R)', mouse.x > ARENA.width / 2 - 110 && mouse.x < ARENA.width / 2 + 110 && mouse.y > 462 && mouse.y < 508);
  drawControlsHint(ctx);
}
