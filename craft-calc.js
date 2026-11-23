/* Brotherhood craft navigation; full calculator lives at crafting/index.html. */
(()=>{'use strict';const $=id=>document.getElementById(id);const a=$('craftShowDirectory'),b=$('craftShowCalculator'),d=$('craftDirectoryArea'),c=$('craftCalculator');if(!a||!b||!d||!c)return;
a.addEventListener('click',()=>{d.hidden=false;c.hidden=true;a.classList.add('craft-switch-active');b.classList.remove('craft-switch-active')});
b.addEventListener('click',()=>{d.hidden=true;c.hidden=false;b.classList.add('craft-switch-active');a.classList.remove('craft-switch-active')});
})();
