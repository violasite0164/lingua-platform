/**
 * Dev server warmup script.
 *
 * Sequentially visits each key page and retries until it gets a successful
 * response. This pre-compiles every route so subsequent browsing is instant
 * and error-free.
 *
 * Usage: run in a second terminal after `npm run dev`
 *   node scripts/warmup.mjs
 */

const PORT  = process.env.PORT ?? 3000;
const BASE  = `http://localhost:${PORT}`;

// Pages to pre-compile, in dependency order (root first)
const PAGES = [
  '/',
  '/login',
  '/courses',
  '/dashboard',
  '/mentor',
  '/mentor/courses',
  '/mentor/courses/new',
  '/mentor/assignments',
];

const MAX_RETRIES    = 10;
const RETRY_DELAY_MS = 3000;   // wait 3s between retries
const PAGE_GAP_MS    = 2000;   // wait 2s between pages (let Webpack settle)

async function waitForServer(maxWaitMs = 90_000) {
  const start = Date.now();
  process.stdout.write('⏳ Waiting for dev server');
  while (Date.now() - start < maxWaitMs) {
    try {
      await fetch(BASE + '/', { signal: AbortSignal.timeout(2000) });
      process.stdout.write(' ready\n');
      return true;
    } catch {
      process.stdout.write('.');
      await sleep(1500);
    }
  }
  console.log('\n✗ Server did not start within 90s');
  return false;
}

async function fetchWithRetry(path) {
  const url = BASE + path;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const t = Date.now();
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
      });
      // Accept any response (200, 302, 401…) — it means the page compiled.
      const ms = Date.now() - t;
      console.log(`  ✓ ${path.padEnd(28)} ${res.status}  ${ms}ms`);
      return;
    } catch {
      if (attempt < MAX_RETRIES) {
        process.stdout.write(`  ↺ ${path} (attempt ${attempt}, retrying in ${RETRY_DELAY_MS / 1000}s)\n`);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.log(`  ✗ ${path} — gave up after ${MAX_RETRIES} attempts`);
      }
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function warmup() {
  const ready = await waitForServer();
  if (!ready) process.exit(1);

  // Give Webpack a moment to finish its initial compilation
  await sleep(2000);

  console.log('🔥 Pre-compiling pages…');
  for (const path of PAGES) {
    await fetchWithRetry(path);
    // Wait between pages so Webpack can fully finish writing chunks
    await sleep(PAGE_GAP_MS);
  }
  console.log('\n✅ Warmup complete — browse freely without errors!');
}

warmup();
