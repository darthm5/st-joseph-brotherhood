(()=>{
 const el=id=>document.getElementById('notice293'+id), dialog=el('Dialog');
 const allowed=()=>['approved','admin'].includes(accessState.mode)&&!!currentSession?.user?.id;
 let limit=30,seq=0,busy=false;
 const labels={profile:'Братство',treasury:'Казна',storehouse:'Кладовая',work:'Работа',calendar:'Календарь'};
 function reset(){++seq;el('Bell').hidden=!allowed();el('Count').textContent='';el('List').replaceChildren();if(dialog.open)dialog.close();}
 async function refresh(){
  el('Bell').hidden=!allowed();if(!allowed())return;
  const uid=currentSession.user.id,n=++seq;
  const valid=()=>n===seq&&allowed()&&currentSession.user.id===uid;
  try{
   const count=await supabaseClient.from('guild_notifications').select('id',{count:'exact',head:true}).eq('recipient',uid).is('read_at',null);
   if(!valid())return;if(count.error)throw count.error;
   el('Count').textContent=count.count?String(count.count):'';
   if(!dialog.open)return;
   const r=await supabaseClient.from('guild_notifications').select('id,section,message,created_at,read_at').eq('recipient',uid).order('id',{ascending:false}).limit(limit+1);
   if(!valid()||!dialog.open)return;if(r.error)throw r.error;
   el('Status').textContent=r.data.length?'':'Уведомлений пока нет.';el('List').replaceChildren();el('More').hidden=r.data.length<=limit;
   for(const item of r.data.slice(0,limit)){
    if(!canVisit(item.section))continue;
    const b=document.createElement('button');b.type='button';b.className='notice293Item'+(item.read_at?'':' unread');
    const title=document.createElement('strong');title.textContent=labels[item.section];const msg=document.createElement('span');msg.textContent=item.message;const time=document.createElement('small');time.textContent=new Date(item.created_at).toLocaleString('ru-RU');b.append(title,msg,time);
    b.onclick=async()=>{if(busy||!allowed()||currentSession.user.id!==uid||!canVisit(item.section))return;busy=true;try{if(!item.read_at){const r=await supabaseClient.from('guild_notifications').update({read_at:new Date().toISOString()}).eq('recipient',uid).eq('id',item.id).is('read_at',null);if(r.error)throw r.error;}if(allowed()&&currentSession.user.id===uid){dialog.close();navigate(item.section);await refresh();}}catch(e){el('Status').textContent='Ошибка: '+e.message;}finally{busy=false;}};
    el('List').append(b);
   }
  }catch(e){if(valid()&&dialog.open)el('Status').textContent='Ошибка загрузки: '+e.message;}
 }
 el('Bell').onclick=()=>{if(!allowed())return;limit=30;el('Status').textContent='Загрузка…';dialog.showModal();refresh();};
 el('Close').onclick=()=>dialog.close();el('More').onclick=()=>{limit+=30;refresh();};
 el('All').onclick=async()=>{if(busy||!allowed())return;busy=true;try{const uid=currentSession.user.id;const r=await supabaseClient.from('guild_notifications').update({read_at:new Date().toISOString()}).eq('recipient',uid).is('read_at',null);if(r.error)throw r.error;await refresh();}catch(e){el('Status').textContent='Ошибка: '+e.message;}finally{busy=false;}};
 document.addEventListener('household-access-change',()=>{reset();if(allowed())refresh();});window.notice293Refresh=refresh;reset();if(allowed())refresh();
})();
