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

Push to `main`. With Pages enabled (GitHub Actions workflow in this repo), the app is served from `index.html` at your repo's Pages URL.

The deploy workflow injects secrets into `app-config.js` at build time. If secrets are missing, the deploy **fails**.

1. Add secrets (Settings → Secrets and variables → Actions, or Environments → github-pages):
   - `SUPABASE_URL` — e.g. `https://xxxx.supabase.co` (include `https://`)
   - `SUPABASE_ANON_KEY` — the anon / publishable key string only

2. Set Pages source to **GitHub Actions**: Settings → Pages → Build and deployment → Source → **GitHub Actions** (not “Deploy from a branch”). If this is wrong, deploys succeed but the live site keeps serving placeholder `app-config.js` and the profile icon stays hidden.

3. Push to `main` or re-run **Deploy GitHub Pages** in the Actions tab.

Check: `https://bbockes.github.io/social-reps/app-config.js` should show JSON with your URL — not `YOUR_PROJECT`.

Locally, gitignored `config.js` or `config.local.js` overrides `app-config.js`.

## Files

- `index.html` — the app (HTML, CSS, JS)
- `js/cloud.js` — Supabase auth & sync
- `app-config.js` — Supabase config (placeholders in git; CI overwrites on deploy)
- `config.example.js` — copy to `config.js` or `config.local.js` for local cloud setup
- `supabase/schema.sql` — database tables & row-level security
