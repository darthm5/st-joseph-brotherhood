/* v2.5.0: streamlined workshop, no changes to calculation or warehouse requests. */
(()=>{
 const root=document.getElementById('craftEmbedded');if(!root)return;
 const app=root.querySelector('.app'),left=root.querySelector('#left'),calc=root.querySelector('.view[data-v="calc"]'),nav=root.querySelector('.views'),right=root.querySelector('.right');
 if(!app||!left||!calc||!nav||!right)return;
 const center=document.createElement('div');center.className='craft-workshop-center';left.after(center);center.append(calc);
 function heading(target,icon,title){const h=document.createElement('div');h.className='craft-workshop-title';h.textContent=icon+'  '+title;target.prepend(h)}
 heading(left,'⚒','Каталог изделий');heading(center,'▤','Ресурсы для заказа');heading(right,'⚖','Ваш заказ');
 const tools=root.querySelector('#toolrow');
 if(tools){const filter=document.createElement('details');filter.className='craft-extra-filters';const summary=document.createElement('summary');summary.textContent='Фильтры и сортировка';const inner=document.createElement('div');inner.className='craft-extra-filters-inner';filter.append(summary,inner);for(const id of ['tabs','ddcats','ddsort','fold']){const el=root.querySelector('#'+id);if(el)inner.append(el)}tools.append(filter)}
 const basket=root.querySelector('#zakaz'),done=root.querySelector('#odone'),undo=root.querySelector('#oundo'),tiles=root.querySelector('#tiles'),quick=root.querySelector('#craftQuickRows');
 const summary=document.createElement('div');summary.className='craft-order-overview';
 const info=document.createElement('div');info.className='craft-order-overview-info';info.setAttribute('aria-live','polite');summary.append(info);
 const action=document.createElement('button');action.type='button';action.className='craft-primary-action';action.textContent='Завершить заказ';summary.append(action);
 const hint=document.createElement('p');hint.className='hint';hint.textContent='Для склада братства сначала запроси выдачу и дождись подтверждения.';summary.append(hint);
 if(basket)basket.append(summary);
 action.addEventListener('click',()=>{if(done&&!done.hidden&&!done.disabled)done.click()});
 const update=()=>{
  const mode=nav.querySelector('button[aria-selected="true"]')?.dataset.view||'book';const workshop=mode==='book'||mode==='calc';
  root.classList.toggle('craft-workshop-mode',workshop);root.classList.toggle('craft-workshop-secondary',!workshop);
  center.hidden=!workshop;right.hidden=!workshop;
  const count=tiles?.querySelectorAll('.tile').length||0;
  info.textContent=count?`${count} поз. в заказе`:'Заказ пока пуст';
  const enabled=!!done&&!done.hidden&&!done.disabled;
  action.disabled=!enabled;action.textContent=done?.textContent.trim()||'Завершить заказ';
 };
 const mo=new MutationObserver(update);
 for(const b of nav.querySelectorAll('button[data-view]'))mo.observe(b,{attributes:true,attributeFilter:['aria-selected']});
 if(tiles)mo.observe(tiles,{childList:true,subtree:true});
 if(done)mo.observe(done,{attributes:true,attributeFilter:['hidden','disabled'],childList:true,subtree:true});
 if(undo)mo.observe(undo,{attributes:true,attributeFilter:['hidden','disabled']});
 update();
})();
