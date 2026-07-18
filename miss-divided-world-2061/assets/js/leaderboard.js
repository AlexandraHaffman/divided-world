/* Полный рейтинг 1–35, сгруппированный по этапам выбытия */
(function(){
"use strict";
const DW=window.DWget(), esc=window.DWesc, fac=window.DWfac, fmt=window.DWfmt;
const CB=window.DWH.CB, by=window.DWby;
const MEDAL={1:"♛",2:"✦",3:"✦"};
const RANKCLS={1:"gold",2:"silver",3:"bronze"};
const ROUND_SHORT={presentation:"Пред",interview:"Интв",swimwear:"Куп",gown:"Плат",costume:"Кост"};

window.DWrenderLeaderboard=function(){
  const host=document.getElementById("main");
  if(!window.DWspoilers()){
    host.innerHTML =
      `<div class="section"><div class="shead big"><span class="n">Официальный рейтинг · 1–35</span></div>`+
      `<div class="spoiler-shield"><div class="serif" style="font-size:22px;color:var(--white)">Полный рейтинг — это спойлер</div>`+
      `<p class="muted" style="margin-top:8px">Итоговые места от короны до последней позиции скрыты в режиме последовательного чтения.</p>`+
      `<button class="btn" onclick="window.DWsetSpoilers(true);location.reload()">Открыть полный рейтинг</button></div></div>`;
    return;
  }
  const final=DW.rankings.final||[];
  const bands=[
    ["Топ-3 · корона","crown",[1,2,3]],
    ["Топ-5 · выбывшие 5→3","finalstage",[4,5]],
    ["Топ-10 · выбывшие 10→5","top10",[6,7,8,9,10]],
    ["Топ-20 · выбывшие 20→10","semifinal",[11,12,13,14,15,16,17,18,19,20]],
    ["Выбывшие 35→20","prelim",[21,22,23,24,25,26,27,28,29,30,31,32,33,34,35]],
  ];
  const METRIC={crown:"итог финала (образ+ответ+слово)",finalstage:"образ + общий вопрос",
    top10:"полуфинал + персон. вопрос",semifinal:"предвар. + манифест",prelim:"предварительные раунды"};
  const row=r=>{
    const c=by(r.slug);
    const rounds=["presentation","interview","swimwear","gown","costume"].map(rk=>{
      const sc=(DW.scores[rk]||{})[r.slug]; return sc?`${ROUND_SHORT[rk]} ${fmt(sc.avg)}`:"";
    }).join(" · ");
    return `<div class="lb-row ${RANKCLS[r.place]||''}" style="${fac(c)}"><div class="facbar"></div>`+
      `<div class="pl">${r.place}</div>`+
      (MEDAL[r.place]?`<div class="medal">${MEDAL[r.place]}</div>`:`<div class="medal"></div>`)+
      `<a class="nm" href="${CB}contestants/participant.html?slug=${r.slug}"><b>${esc(r.name)}</b><span>${esc(r.faction)}</span></a>`+
      `<div class="rounds">${rounds}</div>`+
      `<div class="tot">${fmt(r.total)}</div></div>`;
  };
  host.innerHTML =
    `<div class="section"><div class="round-hero" style="border:none;padding:0 0 10px">`+
    `<div class="rn">итоговая таблица</div><h1>Официальный рейтинг · 1–35</h1>`+
    `<div class="sub">Сокращения идут поэтапно, поэтому баллы сопоставимы внутри каждой группы, а не между ними: пройти дальше всегда весомее любого балла. Внутри группы — по метрике этапа.</div></div>`+
    bands.map(([title,metric,places])=>
      `<div class="lb-band"><div class="bh"><span class="t">${title}</span><span class="m">${METRIC[metric]}</span></div>`+
      places.map(pl=>row(final[pl-1])).join("")+`</div>`
    ).join("")+
    `</div>`;
};
})();
