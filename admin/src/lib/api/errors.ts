/**
 * Error panggilan backend admin dengan status HTTP.
 *
 * Dulu tinggal di `src/lib/admin/execute-function.ts` (Appwrite). Dipindah ke
 * sini supaya `callAdminApi()` (Route Handler Supabase, Fase 5) dan
 * `executeAdminFunction()` (Appwrite, jalur tulis sampai Fase 7/8) melempar
 * KELAS YANG SAMA — `instanceof AdminFunctionExecutionError` di service tetap
 * berlaku untuk keduanya.
 */
export class AdminFunctionExecutionError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "AdminFunctionExecutionError";
  }
}
