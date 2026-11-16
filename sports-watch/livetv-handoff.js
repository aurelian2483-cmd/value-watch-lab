/* Explicit external LiveTV.sx handoff. No scraping, iframes, source injection or trust claims. */
(function(root){
 'use strict';
 const DIRECTORY='https://livetv.sx/enx/';
 function matchName(value){
   if(typeof value!=='string')return '';
   return value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,100);
 }
 function trustedDirectory(url){
   try{const u=new URL(url);return u.href===DIRECTORY&&u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}
 }
 const api=Object.freeze({DIRECTORY,matchName,trustedDirectory});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(!root.document)return;
 const doc=root.document;
 const selected=doc.getElementById('livetv-match-label');
 const copy=doc.getElementById('livetv-copy-match');
 const link=doc.getElementById('livetv-open');
 const status=doc.getElementById('livetv-status');
 const form=doc.getElementById('match-form');
 const input=doc.getElementById('match-name');
 if(![selected,copy,link,status,form,input].every(Boolean))return;
 if(!trustedDirectory(link.href)){link.removeAttribute('href');link.setAttribute('aria-disabled','true');return;}
 let current='';
 function setSelected(name){
   current=matchName(name);
   selected.value=current||'No match selected yet';
   copy.disabled=!current;
   status.textContent=current
     ?'Ready to look up: '+current+'. Open the external website, then search manually. No matching event URL or video source has been verified.'
     :'Select a fixture below, or manually enter a match, then open the external directory and locate it by name.';
 }
 // A single native match submit path handles both user-entered and fixture-selected matches.
 form.addEventListener('submit',()=>setSelected(input.value));
 copy.addEventListener('click',async()=>{
   if(!current)return;
   try{
     if(!root.navigator||!root.navigator.clipboard||!root.navigator.clipboard.writeText)throw Error('Clipboard unavailable');
     await root.navigator.clipboard.writeText(current);
     status.textContent='Copied match name: '+current+'. You can paste it into the external website.';
   }catch{
     selected.focus();
     selected.select();
     status.textContent='Automatic copying unavailable. Match name selected; use Copy to copy it.';
   }
 });
 setSelected('');
})(typeof globalThis!=='undefined'?globalThis:this);
