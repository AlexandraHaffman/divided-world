/* ═══════════════════════════════════════════════════════════════════════════
   Хроника: раунды, прибытия, сокращения. Рендерит из window.DW.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const DW = window.DWget();
const esc = window.DWesc, img = window.DWimg, fac = window.DWfac, fmt = window.DWfmt;
const CB = window.DWH.CB;
const perf = s => (DW.performances||{})[s]||{};
const by = window.DWby;

const PRELIM = ["presentation","interview","swimwear","gown","costume"];
const ROUND_TITLE = {
  presentation:"Представление",interview:"Закрытое интервью",swimwear:"Выход в купальнике",
  gown:"Вечернее платье",costume:"Фракционный костюм",manifesto:"Манифест",
  stage_question:"Персональный вопрос",final_look:"Финальный образ",
  final_question:"Общий финальный вопрос",last_word:"Последнее слово"
};
const SECTION = {presentation:"opening",interview:"interview",swimwear:"swimwear",gown:"gown",
  costume:"costume",manifesto:"manifesto",stage_question:"stage_question",
  final_look:"final_look",final_question:"final_answer",last_word:"last_word"};

/* участницы, участвовавшие в раунде (есть балл), в порядке убывания балла */
function poolFor(rk){
  const sc = DW.scores[rk]||{};
  return Object.keys(sc).sort((a,b)=>sc[b].avg-sc[a].avg);
}
function roundRank(rk){
  const pool = poolFor(rk); const m={}; pool.forEach((s,i)=>m[s]=i+1); return m;
}

/* бегущие места по предварительным раундам (нарастающий взвешенный тотал) */
function runningPrelim(){
  const w = {}; PRELIM.forEach(rk=>w[rk]=DW.rounds[rk].weight);
  const slugs = Object.keys(DW.scores.presentation||{});
  const out={}; const cum={}; slugs.forEach(s=>cum[s]=0);
  let prevRank=null;
  PRELIM.forEach((rk,idx)=>{
    slugs.forEach(s=>{ cum[s]+= (DW.scores[rk][s]?DW.scores[rk][s].avg:0)*w[rk]; });
    const ord = slugs.slice().sort((a,b)=>cum[b]-cum[a]);
    const rank={}; ord.forEach((s,i)=>rank[s]=i+1);
    out[rk]={cum:Object.assign({},cum),rank,prev:prevRank};
    prevRank=rank;
  });
  return out;
}
const RP = runningPrelim();

/* аватар участницы (56px) */
function avatarHTML(c){
  const src = img(c.img.system_1x1)||img(c.img.reference);
  return src?`<img class="av" src="${src}" alt="${esc(c.name)}" loading="lazy">`
            :`<div class="av noimg" style="${fac(c)}">◈</div>`;
}

/* хроника-лид для модных раундов */
function fashionLead(c,d,rk){
  if(rk==="swimwear"){
    const m=c.measure||{};
    const fig = m.height?`<b>Фигура.</b> Рост ${m.height} см · ${m.bust}–${m.waist}–${m.hips} · ${m.weight} кг. `:"";
    return `<p class="lead">${esc(c.sensual)}</p>`+
           `<p>${fig}${esc((d&&d.walk)||"")}</p>`;
  }
  const bits=[];
  bits.push(`<span class="lead">${esc(c.temper.replace(/\.$/,''))}.</span> ${esc(c.sensual)}`);
  if(d&&d.walk) bits.push(esc(d.walk));
  return `<p>${bits.join(" ")}</p>`;
}

/* движение места (prelim) */
function movementHTML(rk,slug){
  const rr=RP[rk]; if(!rr) return "";
  const now=rr.rank[slug]; const prev=rr.prev?rr.prev[slug]:null;
  if(prev==null) return `<div class="movement"><span class="same">Стартовая позиция после раунда: #${now}</span></div>`;
  const d=prev-now;
  const cls=d>0?"up":d<0?"down":"same";
  const arr=d>0?`▲ +${d}`:d<0?`▼ ${d}`:"— без изменений";
  return `<div class="movement">Было #${prev} <span class="${cls}">${arr}</span> Стало #${now}</div>`;
}

