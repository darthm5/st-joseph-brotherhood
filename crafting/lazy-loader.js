/* v2.9.1.1 — load calculator scripts once, on demand, in dependency order. */
(()=>{
 const button=document.getElementById('craftShowCalculator');
 const root=document.getElementById('craftEmbedded');
 const status=document.getElementById('craftLazyStatus');
 const retry=document.getElementById('craftLazyRetry');
 let pending=null, next=0, ready=false;
 const scripts=['crafting/embedded.js?v=2913','crafting/workshop-layout.js?v=288access','crafting/account-sync.js?v=260'];
 function append(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error(src));};document.head.append(s);});}
 function open(){
  if(!canVisit('crafts')||ready||pending)return;
  root.hidden=true;status.hidden=false;retry.hidden=true;status.firstElementChild.textContent='Загрузка счётной книги…';
  pending=(async()=>{try{
   while(next<scripts.length){await append(scripts[next]);next++;}
   ready=true;root.hidden=false;status.hidden=true;
   document.dispatchEvent(new Event('household-access-change'));
   if(!document.getElementById('craftCalculator').hidden&&canVisit('crafts'))button.click();
  }catch(e){status.firstElementChild.textContent='Не удалось загрузить калькулятор. Проверьте соединение.';retry.hidden=false;console.error(e);}finally{pending=null;}})();
 }
 button.addEventListener('click',open);retry.addEventListener('click',open);
})();
