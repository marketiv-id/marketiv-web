# Campaign Brief Runtime Migration to campaign_briefs_v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Point all Campaign Brief runtime reads/writes at Appwrite collection `campaign_briefs_v2` (ID `6ab530d00018edb50097`) without changing business logic, schema, or permissions.

**Architecture:** Collection ID is centralized per layer — main web app via `COLLECTIONS.campaignBriefs` constants in two services; Appwrite Functions via env var `CAMPAIGN_BRIEFS_COLLECTION_ID` with hardcoded fallback. Change the constants/fallbacks and local function `.env` files only. Old collection stays untouched.

**Tech Stack:** Next.js/TypeScript services (Appwrite SDK), Appwrite Functions (node-appwrite), vitest.

## Global Constraints

- New collection ID: `6ab530d00018edb50097` / collection id string `campaign_briefs_v2`.
- Do NOT delete or alter old collection `campaign_briefs` (schema, index, permission, data).
- Do NOT change permission pattern: brief rows keep `read(any)`, `update(user(uid))`, `delete(user(uid))`.
- Do NOT change business logic, field semantics, flows, auth, AI behavior.
- Do NOT blind-replace `campaign_briefs` across docs/history/scripts; only runtime paths.
- No big refactors. Single-point constant/fallback edits only.
- Known non-goal: `createCampaignDraftInAppwrite` brief-write failure only warns (`[createCampaignDraft] Failed to write brief`, `umkm-appwrite.service.ts:825`) — report as remaining risk, do not redesign.

---

### Task 1: Main web app services → v2

**Files:**
- Modify: `src/services/umkm/umkm-appwrite.service.ts:77`
- Modify: `src/services/creator/creator-appwrite.service.ts:77`

**Interfaces:**
- Consumes: none (local constants).
- Produces: `COLLECTIONS.campaignBriefs === "campaign_briefs_v2"` for all brief CRUD/read paths (create draft `:811`, load `:916`, delete cascade `:1358`, publish perm patch `:1535`, upsert `:1632-1653`, creator job read `creator:411`).

- [ ] **Step 1: Edit UMKM service constant**

In `src/services/umkm/umkm-appwrite.service.ts` line 77, replace:

```ts
  campaignBriefs: "campaign_briefs",
```

with:

```ts
  campaignBriefs: "campaign_briefs_v2",
```

- [ ] **Step 2: Edit Creator service constant**

In `src/services/creator/creator-appwrite.service.ts` line 77, replace:

```ts
  campaignBriefs: "campaign_briefs",
```

with:

```ts
  campaignBriefs: "campaign_briefs_v2",
```

- [ ] **Step 3: Confirm no other main-app literal remains in runtime code**

Run: `rg -n 'campaign_briefs' src --glob '*.ts' --glob '*.tsx'`
Expected: only comments (e.g. `campaign.schema.ts`, `JobDetailView.tsx`, `umkm-appwrite.service.ts:752,1102`) plus `creator-appwrite.service.ts:432` doc comment. No string literal used as collection ID.

- [ ] **Step 4: Commit**

```bash
git add src/services/umkm/umkm-appwrite.service.ts src/services/creator/creator-appwrite.service.ts
git commit -m "fix: point campaign brief runtime at campaign_briefs_v2"
```

---

### Task 2: Appwrite Functions code fallbacks → v2

**Files:**
- Modify: `00_BACKEND/functions/ai-brief/src/main.js:220`
- Modify: `00_BACKEND/functions/ai-fraud-precheck/src/main.js:242`
- Modify: `00_BACKEND/functions/patch-campaign-status/src/main.js:156`

**Interfaces:**
- Consumes: env `CAMPAIGN_BRIEFS_COLLECTION_ID` (and for patch-campaign-status also `NEXT_PUBLIC_CAMPAIGN_BRIEF_COLLECTION`) — keep env-first design, only change final fallback.
- Produces: runtime collection resolves to `campaign_briefs_v2` when env unset; env still wins when set.

- [ ] **Step 1: ai-brief fallback**

