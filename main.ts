// LUMENFALL — the entry program (Node 22, standard library only).
//
// What it hands in: this repository's game/ (the playable game, plain static
// files a desktop browser loads offline) and screenshots/ (three real renders
// of the game's own code), plus dossier.json — the summary the judge reads,
// written by the kit's vendored library from exactly those files.
//
// It runs twice in the grader and both runs must write the same bytes; the
// library is deterministic, so identical inputs give identical outputs.
//
// Local run:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

// Refuse to hand in a broken entry instead of writing a dossier for one.
const gameIndex = join(repoRoot, 'game', 'index.html');
if (!existsSync(gameIndex)) throw new Error('game/index.html is missing: nothing playable to hand in');
const shotDir = join(repoRoot, 'screenshots');
const shots = existsSync(shotDir) ? readdirSync(shotDir).filter((f) => !f.startsWith('.')) : [];
if (shots.length < 3) throw new Error(`screenshots/ holds ${shots.length} shots, need at least 3`);

copyTree(join(repoRoot, 'game'), join(outDir, 'game'));
copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));

// The scorer's own caps from the kit's reference/gate.json: the dossier text
// is capped at 160 KiB, screenshots at 4 files of 256 KiB, game/ at 993 files
// and 48 MiB, and no path under game/ longer than 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
const dossierPath = join(outDir, 'dossier.json');
writeFileSync(dossierPath, dossier);

// Confirm what was handed in, so a broken run fails loudly instead of
// silently: the dossier must exist, be non-empty and fit the scorer's cap.
const written = statSync(dossierPath);
if (written.size === 0 || written.size > 1572864) {
  throw new Error(`dossier.json is ${written.size} bytes, expected 1..1572864`);
}
console.log(
  `LUMENFALL handed in: ${shots.length} screenshots, dossier ${written.size} bytes -> ${outDir}`,
);
