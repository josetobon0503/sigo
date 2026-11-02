import { levelsAt, pain } from '../__fixtures__/profiles';
import { addDays } from '../pain';
import {
  feelings,
  levelChanges,
  minutes,
  painChanges,
  painHistory,
  thisWeek,
  trainedDays,
  visibleLevelChanges,
  weekDays,
  weekGoal,
  weekStart,
  weekStreak,
} from '../stats';
import type { Feeling, WeeklyGoal, WorkoutLog } from '../types';

let seq = 0;
function log(
  date: string,
  opts: { completed?: boolean; min?: number; feeling?: Feeling; goal?: WeeklyGoal } = {},
): WorkoutLog {
  seq += 1;
  return {
    id: `${date}-${seq}`,
    date,
    durationSec: (opts.min ?? 20) * 60,
    items: [{ exerciseId: 'x', completed: opts.completed ?? true }],
    ...(opts.feeling ? { feeling: opts.feeling } : {}),
    ...(opts.goal ? { weeklyGoal: opts.goal } : {}),
  };
}

// `count` workouts on Monday, Tuesday, ... of the week that starts on `monday`.
function week(monday: string, count: number, goal?: WeeklyGoal): WorkoutLog[] {
  return Array.from({ length: count }, (_, i) => log(addDays(monday, i), { goal }));
}

// Mondays in October and November 2026.
const W1 = '2026-10-05';
const W2 = '2026-10-12';
const W3 = '2026-10-19';
const W4 = '2026-10-26';
const W5 = '2026-11-02';

describe('weeks', () => {
  it('start on Monday', () => {
    expect(weekStart('2026-10-30')).toBe('2026-10-26'); // Friday
    expect(weekStart('2026-10-26')).toBe('2026-10-26'); // Monday
    expect(weekStart('2026-11-01T22:00:00.000Z')).toBe('2026-10-26'); // Sunday
    expect(weekDays('2026-10-30')).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ]);
  });

  it('cross New Year as one week', () => {
    expect(weekStart('2026-01-02')).toBe('2025-12-29');
    expect(weekDays('2025-12-31')[6]).toBe('2026-01-04');
  });
});

describe('trainedDays', () => {
  it('counts a day once and needs a finished exercise', () => {
    const days = trainedDays([
      log('2026-10-26'),
      log('2026-10-26'),
      log('2026-10-27', { completed: false }),
    ]);
    expect([...days]).toEqual(['2026-10-26']);
  });
});

describe('thisWeek', () => {
  it('marks the days trained and compares with the goal', () => {
    const w = thisWeek([log('2026-10-26'), log('2026-10-28'), log('2026-10-19')], '2026-10-30', 3);
    expect(w.days.map((d) => d.trained)).toEqual([true, false, true, false, false, false, false]);
    expect(w).toMatchObject({ count: 2, goal: 3, met: false });
  });

  it('ignores workouts after today', () => {
    expect(thisWeek([log('2026-10-31')], '2026-10-30', 2).count).toBe(0);
  });

  it.each<[WeeklyGoal, boolean]>([
    [2, true],
    [3, true],
    [4, false],
  ])('3 days with goal %i: met = %s', (goal, met) => {
    expect(thisWeek(week(W4, 3), '2026-11-01', goal).met).toBe(met);
  });
});

describe('weekGoal', () => {
  it('uses the goal of the last workout of the week, or the current one', () => {
    expect(weekGoal([log(W1, { goal: 2 }), log(addDays(W1, 1), { goal: 4 })], 3)).toBe(4);
    expect(weekGoal([log(W1)], 3)).toBe(3);
    expect(weekGoal([], 2)).toBe(2);
  });
});

