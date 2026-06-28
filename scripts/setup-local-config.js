"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const examplePath = path.join(root, "config.example.js");
const localPath = path.join(root, "config.local.js");
const legacyPath = path.join(root, "config.js");

function hasRealConfig(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const text = fs.readFileSync(filePath, "utf8");
  return text.indexOf("YOUR_PROJECT") < 0 && /supabaseUrl/i.test(text);
}

if (hasRealConfig(localPath) || hasRealConfig(legacyPath)) {
  console.log("Local Supabase config already present.");
  if (hasRealConfig(legacyPath) && !hasRealConfig(localPath)) {
    console.log("Using config.js — that file is loaded by index.html.");
  } else if (hasRealConfig(localPath)) {
    console.log("Using config.local.js — that file is loaded by index.html.");
  }
  process.exit(0);
}

fs.copyFileSync(examplePath, localPath);
console.log("Created config.local.js from config.example.js");
console.log("Edit config.local.js with your Supabase URL and anon key, then reload the app.");
console.log("You can also use config.js instead — both are gitignored and never pushed.");
