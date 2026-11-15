// THE WRONG BOX entry program (Node 22, standard library only): the game is
// this directory's game/ folder, plain static files a desktop browser loads
// offline (game/index.html and its ES modules, no library and no network
// request), and the program hands it in. It copies game/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the
// summary the judge reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Clear the output subdirectories first: a rerun into a non-clean output dir
// must never retain stale screenshots or game files and alter the dossier.
mkdirSync(out, { recursive: true });
rmSync(join(out, 'game'), { recursive: true, force: true });
rmSync(join(out, 'screenshots'), { recursive: true, force: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
// Screenshots are stored in the repo as base64 text (*.jpg.b64) because the
// push tool only accepts UTF-8 files; decode each one back into the real JPEG
// in /output/screenshots. A plain *.jpg beside them is copied as-is, so local
// development with real JPEGs still works.
if (existsSync(join(here, 'screenshots'))) {
  for (const name of readdirSync(join(here, 'screenshots'))) {
    if (name.endsWith('.jpg.b64')) {
      const b64 = readFileSync(join(here, 'screenshots', name), 'utf8').trim();
      writeFileSync(join(out, 'screenshots', name.slice(0, -4)), Buffer.from(b64, 'base64'));
    } else if (name.endsWith('.jpg')) {
      cpSync(join(here, 'screenshots', name), join(out, 'screenshots', name));
    }
  }
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
