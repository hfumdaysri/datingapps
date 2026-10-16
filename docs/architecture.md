# Architecture

## Data flow

```
Browser (Next.js client)  --fetch-->  Route handlers (/api/*, Zod)  --user JWT-->  Supabase RPC (SECURITY DEFINER)
        ^                                                                              |
        |  Realtime private Broadcast `space:<id>` ("session-updated", version only)   |
        +------------------------------ refetch viewer-safe state <--------------------+
```

- The database is the source of truth. All game mutations are Postgres functions that derive the caller from
  `auth.uid()` (never from the request body), lock the game row, and bump `state_version`.
- Clients get **projections** (`get_game_state`), never raw rows. Game tables have no client grants and no policies.
- Realtime messages carry only a version number. Clients always refetch; polling every 4s is the fallback.
- Presence is advisory (Online/Offline); it never gates gameplay.

## Access model

| Piece | Rule |
|---|---|
| Provisioning | `npm run setup -- provision` (CLI, needs `SETUP_SECRET`). `provision_space` refuses if a space exists. |
| Invites | 256-bit token, SHA-256 stored, 72h, single use, atomic redeem (`redeem_invite`). |
| Auth | Supabase Anonymous Auth; seat bound in `members.auth_user_id`. Binding is checked live on every query. |
| Recovery | Key `<memberId>.<secret>`; scrypt+pepper hash; rate limited; rotated on use; rebind revokes the old uid instantly. |
| Owner reset | `npm run setup -- invite --seat A|B` (CLI only, no web backdoor). |
| RLS | Enabled everywhere. `couple_spaces`/`members` readable by members only; everything else RPC-only. |

## State machines

- Date: `active -> finished`. `start_date` is idempotent (partial unique index: one active date per space).
- Game: `active <-> paused`, either `-> finished`. One open game per date (partial unique index).
- Conversation round: `pending -> question_selected -> completed | skipped`.
- Secret-vote round: `answering -> revealed -> completed | skipped`. Reveal happens in the same transaction as the second vote.
- Concurrency: `advance_round`/`select_option`/`pause_game` require `expected version`; the loser gets 409 `version_conflict`.
  `submit_choice` is serialised by the game row lock and is idempotent per member.

## API (all JSON, safe errors with stable `code`)

| Route | Notes |
|---|---|
| `GET /api/me` | member + space metadata |
| `POST /api/invites/redeem`, `/api/recovery/redeem` | rate limited; uniform failure responses |
| `GET /api/date/active`, `GET /api/date/:id`, `POST /api/date/start`, `/api/date/finish` | start is idempotent |
| `POST /api/games/start`, `GET /api/games/:id/state`, `POST /api/games/:id/{select,submit,next,pause,finish}` | |
| `GET /api/moments`, `POST /api/moments/{propose,approve}` | partner approval required before a moment is shared |
| `GET/POST /api/preferences` | last-used categories, persisted per space |
| `POST /api/games/:id/{answer,judge}` | know-me typed answers (private until both submit) and owner judgment (2/1/0) |
| `GET/POST /api/custom-questions`, `POST /api/custom-questions/remove` | couple-authored prompts |
| `POST /api/me/rename`, `POST /api/recovery/rotate` | rename self; new recovery key shown once |
| `GET /api/export`, `GET/POST /api/data-request` | JSON export; request/approve/decline deletion of shared data |

Status codes: 400 invalid, 401 unauthenticated, 403 not a member / not your turn, 404, 409 phase/version conflict or exhausted pool, 429.

## Known limitations

- No built-in video call, chat, or offline writes.
- Losing the recovery key means the owner must issue a new invite via the CLI.
- Anonymous auth is per browser: clearing storage or switching device requires the recovery key.
- Idempotency is version-based (409 on stale replays) instead of client-supplied idempotency keys.
- Category settings are edited on `/games` and `/settings`, not from the in-game pause menu.
- v0.2 shipped: Seberapa Kenal Aku? (answer text is deleted when the round ends), custom prompts, JSON export, delete-shared-data that needs the partner approval, recovery-key rotation, rename. Not built: Memory Lane, Never Have I Ever, scrapbook, date planner.
- Deleting shared data removes dates, games, history and moments; members, access and custom prompts remain.
