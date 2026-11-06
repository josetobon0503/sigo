// Builds docs/lista-videos.md, the recording list for the exercise videos (npm run export:videos).
// Batches come from simulating 28 days of workouts for the fixture personas, so the exercises people
// see most get recorded first.

import { maria, mamaActiva, roberto } from '../engine/__fixtures__/profiles';
import { generateWorkout } from '../engine/generator';
import type { Equipment, Exercise, WorkoutLog } from '../engine/types';
import type { ClipChapter, ReadyClips } from './videoFiles';

export const SIM_START = '2026-11-02'; // a Monday
export const SIM_DAYS = 28;
export const BATCH_1_SIZE = 20;

// One workout a day for each persona, each day seeing the days before as history. Levels stay as they are.
export function countUses(library: Exercise[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const persona of [maria, roberto, mamaActiva]) {
    const history: WorkoutLog[] = [];
    for (let day = 0; day < SIM_DAYS; day++) {
      const date = new Date(Date.parse(SIM_START) + day * 86_400_000).toISOString().slice(0, 10);
      const workout = generateWorkout(persona, library, history, date);
      for (const item of workout.items) {
        counts.set(item.exerciseId, (counts.get(item.exerciseId) ?? 0) + 1);
      }
      history.push({
        id: date,
        date,
        durationSec: workout.estimatedSec,
        items: workout.items.map((i) => ({ exerciseId: i.exerciseId, completed: true })),
      });
    }
  }
  return counts;
}

// Batch 1 = the 20 most used; batch 2 = the rest of levels 1-3; batch 3 = levels 4-5.
export function batchOf(library: Exercise[], counts: Map<string, number>): Map<string, 1 | 2 | 3> {
  const top = [...library]
    .filter((e) => (counts.get(e.id) ?? 0) > 0)
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.id.localeCompare(b.id))
    .slice(0, BATCH_1_SIZE)
    .map((e) => e.id);
  return new Map(
    library.map((e) => [e.id, top.includes(e.id) ? 1 : e.level <= 3 ? 2 : 3] as const),
  );
}

// Recording places, in the order they are recorded (fewest set changes).
export const PLACES = [
  'Silla',
  'Pared o mesa',
  'De pie sin silla ni pared',
  'Escalón',
  'Cama',
  'Piso',
] as const;
export type Place = (typeof PLACES)[number];

export function placeOf(e: Exercise): Place {
  if (e.position === 'floor') return 'Piso';
  if (e.position === 'lying') return 'Cama';
  if (e.equipment.includes('step')) return 'Escalón';
  if (e.position === 'seated' || e.equipment.includes('chair')) return 'Silla';
  // Counter and table exercises need no equipment from the list, but are recorded at the counter.
  if (e.equipment.includes('wall') || /counter|table/.test(e.id)) return 'Pared o mesa';
  return 'De pie sin silla ni pared';
}

// Front view where the movement goes sideways or is about balance; lying down, from the side at bed height.
const FRONT_IDS = ['supported-hip-abduction', 'side-lying-leg-raise', 'clamshell'];
export function cameraOf(e: Exercise): string {
  if (FRONT_IDS.includes(e.id)) return 'de frente';
  if (e.position === 'lying') return 'de lado, a la altura de la cama';
  if (e.pattern === 'balance' || e.pattern === 'mobility') return 'de frente';
  return 'de lado';
}

export function renderVideoList(
  library: Exercise[],
  equipmentName: Record<Equipment, string>,
  ready: ReadyClips,
): string {
  const has = (id: string, c: ClipChapter) => ready.get(id)?.has(c) ?? false;
  const status = (id: string, c: ClipChapter) => (has(id, c) ? 'listo' : 'falta');
  const readyCount = library.reduce((n, e) => n + +has(e.id, 'howTo') + +has(e.id, 'mistakes'), 0);
  const batch = batchOf(library, countUses(library));
  const sorted = [...library].sort(
    (a, b) =>
      batch.get(a.id)! - batch.get(b.id)! ||
      PLACES.indexOf(placeOf(a)) - PLACES.indexOf(placeOf(b)) ||
      a.level - b.level ||
      a.name.es.localeCompare(b.name.es, 'es'),
  );

  // Summary: clips (2 per exercise) by batch and place.
  const clips = (b: number, p?: Place) =>
    2 * sorted.filter((e) => batch.get(e.id) === b && (!p || placeOf(e) === p)).length;
  const summary = [
    `| Tanda | ${PLACES.join(' | ')} | Total |`,
    `|---|${PLACES.map(() => '---|').join('')}---|`,
    ...[1, 2, 3].map(
      (b) => `| ${b} | ${PLACES.map((p) => clips(b, p)).join(' | ')} | ${clips(b)} |`,
    ),
    `| Total | ${PLACES.map((p) => [1, 2, 3].reduce((n, b) => n + clips(b, p), 0)).join(' | ')} | ${2 * sorted.length} |`,
  ];

  const blocks: string[] = [];
  let section = '';
  for (const e of sorted) {
    const b = batch.get(e.id)!;
    const heading = `## Tanda ${b} · ${placeOf(e)}`;
    if (heading !== section) blocks.push(heading, '');
    section = heading;
    const objects = e.equipment.map((eq) => equipmentName[eq].toLocaleLowerCase('es'));
    if (/counter/.test(e.id)) objects.push('encimera de la cocina');
    if (/table/.test(e.id)) objects.push('mesa firme');
    blocks.push(
      `### [${has(e.id, 'howTo') && has(e.id, 'mistakes') ? 'x' : ' '}] ${e.name.es}  (tanda ${b})`,
      '',
      `- Código para el archivo: \`${e.id}__como\` y \`${e.id}__no\``,
      `- Lugar y objetos: ${placeOf(e)}; ${objects.join(', ') || 'ningún objeto'}`,
      `- Ángulo de la cámara: ${cameraOf(e)}`,
      `- Un solo lado: ${e.perSide ? 'sí, graba solo el lado derecho' : 'no'}`,
      `- Cómo hacerlo (clip 1, ${status(e.id, 'howTo')}):`,
      ...e.steps.es.map((s, i) => `  ${i + 1}. ${s}`),
      `- Cómo NO hacerlo (clip 2, ${status(e.id, 'mistakes')}):`,
      ...e.mistakes.es.map((m) => `  - ${m}`),
      `- Repeticiones a mostrar: ${e.dosage.kind === 'time' ? 'aguanta 10 s' : '3 lentas'}`,
      '',
    );
  }

  return `# Lista de grabación de videos

> Archivo generado con \`npm run export:videos\` a partir de \`src/data/exercises.ts\`. No lo edites a mano:
> un test falla si no coincide con los datos. \`npm run videos:compress\` lo regenera y marca \`[x]\` cada ejercicio
> con sus 2 clips en \`assets/videos/\`.

Cada ejercicio son 2 clips sin voz: **cómo hacerlo** (\`<código>__como\`) y **cómo NO hacerlo** (\`<código>__no\`).
Las tandas salen de simular ${SIM_DAYS} días seguidos de rutinas para María, Roberto y Mamá activa: la tanda 1
son los ${BATCH_1_SIZE} ejercicios que más salen, la tanda 2 el resto de los niveles 1-3 y la tanda 3 los niveles
4-5. Dentro de cada tanda van por lugar de grabación, para mover la cámara lo menos posible.

**Listos:** ${readyCount} de ${2 * sorted.length} clips.

**Clips por tanda y lugar** (${sorted.length} ejercicios, ${2 * sorted.length} clips):

${summary.join('\n')}

${blocks.join('\n')}`;
}
