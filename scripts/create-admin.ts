import "dotenv/config";
import { hash } from "bcryptjs";
import { db } from "../src/lib/db";
import { emailSchema, passwordSchema } from "../src/lib/domain/validation";
const email = emailSchema.parse(process.env.ADMIN_EMAIL),
  password = passwordSchema.parse(process.env.ADMIN_PASSWORD);
await db.user.upsert({
  where: { email },
  create: {
    email,
    name: "Administrator",
    role: "ADMIN",
    passwordHash: await hash(password, 12),
    profile: { create: {} },
  },
  update: {
    role: "ADMIN",
    passwordHash: await hash(password, 12),
    sessionVersion: { increment: 1 },
  },
});
console.log(
  "Administrator created or credentials rotated. Existing sessions were invalidated.",
);
await db.$disconnect();
