/**
 * Writes minimal .next/server skeleton files BEFORE `next dev` boots.
 * Next reads manifests synchronously at startup; Webpack may not have run yet.
 * Next overwrites these with real output once compilation finishes.
 *
 * `app-paths-manifest.json` 僅在缺檔時建立（避免覆寫實體 App Router 對照而導致 chunk ENOENT）。
 * `middleware-manifest.json` 僅在**缺檔**時建立（不覆寫 Turbopack 的 edge chunk 對照）。其餘內建 pages
 * 虛擬路由目錄下 JSON、以及 `static/development` 的 build manifest _seed 則**每次**寫入。
 *
 * Set NEXT_DEV_TURBOPACK=1 when using `next dev --turbopack`:
 * - Do not write the Webpack-only pages/_document.js stub.
 * - middleware-manifest.json：Next 15 dev server 會同步 require 此檔；缺檔會 MODULE_NOT_FOUND。
 *   仍寫入 version 3 空骨架（若缺），Next 編譯完成後會覆寫。勿在啟動前刪除此檔。
 *
 * Turbopack 仍會讀取內建 Pages 虛擬路由 `/_app`、`/_document`、`/_error` 目錄下的 per-route manifest
 *（next/dist/shared/lib/turbopack/manifest-loader.js → readPartialManifest）。
 * 在編譯空窗、`rm -rf .next` 後或登出觸發錯誤路徑時若缺檔會 ENOENT。
 *
 * Dev build id 為 `development`。`writeFileAtomic` 會在 `.next/static/development/` 下寫
 * `_buildManifest.js.tmp.<random>`；若父目錄不存在則 open 失敗 ENOENT。預先建立該目錄並在缺檔時
 * 寫入最小 `_buildManifest.js` / `_ssgManifest.js`（Next 編譯後會覆寫）。
 *
 * Turbopack：`server/pages/_document.js`、`_app.js`、`_error.js` 會 require
 * `chunks/ssr/[turbopack]_runtime.js`。若 chunks 被清空而這三個檔仍在，會 MODULE_NOT_FOUND。
 * 每次 **NEXT_DEV_TURBOPACK=1** 跑 prep 時刪除這三個頂層 bundle，強制下次 dev 重新編譯產出，
 * 不依賴「runtime 檔是否存在」的偵測（避免 race／不完整快取）。
 *
 * App Router：`readPartialManifest` 會讀 `server/app/<…>/page/app-build-manifest.json`（見
 * manifest-loader `getManifestPath`）。掃描 `app` 下各含 page 檔的路由並每跑必寫空 `pages` 物件，
 * 另補內建 `/_not-found/page`。
 *
 * 搭配 `scripts/next-dev-prelude.cjs`（`node -r`）：在 Next 進程最開始同步寫入
 * `middleware-manifest.json`，避免 `require('.next/server/middleware-manifest.json')` 早於 prep。
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const turbopack = process.env.NEXT_DEV_TURBOPACK === '1';

/** 專案根（指令檔所在目錄上一層），勿用 `process.cwd()` — IDE 可能在錯誤 cwd 下跑 npm/script。 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = join(root, '.next', 'server');
const pagesDir = join(serverDir, 'pages');
const staticDevDir = join(root, '.next', 'static', 'development');

mkdirSync(serverDir, { recursive: true });
mkdirSync(pagesDir, { recursive: true });
mkdirSync(join(serverDir, 'edge'), { recursive: true });
mkdirSync(staticDevDir, { recursive: true });

/**
 * Turbopack dev：刪除會綁定 `[turbopack]_runtime` 的 pages 根目錄 bundle，強制乾淨重編。
 */
function clearTurbopackPagesRootBundles(pagesDir) {
  if (!turbopack) return 0;
  let removed = 0;
  for (const name of ['_document.js', '_app.js', '_error.js']) {
    const p = join(pagesDir, name);
    if (!existsSync(p)) continue;
    try {
      unlinkSync(p);
      removed += 1;
    } catch {
      /* ignore */
    }
  }
  return removed;
}

let optionalCreated = 0;
const clearedTurbopackRootBundles = clearTurbopackPagesRootBundles(pagesDir);

/** Matches TurbopackManifestLoader.writeBuildManifest empty client shape (dev). */
const emptyClientBuildManifestJs =
  'self.__BUILD_MANIFEST = ' +
  JSON.stringify(
    {
      __rewrites: { beforeFiles: [], afterFiles: [], fallback: [] },
      sortedPages: [],
    },
    null,
    2,
  ) +
  ';self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()';

/** Same as next/dist/build/webpack/plugins/build-manifest-plugin `srcEmptySsgManifest`. */
const emptySsgManifestJs =
  'self.__SSG_MANIFEST=new Set;self.__SSG_MANIFEST_CB&&self.__SSG_MANIFEST_CB()';

