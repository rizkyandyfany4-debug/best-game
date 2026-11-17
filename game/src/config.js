// LUMENFALL — tuning constants. One place for every number the game balances on,
// so the design can be tuned without touching the rules in the other files.
export const ARENA = {
  width: 960,
  height: 600,
  // The lantern stands at the middle of the arena; everything in the game is a
  // distance from it.
  lanternX: 480,
  lanternY: 300,
  lanternRadius: 34,
};

export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  speed: 235,
  maxHearts: 3,
  fireInterval: 0.22,
  boltSpeed: 560,
  boltDamage: 1,
  boltRadius: 5,
  dashSpeed: 720,
  dashTime: 0.16,
  dashCooldown: 1.6,
  pickupRadius: 26,
  invulnerableTime: 1.1,
};

export const LANTERN = {
  maxFlame: 100,
  // Embers feed the flame: every EMBERS_PER_MEND embers gathered mends this much.
  embersPerMend: 10,
  mendAmount: 6,
};

export const WAVES = {
  total: 10,
  // Seconds between one wave's last shade dying and the next wave's banner.
  breather: 2.2,
  // Shades arrive in a trickle so the wave builds instead of flooding the arena.
  spawnInterval: 0.85,
};

// One entry per shade kind. hp, speed, damage to the lantern, damage to the
// keeper, score value and ember drops are all here.
export const SHADES = {
  mote: { radius: 11, hp: 1, speed: 62, flameDamage: 6, touchDamage: 1, score: 10, embers: 1, color: '#8f7bff' },
  hollow: { radius: 16, hp: 3, speed: 46, flameDamage: 10, touchDamage: 1, score: 25, embers: 2, color: '#c65df0' },
  spit: { radius: 14, hp: 2, speed: 40, flameDamage: 0, touchDamage: 1, score: 30, embers: 2, color: '#ff7ad9', ranged: true, spitInterval: 2.6, spitSpeed: 170, orbDamage: 8 },
  brute: { radius: 26, hp: 12, speed: 26, flameDamage: 22, touchDamage: 1, score: 80, embers: 4, color: '#ff5d5d' },
};

// How each wave is composed. counts are per kind; hpScale and speedScale grow
// with the wave so the same kinds stay threatening.
export const WAVE_TABLE = [
  { mote: 6, hollow: 0, spit: 0, brute: 0 },
  { mote: 9, hollow: 2, spit: 0, brute: 0 },
  { mote: 10, hollow: 4, spit: 2, brute: 0 },
  { mote: 12, hollow: 5, spit: 3, brute: 1 },
  { mote: 14, hollow: 7, spit: 4, brute: 1 },
  { mote: 16, hollow: 8, spit: 5, brute: 2 },
  { mote: 18, hollow: 10, spit: 6, brute: 2 },
  { mote: 20, hollow: 12, spit: 7, brute: 3 },
  { mote: 22, hollow: 13, spit: 8, brute: 3 },
  { mote: 24, hollow: 15, spit: 10, brute: 4 },
];

// The draft: after every cleared wave the keeper picks one of three boons.
// id, name, blurb and what it does are all here; waves.js applies them.
export const BOONS = [
  { id: 'twin', name: 'Twin Flames', blurb: 'Fire two bolts side by side.', max: 1 },
  { id: 'triple', name: 'Triple Flames', blurb: 'Fire three bolts in a fan. Needs Twin Flames.', needs: 'twin', max: 1 },
  { id: 'rapid', name: 'Rapid Wick', blurb: '+25% fire rate.', max: 3 },
  { id: 'heavy', name: 'Heavy Ember', blurb: '+1 damage per bolt.', max: 3 },
  { id: 'swift', name: 'Swift Step', blurb: '+15% move speed.', max: 3 },
  { id: 'magnet', name: 'Ember Magnet', blurb: 'Double ember pickup radius.', max: 2 },
  { id: 'pierce', name: 'Piercing Light', blurb: 'Bolts pierce one extra shade.', max: 2 },
  { id: 'mend', name: 'Lantern Mend', blurb: 'Restore 35 flame at once.', max: 99 },
  { id: 'heart', name: 'Second Wind', blurb: '+1 heart, and heal one heart.', max: 2 },
  { id: 'nova', name: 'Nova Burst', blurb: 'Press E: a ring of light banishes nearby shades.', max: 1 },
  { id: 'dash', name: 'Ember Dash', blurb: 'Press Shift: a quick dash. Shorter cooldown each time.', max: 2 },
];

export const PALETTE = {
  bg: '#0b0e1e',
  bgEdge: '#070912',
  floorLine: 'rgba(120, 140, 255, 0.07)',
  lanternGlow: '#ffb347',
  lanternCore: '#ffe9b0',
  bolt: '#ffd76a',
  boltCore: '#fff6d8',
  ember: '#ffb347',
  text: '#f2ecff',
  textDim: '#a9a3c7',
  danger: '#ff5d5d',
  good: '#7dffb0',
};
