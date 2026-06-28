// Local Supabase credentials — copy to config.js OR config.local.js (both gitignored).
// Dashboard → Project Settings → API
//
//   cp config.example.js config.js
//
// Edit the copy with your URL and anon key. These files are never pushed to GitHub.
// For the live site, add SUPABASE_URL and SUPABASE_ANON_KEY as GitHub Actions secrets.
window.APP_CONFIG = Object.assign({}, window.APP_CONFIG || {}, {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY"
});
