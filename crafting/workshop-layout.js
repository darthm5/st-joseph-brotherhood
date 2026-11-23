/* v2.5.1: actual two-column workshop; preserve existing calculator event handlers. */
(()=>{
 const root=document.getElementById('craftEmbedded');if(!root)return;
 const app=root.querySelector('.app'),left=root.querySelector('#left'),calc=root.querySelector('.view[data-v="calc"]'),right=root.querySelector('.right'),nav=root.querySelector('.views');
 if(!app||!left||!calc||!right||!nav)return;
 const center=document.createElement('section');center.className='craft-workshop-center';center.setAttribute('aria-label','Ресурсы и склады');left.after(center);center.append(calc);
 const title=(parent,txt)=>{const h=document.createElement('h2');h.className='craft-workshop-title';h.textContent=txt;parent.prepend(h)};
 title(left,'Каталог изделий');title(center,'Ресурсы для заказа');title(right,'Ваш заказ');
 const tools=root.querySelector('#toolrow');
 if(tools){const filter=document.createElement('details');filter.className='craft-extra-filters';const s=document.createElement('summary');s.textContent='Фильтры';const inner=document.createElement('div');inner.className='craft-extra-filters-inner';filter.append(s,inner);for(const id of ['tabs','ddcats','ddsort','fold']){const el=root.querySelector('#'+id);if(el)inner.append(el)}tools.append(filter)}
 // Move the REAL completion controls, not proxy buttons, into the order panel.
 const basket=root.querySelector('#zakaz'),done=root.querySelector('#odone'),undo=root.querySelector('#oundo'),note=root.querySelector('#odonenote');
 const actions=document.createElement('div');actions.className='craft-final-actions';
 if(done)actions.append(done);if(undo)actions.append(undo);if(note)actions.append(note);
 if(basket)basket.append(actions);
 const tiles=root.querySelector('#tiles');
 const update=()=>{
   const mode=nav.querySelector('[data-view][aria-selected="true"]')?.dataset.view||'book';const workshop=mode==='book'||mode==='calc';
   root.classList.toggle('craft-workshop-mode',workshop);root.classList.toggle('craft-workshop-secondary',!workshop);
   center.hidden=!workshop;right.hidden=!workshop;calc.hidden=!workshop;
   // Catalogue remains visible in the workshop, independent of the old calc tab.
   const book=root.querySelector('#catbook');if(book)book.hidden=!workshop;
   if(workshop){for(const b of nav.querySelectorAll('[data-view]'))b.setAttribute('aria-selected',b.dataset.view==='book'?'true':'false')}
 };
 for(const b of nav.querySelectorAll('[data-view]'))b.addEventListener('click',()=>requestAnimationFrame(update));
 const obs=new MutationObserver(()=>{const mode=nav.querySelector('[data-view][aria-selected="true"]')?.dataset.view;if(mode==='prices'||mode==='journal'){
 root.classList.remove('craft-workshop-mode');root.classList.add('craft-workshop-secondary');center.hidden=true;right.hidden=true;
 }});
 for(const b of nav.querySelectorAll('[data-view]'))obs.observe(b,{attributes:true,attributeFilter:['aria-selected']});
 // Compact list view uses the same original quantity buttons and variant inputs.
 const rename=()=>{if(!tiles)return;for(const tile of tiles.querySelectorAll('.tile')){tile.setAttribute('role','group');tile.setAttribute('aria-label',tile.querySelector('.tn')?.textContent||'Изделие')}};
 if(tiles){new MutationObserver(rename).observe(tiles,{childList:true});rename()}
 update();
})();