/**
 * Dev-only `.next` root manifests (routes-manifest.json, app-path-routes-manifest.json).
 * Next's dev server reads these before the first compile finishes; missing → ENOENT on /profile etc.
 * Only write when missing — never overwrite a real build output.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));

const routesSkeleton = readFileSync(join(here, 'routes-manifest.dev-skeleton.json'), 'utf8');
const appPathRoutesSkeleton = '{}\n';

/**
 * @param {string} projectRoot
 */
export function writeDistManifestSkeletonsIfMissing(projectRoot) {
  const distDir = join(projectRoot, '.next');
  mkdirSync(distDir, { recursive: true });

  const routesPath = join(distDir, 'routes-manifest.json');
  if (!existsSync(routesPath)) {
    writeFileSync(routesPath, routesSkeleton);
  }

  const appPathRoutesPath = join(distDir, 'app-path-routes-manifest.json');
  if (!existsSync(appPathRoutesPath)) {
    writeFileSync(appPathRoutesPath, appPathRoutesSkeleton);
  }
}
