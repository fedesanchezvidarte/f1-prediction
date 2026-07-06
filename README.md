# F1 Prediction 🏎️

A fun, friendly Formula 1 prediction game built for competing with friends — **not** a gambling or betting platform.

Predict race podiums, sprint results, and season-long championships, earn points based on accuracy, and climb the leaderboard. The goal is simple: bragging rights among friends who love F1.

**Live app:** [f1-prediction.vercel.app](https://f1-prediction.vercel.app/)

## Purpose

F1 Prediction is a hobby project that turns every Grand Prix weekend into a friendly competition. Players forecast race outcomes, sprint results, and championship winners; the app scores predictions against the official results and tracks who's the sharpest tipster across the season. It exists to make watching F1 with friends more engaging — no money, no stakes, just bragging rights.

## Features

- **Race Predictions** — Top 10 finishers, fastest lap, pole position, and fastest pit stop for each Grand Prix.
- **Sprint Predictions** — Top 8 finishers for sprint weekends.
- **Championship Predictions** — Pre-season picks for the World Drivers' Champion (WDC) and World Constructors' Champion (WCC).
- **Points & Scoring** — Accuracy-based scoring with bonuses for perfect podiums and perfect top 10/8 predictions.
- **Leaderboard** — Live ranking of all participants with detailed and per-race views.
- **Achievements** — Unlockable milestones based on prediction performance.
- **Dashboard** — A bento-grid home page with points, upcoming race countdown, recent predictions, leaderboard snapshot, and achievements.
- **Bilingual UI** — English and Spanish, switchable at runtime.
- **Admin Panel** — Manage race results (auto-fetch from OpenF1 or manual entry), trigger scoring, and recalculate achievements.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router, React Server Components) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth & Database | [Supabase](https://supabase.com) (Postgres with RLS) |
| Data Source | [OpenF1 API](https://openf1.org) for official race results |
| Hosting | [Vercel](https://vercel.com) |
| Icons | [Lucide React](https://lucide.dev) |

The codebase is an npm-workspaces **monorepo**: the Next.js app lives in `apps/web`, and all framework-agnostic business logic (scoring, achievements, types, translations) lives in `packages/shared` so it can be reused by the upcoming React Native mobile app. It follows a strict layered architecture: pages and API routes delegate to shared pure functions (scoring, utilities) and service functions (Supabase I/O), with all UI text routed through a bilingual i18n system.

## Getting Started

```bash
git clone https://github.com/fedesanchezvidarte/f1-prediction.git
cd f1-prediction
npm install
```

Create `apps/web/.env.local` (copy from `apps/web/.env.example`) with your Supabase project's publishable values:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are in your [Supabase dashboard](https://supabase.com/dashboard) under **Settings → API**. They are publishable (safe for the browser); data access is protected by Row Level Security.

Then run from the repo root:

```bash
npm run dev              # dev server at http://localhost:3000
npm test                 # Jest test suite
npm run lint             # ESLint
npm run typecheck        # TypeScript
```

## Documentation

For an in-depth look at the architecture, data model, and features, see the [DeepWiki documentation](https://deepwiki.com/fedesanchezvidarte/f1-prediction).

## Disclaimer

This application is a **hobby project** made purely for fun among friends. It is **not** intended for gambling, betting, or any form of monetary exchange. No real money is involved — just friendly competition and love for the sport.
