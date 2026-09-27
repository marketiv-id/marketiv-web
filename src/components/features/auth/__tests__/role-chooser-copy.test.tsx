// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, afterEach, beforeEach } from "vitest";

let root: Root | undefined;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("RoleChooser copy", () => {
  it("tidak memuat klaim skala yang tidak bisa diverifikasi", async () => {
    const { RoleChooser } = await import("../RoleChooser");
    await act(async () => root?.render(<RoleChooser />));

    const text = host.textContent ?? "";
    expect(text).toContain("direktori kreator terverifikasi");
    expect(text).toContain("UMKM yang sedang aktif");
    expect(text.toLowerCase()).not.toContain("ratusan");
    expect(text.toLowerCase()).not.toContain("ribuan");
  });
});
