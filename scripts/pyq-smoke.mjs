import "dotenv/config";
import { readFileSync } from "node:fs";
const { student } = JSON.parse(readFileSync(".local/credentials.json", "utf8"));
const base = "http://127.0.0.1:3000",
  cookies = new Map();
async function request(path, options = {}) {
  const r = await fetch(base + path, {
    ...options,
    redirect: "manual",
    headers: {
      ...options.headers,
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    signal: AbortSignal.timeout(30000),
  });
  for (const cookie of r.headers.getSetCookie()) {
    const part = cookie.split(";")[0],
      i = part.indexOf("=");
    cookies.set(part.slice(0, i), part.slice(i + 1));
  }
  return r;
}
const csrf = await (await request('/api/auth/csrf')).json();
await request('/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:'http://localhost:3000'},body:new URLSearchParams({email:student.email,password:student.password,csrfToken:csrf.csrfToken,callbackUrl:'http://localhost:3000/dashboard',json:'true'})});
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const rows=JSON.parse(readFileSync('.local/pyq-ingest/app-import.json','utf8'));
const paper=rows.find(r=>r.paper==='NEET 2019').paper_id;
const create=await request('/api/pyq',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000'},body:JSON.stringify({paper,subject:'Chemistry',count:3})});
const made=await create.json();assert(create.status===201,JSON.stringify(made));
const payload=await (await request('/api/tests/'+made.testId)).json();
assert(payload.questions.length===3,'Question count');
assert(!/"(?:correctOption|explanation|snapshot|answer_raw|answer_page)"/.test(JSON.stringify(payload)),'Answer leaked in active payload');
const image=payload.questions.flatMap(q=>q.media)[0];assert(image,'Expected source screenshot');
assert((await request(image.url)).status===200,'Assigned media not served');
assert((await fetch(base+image.url)).status===401,'Anonymous media access');
assert((await fetch(base+'/api/tests/'+made.testId)).status===401,'Anonymous attempt access');
const before=await request('/tests/'+made.testId+'/result');const beforeBody=await before.text();assert([303,307].includes(before.status)||(beforeBody.includes('NEXT_REDIRECT')&&!beforeBody.includes('Your test, understood.')),'Active result revealed');
const {Client}=await import('pg');const pg=new Client({connectionString:process.env.DATABASE_URL});await pg.connect();
await pg.query('UPDATE "TestConfiguration" SET "instantFeedback"=true, "mode"=$1 WHERE "testId"=$2',['LEARNING',made.testId]);
const saved=await (await request('/api/tests/'+made.testId+'/answers',{method:'PUT',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000'},body:JSON.stringify({testQuestionId:payload.questions[0].testQuestionId,selectedOption:0,marked:false,revision:1})})).json();
assert(saved.ok&&!('feedback' in saved)&&!('correctOption' in saved),'Legacy instant feedback leaked');
const result=await request('/api/tests/'+made.testId+'/submit',{method:'POST',headers:{Origin:'http://localhost:3000'}});assert(result.status===200,'Submission failed');
assert((await request('/tests/'+made.testId+'/result')).status===200,'Result missing');
const originalCookies=new Map(cookies);cookies.clear();
const otherEmail=`pyq-security-${Date.now()}@example.test`,otherPassword='Isolation-test-password-2026!';
const registration=await request('/api/register',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000'},body:JSON.stringify({name:'Security verification',email:otherEmail,password:otherPassword})});assert(registration.ok,'Test account creation');
const otherCsrf=await (await request('/api/auth/csrf')).json();await request('/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:'http://localhost:3000'},body:new URLSearchParams({email:otherEmail,password:otherPassword,csrfToken:otherCsrf.csrfToken,json:'true'})});
assert((await request('/api/tests/'+made.testId)).status===404,'Another student accessed test');
assert((await request(image.url)).status===404,'Another student accessed assigned image');
await pg.query('DELETE FROM "User" WHERE email=$1',[otherEmail]);cookies.clear();for(const [k,v] of originalCookies)cookies.set(k,v);
await pg.end();
const timings=[];for(let run=0;run<2;run++){for(const route of ['/dashboard','/tests','/syllabus','/pyq']){const start=performance.now();const r=await request(route);await r.text();timings.push({run,route,status:r.status,ms:Math.round(performance.now()-start)});}}
console.log(JSON.stringify({security:'active payload, legacy feedback, result gate and anonymous access checks passed',testId:made.testId,timings},null,2));
const {chromium}=await import('@playwright/test');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}});
await context.addCookies([...cookies].map(([name,value])=>({name,value,url:base})));
const page=await context.newPage();await page.goto(base+'/pyq');await page.screenshot({path:'.local/qa/pyq-library.png',fullPage:true});
const newTest=await (await request('/api/pyq',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000'},body:JSON.stringify({paper,subject:'Chemistry',count:2})})).json();
const pageResponse=await page.goto(base+'/tests/'+newTest.testId);const html=await pageResponse.text();assert(!html.includes('\\"correctOption\\":'),'Answer key in serialized page');
await page.locator('img').first().waitFor();await page.waitForFunction(()=>[...document.images].some(i=>i.naturalWidth>0));
await page.screenshot({path:'.local/qa/pyq-image-exam.png',fullPage:true});await browser.close();console.log('Browser: PYQ library and full question screenshot loaded');