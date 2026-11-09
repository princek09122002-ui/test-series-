import 'dotenv/config';
import pg from 'pg';
import {mkdirSync,writeFileSync} from 'node:fs';
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
const names=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);
const tables={};for(const name of names){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))throw Error('Unexpected table identifier');tables[name]=(await client.query(`SELECT row_to_json(t) AS row FROM "${name}" t`)).rows.map(r=>r.row);}
await client.query('COMMIT');await client.end();
const path='.local/backups/pre-chemistry-'+new Date().toISOString().replaceAll(':','-');mkdirSync(path,{recursive:true});writeFileSync(path+'/database.json',JSON.stringify({capturedAt:new Date().toISOString(),tables}));mkdirSync('.local/chemistry-import',{recursive:true});writeFileSync('.local/chemistry-import/backup-path.txt',path+'/database.json');
console.log('Read-only database backup:',path,'tables:',names.length,'questions:',tables.Question.length,'sourceQuestions:',tables.SourceQuestion.length);
