# Sigo: design spec (visual redesign)

> Source of truth for how Sigo looks. Read together with CLAUDE.md. Implements the approved mockups
> (5 screens: Hoy, Ejercicio, Descanso, Final, Progreso). UI copy stays in es.json / en.json.

## 1. Principles

1. **Readable at 2 meters.** The phone is propped up in the living room. Counters, timers and the
   current exercise name are huge; nothing important is smaller than 17 pt.
2. **Calm, clear, encouraging.** Soft neutral ground, white cards, one strong teal, a warm orange for
   achievements. Never guilt, never alarm except for real safety.
3. **Red means pain or safety, nothing else.** Only "Me duele", the Safety screen and the chest-pain link.
4. **No emoji.** Feeling and pain faces are drawn with react-native-svg (circle + eyes + mouth) plus a text label.
5. **Light and dark mode from day one**, following the system setting (`useColorScheme`). Every color comes
   from tokens; no hex values in screens.
6. Accessibility rules in CLAUDE.md §2.4 still apply (44 pt targets, font scaling, labels, contrast 4.5:1).

## 2. Typography

- Typeface: **Lexend** (designed for reading ease), regular 400 and bold 700, via
  `@expo-google-fonts/lexend` + `expo-font` (works in Expo Go). Keep the splash screen until fonts load.
  Fallback: system font. Replaced Atkinson Hyperlegible, whose slashed zero confused users. Lexend is a bit
  wider: layouts must never split a word (see section 7).
- Scale (pt): `display` 104 bold (reps counter) · `countdown` 68 bold · `largeTitle` 32 bold ·
  `title` 28 bold · `title2` 26 bold · `headline` 20 bold · `body` 18 · `callout` 17 · `caption` 15 (minimum).
- Big numbers use `maxFontSizeMultiplier` so they don't break layout; all other text scales freely.

## 3. Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| bg | #F3F5F4 | #0E1514 | screen background |
| surface | #FFFFFF | #172120 | cards, tab bar |
| surfaceMuted | #EEF1F0 | #1F2B2A | empty day dots, inactive segments |
| border | #E3E8E6 | #263433 | row dividers, tab bar top line |
| borderStrong | #C9D3D0 | #3A4B49 | outlined buttons, inactive dots |
| text | #13201F | #F1F5F4 | primary text |
| textSecondary | #4A5856 | #A9B8B5 | secondary text |
| primary | #0B6E7A | #3FB5C2 | main buttons, selected tab, progress |
| primaryPressed | #08525B | #6BC9D3 | pressed state, selected chip text (light) |
| onPrimary | #FFFFFF | #06272B | text/icons on primary |
| primarySoft | #E1F0F1 | #133A3F | selected chip bg, thumbnails, avatar |
| heroBg | #0B6E7A | #0B5560 | hero card background (darker teal in dark mode, no glare) |
| onHero | #FFFFFF | #FFFFFF | text/icons on heroBg and restBg |
| onHeroMuted | #CDE7EA | #B9DDE1 | secondary text on heroBg and restBg |
| inverseBg | #FFFFFF | #FFFFFF | inverse button / selected choice on heroBg and restBg |
| accent | #E07A2E | #F29A57 | level-up icon bg, streak flame, "raised this week" segment |
| onAccent | #13201F | #13201F | icons on accent (white on accent is under 3:1) |
| accentSoft | #FCEBDD | #3A2414 | level-up banner, streak card |
| onAccentSoft | #7A3A0C | #F7C9A3 | text on accentSoft |
| alert | #D70015 | #D70015 | ONLY Me duele / Safety |
| onAlert | #FFFFFF | #FFFFFF | text on alert |
| alertText | #D70015 | #FF6B6B | red text / icons on bg or surface, e.g. the chest-pain link (#D70015 is 3.1:1 on dark surface) |
| restBg | #0B6E7A | #0B5560 | full-screen rest background |
| restTrack | #2B8893 | #2B7A84 | countdown ring track |
| videoBg | #0E3B40 | #0A2A2E | video area behind the clip |
| bodyFill | #E6EBE9 | #2E3D3B | MuscleMap: muscles not worked |
| muscleSecondary | #F5B98A | #8A5A36 | MuscleMap: muscles that help (accentSoft disappears against bodyFill) |
| restCard | #FFFFFF | #08434B | "A continuación" card on restBg (dark: darker teal than restBg) |
| onRestCard | #13201F | #FFFFFF | text on restCard |
| onRestCardMuted | #4A5856 | #B9DDE1 | secondary text on restCard |
| restCardAccent | #0B6E7A | #6BC9D3 | highlighted text / icons on restCard (dark primary #3FB5C2 is 4.49:1) |

