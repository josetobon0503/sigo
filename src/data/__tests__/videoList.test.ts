/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import es from '../../i18n/es.json';
import { exercises } from '../exercises';
import { readyClips, renderVideosModule } from '../videoFiles';
import { BATCH_1_SIZE, batchOf, cameraOf, countUses, placeOf, renderVideoList } from '../videoList';

const DOC = join(__dirname, '../../../docs/lista-videos.md');
const byId = new Map(exercises.map((e) => [e.id, e]));
const ids = new Set(exercises.map((e) => e.id));
const ready = readyClips(readdirSync(join(__dirname, '../../../assets/videos')), ids);

describe('docs/lista-videos.md', () => {
  it('matches the exercise library (run `npm run export:videos` after changing it)', () => {
    const onDisk = readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
    expect(onDisk).toBe(renderVideoList(exercises, es.equipmentName, ready));
  });

  it('lists every exercise once', () => {
    const blocks = renderVideoList(exercises, es.equipmentName, ready).match(/^### \[[ x]\] /gm);
    expect(blocks).toHaveLength(exercises.length);
  });

  it('marks an exercise [x] only with both clips, and says which clip is missing', () => {
    const one = new Map([['sit-to-stand', new Set(['howTo'] as const)]]);
    const both = new Map([['sit-to-stand', new Set(['howTo', 'mistakes'] as const)]]);
    const doc1 = renderVideoList(exercises, es.equipmentName, one);
    expect(doc1).toContain('**Listos:** 1 de 168 clips.');
    expect(doc1).not.toMatch(/^### \[x\]/m);
    expect(doc1).toMatch(/clip 1, listo[\s\S]*?clip 2, falta/);
    const doc2 = renderVideoList(exercises, es.equipmentName, both);
    expect(doc2.match(/^### \[x\] /gm)).toHaveLength(1);
  });

  it('src/data/videos.ts matches assets/videos (run `npm run videos:compress`)', () => {
    const onDisk = readFileSync(join(__dirname, '../videos.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(onDisk).toBe(renderVideosModule(ready));
  });
});

describe('batches', () => {
  const batch = batchOf(exercises, countUses(exercises));

  it('batch 1 holds the 20 most used; 2 = other levels 1-3; 3 = levels 4-5', () => {
    expect([...batch.values()].filter((b) => b === 1)).toHaveLength(BATCH_1_SIZE);
    for (const [id, b] of batch) {
      const level = byId.get(id)!.level;
      if (b === 2) expect(level).toBeLessThanOrEqual(3);
      if (b === 3) expect(level).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('place and camera', () => {
  it('picks the recording place', () => {
    expect(placeOf(byId.get('floor-plank')!)).toBe('Piso');
    expect(placeOf(byId.get('glute-bridge')!)).toBe('Cama');
    expect(placeOf(byId.get('step-up')!)).toBe('Escalón');
    expect(placeOf(byId.get('sit-to-stand')!)).toBe('Silla');
    expect(placeOf(byId.get('counter-push-up')!)).toBe('Pared o mesa');
    expect(placeOf(byId.get('towel-good-morning')!)).toBe('De pie sin silla ni pared');
  });

  it('films balance, sideways legs and mobility from the front, the rest from the side', () => {
    expect(cameraOf(byId.get('supported-single-leg-stand')!)).toBe('de frente');
    expect(cameraOf(byId.get('clamshell')!)).toBe('de frente');
    expect(cameraOf(byId.get('seated-shoulder-rolls')!)).toBe('de frente');
    expect(cameraOf(byId.get('glute-bridge')!)).toBe('de lado, a la altura de la cama');
    expect(cameraOf(byId.get('sit-to-stand')!)).toBe('de lado');
  });
});
