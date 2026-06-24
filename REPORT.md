# Revido Challenge Report

## Stack and AI Tool Used

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, `@supabase/ssr`, `@supabase/supabase-js`
- Backend: Hono on Node.js, TypeScript, `@supabase/supabase-js`
- Database and auth: Supabase Auth, Postgres, Row Level Security, Realtime
- AI provider: OpenRouter chat completions
- AI model path: primary `meta-llama/llama-3.3-70b-instruct:free`, fallback `openai/gpt-oss-20b:free`
- AI tool used during development: Codex

## What Was Built

- Password-based sign-up and sign-in with Supabase Auth.
- Protected dashboard routes and sign-out.
- Shared workspace work item CRUD: create, list, edit, and delete.
- Status and priority badges with typed status/priority values.
- Owner display using user id to email resolution.
- Automatic activity capture through a Postgres trigger.
- Activity timeline with joined work item titles.
- Supabase Realtime timeline updates for new activity events.
- Hono `POST /summary` endpoint that queries recent activity and asks OpenRouter for a short operational summary.
- Frontend `Generate Summary` button with loading, success, and error states.
- Railway preparation files: env examples, API Nixpacks config, standalone Next output, and production API start script.

## What Was Cut and Why

- Timeline filters by user, item, or event type were cut because the brief did not require them and the core timeline needed to stay simple.
- Structured JSON output from the LLM was cut because the current UI only needs a short paragraph and JSON parsing would add failure modes.
- Title and description activity capture was not added because the brief focused on creation, status, priority, and owner changes.
- Multi-workspace support was not added because the brief defines one shared workspace for all authenticated users.
- Full admin/user management was not added because Supabase Auth covers basic users and the challenge scope is project activity tracking.

## Activity Capture Choice

Activity capture is handled with a Postgres trigger on `work_items`, not in application code.

The main reason is correctness. Creates and updates should produce activity no matter which surface changes the row: the Next.js UI, an API route, a future worker, a seed script, or manual admin tooling. A trigger keeps the audit behavior close to the data and avoids requiring every mutation path to remember to write an `activity_events` row.

The tradeoff is that the behavior is less visible from the app code. Debugging requires checking the database trigger function and table rows, not only React or Hono code. It also means changing which fields are captured requires a database migration rather than a simple frontend/backend patch. For an activity tracker, that is a good tradeoff because missed audit records are worse than the extra database-level complexity.

## Key Decisions and Turning Points

- The app was moved to `apps/web/src/app` so the `@/*` alias could point consistently at `src`.
- Auth stayed password-only; no magic links were added.
- The work item list uses a server component for initial data and a client component for mutation interactivity.
- The timeline uses a server component for the initial query and a client component for Realtime updates.
- Realtime insert payloads do not include joined `work_items(title)`, so the client fetches the inserted event by id after receiving the realtime notification.
- OpenRouter’s requested Llama free model returned provider/rate-limit errors during testing, so the API keeps that model as primary and falls back to `openai/gpt-oss-20b:free`.
- The production API start script was changed to `node dist/index.js`, and the API package was marked as ESM because TypeScript emits ES module imports.
- `next/font/google` was removed from the root layout because production builds should not depend on fetching Google Fonts.

## Architecture Notes

The monorepo has two services:

- `apps/web`: Next.js App Router frontend.
- `apps/api`: Hono backend for AI summary generation.

Next.js talks directly to Supabase for auth, work item CRUD, server-rendered reads, and Realtime subscriptions. Server-side Supabase helpers live in `apps/web/src/lib/supabase/server.ts`, browser helpers live in `apps/web/src/lib/supabase/client.ts`, and shared app types live in `apps/web/src/lib/supabase/types.ts`.

The Hono API owns the AI summary endpoint because it needs server-only secrets: `SUPABASE_SERVICE_ROLE_KEY` and `OPENROUTER_API_KEY`. The web app calls it through `NEXT_PUBLIC_API_URL`, currently at `POST /summary`.

The dashboard routes are:

- `apps/web/src/app/dashboard/page.tsx`: server fetch for work items.
- `apps/web/src/components/WorkItemsClient.tsx`: create, edit, delete, local UI state.
- `apps/web/src/app/dashboard/timeline/page.tsx`: server fetch for initial timeline events.
- `apps/web/src/components/TimelineClient.tsx`: live Realtime subscription and rendering.
- `apps/web/src/components/GenerateSummaryButton.tsx`: calls the Hono summary endpoint.

## AI Prompt Design

The summary prompt in `apps/api/src/index.ts` is:

```text
Summarize the last 24 hours of project activity for a team lead.

Extract signal, not a list of events. Highlight what got done, anything blocked or urgent, capacity concerns, and patterns worth flagging to a team lead.

Write one short, direct paragraph in 3-5 sentences. Do not use bullet points.

Activity events:
${eventLines}
```

The system message is:

```text
You write concise operational summaries for software team leads.
```

The prompt asks for signal instead of a raw list because the value of the AI feature is not restating the timeline. It should compress the last 24 hours into a short team-lead summary: completed work, urgent or blocked items, ownership/capacity hints, and patterns worth flagging.

## AI Usage Notes

Codex was useful for wiring repetitive implementation details quickly: Supabase client utilities, typed React forms, Hono route structure, deployment config, and focused verification scripts. It also helped catch integration problems that were easy to miss, such as `next/font/google` causing production build network failures and the need for ESM support in the compiled API start script.

Codex also got things wrong or needed correction in a few places. It initially treated a bare or malformed Supabase URL as a runtime surprise instead of validating the env shape earlier. It also tried to verify the OpenRouter summary call with real workspace data, which was blocked because that would send private activity data to an external provider. Finally, the initial Realtime implementation had to account for the fact that realtime payloads do not include joined table data.

## What I Would Do Next With Another Full Day

- Add a seed script with realistic work items and activity data.
- Add Playwright tests for auth, CRUD, timeline, Realtime, and summary generation.
- Add timeline filters by user, item, event type, and date range.
- Add a durable `summaries` table so generated summaries can be saved and reviewed later.
- Improve the AI prompt to return structured JSON with fields like `completed`, `blocked`, `urgent`, and `capacity_risk`.
- Add stall detection for items that stay blocked or in progress too long.
- Replace the `get_user_emails` fallback assumptions with a documented SQL RPC migration.
- Add better production observability for Hono errors and OpenRouter failures.
