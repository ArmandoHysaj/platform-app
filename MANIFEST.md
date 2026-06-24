# Revido Challenge Manifest

Feature 1 — Auth & User Setup
Status: Built
Lives in: apps/web/src/app/(auth)/, apps/web/src/lib/supabase/
What works: Password sign-in and sign-up, session persistence, protected routes, sign-out
What's missing: Nothing — fully implemented

Feature 2 — Workspace Data Model
Status: Built
Lives in: Supabase schema (work_items, activity_events tables)
What works: Single shared workspace, all authenticated users see all items and activity
What's missing: Nothing — fully implemented

Feature 3 — Work Item CRUD
Status: Built
Lives in: apps/web/src/app/dashboard/page.tsx, apps/web/src/components/WorkItemsClient.tsx
What works: Create, list, edit, delete with status/priority badges and owner display
What's missing: Nothing — fully implemented

Feature 4 — Automatic Activity Capture
Status: Built
Lives in: Supabase Postgres trigger (record_activity_event function)
What works: Captures creation, status changes, priority changes, owner changes automatically
What's missing: Title/description change capture (out of scope per brief)

Feature 5 — Activity Timeline
Status: Built
Lives in: apps/web/src/app/dashboard/timeline/page.tsx, apps/web/src/components/TimelineClient.tsx
What works: Reverse chronological list, human-readable event formatting, user email display
What's missing: Filtering by user/item/type (stretch — not attempted)

Feature 6 — AI Activity Summary
Status: Built
Lives in: apps/api/src/index.ts (POST /summary), apps/web/src/components/GenerateSummaryButton.tsx
What works: Hono queries Supabase, builds prompt, calls OpenRouter, returns signal-focused summary. Fallback model if primary is rate-limited.
What's missing: Nothing — fully implemented and verified in production

Feature 7 — Realtime Collaboration
Status: Built
Lives in: apps/web/src/components/TimelineClient.tsx
What works: Supabase Realtime channel on activity_events, new events prepend live without refresh
What's missing: Nothing — fully implemented

Feature 8 — Rich AI Prompts
Status: Partial
Lives in: apps/api/src/index.ts
What works: Prompt extracts signal — highlights completions, blockers, priority changes, capacity concerns
What's missing: Grouping by priority, stall detection, structured JSON output from LLM
