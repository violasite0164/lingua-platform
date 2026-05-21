'use strict';

/**
 * 透過 `node -r ./scripts/next-dev-prelude.cjs ... next dev` 在 Next 載入前處理
 * `.next/server/middleware-manifest.json`：
 * - 檔案不存在 → 寫入 v3 空骨架（避免 require MODULE_NOT_FOUND）
 * - 檔案存在但指向的 edge chunk 已在磁碟上缺失 → 重置為骨架，強制 Turbopack 重產（避免 ENOENT）
 *
 * 勿在每次啟動覆寫「仍有效的」Turbopack manifest，否則會抹掉 edge chunk 對照。
 *
 * 同時處理「本檔推算的專案根」與 `process.cwd()`。
 */

const fs = require('fs');
const path = require('path');

const skeleton = JSON.stringify(
  {
    version: 3,
    middleware: {},
    functions: {},
    pages: {},
    matchers: {},
  },
  null,
  2,
);

function middlewareManifestReferencesMissingChunks(projectRoot) {
  const mwPath = path.join(projectRoot, '.next', 'server', 'middleware-manifest.json');
  if (!fs.existsSync(mwPath)) return false;

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(mwPath, 'utf8'));
  } catch {
    return true;
  }

  const files = parsed.middleware?.['/']?.files;
  if (!Array.isArray(files) || files.length === 0) return false;

  const distDir = path.join(projectRoot, '.next');
  for (const rel of files) {
    if (typeof rel !== 'string') continue;
    const abs = path.join(distDir, rel);
    if (!fs.existsSync(abs)) return true;
  }
  return false;
}

function ensureMiddlewareManifest(projectRoot) {
  const serverDir = path.join(projectRoot, '.next', 'server');
  const mwPath = path.join(serverDir, 'middleware-manifest.json');

  const missingFile = !fs.existsSync(mwPath);
  const staleRefs = middlewareManifestReferencesMissingChunks(projectRoot);

  if (!missingFile && !staleRefs) return;

  try {
    fs.mkdirSync(serverDir, { recursive: true });
    fs.mkdirSync(path.join(serverDir, 'edge', 'chunks'), { recursive: true });
    fs.writeFileSync(mwPath, skeleton, 'utf8');
  } catch (err) {
    console.warn('[next-dev-prelude] middleware-manifest:', projectRoot, err && err.message);
  }
}

const roots = new Set([path.join(__dirname, '..'), process.cwd()]);

for (const root of roots) {
  ensureMiddlewareManifest(root);
}
