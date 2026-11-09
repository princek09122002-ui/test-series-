import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
const local = path.resolve(".local");
mkdirSync(local, { recursive: true });
if (existsSync(".env")) {
  console.log(
    "Existing .env preserved. Configure DATABASE_URL and run migrations if needed.",
  );
  process.exit(0);
}
const secret = randomBytes(48).toString("hex"),
  dbPassword = randomBytes(24).toString("hex");
const studentPassword = randomBytes(18).toString("base64url"),
  adminPassword = randomBytes(18).toString("base64url");
const credentials = {
  student: { email: "student@neet.local", password: studentPassword },
  admin: { email: "admin@neet.local", password: adminPassword },
};
writeFileSync(
  path.join(local, "credentials.json"),
  JSON.stringify(credentials, null, 2),
  { mode: 0o600 },
);
let env = readFileSync(".env.example", "utf8");
const values = {
  DATABASE_URL: `postgresql://neet:${dbPassword}@localhost:55432/neet_adaptive`,
  AUTH_SECRET: secret,
  NEXTAUTH_SECRET: secret,
  CRON_SECRET: randomBytes(32).toString("hex"),
  SEED_STUDENT_EMAIL: credentials.student.email,
  SEED_STUDENT_PASSWORD: studentPassword,
  SEED_ADMIN_EMAIL: credentials.admin.email,
  SEED_ADMIN_PASSWORD: adminPassword,
};
for (const [key, value] of Object.entries(values))
  env = env.replace(new RegExp(`^${key}=.*$`, "m"), `${key}="${value}"`);
writeFileSync(".env", env, { mode: 0o600 });
console.log(
  "Created ignored .env and .local/credentials.json with unique local passwords. Run npm run db:local in another terminal, then npm run db:migrate and npm run db:seed.",
);
