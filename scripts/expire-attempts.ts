import "dotenv/config";
import { expireAttempts } from "../src/lib/services/testing";
import { db } from "../src/lib/db";
console.log(`Finalized ${await expireAttempts()} expired attempts.`);
await db.$disconnect();
