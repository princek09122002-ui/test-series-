import "dotenv/config";
import pg from "pg";
import { readFileSync, writeFileSync } from "node:fs";
const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("This helper only repairs project-local development setup");
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
const result = await client.query("SHOW server_encoding");
if (result.rows[0].server_encoding !== "UTF8") {
  const name = `${url.pathname.slice(1)}_utf8`;
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name))
    throw new Error("Invalid local database name");
  const exists = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [name],
  );
  if (!exists.rowCount)
    await client.query(
      `CREATE DATABASE "${name}" WITH TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
    );
  url.pathname = `/${name}`;
  writeFileSync(
    ".env",
    readFileSync(".env", "utf8").replace(
      /^DATABASE_URL=.*$/m,
      `DATABASE_URL="${url.toString()}"`,
    ),
  );
  console.log(
    "Created a UTF-8 local database and updated .env. Previous development data is preserved.",
  );
} else console.log("Database is already UTF-8.");
await client.end();
