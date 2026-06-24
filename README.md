# Revido Project Tracker

Internal project activity tracker built for the Revido senior developer challenge. The app lets authenticated users manage shared work items, captures important activity automatically, shows a live activity timeline, and generates a short AI summary of recent project movement.

## Services

- `apps/web`: Next.js App Router frontend for auth, dashboard, work item CRUD, timeline, Realtime updates, and summary UI.
- `apps/api`: Hono API for server-side AI summary generation with Supabase service-role access and OpenRouter.

## Tech Stack

- Next.js, React, TypeScript, Tailwind CSS
- Hono, Node.js, TypeScript
- Supabase Auth, Postgres, RLS, Realtime
- OpenRouter for AI summaries

## Run Locally

Install dependencies from the repo root:

```bash
npm install
```

Create local env files from the examples:

- `apps/web/.env.example` -> `apps/web/.env.local`
- `apps/api/.env.example` -> `apps/api/.env`

Start both services in separate terminals:

```bash
npm run dev:web
npm run dev:api
```

Local URLs:

- Web: `http://localhost:3000`
- API health: `http://localhost:3001/health`

## Environment Variables

Web variables are documented in `apps/web/.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`

API variables are documented in `apps/api/.env.example`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `FRONTEND_URL`
- `PORT`

## Live Deployments

- Web: `<add Railway web URL>`
- API: `<add Railway API URL>`
