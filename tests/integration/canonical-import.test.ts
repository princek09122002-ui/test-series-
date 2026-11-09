import {it,expect,afterAll} from 'vitest';
import {db} from '../../src/lib/db';
import {importCanonicalQuestion} from '../../src/lib/services/canonical-import';
import type {CanonicalQuestion} from '../../src/lib/domain/canonical-question';
if(process.env.TEST_DATABASE_READY!=='true')throw Error('Isolated test database required');
afterAll(()=>db.$disconnect());
it('atomically imports private structured versions, rejects fabricated provenance and keys, and reruns without duplicates',async()=>{
 const id=crypto.randomUUID();const topic=await db.topic.findFirstOrThrow({where:{active:true,chapter:{active:true,subject:{name:'Physics',syllabus:{active:true}}}},include:{chapter:{include:{subject:true}}}});
 await db.sourceDocument.create({data:{id,sha256:id,fileName:'isolated-contract-fixture.pdf',title:'Original isolated fixture',pageCount:1,declaredCount:1,metadata:{subject:'Physics'}}});
 await db.sourceQuestion.create({data:{id,sourceId:id,sourceNumber:1,year:2024,exam:'TEST FIXTURE',page:1,type:'SINGLE_CORRECT',sourceOut:false,contentHash:id,answerStatus:'VERIFIED',extracted:{answer:'A',stem:'Original fixture'},suggestions:{}}});
 const q:CanonicalQuestion={schemaVersion:'1.0',id,contentVersion:1,subject:'Physics',subjectId:topic.chapter.subjectId,classLevel:topic.chapter.classLevel as 11|12,chapterId:topic.chapterId,primaryTopicIds:[topic.id],additionalTopicIds:[],prerequisiteTopicIds:[],type:'SINGLE_CORRECT',stem:[{type:'text',text:'Which number is equal to two?'}],options:['2','3','4','5'].map((text,i)=>({id:id+':'+ 'ABCD'[i],label:'ABCD'[i] as 'A'|'B'|'C'|'D',content:[{type:'text',text}]})),correctAnswerIds:[id+':A'],difficulty:'UNRATED',language:'en',source:{documentId:id,sourceQuestionId:id,questionNumber:1,section:'SINGLE_CORRECT',year:2024,paperVariant:'TEST FIXTURE',pages:[1],answerEvidence:{answer:'A',page:1}},syllabus:{versionId:topic.chapter.subject.syllabusId,eligibilityVersion:'TEST',eligibility:'UNVERIFIED',mappingState:'PENDING'},verification:{extraction:'PENDING',answer:'VERIFIED',academic:'PENDING',rights:'UNVERIFIED',publication:'PRIVATE'},presentation:'STRUCTURED',reviewMedia:[],issues:[]};
 expect((await importCanonicalQuestion(q)).inserted).toBe(true);expect((await importCanonicalQuestion(q)).inserted).toBe(false);
 expect(await db.canonicalQuestionOption.count({where:{questionId:id}})).toBe(4);expect(await db.canonicalQuestionTopic.count({where:{questionId:id}})).toBe(1);
 await expect(importCanonicalQuestion({...q,contentVersion:2,source:{...q.source,year:2025}})).rejects.toThrow('provenance');
 await expect(importCanonicalQuestion({...q,contentVersion:2,correctAnswerIds:[id+':B']})).rejects.toThrow('source key');
 await expect(importCanonicalQuestion({...q,contentVersion:2,verification:{...q.verification,publication:'PUBLISHED'}})).rejects.toThrow('cannot publish');
 expect(await db.canonicalQuestionRecord.count({where:{questionId:id}})).toBe(1);expect(await db.question.count({where:{id}})).toBe(0);
});