describe('weekStreak', () => {
  it('counts weeks in a row that reached the goal', () => {
    const logs = [...week(W1, 2), ...week(W2, 2), ...week(W3, 3)];
    // Monday of W4, nothing yet: the week is still open.
    expect(weekStreak(logs, W4, 2)).toEqual({ weeks: 3, best: 3, currentWeek: 'open' });
  });

  it('a week that missed the goal ends the streak', () => {
    const logs = [...week(W1, 2), ...week(W2, 1), ...week(W3, 2)];
    expect(weekStreak(logs, W4, 2).weeks).toBe(1);
  });

  it('a week without workouts ends the streak', () => {
    const logs = [...week(W1, 2), ...week(W3, 2)];
    expect(weekStreak(logs, W4, 2).weeks).toBe(1);
  });

  it('this week adds 1 once the goal is met', () => {
    const logs = [...week(W3, 2), ...week(W4, 2)];
    expect(weekStreak(logs, '2026-10-28', 2)).toEqual({ weeks: 2, best: 2, currentWeek: 'met' });
  });

  it('this week does not break the streak while it can still be met', () => {
    const logs = [...week(W2, 3), ...week(W3, 3)];
    // Saturday with nothing done and goal 2: Saturday and Sunday are left.
    expect(weekStreak(logs, '2026-10-31', 2)).toMatchObject({ weeks: 2, currentWeek: 'open' });
    // Sunday with 1 done: today is still left.
    expect(weekStreak([...logs, log('2026-10-26')], '2026-11-01', 2).currentWeek).toBe('open');
  });

  it('a day already trained today does not count as a day left', () => {
    const logs = [...week(W3, 2), log('2026-11-01')];
    // Sunday, trained today, 1 of 2: nothing left.
    expect(weekStreak(logs, '2026-11-01', 2)).toEqual({ weeks: 0, best: 1, currentWeek: 'missed' });
  });

  it('when this week can no longer be met, the streak is 0 but the best one stays', () => {
    const logs = [...week(W1, 2), ...week(W2, 2), ...week(W3, 2)];
    // Sunday of W4 with nothing done and goal 2.
    expect(weekStreak(logs, '2026-11-01', 2)).toEqual({ weeks: 0, best: 3, currentWeek: 'missed' });
  });

  it('keeps the best streak when an older one was longer', () => {
    const logs = [...week(W1, 2), ...week(W2, 2), ...week(W3, 2), ...week(W5, 2)];
    expect(weekStreak(logs, '2026-11-04', 2)).toEqual({ weeks: 1, best: 3, currentWeek: 'met' });
  });

  it('raising the goal never breaks weeks that already happened', () => {
    const logs = [...week(W1, 2, 2), ...week(W2, 2, 2), ...week(W3, 2, 2), ...week(W4, 2, 2)];
    // The user moves the goal to 3 on Monday of W5.
    expect(weekStreak(logs, W5, 3)).toEqual({ weeks: 4, best: 4, currentWeek: 'open' });
    // This week is judged with the new goal: 2 days are not enough.
    expect(weekStreak([...logs, ...week(W5, 2, 3)], '2026-11-04', 3)).toMatchObject({
      weeks: 4,
      currentWeek: 'open',
    });
    expect(weekStreak([...logs, ...week(W5, 3, 3)], '2026-11-04', 3).weeks).toBe(5);
  });

  it('a week is judged by the goal of its last workout', () => {
    // Goal 4 at the start of W1, lowered to 2 later that week.
    const logs = [log(W1, { goal: 4 }), log(addDays(W1, 2), { goal: 2 })];
    expect(weekStreak(logs, W2, 3).weeks).toBe(1);
  });

  it('works across New Year', () => {
    const logs = [
      ...week('2025-12-22', 2),
      log('2025-12-30'),
      log('2026-01-02'),
      ...week('2026-01-05', 2),
    ];
    expect(weekStreak(logs, '2026-01-12', 2)).toEqual({ weeks: 3, best: 3, currentWeek: 'open' });
  });

  it('with no history the week is open and there is no streak', () => {
    expect(weekStreak([], '2026-10-30', 2)).toEqual({ weeks: 0, best: 0, currentWeek: 'open' });
  });
});

describe('minutes', () => {
  it('adds up the total and this week', () => {
    const logs = [
      log('2026-10-20', { min: 18 }),
      log('2026-10-27', { min: 22 }),
      log('2026-10-29', { min: 20, completed: false }),
    ];
    expect(minutes(logs, '2026-10-30')).toEqual({ total: 60, week: 42 });
  });
});

