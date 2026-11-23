export type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Satu endpoint `/api/**`. `path` boleh memuat `:param`; nilainya diambil dari
 * key `body` dengan nama sama lalu DIHAPUS dari body sebelum dikirim.
 * GET/DELETE mengirim sisa body sebagai query string; lainnya sebagai JSON.
 */
export interface ApiRoute {
  method: ApiMethod;
  path: string;
}
