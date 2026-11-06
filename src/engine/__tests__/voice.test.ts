import { createProfile, defaultCountSpeed } from '../profile';
import {
  LEAD_MS,
  REP_MS,
  SWITCH_SIDE_SECONDS,
  WELL_DONE_MS,
  completeSet,
  pauseTimer,
  repsCounted,
  setCountMs,
  startTimer,
  tick,
  type Session,
  type SessionItem,
} from '../session';
import { STALE_MS, dueCues, voiceCues, voiceSegment, type Cue } from '../voice';

const T0 = 1_000_000;

function item(overrides: Partial<SessionItem> = {}): SessionItem {
  return {
    exerciseId: 'sit-to-stand',
    section: 'main',
    dosage: { kind: 'reps', sets: 3, reps: 10 },
    perSide: false,
    level: 3,
    setsDone: 0,
    ...overrides,
  } as SessionItem;
}

function session(items: SessionItem[], countMs: number | null = REP_MS.normal): Session {
  return {
    date: '2026-11-06',
    startedAt: T0,
    endedAt: null,
    items,
    index: 0,
    set: 1,
    side: 1,
    seatedOnly: false,
    countMs,
    phase: { kind: 'exercise', timer: { status: 'idle' } },
  };
}

const at = (cues: Cue[], key: Cue['key']) => cues.filter((c) => c.key === key);

describe('rep sets in distance mode', () => {
  it('announce, one number every 3 s, "Well done!", then 3 s and on to the rest', () => {
    const s = startTimer(session([item(), item()]), T0);
    const cues = voiceCues(s, 'Sentarse y pararse');
    expect(cues[0]).toEqual({
      at: 0,
      key: 'announce',
      params: { name: 'Sentarse y pararse', set: 1, sets: 3 },
    });
    expect(at(cues, 'number').map((c) => c.at)).toEqual(
      Array.from({ length: 10 }, (_, i) => LEAD_MS + (i + 1) * 3000),
    );
    const end = LEAD_MS + 10 * 3000;
    expect(at(cues, 'wellDone')).toEqual([{ at: end, key: 'wellDone' }]);

    expect(tick(s, T0 + end + WELL_DONE_MS - 1).phase.kind).toBe('exercise');
    const rested = tick(s, T0 + end + WELL_DONE_MS);
    expect(rested.phase.kind).toBe('rest');
    expect(rested.items[0].setsDone).toBe(1);
  });

  it('slow count: 5 s per rep; level 5 is always 5 s', () => {
    const slow = startTimer(session([item()], REP_MS.slow), T0);
    expect(at(voiceCues(slow, 'x'), 'number')[0].at).toBe(LEAD_MS + 5000);
    const level5 = startTimer(session([item({ level: 5 })], REP_MS.normal), T0);
    expect(at(voiceCues(level5, 'x'), 'number')[1].at).toBe(LEAD_MS + 10_000);
    const slowTempo = item({ dosage: { kind: 'reps', sets: 3, reps: 8, slow: true } });
    expect(at(voiceCues(startTimer(session([slowTempo]), T0), 'x'), 'number')[0].at).toBe(
      LEAD_MS + 5000,
    );
  });

  it('one side at a time: "Switch sides", count again, "Well done!" only at the end', () => {
    const it2 = item({ perSide: true, dosage: { kind: 'reps', sets: 3, reps: 8 } });
    const s = startTimer(session([it2, item()]), T0);
    const side1 = voiceCues(s, 'x');
    expect(at(side1, 'wellDone')).toEqual([]);
    const side1End = LEAD_MS + 8 * 3000;
    const s2 = tick(s, T0 + side1End);
    expect(s2.side).toBe(2);
    const side2 = voiceCues(s2, 'x');
    expect(side2[0]).toEqual({ at: 0, key: 'switchSides' });
    const first = SWITCH_SIDE_SECONDS * 1000;
    expect(at(side2, 'number')[0].at).toBe(first + 3000);
    expect(at(side2, 'wellDone')).toEqual([{ at: first + 8 * 3000, key: 'wellDone' }]);
    expect(tick(s2, T0 + side1End + first + 8 * 3000 + WELL_DONE_MS).phase.kind).toBe('rest');
  });

  it('counts the reps done so far, and pausing freezes the count', () => {
    const s = startTimer(session([item()]), T0);
    expect(repsCounted(s, T0 + LEAD_MS + 2999)).toBe(0);
    expect(repsCounted(s, T0 + LEAD_MS + 3000 * 4)).toBe(4);
    const paused = pauseTimer(s, T0 + LEAD_MS + 3000 * 4);
    expect(repsCounted(paused, T0 + 999_999)).toBe(4);
    expect(voiceSegment(paused, T0 + 999_999)?.elapsed).toBe(LEAD_MS + 12_000);
    const resumed = startTimer(paused, T0 + 50_000);
    expect(repsCounted(resumed, T0 + 50_000 + 3000)).toBe(5);
  });

  it('turning distance mode off stops the count; "Done" still works', () => {
    const s = startTimer(session([item(), item()]), T0);
    const off = setCountMs(s, null);
    expect(off.phase).toEqual({ kind: 'exercise', timer: { status: 'idle' } });
    expect(startTimer(off, T0)).toBe(off); // rep sets have no timer without distance mode
    expect(completeSet(s, T0 + 100).phase.kind).toBe('rest');
  });
});

