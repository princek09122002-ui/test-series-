/* eslint-disable @next/next/no-img-element -- Question assets use authenticated endpoints. */
import type {ContentBlock} from '@/lib/domain/canonical-question';
import {ScienceText} from '@/components/science-text';
export function QuestionContent({blocks,review=false}:{blocks:ContentBlock[];review?:boolean}){
  return <div className="space-y-3 break-words">{blocks.map((block,index)=>{
    if(block.type==='text')return <ScienceText key={index} text={block.text}/>;
    if(block.type==='latex')return <ScienceText key={index} text={(block.display?'$$':'$')+block.value+(block.display?'$$':'$')}/>;
    if(block.type==='image')return (review||block.visibility==='STUDENT'&&block.verified)?<img key={index} src={block.url} alt={block.alt} className="max-w-full h-auto rounded"/>:null;
    if(block.type==='table')return <div key={index} className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr>{block.headers.map((header,i)=><th className="border p-2" key={i}><ScienceText text={header}/></th>)}</tr></thead><tbody>{block.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} className="border p-2"><ScienceText text={cell}/></td>)}</tr>)}</tbody></table></div>;
    const List=block.ordered?'ol':'ul';return <List key={index} className={block.ordered?'list-decimal pl-6':'list-disc pl-6'}>{block.items.map((item,i)=><li key={i}><ScienceText text={item}/></li>)}</List>;
  })}</div>;
}
