export type PhysicsChapter={id:string,topics:{id:string,name:string}[]};
const groups:Record<string,[number,number[]]>={
 'Units & Measurement':[11,[1]],'Motion in a Straight Line':[11,[2]],'Vector Algebra':[11,[3]],'Motion in a Plane':[11,[3]],'Laws of Motion':[11,[4]],'Work, Energy and Power':[11,[5]],'Center of Mass and Collision':[11,[5,6]],'Rotational Motion':[11,[6]],'Gravitation':[11,[7]],'Properties of Matter':[11,[8,9,10]],'Heat and Thermodynamics':[11,[10,11,12]],'Oscillations':[11,[13]],'Waves':[11,[14]],'Electrostatics':[12,[1,2]],'Capacitor':[12,[2]],'Current Electricity':[12,[3]],'Moving Charges and Magnetism':[12,[4]],'Magnetism and Matter':[12,[5]],'Electromagnetic Induction':[12,[6]],'Alternating Current':[12,[7]],'Electromagnetic Waves':[12,[8]],'Geometrical Optics':[12,[9]],'Wave Optics':[12,[10]],'Dual Nature of Radiation and Matter':[12,[11]],'Atoms and Nuclei':[12,[12,13]],'Semiconductor Electronics':[12,[14]],
};
export function candidateChapters(group:string){const entry=groups[group];return entry?entry[1].map(n=>`physics-school-${entry[0]}-${n}`):[];}
const words=(s:string)=>new Set(s.toLowerCase().match(/[a-z]{4,}/g)?.filter(w=>!['with','from','which','following','their','this','that','when','into','given'].includes(w))??[]);
export function suggestPhysicsMapping(group:string,stem:string,syllabus:PhysicsChapter[]){
 const tokens=words(stem),scope=new Set(candidateChapters(group));
 const ranked=syllabus.flatMap(c=>c.topics.map(t=>({chapterId:c.id,topicId:t.id,score:[...words(t.name)].filter(w=>tokens.has(w)).length,inSourceScope:scope.has(c.id)}))).filter(x=>x.score>=2).sort((a,b)=>Number(b.inSourceScope)-Number(a.inSourceScope)||b.score-a.score);
 return {status:'UNREVIEWED',method:'source-context-and-syllabus-token-v2',confidence:'LOW',candidateChapterIds:[...scope],candidates:ranked.filter(x=>x.inSourceScope).slice(0,5),possibleCrossChapterConcepts:ranked.filter(x=>!x.inSourceScope).slice(0,5),warning:'Suggestions require individual review; no prerequisite or topic is auto-approved.'};
}
