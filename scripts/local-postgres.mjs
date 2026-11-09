import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("db:local only supports a loopback DATABASE_URL");
const databaseDir = path.resolve(".local/postgres");
mkdirSync(path.dirname(databaseDir), { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port || 5432),
  persistent: true,
  authMethod: "scram-sha-256",
  autoRehydrateSymlinks: true,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: (message) => { if (process.env.PG_DEBUG) console.log(message); },
  onError: (error) => console.error(error),
});
if (!existsSync(path.join(databaseDir, "PG_VERSION"))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const database = url.pathname.slice(1);
if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(database))
  throw new Error("Invalid local database name");
const result = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = $1",
  [database],
);
if (!result.rowCount)
  await client.query(
    `CREATE DATABASE "${database}" WITH TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
  );
await client.end();
console.log(
  `Local PostgreSQL is ready on ${url.hostname}:${url.port}. Data: .local/postgres. Press Ctrl+C to stop.`,
);
const keepAlive = setInterval(() => {}, 30000);
async function stop() {
  clearInterval(keepAlive);
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
