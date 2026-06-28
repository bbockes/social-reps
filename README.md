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

### 2. Configure the app

```bash
cp config.example.js config.js
```

Edit `config.js` with your Supabase URL and anon key.

`config.js` is gitignored — do not commit it.

### 3. Run and sign up

Reload the app. You'll see a sign-in screen. Create an account to sync your reps and routes.

On first sign-in, any reps/routes already in your browser are copied to your account.

## GitHub Pages

Push to `main`. With Pages enabled (GitHub Actions workflow in this repo), the app is served from `index.html` at your repo's Pages URL.

For cloud sync on Pages, add two secrets on the **github-pages** environment (Settings → Environments → github-pages → Environment secrets):

- `SUPABASE_URL` — just the URL, e.g. `https://xxxx.supabase.co`
- `SUPABASE_ANON_KEY` — just the key string, e.g. `eyJ...` or `sb_publishable_...` (do **not** paste the whole `supabaseAnonKey: "..."` line from `config.js`)

The deploy workflow writes these into `config.js` at build time. After pushing to `main` or re-running **Deploy GitHub Pages**, check `https://<user>.github.io/social-reps/config.js` — it should be valid JavaScript with your URL and key.

## Files

- `index.html` — the app (HTML, CSS, JS)
- `js/cloud.js` — Supabase auth & sync
- `config.example.js` — copy to `config.js` for cloud setup
- `supabase/schema.sql` — database tables & row-level security
