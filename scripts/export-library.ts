/// <reference types="node" />
// Writes docs/biblioteca-ejercicios.md from src/data/exercises.ts. Run with: npm run export:library
// Plain Node (24+) runs this TypeScript directly, so no extra tools are needed.

import { readFileSync, writeFileSync } from 'node:fs';

import { exercises } from '../src/data/exercises.ts';
import { renderLibraryDoc, type DocLabels } from '../src/data/libraryDoc.ts';

const es = JSON.parse(
  readFileSync(new URL('../src/i18n/es.json', import.meta.url), 'utf8'),
) as DocLabels;
const out = new URL('../docs/biblioteca-ejercicios.md', import.meta.url);
writeFileSync(out, renderLibraryDoc(exercises, es));
console.log(`docs/biblioteca-ejercicios.md: ${exercises.length} ejercicios`);
