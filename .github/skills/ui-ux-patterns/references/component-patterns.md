# Component Patterns

## Server Component Page (Data Fetching + Auth)

```typescript
// app/leaderboard/page.tsx — Server Component
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LeaderboardContent from "@/components/leaderboard/LeaderboardContent";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: leaderboard } = await supabase
    .from("leaderboard")
    .select("*")
    .order("rank", { ascending: true });

  return <LeaderboardContent entries={leaderboard || []} currentUserId={user.id} />;
}
```

**Key points:**
- No `'use client'` directive — this is a Server Component
- Auth check with `getUser()` and redirect
- Data fetching happens on the server
- Passes data as props to a Client Component for interactivity

## Client Component with Hooks

```typescript
// components/leaderboard/LeaderboardContent.tsx
'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types';

interface LeaderboardContentProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

export default function LeaderboardContent({ entries, currentUserId }: LeaderboardContentProps) {
  const { t } = useLanguage();
  const [view, setView] = useState<'simple' | 'detailed'>('simple');

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t('leaderboardPage.title')}</h1>

      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('simple')}
          className={cn(
            "px-4 py-2 rounded-lg font-medium",
            view === 'simple'
              ? "bg-[#CF2637] text-white"
              : "bg-gray-100 text-gray-600"
          )}
        >
          {t('leaderboardPage.simple')}
        </button>
        <button
          onClick={() => setView('detailed')}
          className={cn(
            "px-4 py-2 rounded-lg font-medium",
            view === 'detailed'
              ? "bg-[#CF2637] text-white"
              : "bg-gray-100 text-gray-600"
          )}
        >
          {t('leaderboardPage.detailed')}
        </button>
      </div>

      {/* Leaderboard table */}
      <table className="w-full">
        <caption className="sr-only">{t('leaderboardPage.title')}</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="text-left p-2">#</th>
            <th scope="col" className="text-left p-2">{t('leaderboardPage.player')}</th>
            <th scope="col" className="text-right p-2">{t('leaderboardCard.pts')}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.userId}
              className={cn(
                "border-b",
                entry.userId === currentUserId && "bg-[#CF2637]/10 font-semibold"
              )}
            >
              <td className="p-2">{entry.rank}</td>
              <td className="p-2">{entry.displayName}</td>
              <td className="p-2 text-right">{entry.totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Key points:**
- `'use client'` at the top — needed for `useState` and event handlers
- `useLanguage()` hook for all user-visible strings
- `cn()` for conditional Tailwind classes
- Typed props interface
- Semantic HTML (`<table>`, `<th scope>`, `<caption>`)

## Shared UI Component (Reusable)

```typescript
// components/ui/Card.tsx
'use client';

import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl shadow-md p-6",
        onClick && "cursor-pointer hover:shadow-lg transition-shadow",
        className
      )}
    >
      {children}
    </Component>
  );
}
```

## Dashboard Card Pattern

```typescript
// components/dashboard/PointsCard.tsx
'use client';

import { useLanguage } from '@/components/providers/LanguageProvider';

interface PointsCardProps {
  points: number;
  rank: number;
}

export function PointsCard({ points, rank }: PointsCardProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {t('userPoints.yourPoints')}
      </h3>
      <p className="text-3xl font-bold text-[#CF2637] mt-1">{points}</p>
      <p className="text-sm text-gray-500 mt-2">
        {t('userPoints.rank')}: #{rank}
      </p>
    </div>
  );
}
```

## Existing Component Exemplars

| Component | Pattern | File |
|---|---|---|
| Leaderboard page | Server Component → Client Component | `app/leaderboard/page.tsx` → `components/leaderboard/LeaderboardContent.tsx` |
| Predictions page | Server Component → Client Component | `app/race-prediction/page.tsx` → `components/predictions/RacePredictionContent.tsx` |
| Dashboard cards | Client Components with `useLanguage` | `components/dashboard/*.tsx` |
| Admin panel | Client Component with admin features | `components/admin/AdminPanel.tsx` |
| Auth pages | Server Components with form Client | `app/login/page.tsx`, `app/register/page.tsx` |
