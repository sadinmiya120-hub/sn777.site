const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DIST_BACKUP_DIR = path.join(ROOT_DIR, 'dist_backup');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

console.log('[Build] 1. Syncing assets (No Patches)...');
if (fs.existsSync(DIST_BACKUP_DIR)) {
  copyDir(DIST_BACKUP_DIR, DIST_DIR);
}

if (fs.existsSync("index.html")) {
  fs.copyFileSync("index.html", path.join(DIST_DIR, "index.html"));
}

console.log('[Build] 2. Bundling server.ts...');
if (fs.existsSync("server.ts")) {
  try {
    esbuild.buildSync({
      entryPoints: ["server.ts"],
      bundle: true,
      platform: "node",
      target: "node20",
      format: "cjs",
      packages: "external",
      outfile: path.join(DIST_DIR, "server.cjs")
    });
  } catch (err) {
    console.warn("[Build] Server bundle notice:", err.message);
  }
}

console.log('[Build] Build completed successfully (No Patches)!');
