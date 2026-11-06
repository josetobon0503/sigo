/// <reference types="node" />
// Compresses the clips in videos-originales/ into assets/videos/, then regenerates src/data/videos.ts
// and docs/lista-videos.md. Run with: npm run videos:compress

import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ffmpeg: string = createRequire(import.meta.url)('ffmpeg-static');
const { exercises } = await import('../src/data/exercises.ts');
const { MAX_CLIP_BYTES, ffmpegArgs, parseClipName, readyClips, renderVideosModule } =
  await import('../src/data/videoFiles.ts');

const ids = new Set(exercises.map((e) => e.id));
const originals = new URL('../videos-originales/', import.meta.url);
const assets = new URL('../assets/videos/', import.meta.url);
mkdirSync(originals, { recursive: true });
mkdirSync(assets, { recursive: true });

let failed = false;
for (const file of readdirSync(originals)) {
  const clip = parseClipName(file, ids);
  if (!clip.ok) {
    console.warn(
      clip.reason === 'name'
        ? `! ${file}: el nombre debe ser <código>__como o <código>__no (.mov o .mp4)`
        : `! ${file}: ningún ejercicio tiene ese código (mira docs/lista-videos.md)`,
    );
    continue;
  }
  const input = fileURLToPath(new URL(file, originals));
  const output = fileURLToPath(new URL(clip.output, assets));
  let outTime = 0;
  try {
    outTime = statSync(output).mtimeMs;
  } catch {}
  if (outTime > statSync(input).mtimeMs) continue; // already compressed
  const run = spawnSync(ffmpeg, ffmpegArgs(input, output), { stdio: ['ignore', 'ignore', 'pipe'] });
  if (run.status !== 0) {
    failed = true;
    console.error(`x ${file}: ffmpeg falló\n${run.stderr.toString().slice(-800)}`);
    continue;
  }
  const mb = statSync(output).size / 1024 / 1024;
  console.log(`✓ ${clip.output} (${mb.toFixed(1)} MB)`);
  if (statSync(output).size > MAX_CLIP_BYTES) {
    console.warn(`! ${clip.output} pasa de 3 MB: recórtalo o graba un clip más corto`);
  }
}

writeFileSync(
  new URL('../src/data/videos.ts', import.meta.url),
  renderVideosModule(readyClips(readdirSync(assets), ids)),
);
// Same list update as npm run export:videos.
await import('./export-video-list.ts');
if (failed) process.exitCode = 1;
