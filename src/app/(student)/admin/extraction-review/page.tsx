/* eslint-disable @next/next/no-img-element -- Private source evidence cannot use the public optimizer. */
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { ScienceText } from "@/components/science-text";
import { redirect } from "next/navigation";
import { invalidateImportApproval } from "@/lib/services/publication";
import type { Prisma } from "@/generated/prisma/client";

type Version={version:string;warnings:string[];answerState:string;answerEvidence:unknown;segments:Array<{page:number}>;structured:{stem:{kind:string;text:string};options:Array<{label:string;kind:string;text:string}>}};
export default async function ExtractionReview({searchParams}:{searchParams:Promise<{id?:string;subject?:string;source?:string;issue?:string}>}){
  await requireStaff(false,true);
  const query=await searchParams;
  const sources=await db.sourceDocument.findMany({orderBy:{title:'asc'},select:{id:true,title:true,metadata:true}});
  const ids=sources.filter(s=>!query.subject||((s.metadata as {subject?:string}).subject??'Physics')===query.subject).map(s=>s.id);
  const rows=await db.sourceQuestion.findMany({where:{sourceId:query.source||{in:ids},...(query.id?{id:query.id}:{})},include:{source:true},take:100,orderBy:{id:'asc'}});
  const candidates=rows.filter(row=>{
    const versions=(row.extracted as {hybridVersions?:Version[]}).hybridVersions;
    return versions?.length&&(!query.issue||versions.at(-1)!.warnings.some(w=>w.includes(query.issue!)));
  });
  const row=candidates[0];
  async function save(form:FormData){
    'use server';
    const user=await requireStaff();
    const id=String(form.get('id'));
    const action=String(form.get('decision'));
    if(!['APPROVE_EXTRACTION','REEXTRACT','REJECT','SAVE'].includes(action)) throw Error('Invalid action');
    const text=String(form.get('stem')).trim();
    const options=['A','B','C','D'].map(label=>String(form.get(label)).trim());
    const imageMode=form.get('renderMode')==='IMAGE';
    if(action==='APPROVE_EXTRACTION'&&!imageMode&&(!text||options.some(v=>!v))) throw Error('A statement and four nonempty options are required for text presentation.');
    await db.$transaction(async tx=>{
      const record=await tx.sourceQuestion.findUniqueOrThrow({where:{id}});
      const raw=record.extracted as Record<string,Prisma.JsonValue>;
      const latest=(raw.hybridVersions as unknown as Version[]).at(-1);
      const repair=(raw.repairVersions as unknown as Array<{media:unknown[]}>|undefined)?.at(-1);
      if(action==='APPROVE_EXTRACTION'&&imageMode&&(!repair?.media.length||form.get('figureVerified')!=='on')) throw Error('A prepared image and explicit visual comparison are required');
      if(action==='APPROVE_EXTRACTION'&&latest?.warnings.some(w=>w.includes('VISUAL'))&&form.get('figureVerified')!=='on') throw Error('Compare required figures before approving extraction');
      const revisions=(raw.extractionReviews??[]) as Prisma.JsonValue[];
      const review={decision:action,reviewerId:user.id,at:new Date().toISOString(),text,options,renderMode:imageMode?'IMAGE':'TEXT',note:String(form.get('note')),figureVerified:form.get('figureVerified')==='on'};
      if(action==='APPROVE_EXTRACTION'&&review.note.trim().length<20) throw Error('Record source comparison evidence before approving extraction');
      await tx.sourceQuestion.update({where:{id},data:{extracted:{...raw,extractionReviews:[...revisions,review]} as Prisma.InputJsonValue}});
      await invalidateImportApproval(tx,id);
      await tx.auditLog.create({data:{userId:user.id,action:'EXTRACTION_REVIEW_'+action,entityId:id,metadata:review}});
    });
    const next=await db.sourceQuestion.findFirst({where:{id:{gt:id}},orderBy:{id:'asc'},select:{id:true}});
    redirect('/admin/extraction-review'+(next?'?id='+next.id:''));
  }
  let version=row?(row.extracted as {hybridVersions:Version[]}).hybridVersions.at(-1):undefined;
  const repair=row?(row.extracted as {repairVersions?:Array<{media:Array<{page:number}>;structured?:Version['structured']}>}).repairVersions?.at(-1):undefined;
  if(version&&repair?.structured) version={...version,structured:repair.structured};
  const savedReview=row?(row.extracted as {extractionReviews?:Array<{text:string;options:string[];renderMode?:string}>}).extractionReviews?.at(-1):undefined;
  if(version&&savedReview) version={...version,structured:{stem:{kind:'text',text:savedReview.text},options:savedReview.options.map((text,index)=>({kind:'text',label:'ABCD'[index],text}))}};
  return <div className="space-y-5"><h1 className="text-2xl font-bold">Extraction quality review</h1>
    <form className="flex flex-wrap gap-3"><select name="subject" defaultValue={query.subject??''}><option value="">All subjects</option>{['Physics','Chemistry','Biology'].map(s=><option key={s}>{s}</option>)}</select><select name="source" defaultValue={query.source??''}><option value="">All PDFs</option>{sources.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select><select name="issue" defaultValue={query.issue??''}><option value="">All extraction issues</option>{['MISSING_OPTIONS','CORRUPTED_GLYPH','VISUAL','ANSWER','SOURCE_COMPARISON_PENDING'].map(s=><option key={s}>{s}</option>)}</select><button>Filter queue</button></form>
    <p>Showing up to 100 source records per filter. Extraction review is separate from academic and publication approval. Shortcut: Alt+S saves and advances.</p>
    {row&&version?<><p>{row.source.title} · {row.exam} · source Q{row.sourceNumber} · page {row.page}</p><div className="grid gap-5 lg:grid-cols-2"><section><h2>Original private PDF region</h2>{version.segments.map(segment=><img key={segment.page} src={`/api/admin/hybrid-media/${row.id}?page=${segment.page}`} alt={`Original source page ${segment.page}`} className="w-full"/>)}</section><section><h2>Extracted text presentation — review pending</h2><ScienceText text={version.structured.stem.text}/>{version.structured.options.map(o=><div className="my-3 rounded border p-3" key={o.label}>{o.label}. <ScienceText text={o.text||'[MISSING OPTION]'}/></div>)}<p>Warnings: {version.warnings.join(', ')}</p><p>Answer association: {version.answerState}</p><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(version.answerEvidence,null,2)}</pre></section></div>
    {repair&&<section className="rounded border p-4"><h2>Private image fallback — presentation review required</h2><p>Includes source solution links; this reference cannot be published directly. A separate reviewed presentation crop is required.</p>{repair.media.map(m=><img key={m.page} src={`/api/admin/hybrid-media/${row.id}?page=${m.page}&repair=1`} alt="Private repaired question and options reference" className="w-full max-w-4xl"/>)}<fieldset className="flex gap-5"><legend>Interactive selection controls preview</legend>{['A','B','C','D'].map(label=><label key={label}><input type="radio" name="private-preview-answer" value={label}/> Option {label}</label>)}</fieldset></section>}
    <p className="flex flex-wrap gap-4"><a className="underline" href={'/admin/imports/'+row.id}>Review answer, chapter, topics, prerequisites, difficulty and academic approval</a><a className="underline" href={'/admin/imports/sources/'+row.sourceId}>Review source publication permission</a></p>
    <p>Academic status: {row.reviewStatus} · Answer: {row.answerStatus} · Rights: {row.rightsStatus} · Eligibility: {row.eligibility}</p>
    <form action={save} className="space-y-3">
      <label className="block">Presentation <select name="renderMode" defaultValue={savedReview?.renderMode??(repair?'IMAGE':'TEXT')}><option value="TEXT">Structured text and options</option><option value="IMAGE">Image with separate A–D controls</option></select></label>
      <input type="hidden" name="id" value={row.id}/><label className="block">Corrected stem<textarea name="stem" defaultValue={version.structured.stem.text} className="block w-full border p-3"/></label>{version.structured.options.map(o=><label className="block" key={o.label}>Option {o.label}<textarea name={o.label} defaultValue={o.text} className="block w-full border p-2"/></label>)}<label className="block"><input type="checkbox" name="figureVerified"/> I compared every required figure and option against the PDF</label><textarea name="note" placeholder="Source comparison evidence and remaining defects" className="block w-full border p-3"/>{['SAVE','APPROVE_EXTRACTION','REEXTRACT','REJECT'].map(action=><button name="decision" value={action} accessKey={action==='SAVE'?'s':undefined} className="mr-3 rounded border p-3" key={action}>{action} & Next</button>)}</form></>:<p>No versioned extraction is available in this filtered page yet.</p>}
    <div className="flex flex-wrap gap-3">{candidates.slice(0,30).map(r=><a className="underline" key={r.id} href={'?id='+r.id}>{r.source.title} Q{r.sourceNumber}</a>)}</div>
  </div>;
}
