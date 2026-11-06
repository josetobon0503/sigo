/// <reference types="node" />
// Writes docs/lista-videos.md from src/data/exercises.ts. Run with: npm run export:videos

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

// The engine imports './rules' without the .ts extension (the bundler adds it); plain Node needs it.
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (specifier.startsWith('.')) return next(`${specifier}.ts`, context);
      throw error;
    }
  },
});

const { exercises } = await import('../src/data/exercises.ts');
const { renderVideoList } = await import('../src/data/videoList.ts');
const { readyClips } = await import('../src/data/videoFiles.ts');

const assets = new URL('../assets/videos/', import.meta.url);
mkdirSync(assets, { recursive: true });
const ready = readyClips(readdirSync(assets), new Set(exercises.map((e) => e.id)));

const es = JSON.parse(readFileSync(new URL('../src/i18n/es.json', import.meta.url), 'utf8'));
writeFileSync(
  new URL('../docs/lista-videos.md', import.meta.url),
  renderVideoList(exercises, es.equipmentName, ready),
);
console.log(`docs/lista-videos.md: ${exercises.length} ejercicios`);