/* один перфоманс-блок */
function perfBlock(rk,slug,rr){
  const c=by(slug); const p=perf(slug); const sec=SECTION[rk]; const d=p[sec];
  const isFashion = ["swimwear","gown","costume","final_look"].includes(rk);
  const isSpeech = ["manifesto","last_word"].includes(rk);
  const rank = rr?rr[slug]:null;
  const link=`${CB}contestants/participant.html?slug=${slug}`;
  let body="";
  if(isFashion){
    body = `<div class="cols"><div class="chron">${fashionLead(c,d,rk)}`+
      (rk==="costume"&&d&&d.entrance?`<p><b>Появление.</b> ${esc(d.entrance)}</p>`:"")+
      (d&&d.crowd&&rk!=="costume"?`<p><b>Зал.</b> ${esc(d.crowd)}</p>`:"")+
      (PRELIM.includes(rk)?movementHTML(rk,slug):"")+
      `</div><div>${window.DWdossier(d,fac(c))}</div></div>`+
      window.DWprotocol(rk,slug,"Протокол · "+ROUND_TITLE[rk]);
  } else if(rk==="interview"){
    body = `<div class="cols"><div>${window.DWinterview(p.interview,fac(c))}${PRELIM.includes(rk)?movementHTML(rk,slug):""}</div>`+
      `<div>${window.DWprotocol(rk,slug,"Протокол · Интервью")}</div></div>`;
  } else if(rk==="presentation"){
    const op=p.opening||{};
    body = `<div class="cols"><div class="chron">`+
      (op.outfit?`<p><b>Наряд.</b> ${esc(op.outfit)}</p>`:"")+
      (op.walk?`<p><b>Выход.</b> ${esc(op.walk)} ${esc(op.pose||"")}</p>`:"")+
      (op.line?`<p class="lead">«${esc(op.line).replace(/^«|»$/g,'')}»</p>`:"")+
      (op.crowd?`<p><b>Зал.</b> ${esc(op.crowd)}</p>`:"")+
      (op.jury?`<p class="muted">${esc(op.jury)}</p>`:"")+
      movementHTML(rk,slug)+
      `</div><div>${window.DWprotocol(rk,slug,"Протокол · Представление")}</div></div>`;
  } else if(isSpeech){
    body = `<div class="cols"><div>${window.DWspeech(p[sec])}</div>`+
      `<div>${window.DWprotocol(rk,slug,"Протокол · "+ROUND_TITLE[rk])}</div></div>`;
  } else if(rk==="stage_question"){
    const q=p.stage_question||{};
    body = `<div class="cols"><div>`+
      `<div class="qa" style="${fac(c)}"><div class="q">— ${esc(q.q)}</div>`+
      (q.first_reaction?`<div class="a muted" style="font-size:13px">${esc(q.first_reaction)}</div>`:"")+
      `<div class="a">${esc(q.answer)}</div></div>`+
      (q.manner?`<p class="muted"><b>Манера.</b> ${esc(q.manner)}</p>`:"")+
      (q.crowd?`<p><b>Зал.</b> ${esc(q.crowd)}</p>`:"")+
      (q.jury?`<p class="muted">${esc(q.jury)}</p>`:"")+
      `</div><div>${window.DWprotocol(rk,slug,"Протокол · Вопрос")}</div></div>`;
  } else if(rk==="final_question"){
    const q=p.final_answer||{};
    body = `<div class="cols"><div><div class="speech"><div class="txt">«${esc(q.text).replace(/^«|»$/g,'')}»</div>`+
      `<div class="meta">${q.crowd?`<div class="m"><b>Зал</b>${esc(q.crowd)}</div>`:""}${q.jury?`<div class="m"><b>Жюри</b>${esc(q.jury)}</div>`:""}</div></div></div>`+
      `<div>${window.DWprotocol(rk,slug,"Протокол · Общий вопрос")}</div></div>`;
  }
  return `<div class="perf" id="p-${slug}" style="${fac(c)}"><div class="facbar"></div>`+
    `<div class="phead">${avatarHTML(c)}`+
    `<div class="who"><a href="${link}"><div class="nm">${esc(c.name)}</div></a>`+
    `<div class="fc">${esc(c.faction)}${c.subfaction?" · "+esc(c.subfaction):""}</div></div>`+
    (rank?`<div class="rr"><div class="lbl">Место в раунде</div><div class="val">#${rank}</div></div>`:"")+
    `</div><div class="pbody">${body}</div></div>`;
}