Replace in `00_BACKEND/functions/ai-brief/src/main.js:220`:

```js
        const briefCollectionId = env.CAMPAIGN_BRIEFS_COLLECTION_ID || "campaign_briefs";
```

with:

```js
        const briefCollectionId = env.CAMPAIGN_BRIEFS_COLLECTION_ID || "campaign_briefs_v2";
```

- [ ] **Step 2: ai-fraud-precheck fallback**

Replace in `00_BACKEND/functions/ai-fraud-precheck/src/main.js:242`:

```js
    campaignBriefsCollectionId: process.env.CAMPAIGN_BRIEFS_COLLECTION_ID || "campaign_briefs",
```

with:

```js
    campaignBriefsCollectionId: process.env.CAMPAIGN_BRIEFS_COLLECTION_ID || "campaign_briefs_v2",
```

- [ ] **Step 3: patch-campaign-status fallback**

Replace in `00_BACKEND/functions/patch-campaign-status/src/main.js:153-156`:

```js
    campaignBriefsCollectionId:
      process.env.CAMPAIGN_BRIEFS_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_CAMPAIGN_BRIEF_COLLECTION ||
      "campaign_briefs",
```

with:

```js
    campaignBriefsCollectionId:
      process.env.CAMPAIGN_BRIEFS_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_CAMPAIGN_BRIEF_COLLECTION ||
      "campaign_briefs_v2",
```

- [ ] **Step 4: Commit**

```bash
git add 00_BACKEND/functions/ai-brief/src/main.js 00_BACKEND/functions/ai-fraud-precheck/src/main.js 00_BACKEND/functions/patch-campaign-status/src/main.js
git commit -m "fix: default campaign brief collection to campaign_briefs_v2 in functions"
```

---

### Task 3: Function env config → v2

**Files:**
- Modify: `00_BACKEND/functions/ai-brief/.env:4`
- Modify: `00_BACKEND/functions/ai-fraud-precheck/.env:7`
- Modify: `00_BACKEND/functions/patch-campaign-status/.env` (append missing var)
- Modify: `00_BACKEND/functions/ai-brief/.env.example:35`
- Modify: `00_BACKEND/functions/ai-fraud-precheck/.env.example:31`
- Modify: `00_BACKEND/functions/patch-campaign-status/.env.example:27`

**Interfaces:**
- Consumes: `appwrite/ops/sync-function-vars.mjs` treats `functions/<id>/.env` as source of truth for live function variables.
- Produces: local env points at `campaign_briefs_v2`; live sync command documented for human execution (write-to-production blocked for assistant per `appwrite/ops/README.md`).

- [ ] **Step 1: ai-brief .env**

Replace `CAMPAIGN_BRIEFS_COLLECTION_ID=campaign_briefs` with `CAMPAIGN_BRIEFS_COLLECTION_ID=campaign_briefs_v2`.

- [ ] **Step 2: ai-fraud-precheck .env**

Replace `CAMPAIGN_BRIEFS_COLLECTION_ID=campaign_briefs` with `CAMPAIGN_BRIEFS_COLLECTION_ID=campaign_briefs_v2`.

- [ ] **Step 3: patch-campaign-status .env**

Append:

```
CAMPAIGN_BRIEFS_COLLECTION_ID=campaign_briefs_v2
```

- [ ] **Step 4: .env.example templates**

Set `CAMPAIGN_BRIEFS_COLLECTION_ID=campaign_briefs_v2` (replace empty value) in all three `.env.example` files.

- [ ] **Step 5: Dry-run sync (read-only)**

Run: `node appwrite/ops/sync-function-vars.mjs --dry --only ai-brief` (repeat for `ai-fraud-precheck`, `patch-campaign-status`)
Expected: plan shows `UPD CAMPAIGN_BRIEFS_COLLECTION_ID` (or `NEW` for patch-campaign-status). No live writes.
Live apply (human, per ops README): `node appwrite/ops/sync-function-vars.mjs --only ai-brief` etc.

- [ ] **Step 6: Commit**

