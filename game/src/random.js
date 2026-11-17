// A small seeded random generator (mulberry32) plus the helpers the game uses
// to pick spawn points, draft boons and scatter particles. The screenshot scenes
// run on a fixed seed so the same seed always draws the same frame.
export function makeRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// A point on the arena's edge, so shades always walk in from outside the light.
export function edgePoint(rng, width, height, margin) {
  const side = Math.floor(rng() * 4);
  if (side === 0) return { x: range(rng, 0, width), y: -margin };
  if (side === 1) return { x: width + margin, y: range(rng, 0, height) };
  if (side === 2) return { x: range(rng, 0, width), y: height + margin };
  return { x: -margin, y: range(rng, 0, height) };
}
