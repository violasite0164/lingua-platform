/**
 * Dev-only: Next sometimes clears `.next/server` mid-compile; readers then ENOENT.
 * Fill missing manifest stubs — never overwrite existing files (would wipe routes).
 *
 * `_document.js` Webpack stub must NOT be used with Turbopack (breaks
 * `[turbopack]_runtime.js` resolution).
 *
 * Empty `middleware-manifest.json` from prep-next breaks Turbopack ("Cannot find
 * the middleware module") — remove that skeleton under Turbopack; never recreate it.
 *
 * Turbopack 仍會讀 `.next/server/pages/_app|_error/*.json`（內建 Pages 虛擬路由）；
 * 若缺 `build-manifest.json` 等會 ENOENT — 與 `scripts/prep-next.mjs` 同步補齊。
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

let devPollingStarted = false;

export function isNextDevTurbopack(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.argv.some((a) => a === '--turbopack' || a === '--turbo')
  );
}

/** prep-next empty middleware manifest (conflicts with Turbopack). */
function isPrepNextMiddlewareSkeleton(filePath: string): boolean {
  try {
    const j = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    if (j.version !== 3 || typeof j.middleware !== 'object' || j.middleware === null) return false;
    if (Object.keys(j.middleware as object).length !== 0) return false;
    if (typeof j.functions !== 'object' || j.functions === null) return false;
    if (Object.keys(j.functions as object).length !== 0) return false;
    if (typeof j.pages !== 'object' || j.pages === null) return false;
    if (Object.keys(j.pages as object).length !== 0) return false;
    return true;
  } catch {
    return false;
  }
}

function isWebpackDocumentStub(filePath: string): boolean {
  try {
    const s = readFileSync(filePath, 'utf8');
    return s.includes('next/dist/pages/_document') && s.length < 600;
  } catch {
    return false;
  }
}

/** App-only 專案仍會用到 Turbopack 內建的 pages `/_app`、`/_error` manifest 路徑 */
function writeVirtualPagesManifestStubs(pagesDir: string): void {
  const virtual = [
    { dir: '_app', route: '/_app' as const },
    { dir: '_error', route: '/_error' as const },
  ];
  for (const { dir, route } of virtual) {
    const d = join(pagesDir, dir);
    mkdirSync(d, { recursive: true });
    const files: Record<string, unknown> = {
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
      if (!existsSync(p)) {
        writeFileSync(p, JSON.stringify(content, null, 2));
      }
    }
  }
}

export function writeNextServerSkeletonsIfMissing(): void {
  const root = process.cwd();
  const serverDir = join(root, '.next', 'server');
  const pagesDir = join(serverDir, 'pages');
  mkdirSync(serverDir, { recursive: true });
  mkdirSync(pagesDir, { recursive: true });
  mkdirSync(join(serverDir, 'edge'), { recursive: true });

  const middlewareManifestPath = join(serverDir, 'middleware-manifest.json');
  if (isNextDevTurbopack() && existsSync(middlewareManifestPath) && isPrepNextMiddlewareSkeleton(middlewareManifestPath)) {
    try {
      unlinkSync(middlewareManifestPath);
    } catch {
      /* ignore */
    }
  }

  const jsonSkeletons: Record<string, unknown> = {
    'middleware-manifest.json': {
      version: 3,
      middleware: {},
      functions: {},
      pages: {},
      matchers: {},
    },
    'app-paths-manifest.json': {},
    'pages-manifest.json': {},
    'next-font-manifest.json': { pages: {}, app: {} },
  };

  for (const [name, content] of Object.entries(jsonSkeletons)) {
    if (isNextDevTurbopack() && name === 'middleware-manifest.json') continue;
    const filePath = join(serverDir, name);
    if (!existsSync(filePath)) {
      writeFileSync(filePath, JSON.stringify(content, null, 2));
    }
  }

  writeVirtualPagesManifestStubs(pagesDir);

  const documentPath = join(pagesDir, '_document.js');
  if (isNextDevTurbopack()) {
    if (existsSync(documentPath) && isWebpackDocumentStub(documentPath)) {
      try {
        unlinkSync(documentPath);
      } catch {
        /* ignore */
      }
    }
  } else if (!existsSync(documentPath)) {
    const documentStub = `\
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
try {
  const d = require("next/dist/pages/_document");
  exports.default = d.default ?? d;
} catch {
  exports.default = function Document() { return null; };
}
`;
    writeFileSync(documentPath, documentStub);
  }
}

/**
 * Webpack hooks still lose races vs Next opening manifests during route compilation.
 * Poll only while `next dev`; still only writes files that are missing.
 */
export function startDevManifestSkeletonPolling(intervalMs = 75): void {
  if (devPollingStarted) return;
  if (typeof process === 'undefined' || !process.argv.includes('dev')) return;
  devPollingStarted = true;

  setInterval(() => {
    try {
      writeNextServerSkeletonsIfMissing();
    } catch {
      /* ignore */
    }
  }, intervalMs);
}
