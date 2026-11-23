import "server-only";

import { HttpError } from "./http";

/** Body JSON objek; rusak / bukan objek → 400 (bukan 500). */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // jatuh ke error di bawah
  }
  throw new HttpError(400, "Format permintaan tidak valid.");
}
