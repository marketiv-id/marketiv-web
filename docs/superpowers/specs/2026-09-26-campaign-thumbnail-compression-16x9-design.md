# Campaign Thumbnail Compression + 16:9 Presentation — Design

Date: 2026-09-26
Status: Approved (user amended WebP-failure behavior: fail, no original-file fallback)

## Goal

1. Compress/resize campaign thumbnail client-side BEFORE upload to Appwrite `campaign-assets`.
2. Standardize all campaign thumbnail containers to responsive 16:9 (`aspect-video`) with `object-fit: cover`.

Incremental change only. No schema change, no lifecycle change, no new dependency, no unrelated refactor.

## Current implementation (audit)

Upload flow: `CreateCampaignWizard.tsx:146` `handleSelectThumbnail(file)`
1. raw `File` from input (`ProductInfoStep.tsx:75`, `CampaignLivePreviewCard.tsx:50`)
2. `URL.createObjectURL(raw)` → `thumbnailPreview` state (transient)
3. `uploadCampaignThumbnail(file)` → `umkm-appwrite.service.ts:1121` → `campaign-thumbnail.ts:39` (`assertCampaignThumbnailFile`: MIME image/* + bucket rules) → `storage.ts:87` upload original bytes → public URL
4. `finally`: revoke object URL, clear preview

No compression exists anywhere. No image library in `package.json`.

Model B lifecycle (wizard only, MUST NOT change):
- staged cleanup after new upload: `CreateCampaignWizard.tsx:164`
- persist-fail revert + delete staged B: `:492`
- persist-success delete old A: `:483`
- unmount cleanup: `:181`, discard/reset: `:194`
- Model B order: upload B → persist B → delete A; persist fail → delete B best-effort, keep A.

Thumbnail render sites (all `campaign.thumbnailUrl` / mapped `job.thumbnailUrl` / `work.thumbnailUrl`):

| File | Line | Current |
|---|---|---|
| `src/components/features/umkm-dashboard/campaign/CampaignCard.tsx` | 104 | fixed `h-32 sm:h-36` |
| `src/components/features/umkm-dashboard/overview/CampaignSection.tsx` | 83 | fixed `h-28 sm:h-36` |
| `src/components/features/umkm-dashboard/campaign/CampaignTable.tsx` | 101 | 40×40 square |
| `src/components/features/umkm-dashboard/create-campaign/steps/ProductInfoStep.tsx` | 104 | 96×96 square |
| `src/components/features/umkm-dashboard/create-campaign/CampaignLivePreviewCard.tsx` | 62 | fixed `h-36` CSS background cover |
| `src/components/features/creator-dashboard/JobPoolView.tsx` | 114 | inline `aspectRatio: 4/3` |
| `src/components/features/creator-dashboard/CreatorDashboardView.tsx` | 183 | `aspect-[16/10] sm:aspect-[4/3]` |
| `src/components/features/creator-dashboard/PekerjaanAktifView.tsx` | 201 | inline `aspectRatio: 4/3` |
| `src/components/features/creator-dashboard/JobDetailView.tsx` | 307 | already `aspect-video` (no change) |
| `src/components/features/creator-dashboard/ActiveWorkDetailView.tsx` | 427 | 4/3 gradient panel, NO thumbnail rendered → no change |
| `src/components/features/umkm-dashboard/campaign/CampaignListSkeleton.tsx` | 24 | already `aspect-video` (matches) |

Out of scope: `SettingsView:967` (creator portfolio), `NegosiasiView` (UMKM avatar),
`features/dashboard/CampaignCard.tsx` (static demo `imageUrl` data), UMKM campaign detail
page (renders no thumbnail).

User decisions:
- 16:9 applies to all three non-card spots too (table chip, form preview, live preview cover).
- WebP encode failure (or decode failure) → FAIL processing with clear user-facing error. Do NOT upload original uncompressed file.

## Compression utility

New file: `src/lib/compress-image.ts` (browser-native, no new dependency).

```ts
export const IMAGE_COMPRESSION = {
  maxDimension: 1600,   // longest side, never upscale
  quality: 0.8,         // starting WebP quality
  targetBytes: 500_000, // TARGET not hard limit
  minQuality: 0.5,      // floor for quality loop; dimensions never reduced
} as const;

export function computeTargetSize(width, height, max): { width, height }
export async function compressImageToWebP(file: File): Promise<File>
```

Steps:
1. Validate source: `file.type.startsWith("image/")` else throw `Error` (Indonesian message).
   Caller additionally runs existing `assertCampaignThumbnailFile` before calling.
2. Decode: `createImageBitmap(file, { imageOrientation: "from-image" })`;
   fallback for environments without `createImageBitmap`: `new Image()` + object URL
   (revoke in `finally`). Decode failure → throw (no upload).
3. `computeTargetSize`: `scale = Math.min(1, max / maxSide)`; rounded ints; never upscale;
   ratio preserved (no crop).
4. Canvas draw → `toBlob("image/webp", quality)` loop: q = 0.8 → if `size > 500KB` and
   `q > 0.5`, retry q -= 0.1; stop at floor 0.5. Dimensions unchanged across retries.
5. `blob === null` → throw. `blob.type !== "image/webp"` (browser cannot encode WebP) →
   throw clear Indonesian error; caller fails the operation, nothing uploaded.
6. Filename: strip original extension, append `.webp`.
7. Return `new File([blob], name, { type: "image/webp", lastModified: Date.now() })`.

Notes: animated GIF → first frame (acceptable for thumbnail). HEIC undecodable in most
browsers → decode failure → error (same path).

## Wizard flow change

Only `handleSelectThumbnail` in `CreateCampaignWizard.tsx` changes:

```
guard uploadingThumbnailRef (existing) → assertCampaignThumbnailFile(raw)   // reject invalid BEFORE processing
  → compressImageToWebP(raw)  (fail → toast.error, return, no state change)
  → optimized File
  → preview = URL.createObjectURL(optimized)  // preview = bytes that will be stored
  → upload optimized via existing uploadCampaignThumbnail (re-validates, unchanged)
  → existing Model B staged-cleanup logic (unchanged)
  → finally: revoke preview + reset flags (existing pattern)
```

- `uploadingThumbnailRef` set BEFORE compression → blocks double-select during processing.
- Object URL lifecycle: single transient URL, revoked in `finally`; unmount/discard cleanup
  already revoke `thumbnailPreviewRef` (unchanged). No new leaks.
- Compression runs only on user select/replace — never on render, never on persisted thumbs.
- Duplicate campaign copy (`copyCampaignThumbnail`) unchanged — copies stored file as-is.
- Validation not weakened: pre-compress `assertCampaignThumbnailFile` + unchanged
  `uploadCampaignThumbnail` validation.

## 16:9 presentation

Change container class only, keep everything else (badges, overlays, gradients,
`fill` + `object-cover` + `sizes` + `onError` hide):

1. `umkm/campaign/CampaignCard.tsx:104` — `h-32 sm:h-36` → `aspect-video`
2. `overview/CampaignSection.tsx:83` — `h-28 sm:h-36` → `aspect-video`
3. `campaign/CampaignTable.tsx:101` — `h-10 w-10` → small 16:9 chip (`aspect-video`, width kept)
4. `create-campaign/steps/ProductInfoStep.tsx:104` — `w-24 h-24` → `w-24 aspect-video`
5. `create-campaign/CampaignLivePreviewCard.tsx:62` — `h-36` → `aspect-video` (keep background-image gradient technique)
6. `creator/JobPoolView.tsx:114` — inline 4/3 → `aspect-video`
7. `creator/CreatorDashboardView.tsx:183` — `aspect-[16/10] sm:aspect-[4/3]` → `aspect-video`
8. `creator/PekerjaanAktifView.tsx:201` — inline 4/3 → `aspect-video`

Rules: width 100%, height derived from width, no fixed pixel heights as primary sizing,
`object-fit: cover` (presentation may crop, stored file not cropped), fallback/gradient
containers inherit same 16:9 (legacy `thumbnailUrl = ""` stays valid), badges stay
`absolute` inside container.

## Tests

New `src/lib/__tests__/compress-image.test.ts` (jsdom + stubbed `createImageBitmap` and
canvas `getContext`/`toBlob`; repo has no canvas lib, real codec not testable in jsdom):
- landscape 4000×3000 → 1600×1200; portrait 3000×4000 → 1200×1600;
  square 3000×3000 → 1600×1600; small 800×600 → 800×600 (no upscale)
- invalid source (non-image MIME) throws
- output MIME `image/webp`, filename `.webp`
- result smaller than original (mocked encode bytes < source bytes)
- quality loop: >500KB at 0.8 → descends, floor 0.5, dimensions unchanged
- non-WebP encoder output → throws (no silent original fallback)
- decode failure → throws

Presentation assertions: cover container has `aspect-video` in UMKM `CampaignCard` and
creator `JobPoolView` card.

Regression (must stay green): `campaign-thumbnail.test.ts`,
`umkm-dashboard.thumbnail-legacy.test.ts`, `create-campaign.validation.test.ts`,
`CampaignCard.responsive.test.tsx`, full suite.

## Verification commands

`npm run typecheck`, `npm test -- --run`, `npm run build`, `npm run lint`.

## Not changing

Appwrite schema / `campaigns.thumbnailUrl`; `campaign-assets` bucket; `campaign-thumbnail.ts`;
`storage.ts`; services; duplicate business rules; funded/active edit guard; legacy
compatibility; payment/publish/claim flows; dependencies; unrelated components.

## Manual E2E (https://marketiv-dev.my.id)

A. New campaign: select >1MB image → observe compression → thumbnail renders correct →
   UMKM card shows 16:9.
B. Creator side: dashboard recommendation, Job Pool card, Job Pool detail → all 16:9.
C. Responsive: desktop/tablet/mobile → no horizontal overflow, 16:9 kept, no distortion.
D. Draft replacement: replace with another large image → optimized upload → old file
   cleanup behavior intact.