/* ── публичная: рендер страницы раунда ── */
window.DWrenderRound = function(cfg){
  const {key, roundKey, title, subtitle, host} = cfg;
  const el=document.getElementById(host||"main");
  const pool=poolFor(roundKey); const rr=roundRank(roundKey);
  // показываем от последнего места раунда к первому — интрига сохраняется,
  // лучшая выходит в самом низу. Ранги (#N) при этом остаются верными.
  const disp=pool.slice().reverse();
  const t=(DW.timeline||[]).find(x=>x.key===key)||{};
  const index = `<div class="perf-index">`+disp.map(s=>`<a href="#p-${s}">${esc(by(s).name)}</a>`).join("")+`</div>`;
  const note = `<p class="muted" style="margin:2px 0 14px;font-size:12.5px">↑ Порядок обратный: сверху — последнее место раунда, лучшая выходит в самом низу. Так итог раунда не раскрывается заранее.</p>`;
  const scene = cfg.scene?`<div class="stage-scene chron">${cfg.scene}</div>`:"";
  el.innerHTML =
    `<div class="round-hero"><div class="rn">${esc(t.date||"")} · осталось ${pool.length}</div>`+
    `<h1>${esc(title)}</h1><div class="sub">${esc(subtitle||"")}</div>`+
    window.DWprogress(key)+`</div>`+
    scene + index + note +
    disp.map(s=>perfBlock(roundKey,s,rr)).join("")+
    window.DWchapnav(key);
};

/* ── прибытия (35 карточек, без баллов) ── */
window.DWrenderArrivals = function(cfg){
  const el=document.getElementById(cfg.host||"main");
  // порядок: по фракциям, затем по имени — как парад делегаций (не спойлер)
  const cs=(DW.contestants||[]).slice().sort((a,b)=>
    a.faction.localeCompare(b.faction,'ru')||a.name.localeCompare(b.name,'ru'));
  const t=(DW.timeline||[]).find(x=>x.key==="arrivals")||{};
  const cards = cs.map(c=>{
    const a=perf(c.slug).arrival||{};
    const src=img(c.img.cinematic)||img(c.img.reference);
    const link=`${CB}contestants/participant.html?slug=${c.slug}`;
    const ph=src?`<img src="${src}" alt="${esc(c.name)}" loading="lazy">`
      :`<div class="noimg" style="${fac(c)}">◈</div>`;
    return `<div class="arr" style="${fac(c)}"><div class="facbar"></div>`+
      `<a class="photo" href="${link}">${ph}</a>`+
      `<div class="arr-body">`+
      `<div class="arr-head"><a href="${link}"><span class="nm">${esc(c.name)}</span></a>`+
      `<span class="fc">${esc(c.faction)}${c.subfaction?" · "+esc(c.subfaction):""}</span></div>`+
      `<div class="chron">`+
      (a.mode?`<p><b>Прибытие.</b> ${esc(a.mode)}</p>`:"")+
      (a.first_image?`<p><b>Первый образ.</b> ${esc(a.first_image)}</p>`:"")+
      (a.gesture?`<p><b>Жест.</b> ${esc(a.gesture)}</p>`:"")+
      (a.first_line?`<p class="lead">«${esc(a.first_line).replace(/^«|»$/g,'')}»</p>`:"")+
      (a.crowd?`<p><b>Публика.</b> ${esc(a.crowd)}</p>`:"")+
      (a.press?`<p class="muted">Пресса: ${esc(a.press)}</p>`:"")+
      `</div></div></div>`;
  }).join("");
  el.innerHTML =
    `<div class="round-hero"><div class="rn">${esc(t.date||"")} · 35 участниц</div>`+
    `<h1>Прибытие 35 участниц</h1>`+
    `<div class="sub">Расколотый мир съезжается на плавучий остров. Кортежи и морские явления, демонстративная роскошь и тихое проникновение — тридцать пять разных способов войти в один амфитеатр.</div>`+
    window.DWprogress("arrivals")+`</div>`+
    (cfg.scene?`<div class="stage-scene chron">${cfg.scene}</div>`:"")+
    cards + window.DWchapnav("arrivals");
};