```bash
git add 00_BACKEND/functions/ai-brief/.env 00_BACKEND/functions/ai-brief/.env.example \
  00_BACKEND/functions/ai-fraud-precheck/.env 00_BACKEND/functions/ai-fraud-precheck/.env.example \
  00_BACKEND/functions/patch-campaign-status/.env 00_BACKEND/functions/patch-campaign-status/.env.example
git commit -m "fix: set function brief collection env to campaign_briefs_v2"
```

---

### Task 4: Shared backend collections fallback → v2

**Files:**
- Modify: `00_BACKEND/src/lib/appwrite/collections.ts:27`

**Interfaces:**
- Consumes: exported `COLLECTIONS` via `00_BACKEND/src/lib/appwrite/index.ts`. Audit: no current consumer reads `COLLECTIONS.campaignBriefs` (services use campaigns/assets/claims/submissions only). `patch-campaign-status` reads `NEXT_PUBLIC_CAMPAIGN_BRIEF_COLLECTION` from process.env directly, not this file.
- Produces: consistent fallback if/when key is consumed.

- [ ] **Step 1: Edit fallback**

Replace line 27:

```ts
  campaignBriefs: process.env.NEXT_PUBLIC_CAMPAIGN_BRIEF_COLLECTION || 'campaign_briefs',
```

with:

```ts
  campaignBriefs: process.env.NEXT_PUBLIC_CAMPAIGN_BRIEF_COLLECTION || 'campaign_briefs_v2',
```

- [ ] **Step 2: Commit**

```bash
git add 00_BACKEND/src/lib/appwrite/collections.ts
git commit -m "fix: default NEXT_PUBLIC_CAMPAIGN_BRIEF_COLLECTION fallback to v2"
```

---

### Task 5: Verification

**Files:** none (commands only).

- [ ] **Step 1: Root typecheck**

Run: `npm run typecheck`
Expected: pass (or pre-existing errors explained).

- [ ] **Step 2: Root lint**

Run: `npm run lint`
Expected: pass (or pre-existing errors explained).

- [ ] **Step 3: Root build**

Run: `npm run build`
Expected: pass (or pre-existing errors explained).

- [ ] **Step 4: Backend tests (functions.test.ts covers patch-campaign-status brief path)**

Run: `npm test` (workdir `00_BACKEND`)
Expected: pass. Test sets `CAMPAIGN_BRIEFS_COLLECTION_ID` explicitly (`functions.test.ts:3461`) — mechanism test, unaffected by fallback change.

- [ ] **Step 5: Static verification — no runtime path on old collection**

Run: `rg -n 'campaign_briefs[^_]|campaign_briefs$' src 00_BACKEND/functions 00_BACKEND/src 00_BACKEND/appwrite/ops --glob '!**/node_modules/**'`
Expected remaining hits classified: comments, docs-in-code, test fixture with explicit env, ops scripts targeting old collection (historical/ops), graphify/docs excluded by path. Zero hits where value is used as active collection ID for brief CRUD.

- [ ] **Step 6: Positive check — v2 is the runtime value**

Run: `rg -n 'campaign_briefs_v2' src 00_BACKEND`
Expected: constants in both services, three function fallbacks, three+ `.env` files, collections.ts fallback.

---

## Out of Scope / Do Not Touch

- `00_BACKEND/appwrite.json`, `appwrite.config.json`, `appwrite/generate_appwrite_json.cjs` — old collection infra definition stays; v2 exists only in live console (drift noted in report).
- Docs (`00_BACKEND/docs/**`, `docs/**`), audits, graphify-out, `.kiro/**`, agent skill files (`.claude/`, `.agents/`, `.codex/`) — historical/descriptive.
- `00_BACKEND/appwrite/ops/harden-permissions.mjs`, `inspect-campaign.mjs` — ops scripts aimed at old collection; report only.
- `00_BACKEND/tests/integration/functions.test.ts` — env-mechanism fixture; leave.
- Comments in `src/**` describing schema as `campaign_briefs` — leave (descriptive, not runtime IDs).
