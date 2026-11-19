/* global process, console */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { build as esbuild } from 'esbuild';

const rootDir = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version || '1.0.0';
const bundleName = `pulse-lab-v${version}-portable`;
const releaseRoot = path.join(rootDir, 'release');
const stageDir = path.join(releaseRoot, bundleName);
const zipPath = path.join(releaseRoot, `${bundleName}.zip`);

console.log(`[Package] Building PULSE LAB portable release v${version}...`);

// 1. Clean staging directory
fs.rmSync(stageDir, { recursive: true, force: true });
fs.rmSync(zipPath, { force: true });
fs.mkdirSync(path.join(stageDir, 'data'), { recursive: true });

// 2. Build frontend (tsc -b && vite build)
console.log('[Package] 1/5 Building frontend (dist/)...');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npmCmd, ['run', 'build'], { cwd: rootDir, stdio: 'inherit', shell: process.platform === 'win32' });

// 3. Bundle backend server into a single ESM file (zero node_modules required at runtime)
console.log('[Package] 2/5 Bundling backend server (server.mjs)...');
await esbuild({
  entryPoints: [path.join(rootDir, 'server', 'index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['node:*'],
  outfile: path.join(stageDir, 'server.mjs'),
  logLevel: 'info',
});

// 4. Copy dist/ and checkpointed data/ssd_benchmark.db
console.log('[Package] 3/5 Copying dist/ and checkpointing data/ssd_benchmark.db...');
fs.cpSync(path.join(rootDir, 'dist'), path.join(stageDir, 'dist'), { recursive: true });

const srcDb = path.join(rootDir, 'data', 'ssd_benchmark.db');
const dstDb = path.join(stageDir, 'data', 'ssd_benchmark.db');
fs.copyFileSync(srcDb, dstDb);
for (const suffix of ['-wal', '-shm']) {
  if (fs.existsSync(srcDb + suffix)) {
    fs.copyFileSync(srcDb + suffix, dstDb + suffix);
  }
}
const db = new DatabaseSync(dstDb);
db.exec('PRAGMA busy_timeout = 3000; PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;');
db.close();
for (const suffix of ['-wal', '-shm']) {
  fs.rmSync(dstDb + suffix, { force: true });
}

// 5. Write cross-platform launcher & one-click scripts
console.log('[Package] 4/5 Writing one-click launcher and documentation...');

const launcherCode = `import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

function checkNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 5)) {
    console.error(\`[PULSE LAB] Node.js >= 22.5.0 is required (current: \${process.versions.node}).\`);
    console.error('Download Node.js 24 LTS from: https://nodejs.org/');
    process.exit(1);
  }
}

function getOrCreateSecret() {
  if (process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length >= 32) {
    return process.env.BETTER_AUTH_SECRET;
  }
  const dataDir = path.join(__dirname, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const secretFile = path.join(dataDir, '.auth_secret');
  if (fs.existsSync(secretFile)) {
    const existing = fs.readFileSync(secretFile, 'utf-8').trim();
    if (existing.length >= 32) return existing;
  }
  const generated = crypto.randomBytes(32).toString('base64url');
  fs.writeFileSync(secretFile, generated, { mode: 0o600 });
  return generated;
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function pickPort(preferred) {
  for (let p = preferred; p < preferred + 20; p++) {
    if (await isPortFree(p)) return p;
  }
  return preferred;
}

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error(\`Server returned HTTP \${res.statusCode}\`));
        } else {
          setTimeout(probe, 250);
        }
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Timed out waiting for PULSE LAB server to start'));
        } else {
          setTimeout(probe, 250);
        }
      });
    };
    probe();
  });
}

function openBrowser(url) {
  if (process.env.NO_OPEN === '1') return;
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
}

checkNodeVersion();

const preferredPort = Number(process.env.API_PORT || process.env.PORT || 3001);
const port = await pickPort(preferredPort);
const url = \`http://localhost:\${port}\`;
const secret = getOrCreateSecret();

const env = {
  ...process.env,
  NODE_ENV: 'production',
  API_PORT: String(port),
  BETTER_AUTH_SECRET: secret,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || url,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@pulselab.io',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@123456',
};

console.log('============================================================');
console.log('  PULSE LAB - SSD Telemetry & Visualization Platform');
console.log('============================================================');
console.log(\`  URL:      \${url}\`);
console.log(\`  Admin:    \${env.ADMIN_EMAIL} / \${env.ADMIN_PASSWORD}\`);
console.log('  Press Ctrl+C to stop the server.');
console.log('============================================================');

const child = spawn(process.execPath, [path.join(__dirname, 'server.mjs')], {
  cwd: __dirname,
  env,
  stdio: 'inherit',
});

const shutdown = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

try {
  await waitForServer(\`\${url}/api/auth/get-session\`);
  openBrowser(url);
} catch (err) {
  console.warn('[PULSE LAB] Auto-open skipped:', err?.message || err);
}
`;

fs.writeFileSync(path.join(stageDir, 'launcher.mjs'), launcherCode, 'utf-8');

const batContent = `@echo off
chcp 65001 >nul
title PULSE LAB - SSD Telemetry Platform
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo Please install Node.js 22.5+ ^(Node.js 24 LTS recommended^) from:
  echo   https://nodejs.org/
  echo.
  pause
  exit /b 1
)

node "%~dp0launcher.mjs"
if errorlevel 1 (
  echo.
  echo [ERROR] PULSE LAB exited unexpectedly.
  pause
)
`;

fs.writeFileSync(path.join(stageDir, '一键启动.bat'), batContent, 'utf-8');
fs.writeFileSync(path.join(stageDir, 'start.bat'), batContent, 'utf-8');

const shContent = `#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is required (>= 22.5.0, Node.js 24 LTS recommended)."
  echo "Download from https://nodejs.org/"
  exit 1
fi

exec node "./launcher.mjs"
`;
const shPath = path.join(stageDir, 'start.sh');
fs.writeFileSync(shPath, shContent, 'utf-8');
if (process.platform !== 'win32') {
  fs.chmodSync(shPath, 0o755);
}

const readmeContent = `PULSE LAB v${version} — Portable One-Click Package
====================================================

1. Requirements
   - Node.js >= 22.5.0 (Node.js 24 LTS recommended, uses built-in node:sqlite)
   - No npm install or C++ build tools required.

2. Quick Start
   - Windows: Double-click "一键启动.bat" (or "start.bat")
   - macOS / Linux: Run "./start.sh" (or "node launcher.mjs")

   The launcher will automatically:
   - Generate a persistent BETTER_AUTH_SECRET in data/.auth_secret on first launch
   - Start the Hono + Better Auth + SQLite server (default http://localhost:3001)
   - Open your default web browser to the dashboard

3. Default First-Run Admin Account
   - Email:    admin@pulselab.io
   - Password: Admin@123456
   (You can change or add users in the Admin panel after signing in.)

4. Optional Environment Variables
   - API_PORT=3001        Change listening port (auto-increments if 3001 is busy)
   - NO_OPEN=1            Disable auto-opening browser
   - ADMIN_EMAIL=...      Override initial admin email on first boot
   - ADMIN_PASSWORD=...   Override initial admin password on first boot
`;
fs.writeFileSync(path.join(stageDir, 'README.txt'), readmeContent, 'utf-8');

// 6. Compress into release/<bundleName>.zip
console.log(`[Package] 5/5 Creating archive ${path.relative(rootDir, zipPath)}...`);
if (process.platform === 'win32') {
  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path '${stageDir}' -DestinationPath '${zipPath}' -CompressionLevel Optimal -Force`,
    ],
    { stdio: 'inherit' }
  );
} else {
  execFileSync('zip', ['-r', '-q', zipPath, bundleName], { cwd: releaseRoot, stdio: 'inherit' });
}

const sizeMB = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
console.log(`[Package] Done! Created ${zipPath} (${sizeMB} MB)`);
