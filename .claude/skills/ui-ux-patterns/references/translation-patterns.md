# Translation Patterns

## File Structure

### `messages/en.ts` — Source of Truth

```typescript
const en = {
  // Domain-grouped keys
  navbar: {
    season: "Season 2026",
    openMenu: "Open menu",
    navigate: "Navigate to",
    // ...
  },
  nav: {
    dashboard: "Dashboard",
    predictions: "Predictions",
    leaderboard: "Leaderboard",
    achievements: "Achievements",
    profile: "Profile",
  },
  login: {
    title: "Welcome",
    subtitle: "Sign in to make your predictions",
    // ...
  },
  // Each domain/page gets its own section
  predictionsPage: {
    backToLeaderboard: "Back to Leaderboard",
    yourPredictions: "Your Predictions",
    top10: "Top 10",
    polePosition: "Pole Position",
    // ...
  },
};

// Export the type for es.ts to enforce
export type Messages = typeof en;
export default en;
```

### `messages/es.ts` — Type-Safe Translation

```typescript
import type { Messages } from "./en";

const es: Messages = {
  navbar: {
    season: "Temporada 2026",
    openMenu: "Abrir menú",
    navigate: "Navegar a",
    // ...
  },
  nav: {
    dashboard: "Inicio",
    predictions: "Predicciones",
    leaderboard: "Clasificación",
    achievements: "Logros",
    profile: "Perfil",
  },
  login: {
    title: "Bienvenido",
    subtitle: "Inicia sesión para hacer tus predicciones",
    // ...
  },
  predictionsPage: {
    backToLeaderboard: "Volver a Clasificación",
    yourPredictions: "Tus Predicciones",
    top10: "Top 10",
    polePosition: "Pole Position",
    // ...
  },
};

export default es;
```

**Key:** `es.ts` uses `Messages` type from `en.ts`. If you add a key to `en.ts` but not `es.ts`, TypeScript will error.

## Adding New Translation Keys

### Step-by-Step

1. **Choose the domain section** — group keys by the page or component domain:
   - `navbar`, `nav`, `login`, `register`, `forgotPassword`
   - `userPoints`, `nextRace`, `predictionsCard`, `leaderboardCard`
   - `predictionsPage`, `leaderboardPage`, `achievementsPage`, `profilePage`
   - `admin`, `pointSystem`, `achievementsCard`

2. **Add to `messages/en.ts`:**
   ```typescript
   featureName: {
     title: "My Feature",
     description: "Description of the feature",
     submitButton: "Submit",
     successMessage: "Successfully saved!",
   },
   ```

3. **Add to `messages/es.ts`** (same keys, Spanish values):
   ```typescript
   featureName: {
     title: "Mi Función",
     description: "Descripción de la función",
     submitButton: "Enviar",
     successMessage: "¡Guardado exitosamente!",
   },
   ```

4. **Use in component:**
   ```typescript
   const { t } = useLanguage();
   return <h1>{t('featureName.title')}</h1>;
   ```

## Bilingual ARIA Labels

ARIA attributes must also use translations:

```typescript
const { t } = useLanguage();

<button aria-label={t('predictions.submitPrediction')}>
  {t('predictions.submit')}
</button>

<img
  src={driver.headshotUrl}
  alt={t('predictions.driverPhoto').replace('{name}', driver.firstName)}
/>

<nav aria-label={t('navbar.navigate')}>
  {/* nav items */}
</nav>
```

## Key Naming Conventions

- **Flat within domain:** `predictionsPage.title`, not `predictions.page.title`
- **Action verbs for buttons:** `submitPrediction`, `saveName`, `sendResetLink`
- **State descriptions:** `submitted`, `scored`, `pending`, `locked`, `unlocked`
- **No interpolation in keys:** Use `.replace()` in the component for dynamic values
- **Consistent casing:** camelCase for all keys

## Common Translation Patterns

### Plurals / Counts
```typescript
// en.ts
players: "players",
// Component
<span>{count} {t('leaderboardPage.players')}</span>
```

### Dynamic Values
```typescript
// en.ts  
rank: "Rank",
// Component
<span>{t('userPoints.rank')}: #{user.rank}</span>
```

### Conditional Text
```typescript
// en.ts
submitted: "Submitted",
pending: "Pending",
// Component
<span>{prediction.status === 'submitted' ? t('predictionsCard.submitted') : t('predictionsCard.pending')}</span>
```
