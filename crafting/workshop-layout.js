/* v2.4.8: unified workshop presentation. Existing calculation, request and completion handlers remain authoritative. */
(()=>{
  const root=document.getElementById('craftEmbedded');if(!root)return;
  const app=root.querySelector('.app'),left=root.querySelector('#left'),calc=root.querySelector('.view[data-v="calc"]'),book=root.querySelector('.view[data-v="book"]'),nav=root.querySelector('.views'),right=root.querySelector('.right');
  if(!app||!left||!calc||!book||!nav||!right)return;
  const center=document.createElement('div');center.className='craft-workshop-center';center.setAttribute('aria-label','Расчёт ресурсов');left.after(center);center.appendChild(calc);
  function title(container,icon,name,count){const el=document.createElement('div');el.className='craft-workshop-title';const ico=document.createElement('span');ico.className='craft-workshop-icon';ico.textContent=icon;const txt=document.createElement('span');txt.textContent=name;el.append(ico,txt);if(count){const c=document.createElement('span');c.className='craft-workshop-count';c.id=count;el.append(c)}container.prepend(el)}
  title(left,'⚒','Каталог рецептов','craftWorkshopCatalogueCount');title(center,'▤','Требуемые ресурсы');title(right,'⚖','Заказ и стоимость','craftWorkshopOrderCount');
  const basket=root.querySelector('#zakaz'),done=root.querySelector('#odone'),tiles=root.querySelector('#tiles');
  const action=document.createElement('div');action.className='craft-workshop-action';
  const state=document.createElement('div');state.className='craft-workshop-state';state.setAttribute('role','status');
  const go=document.createElement('button');go.type='button';go.textContent='Завершить заказ';go.addEventListener('click',()=>{if(done&&!done.disabled&&!done.hidden)done.click()});
  action.append(state,go);basket?.append(action);
  const update=()=>{
    const selected=nav.querySelector('button[aria-selected="true"]');const mode=selected?.dataset.view||'book';const active=mode==='book'||mode==='calc';
    root.classList.toggle('craft-workshop-mode',active);root.classList.toggle('craft-workshop-book',mode==='book');root.classList.toggle('craft-workshop-calc',mode==='calc');center.hidden=!active;
  };
  const updateOrder=()=>{
    const count=root.querySelector('#craftWorkshopOrderCount');if(count){const n=tiles?.querySelectorAll('.tile').length||0;const s=n===1?'позиция':n>=2&&n<=4?'позиции':'позиций';const next=n+' '+s;if(count.textContent!==next)count.textContent=next}
    if(done){const text=done.textContent.trim();if(go.textContent!==text)go.textContent=text;const disabled=done.disabled||done.hidden;if(go.disabled!==disabled)go.disabled=disabled;const note=root.querySelector('#odonenote')?.textContent.trim()||'';const next=note||(!disabled?'Проверь количество и остатки перед выполнением заказа.':'Добавь изделия в заказ.');if(state.textContent!==next)state.textContent=next}
  };
  const observer=new MutationObserver(update);for(const b of nav.querySelectorAll('button[data-view]'))observer.observe(b,{attributes:true,attributeFilter:['aria-selected']});
  if(tiles)new MutationObserver(updateOrder).observe(tiles,{childList:true,subtree:false});
  if(done)new MutationObserver(updateOrder).observe(done,{childList:true,characterData:true,attributes:true,attributeFilter:['disabled','hidden']});
  const note=root.querySelector('#odonenote');if(note)new MutationObserver(updateOrder).observe(note,{childList:true,characterData:true,subtree:true});
  update();updateOrder();
})();
