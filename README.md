# Sigo

**Keep going, your way.** A free mobile app that helps adults 50+ stay active at home with gentle exercise,
using only a sturdy chair, a wall, water bottles and a towel.

Sigo ("I keep going" in Spanish) adapts to your discomfort:

1. You tell the app **where it hurts** and how much.
2. Each day's workout **avoids or softens** exercises that load those areas while still working the rest of the body.
3. If an exercise hurts mid-workout, a big **"It hurts"** button swaps it for a safer one with the same movement goal.
4. Difficulty goes up when things go well and down when there is discomfort.
5. Every exercise has a short demo in three chapters: what it is for, how to do it, and how NOT to do it.

Spanish and English from day one. Built for large text, big buttons and phones propped up across the living room.

> **Sigo is not medical advice.** Talk to your doctor before starting a new exercise program.

## Privacy

Everything stays on your device. No accounts, no backend, no analytics, no ads. Pain and health data are never sent
to any third party.

## Tech stack

- [Expo](https://expo.dev) + React Native + TypeScript (strict)
- Expo Router (tabs + modal stacks)
- i18next + react-i18next + expo-localization (Spanish / English)
- Zustand + AsyncStorage for local state (coming in Phase 3)
- Jest (jest-expo) + React Native Testing Library, ESLint, Prettier

Workout generation, exercise swaps and progression are **deterministic rules** (pure TypeScript functions with unit
tests), not AI.

## Getting started

Requirements: Node.js LTS and the **Expo Go** app on your phone (same Wi-Fi as your computer).

```bash
npm install
npx expo start          # scan the QR code with your phone camera (iOS) or Expo Go (Android)
npx expo start --tunnel # if your network blocks the connection
```

Scripts:

| Command             | What it does               |
| ------------------- | -------------------------- |
| `npm start`         | Start the Expo dev server  |
| `npm test`          | Run the Jest test suite    |
| `npm run lint`      | Lint with ESLint           |
| `npm run typecheck` | Type-check with TypeScript |
| `npm run format`    | Format with Prettier       |

## Project structure

```
app/                Expo Router routes (tabs: Today, Pain, Profile; modal stacks for workout and "It hurts")
src/engine/         pure rule engine: workout generator, swap, progression, safety (no React)
src/data/           exercise library
src/store/          Zustand stores
src/i18n/           i18n setup + es.json / en.json
src/theme/          design tokens (colors, type, spacing) with light and dark mode
src/components/     BigButton, Card, Chip, ScreenContainer, ...
```

## Status

Early development. Phase 1 (project setup, theme, i18n, tabs skeleton) is done. See `CLAUDE.md` for the full roadmap.

Exercises have not yet been reviewed by a licensed physical therapist.
