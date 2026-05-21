/**
 * Next's writeFileAtomic writes to `<target>.tmp.<random>` without ensuring the parent
 * directory exists. Turbopack can emit manifests before dev middleware mkdir runs → ENOENT.
 * Idempotent: safe to run after every npm install.
 *
 * If `next` upgrades and this script no longer matches upstream `write-atomic.js`, update
 * the bundled copies below or switch to `patch-package`.
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  join(root, 'node_modules/next/dist/lib/fs/write-atomic.js'),
  join(root, 'node_modules/next/dist/esm/lib/fs/write-atomic.js'),
];

const marker = 'LP_PATCH_ENSURE_PARENT_DIR';

for (const file of files) {
  let s;
  try {
    s = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (s.includes(marker)) continue;

  const isEsm = file.includes('/esm/lib/fs/write-atomic') || file.includes('\\esm\\lib\\fs\\write-atomic');

  if (!isEsm) {
    const cjs = `"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "writeFileAtomic", {
    enumerable: true,
    get: function() {
        return writeFileAtomic;
    }
});
const _promises = require("fs/promises");
const _path = require("path");
const _rename = require("./rename");
async function writeFileAtomic(filePath, content) {
    const tempPath = filePath + '.tmp.' + Math.random().toString(36).slice(2);
    try {
        await (0, _promises.mkdir)((0, _path.dirname)(tempPath), {
            recursive: true
        }); // ${marker}
        await (0, _promises.writeFile)(tempPath, content, 'utf-8');
        await (0, _rename.rename)(tempPath, filePath);
    } catch (e) {
        try {
            await (0, _promises.unlink)(tempPath);
        } catch  {
        // ignore
        }
        throw e;
    }
}

//# sourceMappingURL=write-atomic.js.map
`;
    writeFileSync(file, cjs);
    console.log('  ✓ patch-next-write-atomic:', file.replace(root + '/', ''));
    continue;
  }

  const esm = `import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { rename } from './rename';
export async function writeFileAtomic(filePath, content) {
    const tempPath = filePath + '.tmp.' + Math.random().toString(36).slice(2);
    try {
        await mkdir(dirname(tempPath), { recursive: true }); // ${marker}
        await writeFile(tempPath, content, 'utf-8');
        await rename(tempPath, filePath);
    } catch (e) {
        try {
            await unlink(tempPath);
        } catch  {
        // ignore
        }
        throw e;
    }
}

//# sourceMappingURL=write-atomic.js.map
`;
  writeFileSync(file, esm);
  console.log('  ✓ patch-next-write-atomic:', file.replace(root + '/', ''));
}
