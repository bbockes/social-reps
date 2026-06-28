"use strict";

const fs = require("fs");
const path = require("path");

function clean(value, field) {
  let v = String(value || "").trim();
  v = v.replace(new RegExp("^" + field + ":\\s*", "i"), "");
  v = v.replace(/^["']|["']$/g, "");
  return v.trim();
}

const url = clean(process.env.SUPABASE_URL, "supabaseUrl");
const key = clean(process.env.SUPABASE_ANON_KEY, "supabaseAnonKey");
const outPath = path.join(__dirname, "..", "config.js");

if (url && key && url.indexOf("YOUR_PROJECT") < 0) {
  const config = { supabaseUrl: url, supabaseAnonKey: key };
  fs.writeFileSync(outPath, "window.APP_CONFIG = " + JSON.stringify(config, null, 2) + ";\n");
  console.log("Wrote config.js for", url);
  process.exit(0);
}

fs.copyFileSync(path.join(__dirname, "..", "config.example.js"), outPath);
console.log("No Supabase secrets set — using config.example.js (offline mode)");
process.exit(0);
