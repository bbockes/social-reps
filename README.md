# Social reps

A small mobile-friendly web app for practicing social interactions as you go about your day. Log each rep as you go, and track how many routes you complete each week.

## Run locally

`localStorage` needs a real origin (not `file://`):

```bash
cd /path/to/social-reps
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

Without cloud setup, the app works offline with data stored in your browser only.

## Accounts & cloud sync (optional)

Sign in to save your profile, custom reps, routes, and daily progress across devices.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In **SQL Editor**, run the schema in [`supabase/schema.sql`](supabase/schema.sql).
3. In **Authentication → Providers**, enable **Email** (enabled by default).
4. In **Project Settings → API**, copy your **Project URL** and **anon public** key.

### 2. Configure locally

```bash
cp config.example.js config.js
# or: cp config.example.js config.local.js
```

Edit that file with your Supabase URL and anon key.

**Important:** `config.js` and `config.local.js` are gitignored on purpose — they must **never** be committed or pushed. That is normal. Pushing code does not deploy your Supabase keys; the live site reads them from GitHub Actions secrets (below).

Reload the app locally. You should see the profile icon in the top-right of the home screen.

### 3. Run and sign up

Reload the app. You'll see a sign-in screen. Create an account to sync your reps and routes.

On first sign-in, any reps/routes already in your browser are copied to your account.

## GitHub Pages

Push to `main`. The site is live at your repo's Pages URL.

**Supabase config on the live site:** `app-config.js` in the repo contains your Supabase URL and anon (publishable) key. That key is meant to be public in the browser — it is restricted by Row Level Security, not by hiding it.

If you use **Deploy from a branch** (Settings → Pages → Source → main / root), that committed `app-config.js` is what gets published. Push any change to `app-config.js` to update the live site.

If you switch Pages source to **GitHub Actions** instead, the deploy workflow can inject secrets at build time (Settings → Environments → github-pages → `SUPABASE_URL`, `SUPABASE_ANON_KEY`). Either approach works.

Check: `https://bbockes.github.io/social-reps/app-config.js` should show your Supabase URL — not `YOUR_PROJECT`. Then hard-refresh the app and the profile icon should appear.

**Locally**, gitignored `config.js` or `config.local.js` overrides `app-config.js`. Those files are never pushed — that is normal.

## Files

- `index.html` — the app (HTML, CSS, JS)
- `js/cloud.js` — Supabase auth & sync
- `app-config.js` — Supabase config for the live site (and local fallback)
- `config.example.js` — copy to `config.js` or `config.local.js` for local cloud setup
- `supabase/schema.sql` — database tables & row-level security
