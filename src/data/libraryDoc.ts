// Builds docs/biblioteca-ejercicios.md from the exercise library (npm run export:library).
// Pure and with type-only imports, so the export script can run it with plain Node and the test can
// check that the file is up to date.

import type { BodyArea, Dosage, Equipment, Exercise, Pattern, Position } from '../engine/types';

// The 37 exercises of the first library, before the difficulty recalibration ("v1 de revisión").
export const V1_IDS: readonly string[] = [
  'seated-shoulder-rolls',
  'seated-look-side-to-side',
  'seated-marching',
  'seated-ankle-circles',
  'seated-trunk-rotation',
  'seated-knee-extension',
  'sit-to-stand-with-hands',
  'supported-mini-squat',
  'sit-to-stand',
  'wall-sit-shallow',
  'seated-hip-hinge',
  'seated-glute-squeeze',
  'supported-hip-extension',
  'supported-hip-abduction',
  'supported-hip-hinge',
  'towel-good-morning',
  'seated-bottle-chest-press',
  'wall-push-up',
  'seated-bottle-overhead-press',
  'incline-wall-push-up',
  'seated-towel-row',
  'seated-towel-pull-apart',
  'seated-bottle-row',
  'seated-towel-pull-down',
  'supported-bottle-row',
  'seated-belly-brace',
  'seated-lean-back',
  'supported-standing-march',
  'wall-plank',
  'seated-weight-shift',
  'supported-feet-together-stand',
  'supported-tandem-stand',
  'supported-single-leg-stand',
  'supported-heel-to-toe-walk',
  'seated-heel-raise',
  'supported-heel-raise',
  'supported-single-leg-heel-raise',
];

const PATTERN_ORDER: Pattern[] = [
  'mobility',
  'squat',
  'hinge',
  'upper_push',
  'upper_pull',
  'core',
  'balance',
  'calf',
];

const POSITION: Record<Position, string> = {
  seated: 'Sentado',
  standing_supported: 'De pie con apoyo',
  standing: 'De pie',
  lying: 'Acostado',
  floor: 'Piso',
};

// The Spanish names come from es.json, passed in by the caller.
export interface DocLabels {
  pattern: Record<Pattern, string>;
  equipmentName: Record<Equipment, string>;
  bodyArea: Record<BodyArea, string>;
}

function dosage(d: Dosage, perSide: boolean): string {
  const side = perSide ? ' por lado' : '';
  if (d.kind === 'time') return `${d.sets} × ${d.seconds} s${side}`;
  return `${d.sets} × ${d.reps}${side}${d.slow ? ', lento (3 s al bajar)' : ''}`;
}

const HEADER = `# Biblioteca de ejercicios de Sigo

> Archivo generado con \`npm run export:library\` a partir de \`src/data/exercises.ts\`. No lo edites a mano:
> un test falla si no coincide con los datos. Ningún ejercicio está revisado todavía por un fisioterapeuta.

**Niveles.** 1 = sentado o acostado. 2 = de pie con apoyo para el equilibrio. 3 = de pie (o en el piso) sin
apoyo, con el peso del cuerpo: un adulto promedio de 55-65 años que camina a diario. 4 = con carga (mochila o
botellas) o con un solo lado a la vez. 5 = un solo lado con carga, tempo lento (3 s al bajar) o mayor rango.
Dosis por nivel: 1 = 2 × 8, 2 = 2 × 10, 3 = 3 × 10, 4 = 3 × 10 (3 × 8 por lado), 5 = 3 × 8 lento; los de
calentamiento son de 1 serie.

**Posición.** *Sentado* es siempre nivel 1. *De pie con apoyo* es sostenerse para el equilibrio y nunca pasa
del nivel 2; si la pared, la mesa o la silla solo sostienen el tronco o las manos (sentadilla en la pared,
flexión en la encimera, remo apoyado), cuenta como *De pie* y el nivel lo decide la exigencia. *Acostado* se hace
en la cama, o en el piso sobre una toalla si la persona puede bajar y levantarse sola; está permitido con «Solo
ejercicios sentados», va al final de la rutina (máximo 3) y siempre termina con cómo levantarse. *Piso*
(planchas, cuatro apoyos) solo se ofrece a quien puede bajar al piso y levantarse sin ayuda, y desde el nivel 3.
Los ejercicios de equilibrio sin apoyo (nivel 3 o más) se hacen junto a una silla firme por seguridad.
`;

export function renderLibraryDoc(exercises: readonly Exercise[], labels: DocLabels): string {
  const v1 = new Set(V1_IDS);
  const sorted = [...exercises].sort(
    (a, b) =>
      PATTERN_ORDER.indexOf(a.pattern) - PATTERN_ORDER.indexOf(b.pattern) ||
      a.level - b.level ||
      a.name.es.localeCompare(b.name.es, 'es'),
  );
  const rows = sorted.map((e, i) =>
    [
      String(i + 1),
      e.name.es,
      labels.pattern[e.pattern],
      POSITION[e.position],
      String(e.level),
      e.equipment.map((eq) => labels.equipmentName[eq]).join(', ') || '—',
      dosage(e.dosage, e.perSide),
      e.loads.map((a) => labels.bodyArea[a].toLocaleLowerCase('es')).join(', ') || '—',
      e.perSide ? 'Sí' : 'No',
      v1.has(e.id) ? 'No' : 'Sí',
    ].join(' | '),
  );
  const table = [
    '| # | Ejercicio | Patrón | Posición | Nivel | Equipo | Dosis | Zonas que carga | Un solo lado | Nuevo desde la v1 de revisión |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r} |`),
  ];
  const newCount = exercises.filter((e) => !v1.has(e.id)).length;
  const summary = `**Total:** ${exercises.length} ejercicios (${exercises.length - newCount} de la v1 de revisión, ${newCount} nuevos).`;
  return `${HEADER}\n${summary}\n\n${table.join('\n')}\n`;
}
