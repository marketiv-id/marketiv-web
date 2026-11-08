import { after, NextResponse } from "next/server";

/**
 * Probe `after()` dari `next/server` di hosting (Fase 1 migrasi Supabase).
 *
 * Fase 7 memakai `after()` untuk kerja lambat setelah respons terkirim. Route ini
 * membuktikan callback `after()` benar-benar dijalankan di Netlify (OpenNext):
 * 1. Buka GET /api/health/after → respons berisi `probeId`.
 * 2. Setelah ±2 detik, cari `after-probe` + `probeId` di log Function Netlify
 *    (Logs → Functions → "Next.js Server Handler").
 * Baris `after-probe` muncul = `after()` jalan. Tidak muncul = catat di log fase.
 *
 * Tidak membaca data, tidak menulis apa pun selain satu baris log tanpa PII.
 */
export const dynamic = "force-dynamic";

const AFTER_DELAY_MS = 1500;

export async function GET() {
  const probeId = crypto.randomUUID();
  const respondedAt = Date.now();

  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, AFTER_DELAY_MS));
    console.log(
      JSON.stringify({
        tag: "after-probe",
        probeId,
        msAfterResponse: Date.now() - respondedAt,
      }),
    );
  });

  return NextResponse.json(
    {
      ok: true,
      probeId,
      check: `Cari "after-probe" dan "${probeId}" di log Function, ±${AFTER_DELAY_MS} ms setelah respons ini.`,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
