import {beforeAll,afterAll,it,expect} from 'vitest';
import {db} from '../../src/lib/db';import {eligibleBankWhere} from '../../src/lib/services/publication';
if(process.env.TEST_DATABASE_READY!=='true'||!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'))throw Error('Isolated test database required');
let id:string;
beforeAll(async()=>{
 id=crypto.randomUUID();const chapter=await db.chapter.findFirstOrThrow();
 await db.sourceDocument.create({data:{id,fileName:'test-only.pdf',title:'Test-only source',sha256:id,pageCount:1,declaredCount:1,rightsStatus:'CLEARED',metadata:{permissionDecision:{authorizedScope:'STUDENT_TESTS'}}}});
 await db.question.create({data:{id,chapterId:chapter.id,text:'Isolated integration fixture',correctOption:0,explanation:'Test-only explanation',difficulty:'EASY',status:'APPROVED',active:true,license:'LICENSED',examYear:2005}});
 await db.sourceQuestion.create({data:{id,sourceId:id,sourceNumber:1,year:2005,exam:'Fixture',page:1,type:'SINGLE_CORRECT',sourceOut:false,contentHash:id,extracted:{},suggestions:{},questionId:id}});
});afterAll(()=>db.$disconnect());
it('denies private pending content even when Question is approved',async()=>expect(await db.question.count({where:{AND:[eligibleBankWhere,{id}]}})).toBe(0));
it('requires every publication gate independently',async()=>{
 const complete={reviewStatus:'APPROVED',answerStatus:'VERIFIED',rightsStatus:'CLEARED',eligibility:'ELIGIBLE',eligibilityVersion:'NEET-2027-PROVISIONAL',type:'SINGLE_CORRECT',sourceOut:false};
 for(const bad of [{rightsStatus:'UNVERIFIED'},{answerStatus:'SOURCE_MATCHED'},{reviewStatus:'PENDING'},{eligibility:'UNVERIFIED'},{eligibilityVersion:'OLD'},{type:'MULTIPLE_CORRECT'},{sourceOut:true}]){
 await db.sourceQuestion.update({where:{id},data:{...complete,...bad}});expect(await db.question.count({where:{AND:[eligibleBankWhere,{id}]}})).toBe(0);
 }
 await db.sourceQuestion.update({where:{id},data:complete});expect(await db.question.count({where:{AND:[eligibleBankWhere,{id}]}})).toBe(1);
});
it('filters published questions by exam year in PostgreSQL',async()=>{expect(await db.question.count({where:{AND:[eligibleBankWhere,{id,examYear:{gte:2016}}]}})).toBe(0);expect(await db.question.count({where:{AND:[eligibleBankWhere,{id,examYear:2005}]}})).toBe(1)});
it('excludes archived questions after publication',async()=>{await db.question.update({where:{id},data:{active:false,status:'ARCHIVED'}});expect(await db.question.count({where:{AND:[eligibleBankWhere,{id}]}})).toBe(0)});
it('rejects duplicate source occurrences in PostgreSQL',async()=>{const r=await db.sourceQuestion.findUniqueOrThrow({where:{id}});await expect(db.sourceQuestion.create({data:{...r,id:crypto.randomUUID(),questionId:null,extracted:{},suggestions:{}}})).rejects.toThrow()});
