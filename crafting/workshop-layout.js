/* v2.4.6: presentation-only three-column workshop. Keep all original DOM nodes and listeners. */
(()=>{
  const root=document.getElementById('craftEmbedded');
  if(!root)return;
  const app=root.querySelector('.app'),left=root.querySelector('#left'),calc=root.querySelector('.view[data-v="calc"]'),book=root.querySelector('.view[data-v="book"]'),nav=root.querySelector('.views');
  if(!app||!left||!calc||!book||!nav)return;
  const center=document.createElement('div');center.className='craft-workshop-center';center.setAttribute('aria-label','Расчёт ресурсов');
  left.after(center);center.appendChild(calc);
  const update=()=>{
    const selected=nav.querySelector('button[aria-selected="true"]');
    const mode=selected?.dataset.view||'book';
    const active=mode==='book'||mode==='calc';
    root.classList.toggle('craft-workshop-mode',active);
    root.classList.toggle('craft-workshop-book',mode==='book');
    root.classList.toggle('craft-workshop-calc',mode==='calc');
    // When in the workshop both the recipe catalogue and calculation are visible.
    // The original tab handler still controls all other sections.
    center.hidden=!active;
  };
  const observer=new MutationObserver(update);
  for(const b of nav.querySelectorAll('button[data-view]')) observer.observe(b,{attributes:true,attributeFilter:['aria-selected']});
  update();
})();
