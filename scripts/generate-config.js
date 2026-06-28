"use strict";

const fs = require("fs");
const path = require("path");

function clean(value, field) {
  let v = String(value || "").trim();
  v = v.replace(new RegExp("^" + field + ":\\s*", "i"), "");
  v = v.replace(/^["']|["']$/g, "");
  v = v.replace(/[,;\s]+$/g, "");
  return v.trim();
}

function normalizeSupabaseUrl(raw) {
  let url = clean(raw, "supabaseUrl");
  url = url.replace(/^https:\/(?!\/)/i, "https://");
  url = url.replace(/^http:\/(?!\/)/i, "http://");
  try {
    return new URL(url).origin;
  } catch (_err) {
    return "";
  }
}

function normalizeAnonKey(raw) {
  return clean(raw, "supabaseAnonKey");
}

const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const key = normalizeAnonKey(process.env.SUPABASE_ANON_KEY);
const outPath = path.join(__dirname, "..", "app-config.js");

if (url && key && url.indexOf("YOUR_PROJECT") < 0) {
  const config = { supabaseUrl: url, supabaseAnonKey: key };
  fs.writeFileSync(outPath, "window.APP_CONFIG = " + JSON.stringify(config, null, 2) + ";\n");
  console.log("Wrote app-config.js for", url);
  process.exit(0);
}

fs.copyFileSync(path.join(__dirname, "..", "config.example.js"), outPath);
console.log("No Supabase secrets set — using placeholder app-config.js (offline mode)");
process.exit(0);
