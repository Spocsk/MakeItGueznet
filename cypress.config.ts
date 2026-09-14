import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "cypress";
import { tasks } from "./cypress/tasks";

function loadEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const comment = value.indexOf(" #");
    if (comment >= 0) value = value.slice(0, comment).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

export default defineConfig({
  e2e: {
    baseUrl: "http://127.0.0.1:3456",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    defaultCommandTimeout: 12000,
    pageLoadTimeout: 60000,
    requestTimeout: 15000,
    retries: { runMode: 1, openMode: 0 },
    setupNodeEvents(on) {
      on("task", tasks);
    },
  },
});
