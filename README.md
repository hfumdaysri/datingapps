# datingapps (Our Little Space)

Private, browser-based date-night app for exactly two people. Conversation-first games for video calls
(WhatsApp/Meet/Discord): Truth or Truth, Deep Talk Cards, Would You Rather?, Who's More Likely To?

Stack: Next.js 15 (App Router) + strict TypeScript + Tailwind, Supabase (Postgres, Anonymous Auth, Realtime), Vercel.
See `docs/architecture.md` and `docs/manual-two-device-test.md`.

## Local setup

```bash
npm install
cp .env.example .env.local        # fill in values below
npm run migrate                   # applies supabase/migrations (needs SUPABASE_DB_URL)
npm run seed                      # 230 Indonesian prompts
npm run setup -- provision --secret <SETUP_SECRET> --name "<space>" --anniversary YYYY-MM-DD --a <NameA> --b <NameB> --base http://localhost:3000
npm run dev
```

Supabase: enable **Authentication -> Providers -> Anonymous Sign-ins**. Use a database connection string
(the pooler URL works on IPv4 networks) for `SUPABASE_DB_URL`.

| Variable | Scope |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser |
| `SUPABASE_SERVICE_ROLE_KEY`, `SETUP_SECRET`, `RECOVERY_PEPPER` | server only, never `NEXT_PUBLIC_` |
| `SUPABASE_DB_URL` | owner machine only (migrations) |

Provisioning prints two single-use invite links (72h). Re-issue one with `npm run setup -- invite --secret ... --seat A --base <url>`.
Do not change `RECOVERY_PEPPER` after launch: existing recovery keys would stop working.

## Checks

```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:integration   # needs `next dev -p 3100`; access/invite/recovery (A01-A03, A13-A15)
npm run test:games         # game engine + secrecy + concurrency (A04-A12, A16, A17, A19, A20)
```

The integration scripts create a temporary space and delete it afterwards; they refuse to run if a space already exists.

## Deploy (Vercel)

Set the five env vars above (not `SUPABASE_DB_URL`) in the Vercel project, deploy, then re-issue invites with
`--base https://<your-domain>`.

## Known limitations

No built-in video call, chat or offline writes; losing the recovery key needs an owner re-invite;
anonymous auth is per browser. See `docs/architecture.md`.