describe('feelings', () => {
  it('keeps the last 10, oldest first', () => {
    const logs = Array.from({ length: 12 }, (_, i) =>
      log(addDays(W1, i), { feeling: i % 2 ? 'good' : 'tired' }),
    );
    logs.push(log(addDays(W1, 13)));
    const result = feelings(logs);
    expect(result).toHaveLength(10);
    expect(result[0].day).toBe(addDays(W1, 2));
    expect(result[9]).toMatchObject({ day: addDays(W1, 11), feeling: 'good' });
  });
});

describe('painHistory', () => {
  it('groups by area in body order, one point per day (the last wins)', () => {
    const history = painHistory(
      [
        { date: '2026-10-01', area: 'knee', intensity: 3 },
        { date: '2026-10-10T08:00:00.000Z', area: 'knee', intensity: 4 },
        { date: '2026-10-10T09:00:00.000Z', area: 'knee', intensity: 2 },
        { date: '2026-10-05', area: 'neck', intensity: 2 },
      ],
      [],
    );
    expect(history).toEqual([
      { area: 'neck', points: [{ day: '2026-10-05', intensity: 2 }] },
      {
        area: 'knee',
        points: [
          { day: '2026-10-01', intensity: 3 },
          { day: '2026-10-10', intensity: 2 },
        ],
      },
    ]);
  });

  it('starts an area without history at its current value', () => {
    expect(painHistory([], [pain('knee', 3)])).toEqual([
      { area: 'knee', points: [{ day: '2026-10-01', intensity: 3 }] },
    ]);
  });

  it('keeps the last n points', () => {
    const entries = Array.from({ length: 8 }, (_, i) => ({
      date: addDays(W1, i),
      area: 'hip' as const,
      intensity: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
    }));
    expect(painHistory(entries, [], 6)[0].points).toHaveLength(6);
  });
});

describe('painChanges', () => {
  it('records new, changed and removed areas, keeping the value before the first change', () => {
    const prev = [pain('knee', 3), pain('neck', 2)];
    const next = [{ ...pain('knee', 4), updatedAt: '2026-10-20' }, pain('hip', 2)];
    expect(painChanges(prev, next, '2026-10-20')).toEqual([
      { date: '2026-10-01', area: 'knee', intensity: 3 },
      { date: '2026-10-20', area: 'knee', intensity: 4 },
      { date: '2026-10-20', area: 'hip', intensity: 2 },
      { date: '2026-10-01', area: 'neck', intensity: 2 },
      { date: '2026-10-20', area: 'neck', intensity: 1 },
    ]);
  });

  it('does not repeat the earlier value once the area has history, and ignores kind changes', () => {
    const history = [{ date: '2026-10-01', area: 'knee' as const, intensity: 3 as const }];
    expect(painChanges([pain('knee', 3)], [pain('knee', 2)], '2026-10-20', history)).toEqual([
      { date: '2026-10-20', area: 'knee', intensity: 2 },
    ]);
    expect(painChanges([pain('knee', 3)], [pain('knee', 3, 'sharp')], '2026-10-20')).toEqual([]);
  });
});

describe('level changes', () => {
  it('lists the patterns that moved, without mobility', () => {
    const before = levelsAt(3);
    const after = { ...before, squat: 4, balance: 2, mobility: 4 } as const;
    expect(levelChanges(before, after)).toEqual([
      { pattern: 'squat', from: 3, to: 4 },
      { pattern: 'balance', from: 3, to: 2 },
    ]);
  });

  it('shows the changes of the last workout while the level is still the same', () => {
    const levels = { ...levelsAt(3), squat: 4, balance: 2 } as const;
    const last: WorkoutLog = {
      ...log('2026-10-28'),
      levelChanges: [
        { pattern: 'squat', from: 3, to: 4 },
        { pattern: 'balance', from: 3, to: 2 },
      ],
    };
    expect(visibleLevelChanges([log('2026-10-20'), last], levels)).toEqual({
      up: ['squat'],
      down: ['balance'],
    });
    // The next workout replaces them.
    expect(visibleLevelChanges([last, log('2026-10-29')], levels)).toEqual({ up: [], down: [] });
    // A level set again in Profile hides the notice.
    expect(visibleLevelChanges([last], levelsAt(3))).toEqual({ up: [], down: [] });
  });
});
