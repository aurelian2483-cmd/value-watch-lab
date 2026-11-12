'use strict';
// Visual-only navigation bridge: delegates to existing, tested Value Watch controls.
(()=>{function ready(){
 const root=document.querySelector('.pro-landing');if(!root)return;
 root.querySelectorAll('[data-pro-sport]').forEach(btn=>btn.addEventListener('click',()=>{
  const sport=btn.getAttribute('data-pro-sport');
  const target=document.querySelector('#sport-nav button[data-sport="'+sport+'"]');
  if(target)target.click();
  const main=document.getElementById('main-content');main?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 root.querySelectorAll('[data-pro-slot]').forEach(btn=>btn.addEventListener('click',()=>{
  const n=btn.getAttribute('data-pro-slot'),target=document.querySelector('#slip-tabs button[data-slot="'+n+'"]');
  if(target)target.click();
  const open=document.getElementById('paper-open');if(open&&window.matchMedia?.('(max-width: 1000px)').matches)open.click();
  document.getElementById('slip-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();