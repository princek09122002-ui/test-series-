/** Apply independently reconciled PDF evidence to private staging only. */
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
const { Client } = require('pg');
const planPath = path.join(root, '.local', 'staged-processing', 'evidence-plan.json');
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
if (plan.version !== 'source-evidence-v1' || plan.rows.length !== 8592)
  throw new Error('Unexpected evidence plan; review source reconciliation first');
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const identity = await client.query('select current_database() db');
if (identity.rows[0].db !== 'neet_adaptive_utf8') throw new Error('Unexpected live database');
const backupDir = path.join(root, '.local', 'backups');
mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `pre-staged-evidence-${new Date().toISOString().replaceAll(':', '-')}.json`);
const before = await client.query('select id, "answerStatus", extracted->\'processing\' processing from "SourceQuestion" order by id');
if (before.rowCount !== plan.rows.length) throw new Error('Staging count changed; regenerate plan');
writeFileSync(backupPath, JSON.stringify(before.rows));
let changed = 0;
for (let i = 0; i < plan.rows.length; i += 400) {
  const batch = plan.rows.slice(i, i + 400).map((row) => ({
    id: row.id,
    key_verified: row.keySourceVerified,
    processing: {
      version: plan.version,
      keySourceVerified: row.keySourceVerified,
      keyPage: row.keyPage,
      textTechnicalReady: row.textTechnicalReady,
      blockers: row.blockers,
    },
  }));
  await client.query('begin');
  try {
    const result = await client.query(`
      update "SourceQuestion" s set
        "answerStatus" = case when v.key_verified then 'VERIFIED'
          else case when s."answerStatus" = 'VERIFIED' then 'REVIEW_REQUIRED' else s."answerStatus" end end,
        extracted = jsonb_set(s.extracted, '{processing}', v.processing, true)
      from jsonb_to_recordset($1::jsonb) as v(id text, key_verified boolean, processing jsonb)
      where s.id = v.id and s."questionId" is null and s."reviewStatus" = 'PENDING'
        and (s.extracted->'processing' is distinct from v.processing
          or (v.key_verified and s."answerStatus" <> 'VERIFIED'))
    `, [JSON.stringify(batch)]);
    changed += result.rowCount;
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}
const after = await client.query(`select count(*)::int staged,
  count(*) filter (where "answerStatus"='VERIFIED')::int verified,
  count(*) filter (where extracted->'processing'->>'textTechnicalReady'='true')::int text_ready,
  count(*) filter (where "questionId" is not null)::int linked
  from "SourceQuestion"`);
await client.end();
console.log(JSON.stringify({ backupPath, changed, ...after.rows[0] }));
