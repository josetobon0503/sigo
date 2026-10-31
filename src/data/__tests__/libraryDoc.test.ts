/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import es from '../../i18n/es.json';
import { exercises } from '../exercises';
import { renderLibraryDoc, V1_IDS } from '../libraryDoc';

const DOC = join(__dirname, '../../../docs/biblioteca-ejercicios.md');

describe('docs/biblioteca-ejercicios.md', () => {
  it('matches the exercise library (run `npm run export:library` after changing it)', () => {
    // Git may check the file out with Windows line endings.
    const onDisk = readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
    expect(onDisk).toBe(renderLibraryDoc(exercises, es));
  });

  it('has one row per exercise', () => {
    const rows = renderLibraryDoc(exercises, es)
      .split('\n')
      .filter((line) => /^\| \d+ \|/.test(line));
    expect(rows).toHaveLength(exercises.length);
  });

  it('every v1 exercise is still in the library', () => {
    const ids = new Set(exercises.map((e) => e.id));
    for (const id of V1_IDS) expect(ids.has(id)).toBe(true);
  });
});
