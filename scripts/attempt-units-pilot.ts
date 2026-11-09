import 'dotenv/config';
import {db} from '../src/lib/db';
import {availability,generateTest} from '../src/lib/services/testing';
import {writeFile} from 'node:fs/promises';
const user=await db.user.findFirstOrThrow({select:{id:true}});
const config={name:'Authorized Units and Measurements recovery pilot',kind:'CUSTOM',topicIds:[],fullChapterIds:['physics-school-11-1'],count:10,mode:'LEARNING',durationMinutes:null,difficulty:{EASY:30,MEDIUM:50,HARD:20},difficultyMode:'ANY',exposure:'ALL',allocation:'AUTO',chapterCounts:{},language:'en',instantFeedback:false};
const supply=await availability(user.id,config);
let result:unknown;
try {const created=await generateTest(user.id,config);result={created};}catch(error){result={blocked:true,error:error instanceof Error?error.message:String(error)}}
const original=await db.question.count({where:{chapterId:'demo-units',status:'APPROVED',license:'ORIGINAL'}});
const report={configuration:config,availability:supply,pilot:result,existingOriginalUnitsQuestions:original,missingAuthorizedPilotQuestions:Math.max(0,10-original)};
await writeFile('.local/question-repair-v2/production-pilot.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await db.$disconnect();
