# Timetracking

Open-source team time-tracking app. Built with Refine v5, Supabase, and shadcn/ui.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/timetracking&root-directory=frontend&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY&envDescription=Supabase%20project%20URL%20and%20anon%20key%20from%20Project%20Settings%20%E2%86%92%20API)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **Deploying to production?** See [DEPLOYING.md](./DEPLOYING.md) for Supabase Cloud setup, SMTP config, and Vercel/Cloudflare/Docker hosting options.

---

## Prerequisites

- **Node.js** ≥ 20
- **Docker** (required by Supabase CLI for local development)
- **Supabase CLI** — install via npm or Homebrew:
  ```bash
  npm install -g supabase
  # or
  brew install supabase/tap/supabase
  ```
- **GitHub CLI** (`gh`) — for issue/PR workflows

---

## Local Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url> timetracking
cd timetracking
cd frontend && npm install && cd ..
```

### 2. Start Supabase locally

```bash
npx supabase start
```

This starts a local Supabase stack (Postgres, Auth, Storage, Studio). On first run it pulls Docker images — takes a few minutes.

When it finishes, it prints local credentials including `API URL`, `anon key`, and `service_role key`. Keep these handy.

### 3. Apply migrations

```bash
npx supabase migration up --local
```

Runs all migrations in `supabase/migrations/` in order, creating all tables, RLS policies, and helper functions (including `custom_access_token_hook`).

### 4. Refresh generated files

```bash
bash db-refresh.sh
```

Regenerates `supabase/schema.sql` and `frontend/src/types/database.ts` from the live local DB. Run this after every migration.

### 5. Register the custom access token hook

> **This is a manual step in the Supabase dashboard — it cannot be automated via migration.**

1. Open the local Supabase Studio at [http://localhost:54323](http://localhost:54323)
2. Navigate to **Authentication → Hooks**
3. Under **Custom Access Token**, click **Enable hook**
4. Set the URI to:
   ```
   pg-functions://postgres/public/custom_access_token_hook
   ```
5. Save

**What breaks if you skip this step:** The `user_role` claim will be absent from the JWT. Every RLS policy calls `has_role_permission()`, which reads `user_role` from the JWT. Without the claim, `has_role_permission()` returns `false` for all users on all tables — every query returns zero rows or is rejected. No error is shown; the app silently shows empty data. Login succeeds but the app appears broken.

### 6. Configure the frontend environment

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env` and fill in the values printed by `npx supabase start`:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase start output>
```

### 7. Start the frontend

```bash
cd frontend
npm run dev
```

App runs at [http://localhost:5173](http://localhost:5173).

---

## Development Commands

| Command | Location | Description |
|---|---|---|
| `npx supabase start` | repo root | Start local Supabase stack |
| `npx supabase migration up --local` | repo root | Apply pending migrations |
| `bash db-refresh.sh` | repo root | Regenerate schema.sql and TypeScript types |
| `npm run dev` | `frontend/` | Start Vite dev server |
| `npm run type-check` | `frontend/` | TypeScript check (zero errors required before commit) |
| `npm run lint` | `frontend/` | ESLint check (zero errors required before commit) |
| `npm run build` | `frontend/` | Full build (required before push) |
| `npx supabase db reset --local` | repo root | Reset DB and re-apply all migrations from scratch |

---

## Invite & Login Flow

1. A Supervisor creates an invite (email + role) from the app.
2. The invited user receives a magic link email with a one-time password (OTP).
3. The user enters the OTP in the sign-in form.
4. A database trigger (`handle_new_user`) creates a `profiles` row with the correct role and full name from the invite, then deletes the invite.
5. The session JWT contains a `user_role` claim (injected by `custom_access_token_hook`) — this is what drives all RLS policy checks.

> **`enable_confirmations` must be `true`** in `supabase/config.toml` under `[auth.email]` (already set correctly in this repo). If it is `false`, GoTrue auto-confirms new users the moment they are created, so the `handle_new_user` trigger fires and deletes the invite row before the Supervisor ever sees it in the list. The invite disappears immediately and the invites table appears empty.

---

## Project Structure

```
timetracking/
├── frontend/          # Refine v5 + shadcn/ui app
├── supabase/
│   ├── migrations/    # SQL migrations (apply in order)
│   └── config.toml    # Local Supabase config
├── docs/
│   ├── architecture/  # Schema, RLS, flows, roles
│   └── prd/           # Feature PRDs
├── db-refresh.sh      # Regenerate schema.sql + TypeScript types
└── CONTEXT.md         # Domain glossary
```
