#!/usr/bin/env node
/**
 * Cleanup inactive Appwrite Function & Site deployments to reclaim storage.
 *
 * Every deployment (source + build output) counts toward project storage and
 * Appwrite never deletes old ones automatically. This script keeps the ACTIVE
 * deployment of each function/site (plus optional N most recent others) and
 * deletes the rest.
 *
 * Usage:
 *   node scripts/cleanup-old-deployments.mjs                 # dry-run, prod env vars
 *   node scripts/cleanup-old-deployments.mjs --staging       # dry-run, staging env vars
 *   node scripts/cleanup-old-deployments.mjs --execute       # actually delete
 *   node scripts/cleanup-old-deployments.mjs --keep 1        # also keep 1 newest inactive (rollback)
 *   node scripts/cleanup-old-deployments.mjs --only functions|sites
 *
 * Env (prod):    APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY
 * Env (staging): APPWRITE_STAGING_ENDPOINT, APPWRITE_STAGING_PROJECT_ID, APPWRITE_STAGING_API_KEY
 * API key scopes: functions.read/write, sites.read/write
 */

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const staging = flag('--staging');
const execute = flag('--execute');
const keep = Number.parseInt(opt('--keep', '0'), 10);
const only = opt('--only', 'all');

const prefix = staging ? 'APPWRITE_STAGING_' : 'APPWRITE_';
const endpoint = (process.env[`${prefix}ENDPOINT`] || process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
const projectId = process.env[`${prefix}PROJECT_ID`];
const apiKey = process.env[`${prefix}API_KEY`];

if (!endpoint || !projectId || !apiKey) {
  console.error(`Missing env: ${prefix}ENDPOINT / ${prefix}PROJECT_ID / ${prefix}API_KEY`);
  process.exit(1);
}

const BUSY_STATUSES = new Set(['waiting', 'processing', 'building']);
const PAGE = 100;

async function api(method, path, query = []) {
  const url = new URL(endpoint + path);
  for (const q of query) url.searchParams.append('queries[]', JSON.stringify(q));
  const res = await fetch(url, {
    method,
    headers: {
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${body.message || res.statusText}`);
    err.status = res.status;
    err.type = body.type;
    throw err;
  }
  return body;
}

async function listAll(path, key) {
  const items = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await api('GET', path, [
      { method: 'limit', values: [PAGE] },
      { method: 'offset', values: [offset] },
    ]);
    const batch = page[key] || [];
    items.push(...batch);
    if (batch.length < PAGE || items.length >= (page.total ?? 0)) break;
  }
  return items;
}

const sizeOf = (d) => d.totalSize ?? (d.sourceSize ?? d.size ?? 0) + (d.buildSize ?? 0);
const fmt = (b) => {
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(i ? 2 : 0)} ${u[i]}`;
};

async function cleanupKind(kind) {
  // kind: 'functions' | 'sites'
  let resources;
  try {
    resources = await listAll(`/${kind}`, kind);
  } catch (e) {
    if (e.status === 404 || e.type === 'general_route_not_found') {
      console.log(`[${kind}] endpoint not available, skip.`);
      return { total: 0, freed: 0, deleted: 0, failed: 0 };
    }
    throw e;
  }

  console.log(`\n=== ${kind.toUpperCase()} (${resources.length}) ===`);
  let total = 0, freed = 0, deleted = 0, failed = 0;

  for (const r of resources) {
    const activeId = r.deploymentId || r.deployment || null;
    const deployments = await listAll(`/${kind}/${r.$id}/deployments`, 'deployments');
    deployments.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));

    let kept = 0;
    const toDelete = [];
    for (const d of deployments) {
      total += sizeOf(d);
      if (d.$id === activeId) continue;
      if (BUSY_STATUSES.has(d.status)) continue;
      if (kept < keep) { kept++; continue; }
      toDelete.push(d);
    }

    const bytes = toDelete.reduce((s, d) => s + sizeOf(d), 0);
    console.log(
      `${r.$id.padEnd(40)} deployments=${String(deployments.length).padStart(3)} ` +
      `active=${activeId ? 'yes' : 'NO '} delete=${String(toDelete.length).padStart(3)} (${fmt(bytes)})`,
    );

    if (!activeId && toDelete.length) {
      console.log(`  ! ${r.$id} has no active deployment — skipping to be safe.`);
      continue;
    }

    for (const d of toDelete) {
      if (!execute) { freed += sizeOf(d); deleted++; continue; }
      try {
        await api('DELETE', `/${kind}/${r.$id}/deployments/${d.$id}`);
        freed += sizeOf(d);
        deleted++;
      } catch (e) {
        failed++;
        console.log(`  [FAIL] ${d.$id}: ${e.message}`);
      }
    }
  }

  console.log(`[${kind}] total=${fmt(total)} ${execute ? 'freed' : 'would free'}=${fmt(freed)} deployments=${deleted} failed=${failed}`);
  return { total, freed, deleted, failed };
}

async function bucketUsage() {
  try {
    const buckets = await listAll('/storage/buckets', 'buckets');
    console.log(`\n=== BUCKETS (read-only) ===`);
    let sum = 0;
    for (const b of buckets) {
      const files = await listAll(`/storage/buckets/${b.$id}/files`, 'files');
      const s = files.reduce((acc, f) => acc + (f.sizeOriginal || 0), 0);
      sum += s;
      console.log(`${b.$id.padEnd(40)} files=${String(files.length).padStart(5)} size=${fmt(s)}`);
    }
    console.log(`[buckets] total=${fmt(sum)}`);
  } catch (e) {
    console.log(`[buckets] cannot read: ${e.message}`);
  }
}

console.log(`Project ${projectId} @ ${endpoint}`);
console.log(`Mode: ${execute ? 'EXECUTE (deleting!)' : 'DRY-RUN'} | keep extra inactive: ${keep} | only: ${only}`);

const HINTS = {
  billing_limit_exceeded:
    'Project blocked by billing limit; API rejects requests. Delete old deployments from the Console, or upgrade temporarily, then re-run.',
  project_paused: 'Project paused due to inactivity. Restore it from the Console, then re-run.',
  general_unauthorized_scope: 'API key missing scopes. Add functions.read/write and sites.read/write to the key.',
};

const kinds = only === 'all' ? ['functions', 'sites'] : [only];
let grandFreed = 0, grandFailed = 0;
try {
  for (const k of kinds) {
    const r = await cleanupKind(k);
    grandFreed += r.freed;
    grandFailed += r.failed;
  }
} catch (e) {
  console.error(`\nERROR: ${e.message}`);
  if (HINTS[e.type]) console.error(`HINT: ${HINTS[e.type]}`);
  process.exit(2);
}
await bucketUsage();

console.log(`\nTOTAL ${execute ? 'freed' : 'would free'}: ${fmt(grandFreed)}${grandFailed ? ` | failures: ${grandFailed}` : ''}`);
if (!execute) console.log('Dry-run only. Re-run with --execute to delete.');
process.exit(grandFailed ? 1 : 0);
