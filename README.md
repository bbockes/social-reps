# Social reps

A small mobile-friendly web app for practicing social interactions as you go about your day. Log each rep as you go, and track how many routes you complete each week.

## Run locally

`localStorage` needs a real origin (not `file://`):

```bash
cd /path/to/daily-reps
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## GitHub Pages

Push to `main`. With Pages enabled (GitHub Actions workflow in this repo), the app is served from `index.html` at your repo’s Pages URL.

## Files

- `index.html` — the app (HTML, CSS, JS, route data)
- `daily_reps_app.html` — earlier prototype (reference only)