const MIDDLEWARE_MANIFEST_SKELETON = {
  version: 3,
  middleware: {},
  functions: {},
  pages: {},
  matchers: {},
};

const staticDevSeeds = [
  ['_buildManifest.js', emptyClientBuildManifestJs],
  ['_ssgManifest.js', emptySsgManifestJs],
];
for (const [name, content] of staticDevSeeds) {
  writeFileSync(join(staticDevDir, name), content);
}

/** 僅缺檔時建立 — 勿覆寫 Turbopack 已寫入的 manifest（內含 edge chunk 路徑），否則可能與磁碟 chunk 不一致→ ENOENT。 */
const mwPath = join(serverDir, 'middleware-manifest.json');
if (!existsSync(mwPath)) {
  writeFileSync(mwPath, JSON.stringify(MIDDLEWARE_MANIFEST_SKELETON, null, 2));
}

mkdirSync(join(serverDir, 'edge', 'chunks'), { recursive: true });

writeVirtualPagesManifestStubs();

writeAppRouterPartialManifestStubs();

const createIfMissingOnly = {
  'app-paths-manifest.json': {},
  'pages-manifest.json': {},
  'next-font-manifest.json': { pages: {}, app: {} },
};

for (const [name, content] of Object.entries(createIfMissingOnly)) {
  const filePath = join(serverDir, name);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(content, null, 2));
    optionalCreated++;
  }
}

const docPath = join(pagesDir, '_document.js');
const docStub = `\
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
try {
  const d = require("next/dist/pages/_document");
  exports.default = d.default ?? d;
} catch {
  exports.default = function Document() { return null; };
}
`;

function isWebpackDocumentStub(p) {
  try {
    const s = readFileSync(p, 'utf8');
    return s.includes('next/dist/pages/_document') && s.length < 600;
  } catch {
    return false;
  }
}

if (turbopack) {
  if (existsSync(docPath) && isWebpackDocumentStub(docPath)) {
    try {
      unlinkSync(docPath);
      console.log('  ✓ prep-next: removed Webpack _document stub (Turbopack)');
    } catch {
      /* ignore */
    }
  }
} else if (!existsSync(docPath)) {
  writeFileSync(docPath, docStub);
  optionalCreated++;
}

/**
 * App Router：每個含 `page.tsx|ts` 的目錄對應 `server/app/…/page/app-build-manifest.json`。
 */
function writeAppRouterPartialManifestStubs() {
  const emptyAppBuild = JSON.stringify({ pages: {} }, null, 2);
  const appRoot = join(root, 'app');
  if (!existsSync(appRoot)) return;

  function seedRouteManifestDir(manifestDir) {
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(join(manifestDir, 'app-build-manifest.json'), emptyAppBuild);
  }

  function walk(dir, parts) {
    const entries = readdirSync(dir, { withFileTypes: true });
    const hasPage = ['page.tsx', 'page.ts', 'page.jsx', 'page.js'].some((f) =>
      existsSync(join(dir, f)),
    );
    if (hasPage) {
      seedRouteManifestDir(join(serverDir, 'app', ...parts, 'page'));
    }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      walk(join(dir, e.name), [...parts, e.name]);
    }
  }

  walk(appRoot, []);

  seedRouteManifestDir(join(serverDir, 'app', '_not-found', 'page'));
}

/**
 * 見檔案頂部說明。內建 pages 虛擬路由：每跑必寫四個 JSON。
 */
function writeVirtualPagesManifestStubs() {
  const virtual = [
    { dir: '_app', route: '/_app' },
    { dir: '_document', route: '/_document' },
    { dir: '_error', route: '/_error' },
  ];
  for (const { dir, route } of virtual) {
    const d = join(pagesDir, dir);
    mkdirSync(d, { recursive: true });
    const files = {
      'build-manifest.json': {
        pages: { [route]: [] },
        devFiles: [],
        ampDevFiles: [],
        polyfillFiles: [],
        lowPriorityFiles: [],
        rootMainFiles: [],
        ampFirstPages: [],
      },
      'pages-manifest.json': {},
      'client-build-manifest.json': { sortedPages: [] },
      'next-font-manifest.json': {
        app: {},
        appUsingSizeAdjust: false,
        pages: {},
        pagesUsingSizeAdjust: false,
      },
    };
    for (const [fn, content] of Object.entries(files)) {
      const p = join(d, fn);
      writeFileSync(p, JSON.stringify(content, null, 2));
    }
  }
}

const summaryParts = [
  'middleware if missing + App/pages stubs + static/development seeds',
];
if (clearedTurbopackRootBundles > 0) {
  summaryParts.push(
    `cleared ${clearedTurbopackRootBundles} Turbopack pages root bundle(s) (_document/_app/_error)`,
  );
}
if (optionalCreated > 0) summaryParts.push(`+${optionalCreated} optional file(s) created`);
console.log(`  ✓ prep-next: ${summaryParts.join('; ')}`);
