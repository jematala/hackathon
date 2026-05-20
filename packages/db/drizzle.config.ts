import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID ?? "816d5f5d-0be0-4122-88a9-f4bcee86892e",
    token: process.env.CLOUDFLARE_API_TOKEN ?? "",
  },
});
