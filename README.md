# FitTrack — Fitness Tracker

A personal fitness tracker: log workouts, meals, and weigh-ins, set goals, and
watch your trends. Built as an installable PWA with a React front end and a
Firebase (Auth + Firestore) backend, so your data syncs across devices and the
app keeps working offline.

## Features

- **Dashboard** — today's calories vs. goal, protein and weekly-workout
  progress, current streak, latest weight, and a chronological list of the
  day's entries.
- **Workouts** — log exercises by type (weight, assistance, time, distance,
  bodyweight) with per-set reps and weights; autocomplete from past exercises,
  copy a previous day's workout, drag to reorder, and inline editing.
- **Nutrition** — log meals with calories and optional macros; saved-meal
  autocomplete for quick re-entry.
- **Weigh-ins** — quick entry with a 30-day trend sparkline and nudge buttons.
- **Analytics** — charts (via Recharts) for exercise progress, daily
  calories/protein, macro distribution, and weight over time, across selectable
  time ranges.
- **Goals** — a target weight with progress tracking, plus daily and weekly
  targets.
- **Settings** — light/dark theme, profile, goals, JSON data export/import, and
  data-clearing tools.
- **PWA** — installable, offline-capable, with an offline indicator.

## Tech stack

- **React 19** + **Vite 7**
- **Firebase** — Authentication (email/password + anonymous guest) and Cloud
  Firestore
- **Recharts** for data visualization
- **vite-plugin-pwa** (Workbox) for the service worker and manifest

## Getting started

### Prerequisites

- Node.js **20.19+** (or 22.12+)
- A Firebase project with **Authentication** (Email/Password and Anonymous
  providers enabled) and **Cloud Firestore** enabled

### Setup

```bash
npm install
```

Copy the environment template and fill in your Firebase web-app config
(Firebase console → Project settings → General → Your apps):

```bash
cp .env.example .env
```

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

> These `VITE_FIREBASE_*` values are the Firebase **web** config. They are not
> secrets — access is controlled by the Firestore security rules, not by hiding
> these keys.

### Run

```bash
npm run dev      # start the dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
npm run lint     # run ESLint
```

## Security rules

Access is enforced by [`firestore.rules`](firestore.rules): a signed-in user can
only read/write their own `users/{uid}/**` document tree, with lightweight
type/size validation on the documents the app writes. Deploy the rules with the
[Firebase CLI](https://firebase.google.com/docs/cli):

```bash
firebase deploy --only firestore:rules
```

## Deployment

The app deploys to **GitHub Pages** via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to
`master`. The Firebase config is injected at build time from repository secrets
(`VITE_FIREBASE_*`). The Vite `base` is set to `/fitness-tracker/` to match the
Pages path.