Faces (both modes): excelente #3E9B48 · bien #8CC152 · regular #F6C343 · cansancio #F08A3C · molestias #E5574F;
eyes and mouth #13201F.

Extend the existing contrast test so every text/background pair above passes 4.5:1 in BOTH modes
(3:1 allowed only for text ≥ 24 pt). If a pair fails, adjust the shade and update this table.

## 4. Spacing, radii, elevation

- Spacing scale: 4 · 8 · 12 · 16 · 20 · 24. Screen side padding 20. Gap between cards 14-16.
- Radii: card 20 · hero card 24 · primary/alert button 18 · secondary button 16 · chip 12 · pill 999 ·
  thumbnail 12 · avatar/round 50%.
- No shadows in dark mode; at most a very soft shadow on the hero card in light mode. No gradients.

## 5. Components (src/components/)

- **BigButton** variants: `primary` (primary bg, onPrimary text, 64 pt), `alert` (64 pt), `inverse`
  (#FFFFFF bg + heroBg-colored text in both modes, for use on heroBg or restBg), `outline` (borderStrong 2 pt), `text`
  (link style, 44 pt min). Icon left of label, 22-24 pt.
- **Card** (surface, radius 20, padding 16) and **HeroCard** (heroBg, onHero text, radius 24, padding 20).
- **Chip** (min 44-52 pt, radius 12; selected = primarySoft bg + primary 2 pt border + bold).
- **Pill** (radius 999, padding 6×12, 16 pt).
- **WeekStrip**: 7 columns L M M J V S D; trained day = filled primary circle 36 pt with check; today =
  primary 3 pt ring; other days = surfaceMuted circle. Each day has an accessibilityLabel.
- **StreakBadge**: flame icon + "4 semanas" in onAccentSoft.
- **LevelUpBanner**: accentSoft bg, round accent icon (arrow-up), bold text. Level-down uses the same
  shape with primarySoft and a neutral icon (never red).
- **ProgressSegments**: N equal segments 6 pt tall; done = primary, current = primary at ~55% opacity, rest = surfaceMuted.
- **SetDots**: 10 pt dots for "Serie 1 de 3".
- **CountdownRing** (react-native-svg): 232 pt, stroke 16, track restTrack, progress onHero, time
  in the center (countdown style) + "segundos".
- **FaceIcon** (react-native-svg): 48 pt, 5 variants above, decorative (always next to its label).
- **FacesScale**: vertical list of 5 big rows (FaceIcon 48 pt + label on the right, the whole row is the
  button, 64 pt min); selected = primary 2 pt border + primarySoft bg + bold label + check.
- **LevelBars**: label column (~132 pt) · 5 segments 12 pt tall · number. Segment raised this week = accent.
- **ExerciseRow**: 48 pt thumbnail (primarySoft placeholder until videos exist) · name (headline 18 bold) ·
  meta line ("Piernas · 3 × 10") in textSecondary · divider.
- **VideoBox**: 3 equal chapter tabs on top (Para qué sirve / Cómo hacerlo / Cómo NO hacerlo), "Cómo hacerlo"
  open first. Below, a 196 pt videoBg area with the silent clip in a loop (expo-video, starts by itself); on
  "Cómo NO hacerlo" an "Evita esto" badge (accent bg, onAccent text, never red) top left; a 72 pt MuscleMap on
  a surface chip bottom right, tappable to open it big in a modal. No clip: a Card with the numbered steps or
  the bulleted mistakes (plus the badge). "Para qué sirve" has no clip: purpose text, outline "Escuchar"
  button (expo-speech, user's language; "Parar" while speaking), MuscleMap 200 pt, "Trabaja: glúteos y
  abdomen" in bodyBold. Used on the exercise screen and the swap preview.
- **MuscleMap**: front and back figures side by side (react-native-body-highlighter on react-native-svg).
  Primary muscles accent, helpers muscleSecondary, the rest bodyFill, outline borderStrong; never red. Woman
  or man figure from Profile ("Figura del cuerpo", visual only). The drawing is hidden from screen readers;
  the label says the muscles ("Músculos que trabaja: glúteos, isquiotibiales y espalda baja"). The 3 tones
  differ by hue and lightness (an orange can't reach 3:1 against a gray on both sides), and the muscles are
  always also written. Built to be reused in phase 8 as the Pain tab map (the library has onBodyPartPress).
- **TabBar**: 4 tabs Hoy · Progreso · Dolor · Perfil, icon 26 pt + label 15 pt; active = primary + bold.

## 6. Screens

**Hoy**: date (callout, textSecondary) + "Hola, {nombre}" (largeTitle) + avatar initial (48 pt, primarySoft) →
Card "Esta semana: X de {meta}" with StreakBadge and WeekStrip → LevelUpBanner (only when there is a
change) → HeroCard: "Tu rutina de hoy" (onHeroMuted), routine name (title2), "23 min · 7 ejercicios ·
nivel 3", Pill with considered areas ("Atentos a tu rodilla izquierda"), inverse BigButton "Empezar" with
play icon → "Ejercicios de hoy" list of ExerciseRows grouped (Para calentar / Ejercicios / Ahora a la cama /
Para terminar). "¡Ya entrenaste hoy!" replaces the hero content with the same card shape + "Repetir la rutina".

**Ejercicio**: top row = outline "Salir" (with ×) + ProgressSegments + "Ejercicio 3 de 7" → chapter tabs +
VideoBox → name (title, centered) + "Serie 1 de 3" + SetDots → giant reps number (display) +
"repeticiones" (or a timer for timed sets) → text button "Está muy fácil" (arrow-up icon) → bottom,
fixed: primary "Hecho" (check) and alert "Me duele" (hand). The header must be opaque and never overlap
content when scrolling (current bug: the big number scrolls under the header).
Distance mode adds, under the counter: outline "Hecho", outline "Silenciar voz" / "Activar voz", and the
"Modo distancia" SwitchRow (always there, above "Está muy fácil"). The footer's primary button becomes
"Pausa" / "Seguir" (64 pt). Rep sets show the reps counted so far ("4" + "de 10"). In landscape: two columns
(VideoBox left, everything else right) and the footer's two buttons side by side, "Me duele" always visible.

**Descanso**: whole screen restBg, onHero text (onHeroMuted for secondary): "Descansa" (title) + "Respira con calma y toma
agua" → CountdownRing → "¿Cómo estuvo {ejercicio}?" with 3 equal choices (Muy fácil / Bien / Difícil;
selected = inverse fill) → restCard "A continuación · 4 de 7" with thumbnail, name, dosage → bottom
inverse button "Saltar descanso →".

**Final**: round primary check badge 88 pt → "¡Buen trabajo, {nombre}!" (title) → "Llevas 2 de 3
entrenamientos esta semana" → 3 stat tiles (ejercicios · minutos · semanas seguidas, the last in
accentSoft) → Card "¿Cómo te sientes?" with FacesScale (5 rows) + neutral labels (Excelente, Bien,
Regular, Con cansancio, Con molestias) → bottom primary "Volver a Hoy".

**Progreso**: "Tu progreso" → 2 tiles: weekly goal ring "2/3" + "Te falta 1" (goal reached: full ring with a
check, "¡Meta cumplida!" + "2 días esta semana", or "3 días esta semana (meta: 2)" past it; never "3 de 2") | streak tile in accentSoft
(+ "Tu mejor racha" when the current week can no longer be met) → Card "Tus niveles" (LevelBars, legend
"Naranja = subiste esta semana") → Card "Cómo te has sentido" (last 10, one row each: small face + word +
day) → Card "Tu dolor por zona" (keep the current content, restyled).

**All other screens** (onboarding, Dolor, Perfil, Me duele, Seguridad, Preview, Safety Tips): apply the
same tokens, typography and components; no layout redesign needed now. The body map keeps its current
layout with new colors; a proper body-map redesign is a later task.

## 7. Text never splits a word

- A word must never break in the middle, at the default text size or with large system text. Never shrink
  text below 15 pt to make it fit: change the layout instead.
- Side-by-side columns (Final tiles, rest choices, chapter tabs, Progreso tiles, LevelBars labels) use
  `columnsFit` (`src/theme/textFit.ts`): it estimates the longest word at the current `fontScale` and screen
  width. When it does not fit, the columns stack (one per row). Lists of words (feelings, faces) are always
  full-width rows.
- Tab bar labels are one word in a quarter of the screen: their font scale is capped so they never split.
- "Meta cumplida" (Hoy, Progreso, Final) as soon as the days trained reach the weekly goal.