/* ── сокращение (ceremony) ── */
window.DWrenderCut = function(cfg){
  // cfg: {key, cutKey:'35_to_20'|..., stageRanking:'prelim'|'semifinal'|'top10'|'top5', title, subtitle, scene}
  const el=document.getElementById(cfg.host||"main");
  if(!window.DWspoilers()){
    el.innerHTML = spoilerShield(cfg);
    return;
  }
  const cut=DW.results.cuts[cfg.cutKey];
  const ranking=DW.rankings[cfg.stageRanking]||[];
  const t=(DW.timeline||[]).find(x=>x.key===cfg.key)||{};
  const nameToSlug={}; (DW.contestants||[]).forEach(c=>nameToSlug[c.name]=c.slug);
  const ci=(name,i)=>{ const c=by(nameToSlug[name]); if(!c) return "";
    return `<div class="ci" style="${fac(c)}"><span class="p">${i}</span>`+
      `<a class="nm" href="${CB}contestants/participant.html?slug=${c.slug}">${esc(name)}</a>`+
      `<span class="fc" style="color:var(--fc)">${esc(c.faction)}</span></div>`; };
  const advanced = cut.advanced.map((n,i)=>ci(n,i+1)).join("");
  const eliminated = cut.eliminated.map((n,i)=>ci(n,ranking.length-cut.eliminated.length+i+1)).join("");
  const rankRows = ranking.map(r=>{
    const c=by(r.slug);
    return `<div class="lb-row" style="${fac(c)}"><div class="facbar"></div>`+
      `<div class="pl">${r.rank}</div><div class="nm"><b>${esc(r.name)}</b><span>${esc(c.faction)}</span></div>`+
      `<div class="tot">${fmt(r.total)}</div></div>`;
  }).join("");
  el.innerHTML =
    `<div class="round-hero"><div class="rn">${esc(t.date||"")} · ${cut.advanced.length} проходят</div>`+
    `<h1>${esc(cfg.title)}</h1><div class="sub">${esc(cfg.subtitle||"")}</div>`+
    window.DWprogress(cfg.key)+`</div>`+
    (cfg.scene?`<div class="stage-scene chron">${cfg.scene}</div>`:"")+
    `<div class="cut-grid">`+
      `<div class="cut-col adv"><h3>▲ Проходят дальше</h3><div class="cut-list">${advanced}</div></div>`+
      `<div class="cut-col out"><h3>▼ Покидают конкурс</h3><div class="cut-list">${eliminated}</div></div>`+
    `</div>`+
    `<div class="shead"><span class="n">Официальный рейтинг этапа</span></div>`+
    `<div class="lb">${rankRows}</div>`+
    window.DWchapnav(cfg.key);
};

function spoilerShield(cfg){
  const t=(DW.timeline||[]).find(x=>x.key===cfg.key)||{};
  return `<div class="round-hero"><div class="rn">${esc(t.date||"")}</div><h1>${esc(cfg.title)}</h1>`+
    `<div class="sub">${esc(cfg.subtitle||"")}</div>${window.DWprogress(cfg.key)}</div>`+
    `<div class="spoiler-shield"><div class="serif" style="font-size:20px;color:var(--white)">Результаты сокращения скрыты</div>`+
    `<p class="muted" style="margin-top:8px">Вы читаете хронику последовательно. Итоги этого этапа — спойлер. `+
    `Откройте режим спойлеров, чтобы увидеть, кто прошёл дальше и официальный рейтинг.</p>`+
    `<button class="btn" onclick="window.DWsetSpoilers(true);location.reload()">Показать результаты</button></div>`+
    window.DWchapnav(cfg.key);
}
})();
