import "server-only";

import { HttpError, throwIfDbError, type DbErrorLike } from "./http";

/**
 * Error RPC tulis → HTTP (sama dengan pola app user `write-rpc.ts`):
 *   22023 → 400, 42501 → 403, P0002 → 404, P0001 → 409.
 * Pesan Indonesia dari `raise exception` diteruskan ke UI. Kode lain → 500
 * generik (lihat `throwIfDbError`).
 */
export function throwIfRpcError(error: DbErrorLike | null | undefined): void {
  if (!error) return;
  const message = error.message || "Permintaan ditolak.";
  switch (error.code) {
    case "22023":
    case "22P02":
      throw new HttpError(400, message);
    case "42501":
      throw new HttpError(403, message);
    case "P0002":
      throw new HttpError(404, message);
    case "P0001":
    case "23505":
      throw new HttpError(409, error.code === "23505" ? "Data sudah diproses sebelumnya." : message);
    default:
      throwIfDbError(error);
  }
}
