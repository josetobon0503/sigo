# Sigo: project guide for Claude Code

> Read this whole file before every task. It is the source of truth for what we are building and how.
> Talk to Jose in **Spanish**. Write code, code comments, commit messages and the README in **English**.

## 1. What we are building

Sigo is a **free** mobile app (iPhone first, Android also) that helps adults 50+ exercise at home with no
equipment beyond a sturdy chair, a wall, water bottles and a towel.

Core idea:
1. The user tells the app **where it hurts** (body area + intensity).
2. Each day's workout **avoids or softens** exercises that load those areas while still training the rest of the body.
3. If an exercise hurts mid-workout, a big **"It hurts" / "Me duele"** button swaps it for a safer exercise with the
   **same movement goal**.
4. The user's profile **adapts over time**: difficulty goes up when things go well, down when there is pain.
5. Every exercise has a demo video in **3 chapters**: what it is for, how to do it, how NOT to do it.

Naming (use exactly these):
- Display name: **Sigo** in every language. Brand name is never translated.
- Code / technical name: slug `sigo`, repo `sigo`, scheme `sigo`.
- iOS bundle identifier and Android package: `com.josetobon.sigo`.
- Store subtitle, localized: ES "Ejercicio en casa para 50+" / EN "Home exercise for 50+".
- Tagline, localized: ES "Sigo, a mi ritmo." / EN "Keep going, your way."
- Meaning: "Sigo" = "I keep going" (first person, the user's voice). It reflects the core feature: when something hurts, you do not stop, the app gives you another exercise and you keep going.
- Note: the earlier design-course deliverables used the working names "VitalMove" and later "Muévete". Do not use either in the app.

Owner: Jose Tobon, solo developer, working on a **Windows PC (no Mac)**. This is both a portfolio project and a real
product for real users, starting with Spanish-speaking adults in Miami.

Primary persona: Maria, 52, works full time, knee and lower-back pain, Spanish is her first language, uses her iPhone
mostly for WhatsApp, small text is getting hard to read, trains in her living room with the phone propped up a few
feet away.
Secondary persona: Roberto, 72, retired, lower-back and shoulder pain, light dumbbells, daughter lives far away.

## 2. Non-negotiable rules

1. **Safety first.** Any report of chest pain, dizziness, shortness of breath, or *sharp* / *worst* pain stops the
   workout and shows the Safety screen (stop and rest, call 911 via `tel:911`, "I'm OK, keep going", "End workout").
   Never suggest a replacement exercise for a red-flag report.
2. **Wellness app, not a medical device.** In UI text, App Store copy and README, NEVER say: treat, cure, heal,
   therapy, rehab / rehabilitation, diagnose, prescribe, "manage arthritis" (or any named disease), "replaces your
   physical therapist". USE: "gentle exercise", "adapts to your discomfort", "move more comfortably", "stay active".
   A clear disclaimer is shown in onboarding and in Safety Tips: *Sigo is not medical advice. Talk to your doctor
   before starting a new exercise program.*
3. **Spanish and English from day one.** No hard-coded user-facing strings. Every string lives in
   `src/i18n/es.json` and `src/i18n/en.json`. Default language = device language (Spanish if `es-*`), changeable
   in onboarding and Profile.
4. **Accessibility for 50+.** Minimum tap target 44 pt (primary buttons 56 pt tall, "It hurts" button 64 pt).
   Body text 17 pt, never below 15 pt. Respect the system font size (allowFontScaling, layouts must not break at
   large sizes). Every interactive element has `accessibilityLabel` and `accessibilityRole`. Text contrast >= 4.5:1.
   No action that can only be done with a gesture (swipe, long press). Exception: native system pickers
   (such as the iOS time wheel) are allowed, because they work with VoiceOver and TalkBack.
5. **Local-first and private.** All data stays on the device. No accounts, no backend, no analytics SDK, no ad SDK
   in the MVP. Pain and health data must never be sent to any third party.
6. **Rules, not AI.** Workout generation, swapping and progression are **deterministic pure functions** in
   `src/engine/` with unit tests. No LLM calls inside the app.
7. **Expo Go compatible.** During the MVP, only use libraries that run in Expo Go (Jose tests on a real iPhone with
   Expo Go from Windows). Ask before adding any dependency that needs a custom native build.

## 3. Tech stack

- **Expo** (latest stable SDK) + **React Native** + **TypeScript** (`strict: true`)
- **Expo Router** for navigation (tabs + modal stacks)
- **Zustand** for state, persisted with `@react-native-async-storage/async-storage`
- **i18next + react-i18next + expo-localization** for Spanish/English
- **expo-video** for exercise videos, **expo-speech** for spoken guidance (on-device TTS),
  **expo-haptics**, **expo-notifications** (local reminders only), **expo-keep-awake** during workouts
- **Jest (jest-expo) + React Native Testing Library** for tests
- **ESLint + Prettier**
- Builds for the App Store later via **EAS Build** (cloud build, no Mac needed)

## 4. Folder structure

```
app/                      # Expo Router routes
  _layout.tsx
  onboarding/             # first-run flow
  (tabs)/
    _layout.tsx           # tabs: Today, Pain, Profile (Progress added in a later phase)
    index.tsx             # Today
    pain.tsx
    profile.tsx
  workout/                # modal stack: session, rest, finish
  hurt/                   # modal stack: it-hurts, safety, swap, preview
src/
  engine/                 # PURE logic, no React imports
    types.ts
    generator.ts          # builds today's workout
    swap.ts               # finds a replacement exercise
    progression.ts        # updates levels after a workout
    safety.ts             # red-flag rules and screening result
    __tests__/
  data/
    exercises.ts          # exercise library (typed)
  store/                  # Zustand stores (profile, pain, history, session)
  i18n/                   # i18n setup + es.json + en.json
  theme/                  # tokens.ts (colors, type, spacing)
  components/             # BigButton, Card, Chip, FacesScale, BodyMap, VideoChapters, etc.
assets/
  videos/                 # placeholders only; real videos are streamed later
```

## 5. Domain model (put these in `src/engine/types.ts`)

```ts
type Lang = 'es' | 'en';
type Localized = Record<Lang, string>;
type LocalizedList = Record<Lang, string[]>;

type BodyArea =
  | 'neck' | 'shoulder' | 'elbow' | 'wrist' | 'upper_back'
  | 'lower_back' | 'hip' | 'knee' | 'ankle' | 'foot';
type Side = 'left' | 'right' | 'both';

type Pattern =
  | 'squat'        // sit-to-stand, mini squats
  | 'hinge'        // hip hinge, bridges
  | 'upper_push'   // wall push-ups, bottle press
  | 'upper_pull'   // rows with bottle or towel
  | 'core'
  | 'balance'
  | 'mobility'     // warm-up and cool-down
  | 'calf';

type Position = 'seated' | 'standing_supported' | 'standing'; // NO floor exercises in the MVP
type Equipment = 'chair' | 'wall' | 'bottles' | 'towel' | 'light_dumbbells';

type Dosage =
  | { kind: 'reps'; sets: number; reps: number }
  | { kind: 'time'; sets: number; seconds: number };

interface Exercise {
  id: string;                 // kebab-case, e.g. 'chair-sit-to-stand'
  name: Localized;
  pattern: Pattern;
  position: Position;
  level: 1 | 2 | 3 | 4 | 5;   // 1 = gentlest
  loads: BodyArea[];          // joints meaningfully loaded by this exercise
  equipment: Equipment[];
  dosage: Dosage;
  purpose: Localized;         // "what it is for", one or two plain sentences
  steps: LocalizedList;       // "how to do it", 3-5 short steps
  mistakes: LocalizedList;    // "how NOT to do it", 2-3 common mistakes
  video: { purpose?: string; howTo?: string; mistakes?: string }; // asset ids / URLs, optional for now
  reviewedByProfessional: boolean; // false until a licensed physical therapist approves it
}

interface PainArea {
  area: BodyArea;
  side: Side;
  intensity: 1 | 2 | 3 | 4 | 5; // None, Mild, Some, Strong, Worst
  kind: 'achy' | 'sharp' | 'stiff';
  updatedAt: string;            // ISO date
}

type Feeling = 'great' | 'good' | 'ok' | 'tired' | 'sore';

interface UserProfile {
  name: string;
  language: Lang;
  ageBand: 'under-50' | '50-59' | '60-69' | '70-79' | '80+';
  equipment: Equipment[];
  levels: Record<Pattern, 1 | 2 | 3 | 4 | 5>;
  seatedOnly: boolean;          // true after a screening "yes" until the user changes it
  painAreas: PainArea[];
  avoided: { exerciseId: string; until: string }[]; // exercises that caused pain
  reminder: { enabled: boolean; hour: number; minute: number; days: number[] };
  screening: { completedAt: string; anyYes: boolean } | null;
}

interface WorkoutItem {
  exerciseId: string;
  completed: boolean;
  swappedFrom?: string;
  painReported?: { area: BodyArea; intensity: number; kind: PainArea['kind'] };
}

interface WorkoutLog {
  id: string;
  date: string;
  durationSec: number;
  items: WorkoutItem[];
  feeling?: Feeling;
}
```

## 6. Engine rules

### Blocked areas
An area is **blocked** if the profile has it with intensity >= 3, or kind = 'sharp'.
An area is **caution** if intensity = 2 (allowed, but prefer seated / supported variants).

### `generateWorkout(profile, library, history, date)`
- Target 15-25 minutes: 1-2 mobility warm-up + 5-6 main exercises + 1 mobility cool-down.
- Main block rotates patterns so that across a week every pattern is trained: always include `squat` or `hinge`,
  one of `upper_push` / `upper_pull`, `balance`, and one of `core` / `calf`.
- For each slot pick an exercise of the user's level for that pattern (or the closest lower level) that:
  does not load a blocked area, uses only equipment the user has, is not in `avoided` (until date not passed),
  respects `seatedOnly`, and was not used in the previous workout if an alternative exists.
- `balance` exercises at level <= 3 must be `standing_supported` or `seated`.
- If no exercise fits a slot, skip the slot (never break the rule to fill it). Return a list of skipped patterns
  so the UI can say "We skipped X today to protect your knee".
- Deterministic: same inputs = same output (use the date as seed if you need variety).

### `findSwap(current, report, profile, library, usedToday)`
- If `report.kind === 'sharp'` or `report.intensity >= 5` -> return `{ type: 'safety' }`. No swap.
- Candidates: same `pattern`, different id, does NOT load `report.area` or any blocked area, equipment available,
  `level <= current.level`, not in `avoided`, respects `seatedOnly`.
- Sort: same level first, then `seated` / `standing_supported` before `standing`, then not used today.
- If no candidate: try a `mobility` exercise that does not load the area. If still none -> `{ type: 'rest' }`.
- Return `{ type: 'swap', exercise, reasonKey }` where `reasonKey` is an i18n key for the one-sentence "why"
  (e.g. `swap.reason.seatedVersion`, `swap.reason.avoidsArea`).
- Side effects (done by the store, not the engine): add `current.id` to `avoided` for 14 days; add or raise the
  pain area in the profile.

### `updateLevels(profile, log, history)`
- For each pattern trained in `log`:
  - Any pain report on that pattern -> level - 1 (min 1).
  - Feeling `sore` in the last 2 workouts that included that pattern -> level - 1.
  - Feeling `great` or `good` and no pain on that pattern in the last 2 workouts that included it -> level + 1 (max 5).
  - Otherwise unchanged.
- Never move more than 1 level per workout.

### Safety and screening
- Onboarding asks a short readiness screening inspired by PAR-Q+ (heart condition, chest pain, dizziness / fainting,
  bone or joint problem made worse by activity, recent surgery, a fall in the last year, doctor said to limit
  activity). Mark the wording file as `NEEDS PROFESSIONAL REVIEW`.
- Any "yes" -> show "Please talk to your doctor before starting", set all levels to 1 and `seatedOnly = true`.
  The user may continue (it is their decision) and can change `seatedOnly` later in Profile.

## 7. Design system (from Jose's style guide)

Personality: calm, clear, encouraging.

| Token | Value | Use |
|---|---|---|
| primary | `#0B6E7A` | buttons, selected tabs, links |
| secondary | `#C2410C` | small highlights only |
| alert | `#D70015` | ONLY the "It hurts" button and safety screens |
| background | `#F2F2F7` | screen background (light) |
| card | `#FFFFFF` | cards |

Support dark mode with equivalent tokens. Type scale: largeTitle 34 bold, title 22 bold, body 17, caption 15
(minimum on screen). Side margins 16. Icons: `@expo/vector-icons` (Ionicons) as a cross-platform stand-in for SF
Symbols. Feeling and pain scales use five colored faces (green to red) **plus text labels** (never color alone).

## 8. Screens (MVP)

**Onboarding (first run):** Welcome + language -> Disclaimer -> Readiness screening -> Name and age band ->
Where does it hurt (body map + chips) -> How strong (faces 1-5) -> Equipment I have -> Reminder time -> Ready.

**Tabs:** Today | Pain | Profile.
- Today: workout summary (day, minutes, number of exercises), "Knee and lower back considered" pill,
  exercise list, Equipment needed, big Start Workout button, skipped-pattern note.
- Pain: body map, my painful areas (area, side, intensity), add / edit / remove.
- Profile: name, age band, equipment, language, reminders, seated-only switch, Safety Tips, About + disclaimer.

**Workout session (modal):** Exercise screen (video with 3 chapter buttons: What it's for / How to do it /
How NOT to do it, name, short steps, set x reps or timer, Done, big red It hurts) -> Rest (countdown, up next,
skip) -> ... -> Finish (summary + How do you feel faces).

**Distance mode:** a toggle on the exercise screen. Landscape-friendly, huge reps / timer, video large,
`expo-speech` announces the exercise, counts reps at a slow pace and announces "rest" and "next". Keep the screen
awake.

**It hurts flow (modal):** Where (chips, preselected with the areas the current exercise loads) + How strong +
"Is it sharp?" switch + red link "Chest pain or dizziness?" -> Safety screen OR Swap suggestion (new exercise +
one-sentence why, Swap and continue / Preview / Skip and rest) -> Preview (video + steps, Use this exercise).

## 9. Videos

- Each exercise has 3 short chapters: purpose, how-to, common mistakes.
- Videos are recorded once **without speech**. Language is added with subtitles and/or a separate narration track
  per language, so one video works for Spanish and English.
- MVP: if a video is missing, `VideoChapters` shows a placeholder card with the written purpose / steps / mistakes.
- Do NOT bundle large videos in the app. Later phase: stream from a CDN and cache on device.

## 10. Out of scope for the MVP (do not build unless Jose asks)

Ads, accounts / cloud sync, family sharing, voice commands, camera posture checks, Apple Health, payments,
social features.

**Ads policy for later:** the app is free. If ads are added later: never on workout, pain, safety or onboarding
screens; non-personalized ads only; no health data ever passed to an ad SDK; respect App Tracking Transparency.

## 11. How to work in this repo

- For any task that touches more than 2 files: show a short plan first and wait for Jose's OK.
- Work in small steps. After each step run: `npx tsc --noEmit`, `npm test`, `npm run lint`. Fix failures before
  saying you are done.
- Engine code is pure TypeScript with tests for every rule in section 6 (including edge cases: no candidates,
  sharp pain, all areas blocked, seatedOnly).
- Every new user-facing string goes in both `es.json` and `en.json`. Spanish should sound natural to a Latin
  American adult: warm "tú" form, short sentences, everyday words, no fitness jargon.
- When you finish a phase: update the **Status** section below, and suggest a commit message
  (Conventional Commits, e.g. `feat(engine): add swap rules`).
- Explain to Jose in Spanish what you did and how to test it on his iPhone with Expo Go.

## 12. Status

- [x] Phase 1: Project setup, theme, i18n, tabs skeleton (Expo SDK 58; tabs via `expo-router/js-tabs`)
- [x] Phase 2: Exercise library (37 exercises, ES/EN, not yet reviewed by a PT) + engine (generator, swap, progression, safety) with tests
- [x] Phase 3: Onboarding + profile store (Zustand + AsyncStorage, splash until loaded, all levels start at 1) + Profile screen
- [ ] Phase 4: Today screen + workout session (timer, rest, finish, feeling)
- [ ] Phase 5: It hurts flow (safety, swap, preview) + Pain tab
- [ ] Phase 6: Progression + Progress tab (history)
- [ ] Phase 7: Video chapters + distance mode with spoken guidance
- [ ] Phase 8: Reminders, accessibility pass, polish
- [ ] Phase 9: EAS build, TestFlight, privacy policy, App Store listing
