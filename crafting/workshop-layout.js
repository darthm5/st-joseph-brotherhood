/* v2.5.2 — section-first calculator UI. All calculations and Supabase handlers remain in embedded.js. */
(()=>{
 const root=document.getElementById('craftEmbedded');if(!root)return;
 const get=s=>root.querySelector(s), make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n};
 const header=get('.craft-compact'),app=get('.app'),left=get('#left'),right=get('.right'),book=get('#catbook'),prices=get('.view[data-v="prices"]'),calc=get('.view[data-v="calc"]'),journal=get('.view[data-v="journal"]'),basket=get('#zakaz');
 if(!header||!app||!book||!prices||!calc||!journal||!basket)return;
 root.classList.add('craft-v252');
 const shell=make('div','craft252-shell');header.after(shell);
 const nav=make('div','craft252-navigation');shell.append(nav);
 const sections=[['recipes','⚒','Рецепты','Выбор изделий и оформление заказа'],['prices','◈','Цены сырья','Стоимость материалов и заготовок'],['stock','▣','Склад','Личные и общие остатки'],['journal','▤','Журнал','История выполненных заказов']];
 const buttons={};sections.forEach(([id,icon,label,desc])=>{const b=make('button','craft252-nav-btn');b.type='button';b.innerHTML=`<span class="craft252-nav-icon">${icon}</span><strong>${label}</strong><small>${desc}</small>`;nav.append(b);buttons[id]=b;b.addEventListener('click',()=>open(id))});
 const home=make('div','craft252-home');home.innerHTML='<h2>⚒ Счётная книга ремесленника</h2><p>Выберите раздел для работы с рецептами, ценами, складами или журналом.</p>';shell.prepend(home);
 const body=make('div','craft252-body');shell.append(body);
 const page=(id,title)=>{const n=make('section','craft252-page craft252-'+id);n.dataset.page=id;n.innerHTML=`<div class="craft252-pagehead"><button class="craft252-back" type="button">← Разделы</button><h2>${title}</h2></div>`;body.append(n);n.querySelector('.craft252-back').addEventListener('click',()=>open('home'));return n};
 const recipePage=page('recipes','⚒ Рецепты и заказ'),pricePage=page('prices','◈ Цены сырья'),stockPage=page('stock','▣ Склад'),journalPage=page('journal','▤ Журнал'),resultPage=page('result','▤ Расчёт заказа');
 const recipeTools=make('div','craft252-tools'),craftTabs=make('div','craft252-crafts'),recipeFilters=make('div','craft252-filters');recipePage.append(recipeTools,craftTabs,recipeFilters);
 const secs=get('#secs'),q=get('#q'),favorites=get('#craftFavoritesOnly'),levels=get('#tabs'),cats=get('#ddcats'),sort=get('#ddsort');
 if(q)recipeTools.append(q);if(favorites)recipeTools.append(favorites);if(secs)craftTabs.append(secs);if(levels)recipeFilters.append(levels);if(cats)recipeFilters.append(cats);if(sort)recipeFilters.append(sort);
 const recipeGrid=make('div','craft252-recipegrid');recipePage.append(recipeGrid);
 const catalogue=make('div','craft252-catalogue');catalogue.innerHTML='<h3>Каталог изделий</h3>';recipeGrid.append(catalogue);catalogue.append(book);
 const order=make('div','craft252-order');order.innerHTML='<h3>Ваш заказ</h3>';recipeGrid.append(order);order.append(basket);
 const calcButton=make('button','craft252-calculate','Рассчитать заказ →');calcButton.type='button';order.append(calcButton);calcButton.addEventListener('click',()=>open('result'));
 const priceTools=make('div','craft252-price-tools');priceTools.innerHTML='<strong>Ремесло:</strong>';pricePage.append(priceTools);
 // Same source buttons are used in recipes and prices, so existing event listeners continue to work.
 const priceCrafts=make('div','craft252-price-crafts');priceTools.append(priceCrafts);
 const syncPriceCrafts=()=>{priceCrafts.replaceChildren();for(const orig of secs?.querySelectorAll('button[data-s]')||[]){const b=make('button','craft252-craft-btn',orig.textContent);b.type='button';b.dataset.s=orig.dataset.s;b.setAttribute('aria-pressed',orig.getAttribute('aria-pressed')||'false');b.addEventListener('click',()=>{orig.click();syncPriceCrafts()});priceCrafts.append(b)}};
 if(secs){secs.addEventListener('click',()=>requestAnimationFrame(syncPriceCrafts));syncPriceCrafts()}
 pricePage.append(prices);journalPage.append(journal);
 const stockTabs=make('div','craft252-stocktabs');stockPage.append(stockTabs);
 const personalBtn=make('button','craft252-stockbtn','Личный склад'),guildBtn=make('button','craft252-stockbtn','Склад братства');personalBtn.type=guildBtn.type='button';stockTabs.append(personalBtn,guildBtn);
 const personal=get('#craftPersonalStock')||get('#stock')?.closest('details'),guild=get('#craftGuildStock');
 const stockPanel=make('div','craft252-stockpanel');stockPage.append(stockPanel);
 if(personal)stockPanel.append(personal);if(guild)stockPanel.append(guild);
 const stockInfo=make('p','craft252-stockinfo','Личный склад можно редактировать. Склад братства загружается из кладовой и доступен только для просмотра.');stockPage.insertBefore(stockInfo,stockPanel);
 const refresh=make('button','craft252-refresh','↻ Обновить остатки');refresh.type='button';refresh.addEventListener('click',()=>get('#craftGuildRefresh')?.click());stockTabs.append(refresh);
 let stockMode='personal';const showStock=mode=>{stockMode=mode;personalBtn.setAttribute('aria-pressed',String(mode==='personal'));guildBtn.setAttribute('aria-pressed',String(mode==='guild'));if(personal){personal.hidden=mode!=='personal';personal.open=mode==='personal';personal.style.display=mode==='personal'?'block':'none'}if(guild){guild.hidden=mode!=='guild';guild.open=mode==='guild';guild.style.display=mode==='guild'?'block':'none'}refresh.hidden=mode!=='guild';if(mode==='guild')get('#craftGuildRefresh')?.click()};personalBtn.addEventListener('click',()=>showStock('personal'));guildBtn.addEventListener('click',()=>showStock('guild'));showStock('personal');
 // Source selection lives in order details, before calculating. Reuse original radio controls.
 const source=get('.craft-stock-source');
 const detail=get('#omore');if(detail)detail.hidden=true;
 if(source&&detail){
   source.classList.add('craft254-source');
   const title=make('strong','craft254-source-title','Источник ресурсов для расчёта');
   source.prepend(title);
   order.insertBefore(source,calcButton);
   const preview=make('div','craft254-source-preview');preview.id='craft254SourcePreview';source.after(preview);
   source.querySelector('strong:not(.craft254-source-title)')?.remove();
   const refresh=source.querySelector('#craftGuildRefresh');
   if(refresh)refresh.hidden=true;
   source.querySelectorAll('input[name="craftStockSource"]').forEach(r=>r.addEventListener('change',()=>{
     const st=get('#craftGuildStatus');if(st)st.textContent=r.value==='guild'?'Используются остатки склада братства; выдача требует одобрения.':'Используется личный склад.';
   }));
 }
 const back=make('button','craft252-back craft252-edit','← Изменить состав заказа');back.type='button';resultPage.append(back);back.addEventListener('click',()=>open('recipes'));
 const resultOrder=make('div','craft252-result-order');resultPage.append(resultOrder);
 const total=get('#bsum'),priceByItem=get('.craft-item-prices'),actions=get('#odone')?.parentElement;
 // Cost summary and real completion controls remain single instances; move them into result view only while calculating.
 const cost=make('div','craft252-cost');resultOrder.append(cost);
 const markup=get('#pricesm');const workRow=make('div','craft253-work');workRow.innerHTML='<strong>Стоимость работы</strong><span class="craft253-workhint">Процент от себестоимости</span>';if(markup)workRow.append(markup);cost.append(workRow);
 const completion=make('div','craft252-completion');resultOrder.append(completion);
 const resourcePanel=make('div','craft255-resource-panel');resultPage.insertBefore(resourcePanel,resultOrder);
 const resourceSummary=get('#craftQuickSummary'),resourceBreakdown=get('#craftDetailedBreakdown');
 const calcStatus=get('#craftGuildStatus');
 if(resourceSummary)resourcePanel.append(resourceSummary);
 if(resourceBreakdown)resourcePanel.append(resourceBreakdown);
 if(calcStatus)resourcePanel.append(calcStatus);
 // Show breakdown on the final screen, not buried in the stock section.
 if(resourceBreakdown)resourceBreakdown.open=false;

 // Decorative line icons, independent of the calculation engine.
 const paths={hammer:'M3 21l10-10 M9 7l4-4 8 8-4 4z M13 3l2-2 8 8-2 2',coins:'M3 6c0-4 18-4 18 0s-18 4-18 0v5c0 4 18 4 18 0V6 M3 11v5c0 4 18 4 18 0v-5 M3 16v4c0 4 18 4 18 0v-4',chest:'M3 10V6l3-3h12l3 3v4 M3 10h18v11H3z M10 10v5h4v-5',book:'M3 3h8l1 3 1-3h8v17h-8l-1 2-1-2H3z M12 6v16 M6 8h3 M6 12h3 M15 8h3 M15 12h3',shield:'M12 2l9 4v7c0 5-9 9-9 9s-9-4-9-9V6z M12 6v12 M7 11h10',sword:'M3 21l6-6 M5 11l8 8 M8 14L19 3l2-1-1 4L11 17',bow:'M4 3Q24 12 4 21L9 12z M2 12h20 M18 8l4 4-4 4',needle:'M4 20L19 5q4-4 2-2L7 18z M4 20q-4-8 5-8',flask:'M9 2h6 M10 2v7L4 19q-1 3 3 3h10q4 0 3-3L14 9V2 M7 15h10',pot:'M4 10h16l-2 11H6z M2 10h20 M8 7q-2-3 1-5 M14 7q-2-3 1-5',mug:'M4 3h13v18H4z M17 7h4v9h-4 M8 7v10 M12 7v10',gem:'M3 8l4-5h10l4 5-9 14z M3 8h18 M7 3l5 19 5-19',saw:'M2 4h20v5l-3 3-3-3-3 3-3-3-3 3-3-3z M4 4V2h5v2'};
 const icon=(key)=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('craft257-icon');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[key]||paths.hammer);svg.append(p);return svg};
 const decorate=(node,key)=>{if(node)node.prepend(icon(key))};
 ['hammer','coins','chest','book'].forEach((key,i)=>{const n=nav.querySelectorAll('.craft252-nav-icon')[i];if(n)n.replaceChildren(icon(key))});
 decorate(catalogue.querySelector('h3'),'book');decorate(order.querySelector('h3'),'chest');decorate(resourceBreakdown?.querySelector('summary'),'hammer');decorate(priceByItem?.querySelector('summary'),'coins');decorate(resourceSummary?.querySelector('strong'),'chest');
 const craftIcons=['shield','sword','needle','bow','gem','flask','pot','mug','saw'];
 [...(secs?.querySelectorAll('button')||[])].forEach((b,i)=>decorate(b,craftIcons[i]));
 const legacyNav=get('.views');const legacyBtn=v=>legacyNav?.querySelector(`[data-view="${v}"]`);
 let current='home';function open(which){current=which;root.dataset.screen=which;home.hidden=which!=='home';nav.hidden=which!=='home';body.hidden=which==='home';for(const p of body.querySelectorAll('.craft252-page'))p.hidden=p.dataset.page!==which;
  const v=which==='prices'?'prices':which==='journal'?'journal':which==='result'?'calc':'book';legacyBtn(v)?.click();
  // Moving the same DOM elements keeps saved data, original controls, and handlers intact.
  if(which==='result'){if(total)cost.append(total);if(priceByItem)cost.prepend(priceByItem);if(actions)completion.append(actions);calc.hidden=false}
  else {if(total)basket.append(total);if(priceByItem)basket.insertBefore(priceByItem,basket.querySelector('#omore'));if(actions)basket.append(actions)}
  if(which==='recipes')book.hidden=false;
  if(which==='stock')showStock(stockMode);
  if(which==='stock')document.dispatchEvent(new Event('craft-stock-layout-update'));
  if(which==='prices')prices.hidden=false;
  if(which==='journal')journal.hidden=false;
  window.scrollTo?.({top:0,behavior:'instant'});
 }
 open('home');
})();
