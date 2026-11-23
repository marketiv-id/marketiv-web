import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    env: {
      NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://api.example.test/v1",
      NEXT_PUBLIC_APPWRITE_PROJECT_ID: "project-test",
      NEXT_PUBLIC_APPWRITE_DATABASE_ID: "database-test",
    },
    exclude: configDefaults.exclude,
  },
});
