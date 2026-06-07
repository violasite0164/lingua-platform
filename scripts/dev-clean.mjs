/**
 * dev:clean — 清 .next、prep、啟動 next dev，並印出各步驟進度（避免看起來卡在 npm 那一行）。
 */
import { execSync, spawn } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

function log(msg) {
  console.log(msg);
}

function killPort3000() {
  try {
    execSync('lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null', {
      stdio: 'ignore',
      shell: true,
    });
  } catch {
    /* ignore */
  }
}

log('→ 停止佔用 3000 的舊程序…');
killPort3000();

log('→ 刪除 .next …');
if (existsSync('.next')) {
  rmSync('.next', { recursive: true, force: true, maxRetries: 3 });
}
log('  ✓ .next 已清除');

log('→ patch-next-write-atomic …');
execSync('node scripts/patch-next-write-atomic.mjs', { stdio: 'inherit' });

// Webpack dev 略過 prep-next（App Router 骨架會阻止 page.js）；Turbopack 用 dev:clean:turbo
log('→ prep-next …');
if (process.env.NEXT_DEV_TURBOPACK === '1') {
  execSync('node scripts/prep-next.mjs', { stdio: 'inherit' });
} else {
  log('  ✓ 略過 prep-next（Webpack；_document 由 next-dev-prelude 補）');
}

log('');
log('→ 啟動 next dev（首次編譯常需 1–3 分鐘，請等出現 ✓ Ready）');
log('');

const child = spawn(
  process.execPath,
  ['-r', './scripts/next-dev-prelude.cjs', 'node_modules/next/dist/bin/next', 'dev'],
  {
    stdio: 'inherit',
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    cwd: root,
  },
);

child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
