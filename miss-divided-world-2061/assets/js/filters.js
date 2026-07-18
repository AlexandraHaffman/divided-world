/* Каталог участниц: поиск + фильтр по фракции + сортировка */
(function(){
"use strict";
const DW=window.DWget(), esc=window.DWesc, fac=window.DWfac;
const CB=window.DWH.CB;
let all=(DW.contestants||[]).slice();
let fFaction="all", fQuery="", fSort="roster";

function factions(){
  const m={}; all.forEach(c=>{ m[c.faction]=(m[c.faction]||0)+1; c._fid=c.faction_id; c._fc=c.faction_color; });
  return Object.entries(m).sort((a,b)=>b[1]-a[1]);
}
function apply(){
  let a=all.filter(c=>
    (fFaction==="all"||c.faction===fFaction)&&
    (!fQuery||c.name.toLowerCase().includes(fQuery)||c.arch.toLowerCase().includes(fQuery)||c.faction.toLowerCase().includes(fQuery)));
  if(fSort==="name") a.sort((x,y)=>x.name.localeCompare(y.name,'ru'));
  else if(fSort==="faction") a.sort((x,y)=>x.faction.localeCompare(y.faction,'ru')||x.name.localeCompare(y.name,'ru'));
  else if(fSort==="place"&&window.DWspoilers()) a.sort((x,y)=>x.placement-y.placement);
  else a.sort((x,y)=>x.faction.localeCompare(y.faction,'ru')||x.name.localeCompare(y.name,'ru'));
  const grid=document.getElementById("cat-grid");
  grid.innerHTML=a.map(c=>window.DWcard(c)).join("")||`<p class="muted">Ничего не найдено.</p>`;
  document.getElementById("cat-count").textContent=a.length;
}
window.DWrenderCatalog=function(){
  const host=document.getElementById("main");
  const spoil=window.DWspoilers();
  const facChips=`<span class="chip active" data-f="all">Все · ${all.length}</span>`+
    factions().map(([f,n])=>{ const c=all.find(x=>x.faction===f);
      return `<span class="chip" data-f="${esc(f)}" style="${fac(c)}">${esc(f)} · ${n}</span>`;}).join("");
  const sortOpts=`<span class="chip" data-s="roster">Реестр</span><span class="chip" data-s="name">Имя</span>`+
    `<span class="chip" data-s="faction">Фракция</span>`+(spoil?`<span class="chip" data-s="place">Итоговое место</span>`:"");
  host.innerHTML=
    `<div class="section"><div class="round-hero" style="border:none;padding:0 0 6px">`+
    `<div class="rn">каталог · <span id="cat-count">35</span> из 35</div><h1>Участницы</h1>`+
    `<div class="sub">Тридцать пять совершеннолетних женщин расколотого мира. Нажмите карточку, чтобы открыть полное досье, образы и баллы.</div></div>`+
    `<div class="filterbar"><input type="text" id="cat-search" placeholder="Поиск по имени, архетипу, фракции…"></div>`+
    `<div class="chips" id="cat-fac" style="margin-bottom:8px">${facChips}</div>`+
    `<div class="chips" id="cat-sort" style="margin-bottom:14px"><span class="faint mono" style="align-self:center;margin-right:4px">СОРТ:</span>${sortOpts}</div>`+
    `<div class="grid-cards" id="cat-grid"></div></div>`;
  const search=document.getElementById("cat-search");
  search.addEventListener("input",()=>{ fQuery=search.value.trim().toLowerCase(); apply(); });
  host.querySelector("#cat-fac").addEventListener("click",e=>{
    const chip=e.target.closest(".chip"); if(!chip)return;
    fFaction=chip.dataset.f; host.querySelectorAll("#cat-fac .chip").forEach(x=>x.classList.toggle("active",x===chip)); apply();
  });
  host.querySelector("#cat-sort").addEventListener("click",e=>{
    const chip=e.target.closest(".chip"); if(!chip||!chip.dataset.s)return;
    fSort=chip.dataset.s; host.querySelectorAll("#cat-sort .chip").forEach(x=>x.classList.toggle("active",x===chip)); apply();
  });
  host.querySelector('#cat-sort .chip[data-s="roster"]').classList.add("active");
  apply();
};
})();
