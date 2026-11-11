---
name: api-patterns
description: "API route handler patterns for F1 Prediction: Next.js App Router route handlers, auth guards, input validation, admin-only routes, and error responses. Use when implementing or modifying files in app/api/."
---

# API Patterns Skill

## Thin Handler Principle

Every API route handler follows the same flow:

```
1. Authenticate  → createClient() → supabase.auth.getUser() → 401 if no user
2. Authorize     → isAdminUser(user) for admin routes → 403 if not admin
3. Validate      → parse and validate request body → 400 for bad input
4. Delegate      → call lib/ function with validated data
5. Respond       → NextResponse.json({ ... }, { status: N })
```

**Business logic never lives in a route handler.** The handler is a pipeline: auth → validate → delegate → respond.

## Auth Guard Pattern

```typescript
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... proceed with authorized user
}
```

**Critical:** Always use `getUser()`, never `getSession()`. `getUser()` re-validates with the Supabase server; `getSession()` only reads the local JWT.

## Admin Guard Pattern

```typescript
import { isAdminUser } from "@f1/shared/lib/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ... proceed with admin user
}
```

## Input Validation Pattern

```typescript
// Parse body with error handling for malformed JSON
let body;
try {
  body = await request.json();
} catch {
  return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
}

// Validate required fields
const { raceId, top10, polePosition } = body;
if (!raceId || typeof raceId !== "number") {
  return NextResponse.json({ error: "raceId is required and must be a number" }, { status: 400 });
}
```

## Response Format

```typescript
// Success
return NextResponse.json({ scored: result.count }, { status: 200 });
return NextResponse.json({ created: prediction.id }, { status: 201 });

// Error
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
return NextResponse.json({ error: "Forbidden" }, { status: 403 });
return NextResponse.json({ error: "raceId is required" }, { status: 400 });
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
```

## When to Load Reference Files

- **Creating a new route handler file** → read `references/route-handler-patterns.md` for full annotated examples

## File Naming Convention

Routes live under `apps/web/app/api/` and follow Next.js App Router conventions. Keep paths flat: `{domain}/{action}`. They are the shared backend for the web app and the mobile app.

```
apps/web/app/api/
  predictions/{submit,reset}
  results/{manual,score,score-all,reset}
  results/champion/{manual,score,reset}
  races/update-datetime
  achievements/calculate
  admin/{drivers,lineup}
  cron/keep-alive
```

Admin helpers come from `@f1/shared/lib/admin`; server client from `@/lib/supabase/server`.

## Error Handling in Handlers

```typescript
try {
  const result = await serviceFunction(supabase, validatedInput);
  return NextResponse.json(result, { status: 200 });
} catch (error) {
  console.error("Operation failed:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

## Adding a New API Route

### Checklist

1. Create `app/api/{domain}/{action}/route.ts`
2. Add auth guard (getUser → 401)
3. Add admin guard if admin-only (isAdminUser → 403)
4. Parse and validate request body (try/catch for JSON, field validation → 400)
5. Call lib/ function with validated input
6. Return typed response
7. Add test in `apps/web/__tests__/api/{domain}-{action}.test.ts` covering 401, 400, 200 (and 403 for admin routes)

## Anti-Patterns

- Business logic (scoring, achievement calculation) inside a route handler.
- `supabase.auth.getSession()` for server-side auth — always `getUser()`.
- Calling `request.json()` without try/catch.
- Returning internal error details (DB messages, stack traces) to the client — log them, return a generic message.
- Forgetting the admin guard on admin-only routes.
