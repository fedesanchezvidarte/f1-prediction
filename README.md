# F1 Prediction 🏎️

A fun, friendly Formula 1 prediction game built for competing with friends — **not** a gambling or betting platform.

Predict race podiums, sprint results, and season-long championships, earn points based on accuracy, and climb the leaderboard. The goal is simple: bragging rights among friends who love F1.

**Live app:** [f1-prediction.vercel.app](https://f1-prediction.vercel.app/)

## Features

- **Race Predictions** — Predict the top 10 finishers, fastest lap, pole position, and fastest pit stop for each Grand Prix.
- **Sprint Predictions** — Predict the top 8 finishers for sprint race weekends.
- **Championship Predictions** — Predict the World Drivers' Champion (WDC) and World Constructors' Champion (WCC) before the season begins.
- **Points & Scoring** — Earn points for correct picks with bonuses for perfect podiums and perfect top 10/8 predictions.
- **Leaderboard** — Live ranking of all participants with detailed and per-race views.
- **Achievements** — Unlock achievements based on your prediction performance.
- **Dashboard** — A bento-grid home page showing your points, upcoming race countdown, recent predictions, leaderboard snapshot, and achievements.
- **Dark / Light Mode** — Theme toggle with persistence.
- **Bilingual UI** — English and Spanish, switchable at runtime.
- **Admin Panel** — Manage race results (auto-fetch from OpenF1 or manual entry), trigger scoring, and recalculate achievements.

> This project is actively evolving — new features like additional prediction types, more achievements, and expanded stats are on the roadmap.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth & Database | [Supabase](https://supabase.com) |
| Data Source | [OpenF1 API](https://openf1.org) |
| Hosting | [Vercel](https://vercel.com) |
| Icons | [Lucide React](https://lucide.dev) |

## Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

You'll need a Supabase project. Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Project Structure

```
app/            → Pages and API routes (Next.js App Router)
components/     → Reusable UI components
lib/            → Business logic, scoring, Supabase clients
messages/       → i18n translation files (en, es)
types/          → Shared TypeScript types
public/         → Static assets
```

## Documentation

For an in-depth look at the architecture, data model, and features, see the [DeepWiki documentation](https://deepwiki.com/fedesanchezvidarte/f1-prediction).

## Disclaimer

This application is a **hobby project** made purely for fun among friends. It is **not** intended for gambling, betting, or any form of monetary exchange. No real money is involved — just friendly competition and love for the sport.
