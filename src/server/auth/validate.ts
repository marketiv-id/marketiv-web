import "server-only";

import type { z } from "zod";

import { parseOrErrors } from "@/lib/validations/to-field-errors";

import { HttpError } from "./http-error";

/** Validasi body dengan skema Zod yang sama dengan form; gagal → 400 + pesan pertama. */
export function parseBody<S extends z.ZodType>(schema: S, body: unknown, fallback: string): z.infer<S> {
  const parsed = parseOrErrors(schema, body);
  if (!parsed.ok) {
    throw new HttpError(400, Object.values(parsed.errors)[0] ?? fallback, "validation", {
      fieldErrors: parsed.errors,
    });
  }
  return parsed.data;
}
