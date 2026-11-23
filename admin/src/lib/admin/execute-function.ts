import { ExecutionMethod } from "appwrite";
import { functions } from "./appwrite";

import { AdminFunctionExecutionError } from "@/lib/api/errors";

// Kelas error dipakai bersama dengan `callAdminApi()` (Route Handler Supabase).
export { AdminFunctionExecutionError } from "@/lib/api/errors";

/**
 * Eksekusi Function Appwrite admin. Sejak Fase 5 hanya dipakai jalur TULIS
 * (review-submission, review-withdrawal, review-ratecard-deliverable);
 * jalur baca lewat `callAdminApi()`.
 */
export async function executeAdminFunction<T>(
  functionId: string,
  payload: unknown,
  isValid: (value: unknown) => value is T,
  fallbackMessage: string,
): Promise<T> {
  const execution = await functions.createExecution(
    functionId, JSON.stringify(payload), false, "/", ExecutionMethod.POST,
    { "content-type": "application/json" },
  );
  const body = parseBody(execution.responseBody, execution.responseStatusCode);
  const statusCode = execution.responseStatusCode || 500;
  if (execution.status === "failed" || statusCode < 200 || statusCode >= 300) {
    throw new AdminFunctionExecutionError(statusCode, responseError(body) || fallbackMessage);
  }
  if (!isValid(body)) throw new AdminFunctionExecutionError(502, "Respons Function Admin tidak valid.");
  return body;
}

function parseBody(responseBody: string, statusCode: number): unknown {
  try { return responseBody ? JSON.parse(responseBody) : {}; } catch {
    throw new AdminFunctionExecutionError(statusCode || 502, "Respons Function Admin bukan JSON valid.");
  }
}

function responseError(value: unknown): string | undefined {
  return value && typeof value === "object" && typeof (value as Record<string, unknown>).error === "string"
    ? (value as Record<string, string>).error : undefined;
}
