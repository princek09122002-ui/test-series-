import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {QuestionContent} from '../../src/components/question-content';
it('renders math, ordered table cells and lists while escaping extracted HTML',()=>{
 const html=renderToStaticMarkup(createElement(QuestionContent,{blocks:[{type:'text',text:'<script>bad()</script>'},{type:'latex',value:'x^2',display:false},{type:'table',headers:['A','B'],rows:[['one','two']]},{type:'list',ordered:true,items:['first','second']}]}));
 expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('katex');expect(html.indexOf('one')).toBeLessThan(html.indexOf('two'));expect(html).toContain('<ol');
});
it('withholds private or unverified media from student rendering',()=>{
 const html=renderToStaticMarkup(createElement(QuestionContent,{blocks:[{type:'image',url:'/api/admin/hybrid-media/fixture',alt:'private',visibility:'PRIVATE_REVIEW',verified:true},{type:'image',url:'/api/question-media/fixture',alt:'unverified',visibility:'STUDENT',verified:false}]}));
 expect(html).not.toContain('<img');
});
