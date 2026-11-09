import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env"), quiet: true });
const logs = path.join(root, ".local", "logs");
mkdirSync(logs, { recursive: true });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function listening(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const finish = (result) => { socket.destroy(); resolve(result); };
    socket.setTimeout(1500);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

function launch(name, args) {
  const stdout = openSync(path.join(logs, `${name}.out.log`), "a");
  const stderr = openSync(path.join(logs, `${name}.err.log`), "a");
  const child = spawn(process.execPath, args, {
    cwd: root, detached: true, windowsHide: true,
    stdio: ["ignore", stdout, stderr],
  });
  child.on("error", () => console.error(`Could not start ${name}. Check ${logs}.`));
  child.unref();
  closeSync(stdout);
  closeSync(stderr);
}

async function ready(check, name) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try { if (await check()) return; } catch { /* Service is still starting. */ }
    await delay(1000);
  }
  throw new Error(`${name} did not become ready. Check logs in ${logs}.`);
}

try {
  if (!existsSync(path.join(root, ".next", "BUILD_ID")))
    throw new Error("Production build missing. Run npm run build first.");
  const dbUrl = new URL(process.env.DATABASE_URL);
  if (!["localhost", "127.0.0.1"].includes(dbUrl.hostname))
    throw new Error("This launcher only supports the local database.");
  if (!(await listening(Number(dbUrl.port || 5432), "127.0.0.1")))
    launch("database", ["scripts/local-postgres.mjs"]);
  await ready(async () => {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 1500 });
    try { await client.connect(); await client.query("SELECT 1"); return true; }
    finally { await client.end(); }
  }, "Database");
  if (!(await listening(3000, "localhost")))
    launch("website", ["node_modules/next/dist/bin/next", "start", "--port", "3000"]);
  await ready(async () => {
    const response = await fetch("http://localhost:3000/api/auth/providers", { signal: AbortSignal.timeout(2000) });
    return response.ok && Boolean((await response.json()).credentials);
  }, "Website");
  console.log("NEET is ready: http://localhost:3000/pyq");
  console.log("The website and database keep running after this window closes.");
} catch (error) {
  console.error(error instanceof TypeError ? "Check the local DATABASE_URL configuration." : error.message);
  process.exitCode = 1;
}
