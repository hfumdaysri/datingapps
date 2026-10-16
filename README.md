# datingapps (Our Little Space)

Private date-night app for two people. Source of truth: `OUR_LITTLE_SPACE_PRD.md` (in Downloads).

## Status

**Milestone 0 done**: Next.js (App Router) + strict TypeScript + Tailwind + shadcn-style UI, design tokens,
responsive shell (bottom nav on phone, top nav on desktop), demo pages, Supabase client scaffolding,
Asia/Jakarta calendar-day helper with tests. No auth, no multiplayer yet; pages run in demo mode.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in once Supabase project exists
npm run dev
```

Checks: `npm run lint && npm run typecheck && npm test && npm run build`

## Environment variables

| Name | Scope |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser |
| `SUPABASE_SERVICE_ROLE_KEY`, `SETUP_SECRET`, `RECOVERY_PEPPER` | server only |

## Next: Milestone 1

Needs a Supabase project (Anonymous Auth enabled) and the variables above: single-space provisioning,
one-time invites, recovery keys, RLS migrations.
