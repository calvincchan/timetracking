# Deploying to Production

This guide covers deploying a clean, working instance of Timetracking using **Supabase Cloud** (database + auth) and **Vercel** (frontend). Alternative paths for Cloudflare Pages and self-hosting are included at the end.

---

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- [Vercel CLI](https://vercel.com/docs/cli) installed (or use the Vercel dashboard)
- A [Supabase](https://supabase.com) account (free tier is sufficient)
- A [Vercel](https://vercel.com) account (free hobby tier is sufficient)
- A [Resend](https://resend.com) account for transactional email (free tier: 3,000 emails/month)

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Choose a name, region, and database password. Save the password — you won't see it again.
3. Wait for the project to finish provisioning (~1 min).
4. In **Project Settings → API**, copy:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon public** key

---

## Step 2 — Apply migrations

Link your local CLI to the remote project and push all migrations:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies all migrations in `supabase/migrations/` in order, creating tables, RLS policies, helper functions, and the auth hook.

---

## Step 3 — Register the custom access token hook

> This step is required. Without it, the `user_role` claim is absent from JWTs and the app silently shows empty data for all users.

1. Open your project dashboard → **Authentication → Hooks**
2. Under **Custom Access Token**, click **Enable hook**
3. Set the URI to:
   ```
   pg-functions://postgres/public/custom_access_token_hook
   ```
4. Save

---

## Step 4 — Configure email (Resend)

Supabase's built-in SMTP is rate-limited to 4 emails/hour — unsuitable for production.

1. Create a free account at [resend.com](https://resend.com) and verify your sending domain
2. In Supabase dashboard → **Authentication → SMTP Settings**, enable custom SMTP and enter:
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend`
   - **Password**: your Resend API key
   - **Sender email**: `noreply@yourdomain.com`
3. Save

---

## Step 5 — Deploy the frontend to Vercel

### Option A — One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/timetracking&root-directory=frontend&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY&envDescription=Supabase%20project%20URL%20and%20anon%20key%20from%20Project%20Settings%20%E2%86%92%20API)

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` when prompted.

### Option B — Manual deploy

```bash
cd frontend
cp .env.example .env
# Edit .env with your Supabase URL and anon key
vercel --prod
```

Set the root directory to `frontend` in the Vercel project settings.

---

## Step 6 — First sign-in

1. Open your deployed app URL
2. Enter your email and sign in — the first user is automatically promoted to **Supervisor**
3. From the Supervisor dashboard, invite team members by email

---

## Alternative: Cloudflare Pages

1. Connect your repo in the [Cloudflare Pages dashboard](https://dash.cloudflare.com)
2. Set **Build command**: `npm run build`
3. Set **Build output directory**: `dist`
4. Set **Root directory**: `frontend`
5. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables
6. Add a `_redirects` file in `frontend/public/`:
   ```
   /* /index.html 200
   ```

---

## Alternative: Self-hosted (Docker)

A `Dockerfile` is included at the repo root for self-hosting on any VPS (Fly.io, Railway, DigitalOcean, etc.).

```bash
docker build -t timetracking .
docker run -p 3000:3000 \
  -e VITE_SUPABASE_URL=https://your-project.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=your-anon-key \
  timetracking
```

For the Supabase backend, use the official [self-hosted Supabase Docker Compose](https://supabase.com/docs/guides/self-hosting/docker) setup.

---

## Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL from Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key from Project Settings → API |