describe('timed sets', () => {
  it('"10 seconds left" and 3, 2, 1', () => {
    const timedItem = item({ dosage: { kind: 'time', sets: 3, seconds: 30 } });
    const cues = voiceCues(startTimer(session([timedItem]), T0), 'Plancha');
    expect(cues[0].key).toBe('announce');
    expect(at(cues, 'tenLeft')).toEqual([{ at: 20_000, key: 'tenLeft' }]);
    expect(at(cues, 'number').map((c) => [c.at, c.params?.n])).toEqual([
      [27_000, 3],
      [28_000, 2],
      [29_000, 1],
    ]);
  });

  it('no "10 seconds left" in a 10-second hold; side 2 counts down after the switch', () => {
    const short = item({ dosage: { kind: 'time', sets: 1, seconds: 10 } });
    expect(at(voiceCues(startTimer(session([short]), T0), 'x'), 'tenLeft')).toEqual([]);
    const sided = item({ perSide: true, dosage: { kind: 'time', sets: 2, seconds: 20 } });
    const s2 = tick(startTimer(session([sided]), T0), T0 + 20_000);
    const cues = voiceCues(s2, 'x');
    expect(cues[0].key).toBe('switchSides');
    expect(at(cues, 'tenLeft')[0].at).toBe(5000 + 10_000);
  });
});

describe('rest', () => {
  it('"Rest", then "Next: …" 10 s before the end', () => {
    const s = startTimer(session([item({ level: 1 }), item()]), T0);
    const rest = completeSet(s, T0);
    const cues = voiceCues(rest, 'x', 'Flexión en la pared');
    expect(cues).toEqual([
      { at: 0, key: 'rest' },
      { at: 35_000, key: 'next', params: { name: 'Flexión en la pared' } },
    ]);
  });
});

describe('dueCues', () => {
  const cues: Cue[] = [
    { at: 0, key: 'announce' },
    { at: 6000, key: 'number', params: { n: 1 } },
    { at: 9000, key: 'number', params: { n: 2 } },
  ];

  it('says each cue once, as its time comes', () => {
    expect(dueCues(cues, -1, 200)).toEqual([cues[0]]);
    expect(dueCues(cues, 200, 5900)).toEqual([]);
    expect(dueCues(cues, 5900, 6100)).toEqual([cues[1]]);
    expect(dueCues(cues, 6100, 6400)).toEqual([]);
  });

  it('skips cues that went by in the background', () => {
    expect(dueCues(cues, 100, 9000 + STALE_MS + 1)).toEqual([]);
    expect(dueCues(cues, 100, 9000 + STALE_MS)).toEqual([cues[2]]);
  });
});

describe('count speed default', () => {
  it('slow for seated-only users and people 70+, otherwise normal', () => {
    expect(defaultCountSpeed({ seatedOnly: false, ageBand: '60-69' })).toBe('normal');
    expect(defaultCountSpeed({ seatedOnly: true, ageBand: '50-59' })).toBe('slow');
    expect(defaultCountSpeed({ seatedOnly: false, ageBand: '70-79' })).toBe('slow');
    expect(defaultCountSpeed({ seatedOnly: false, ageBand: '80+' })).toBe('slow');
  });

  it('a screening "yes" in onboarding makes the new profile slow', () => {
    const draft = {
      name: 'Ana',
      language: 'es' as const,
      ageBand: '50-59' as const,
      activity: 'daily' as const,
      floorOk: false,
      equipment: [],
      painAreas: [],
      reminder: { enabled: false, hour: 9, minute: 0, days: [] },
      weeklyGoal: 2 as const,
    };
    expect(createProfile({ ...draft, screeningAnswers: {} }, '2026-11-06').countSpeed).toBe(
      'normal',
    );
    expect(
      createProfile({ ...draft, screeningAnswers: { chestPain: true } }, '2026-11-06').countSpeed,
    ).toBe('slow');
  });
});
