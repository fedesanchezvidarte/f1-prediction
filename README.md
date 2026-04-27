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

The codebase follows a strict layered architecture: pages and API routes delegate to a `lib/` layer split between pure functions (scoring, utilities) and service functions (Supabase I/O), with all UI text routed through a bilingual i18n system.

## Documentation

For an in-depth look at the architecture, data model, and features, see the [DeepWiki documentation](https://deepwiki.com/fedesanchezvidarte/f1-prediction).

## Disclaimer

This application is a **hobby project** made purely for fun among friends. It is **not** intended for gambling, betting, or any form of monetary exchange. No real money is involved — just friendly competition and love for the sport.
