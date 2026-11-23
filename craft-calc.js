/* Independent v2.3 crafting ledger. No external repository code or data. */
(()=>{'use strict';
const $=id=>document.getElementById(id), crafts=['Кузнечное','Бронное','Портняжное','Лучное','Ювелирное','Алхимия','Готовка','Пивоварение','Столярное'];
const KEY='brotherhood-crafting-v23';let state;
try{state=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
if(!state||!Array.isArray(state.recipes))state={recipes:[],prices:{},basket:{},sales:[]};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{alert('Не удалось сохранить данные браузера')}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>(Math.round(n*100)/100).toLocaleString('ru-RU')+' гр.';
const materials=r=>r.materials||[];
const cost=r=>materials(r).reduce((sum,m)=>sum+m.qty*(Number(state.prices[m.name])||0),0)+Number(r.fee||0);
const unitCost=r=>cost(r)/Math.max(1,r.yield);
const selected=()=>state.recipes.filter(r=>r.craft===$('ccCraft').value&&r.name.toLowerCase().includes($('ccSearch').value.trim().toLowerCase()));
const line=(name,sub,actions)=>`<div class="craft-entry"><div><b>${esc(name)}</b><div class="craft-muted">${sub}</div></div><div class="craft-actions">${actions}</div></div>`;
function render(){const recipes=selected();$('ccRecipeList').innerHTML=recipes.length?recipes.map(r=>line(r.name,`Уровень ${r.level} · выход ${r.yield} шт. · себестоимость ${money(unitCost(r))}/шт. · ${materials(r).map(m=>esc(m.name)+' × '+m.qty).join(', ')}`,`<button class="secondary-button" data-add="${r.id}">+ В заказ</button><button class="secondary-button" data-del="${r.id}" title="Удалить рецепт">✕</button>`)).join(''):'<p class="craft-muted">Рецептов пока нет. Добавь первый рецепт кнопкой выше.</p>';
const basket=Object.entries(state.basket).map(([id,qty])=>({r:state.recipes.find(x=>x.id===id),qty})).filter(x=>x.r&&x.qty>0);
$('ccBasket').innerHTML=basket.length?basket.map(({r,qty})=>line(r.name,`${qty} шт. · ${money(unitCost(r)*qty)}`,`<button class="secondary-button" data-less="${r.id}">−</button><button class="secondary-button" data-add="${r.id}">+</button>`)).join(''):'<p class="craft-muted">Выбери изделия из каталога.</p>';
const total=basket.reduce((s,{r,qty})=>s+unitCost(r)*qty,0);$('ccTotal').textContent='Себестоимость заказа: '+money(total);$('ccComplete').disabled=!basket.length;
const requirements={};for(const {r,qty} of basket){const craftsNeeded=Math.ceil(qty/r.yield);for(const m of materials(r))requirements[m.name]=(requirements[m.name]||0)+m.qty*craftsNeeded;}
$('ccCalculation').innerHTML=`<p><b>Изделий:</b> ${basket.reduce((n,x)=>n+x.qty,0)} · <b>Себестоимость:</b> ${money(total)}</p>`+(Object.keys(requirements).length?Object.entries(requirements).sort((a,b)=>a[0].localeCompare(b[0],'ru')).map(([name,qty])=>line(name,`${qty} ед. × ${money(Number(state.prices[name])||0)}`,money(qty*(Number(state.prices[name])||0)))).join(''):'<p class="craft-muted">Добавь изделия в заказ.</p>')+'<p class="craft-muted">Заготовки и материалы считаются по введённым рецептам; автоматически раскрывать вложенные рецепты эта версия ещё не умеет.</p>';
const names=[...new Set(state.recipes.flatMap(r=>materials(r).map(m=>m.name)))].sort((a,b)=>a.localeCompare(b,'ru'));
$('ccPriceList').innerHTML=names.length?names.map(name=>`<div class="craft-entry"><label>${esc(name)}</label><input class="craft-price" type="number" min="0" step="0.01" data-price="${esc(name)}" value="${esc(state.prices[name]??0)}" aria-label="Цена ${esc(name)}"></div>`).join(''):'<p class="craft-muted">Ресурсы появятся после добавления рецептов.</p>';
$('ccSales').innerHTML=state.sales.length?state.sales.slice().reverse().map(s=>line(new Date(s.date).toLocaleString('ru-RU'),s.items.map(x=>esc(x.name)+' × '+x.qty).join(', '),money(s.total))).join(''):'<p class="craft-muted">Продаж пока нет.</p>';
}
function tab(name){for(const x of ['recipes','prices','calc','journal'])$('cc'+x[0].toUpperCase()+x.slice(1)).hidden=x!==name;document.querySelectorAll('[data-cc-tab]').forEach(b=>b.classList.toggle('craft-tab-active',b.dataset.ccTab===name));}
function add(id,delta){state.basket[id]=Math.max(0,(state.basket[id]||0)+delta);if(!state.basket[id])delete state.basket[id];save();render()}
$('ccCraft').innerHTML=crafts.map(c=>`<option>${esc(c)}</option>`).join('');
$('craftShowDirectory').onclick=()=>{$('craftDirectoryArea').hidden=false;$('craftCalculator').hidden=true;$('craftShowDirectory').classList.add('craft-switch-active');$('craftShowCalculator').classList.remove('craft-switch-active')};
$('craftShowCalculator').onclick=()=>{$('craftDirectoryArea').hidden=true;$('craftCalculator').hidden=false;$('craftShowCalculator').classList.add('craft-switch-active');$('craftShowDirectory').classList.remove('craft-switch-active');render()};
$('ccCraft').onchange=render;$('ccSearch').oninput=render;
document.querySelectorAll('[data-cc-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.ccTab));
$('ccAddRecipe').onclick=()=>{$('ccRecipeForm').hidden=false;$('ccFormError').textContent='';$('ccRecipeForm').scrollIntoView({behavior:'smooth',block:'nearest'})};
$('ccCancelRecipe').onclick=()=>{$('ccRecipeForm').hidden=true};
$('ccRecipeForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);const lines=String(f.get('materials')).split(/\n/).map(x=>x.trim()).filter(Boolean);const ms=[];for(const line of lines){const m=line.match(/^(.+?)\s*=\s*(\d+(?:[.,]\d+)?)$/);if(!m||!(Number(m[2].replace(',','.'))>0)){$('ccFormError').textContent='Неверный состав: '+line+'. Формат: Железо = 2';return}ms.push({name:m[1].trim(),qty:Number(m[2].replace(',','.'))})}if(!ms.length)return;
state.recipes.push({id:'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),craft:$('ccCraft').value,name:String(f.get('name')).trim(),level:Number(f.get('level')),yield:Number(f.get('yield')),fee:Number(f.get('fee')),materials:ms});save();e.currentTarget.reset();$('ccRecipeForm').hidden=true;render()};
$('craftCalculator').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.add)add(b.dataset.add,1);if(b.dataset.less)add(b.dataset.less,-1);if(b.dataset.del){if(!confirm('Удалить рецепт?'))return;state.recipes=state.recipes.filter(r=>r.id!==b.dataset.del);delete state.basket[b.dataset.del];save();render()}});
$('ccPriceList').addEventListener('change',e=>{const inp=e.target.closest('[data-price]');if(!inp)return;state.prices[inp.dataset.price]=Math.max(0,Number(inp.value)||0);save();render()});
$('ccComplete').onclick=()=>{const items=Object.entries(state.basket).map(([id,qty])=>({r:state.recipes.find(r=>r.id===id),qty})).filter(x=>x.r&&x.qty>0);if(!items.length)return;if(!confirm('Записать заказ как выполненный? Это не спишет ресурсы со склада братства.'))return;state.sales.push({date:new Date().toISOString(),items:items.map(x=>({name:x.r.name,qty:x.qty})),total:items.reduce((s,x)=>s+unitCost(x.r)*x.qty,0)});state.basket={};save();render();tab('journal')};
tab('recipes');render();
})();
