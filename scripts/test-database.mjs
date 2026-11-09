import "dotenv/config";
import pg from "pg";
import { spawn } from "node:child_process";
const mode = process.argv[2] ?? "integration",
  url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error(
    "Automated local checks require a local database; no hosted data will be modified.",
  );
const runId = crypto.randomUUID();
const name = `${url.pathname.slice(1, 36)}_${runId.replaceAll("-", "").slice(0, 8)}_test`;
if (!/^[a-zA-Z][a-zA-Z0-9_]*_test$/.test(name))
  throw new Error("Invalid test database name");
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
if (
  !(await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [name]))
    .rowCount
)
  await client.query(
    `CREATE DATABASE "${name}" WITH TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
  );
await client.end();
url.pathname = `/${name}`;
const env = {
  ...process.env,
  DATABASE_URL: url.toString(),
  TEST_DATABASE_READY: "true",
  RUN_EXPIRY_WORKER: "true",
  NEXTAUTH_URL: "http://localhost:3100",
  E2E_RUN_ID: runId,
  E2E_STUDENT_PASSWORD: `Practice-${crypto.randomUUID()}`,
  SEED_ADMIN_EMAIL: `test-admin-${crypto.randomUUID()}@example.test`,
  SEED_ADMIN_PASSWORD: `Admin-${crypto.randomUUID()}`,
};
function run(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      stdio: "inherit",
      env,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Check exited with code ${code}`)),
    );
  });
}
await run("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
await run("node_modules/tsx/dist/cli.mjs", ["prisma/seed.ts"]);
if (mode === "e2e")
  await run("node_modules/next/dist/bin/next", ["build", "--webpack"]);
await run(
  mode === "e2e"
    ? "node_modules/@playwright/test/cli.js"
    : "node_modules/vitest/vitest.mjs",
  mode === "e2e"
    ? ["test"]
    : ["run", "--config", "vitest.integration.config.ts"],
);
