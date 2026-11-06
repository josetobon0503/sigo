/// <reference types="node" />
// Writes assets/videos/_test.mp4: 3 s of solid color to try the player before the real clips exist.
// VideoBox only uses it in development. Run with: npm run videos:test-clip

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ffmpeg: string = createRequire(import.meta.url)('ffmpeg-static');
const { TEST_CLIP, ffmpegArgs } = await import('../src/data/videoFiles.ts');

const assets = new URL('../assets/videos/', import.meta.url);
mkdirSync(assets, { recursive: true });
const args = ffmpegArgs(
  'color=c=0x0E3B40:s=1280x720:d=3',
  fileURLToPath(new URL(TEST_CLIP, assets)),
);
args.splice(1, 0, '-f', 'lavfi'); // the input is a generated color, not a file
const run = spawnSync(ffmpeg, args, { stdio: 'inherit' });
process.exitCode = run.status ?? 1;
