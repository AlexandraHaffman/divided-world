/* Страница участницы: participant.html?slug=<slug> */
(function(){
"use strict";
const DW=window.DWget(), esc=window.DWesc, img=window.DWimg, fac=window.DWfac, fmt=window.DWfmt;
const CB=window.DWH.CB;
const by=window.DWby;

function qs(k){ return new URLSearchParams(location.search).get(k); }
const ROUND_TITLE={presentation:"Представление",interview:"Закрытое интервью",swimwear:"Выход в купальнике",
  gown:"Вечернее платье",costume:"Фракционный костюм",manifesto:"Манифест",stage_question:"Персональный вопрос",
  final_look:"Финальный образ",final_question:"Общий финальный вопрос",last_word:"Последнее слово"};
const SECTION={presentation:"opening",interview:"interview",swimwear:"swimwear",gown:"gown",costume:"costume",
  manifesto:"manifesto",stage_question:"stage_question",final_look:"final_look",final_question:"final_answer",last_word:"last_word"};
const ORDER=["presentation","interview","swimwear","gown","costume","manifesto","stage_question","final_look","final_question","last_word"];

function portrait(frameCls,src,capText,noimgText,c){
  const inner = src
    ? `<img src="${src}" alt="${esc(c.name)}">`
    : `<div class="noimg" style="${fac(c)}"><span class="g">◈</span><span>${noimgText}</span></div>`;
  return `<figure><div class="frame">${inner}</div><figcaption class="cap">${capText}</figcaption></figure>`;
}

function roundBody(rk,c,p){
  const sec=SECTION[rk], d=p[sec];
  if(["swimwear","gown","costume","final_look"].includes(rk))
    return window.DWdossier(d,fac(c))+window.DWprotocol(rk,c.slug,"Протокол");
  if(rk==="interview") return window.DWinterview(p.interview,fac(c))+window.DWprotocol(rk,c.slug,"Протокол");
  if(rk==="presentation"){ const op=p.opening||{};
    return `<div class="chron">`+
      (op.outfit?`<p><b>Наряд.</b> ${esc(op.outfit)}</p>`:"")+
      (op.walk?`<p><b>Выход.</b> ${esc(op.walk)} ${esc(op.pose||"")}</p>`:"")+
      (op.line?`<p class="lead">«${esc(op.line).replace(/^«|»$/g,'')}»</p>`:"")+
      (op.jury?`<p class="muted">${esc(op.jury)}</p>`:"")+`</div>`+window.DWprotocol(rk,c.slug,"Протокол");
  }
  if(["manifesto","last_word"].includes(rk)) return window.DWspeech(p[sec])+window.DWprotocol(rk,c.slug,"Протокол");
  if(rk==="stage_question"){ const q=p.stage_question||{};
    return `<div class="qa" style="${fac(c)}"><div class="q">— ${esc(q.q)}</div><div class="a">${esc(q.answer)}</div></div>`+
      (q.jury?`<p class="muted">${esc(q.jury)}</p>`:"")+window.DWprotocol(rk,c.slug,"Протокол");
  }
  if(rk==="final_question"){ const q=p.final_answer||{};
    return `<div class="speech"><div class="txt">«${esc(q.text).replace(/^«|»$/g,'')}»</div>`+
      (q.jury?`<div class="meta"><div class="m"><b>Жюри</b>${esc(q.jury)}</div></div>`:"")+`</div>`+window.DWprotocol(rk,c.slug,"Протокол");
  }
  return "";
}

window.DWrenderParticipant=function(){
  const slug=qs("slug"); const c=by(slug);
  const host=document.getElementById("main");
  if(!c){ host.innerHTML=`<div class="section center"><h2>Участница не найдена</h2><p class="muted">Проверьте ссылку.</p><p style="margin-top:16px"><a class="btn ghost" href="${CB}contestants.html">← Ко всем участницам</a></p></div>`; return; }
  document.title=c.name+" · Мисс Разделённый мир 2061";
  const p=(DW.performances||{})[slug]||{};
  const spoil=window.DWspoilers();
  const cin=img(c.img.cinematic);
  const av=img(c.img.system_1x1)||img(c.img.reference);
  const arrival=p.arrival||{};

  // hero
  const heroImg = cin?`<div class="cbg" style="background-image:url('${cin}')"></div><img src="${cin}" alt="${esc(c.name)}">`:`<div class="noimg" style="${fac(c)}">КИНЕМАТОГРАФИЧЕСКИЙ ПОРТРЕТ ОЖИДАЕТСЯ</div>`;
  const avatarEl = av?`<img class="avatar" src="${av}" alt="${esc(c.name)}">`:`<div class="avatar noimg" style="${fac(c)}">◈</div>`;
  const placeBadge = spoil
    ? `<span class="place-badge ${c.placement===1?'win':''}">${c.placement===1?'♛ ':''}#${c.placement} · ${esc(c.elim_band)}</span>`
    : `<span class="tag gold">РЕЗУЛЬТАТ СКРЫТ · режим последовательного чтения</span>`;
  const awards = spoil && c.awards.length
    ? c.awards.map(a=>`<span class="tag gold">★ ${esc(a)}</span>`).join("")
    : "";

  // портреты 3
  const portraits =
    portrait("", img(c.img.system_1x1), "Системный портрет 1:1", `1:1 ОЖИДАЕТСЯ<br>${esc(c.img.system_1x1_expected.split('/').pop())}`, c)+
    portrait("", img(c.img.reference), "Портрет-референс", "РЕФЕРЕНС ОЖИДАЕТСЯ", c)+
    portrait("", img(c.img.cinematic), "Кинематографический портрет", "КИНОПОРТРЕТ ОЖИДАЕТСЯ", c);

  // профиль
  const prof=[["Конкурсный архетип",c.arch],["Причина участия",c.motive],["Стратегия",c.strategy],
    ["Сценический темперамент",c.temper],["Речевой стиль",c.speech],["Тип образа",c.sensual],
    ["Сильные стороны",c.strengths],["Слабые стороны",c.weaknesses]]
    .map(([k,v])=>`<div class="drow"><div class="k">${k}</div><div class="v">${esc(v)}</div></div>`).join("");

  // раунды, в которых участвовала (есть балл) + arrival
  const rounds = ORDER.filter(rk=>(DW.scores[rk]||{})[slug]);
  const roundBlocks = rounds.map(rk=>{
    const sc=DW.scores[rk][slug];
    return `<div class="round-block"><div class="rb-head" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('collapsed')">`+
      `<span class="rt">${ROUND_TITLE[rk]}</span><span class="ravg">${fmt(sc.avg)}</span><span class="chev">▶</span></div>`+
      `<div class="rb-body collapsed">${roundBody(rk,c,p)}</div></div>`;
  }).join("");

  // прибытие блок
  const arrivalBlock = arrival.mode?
    `<div class="card"><h3>Прибытие</h3><div class="chron">`+
    `<p>${esc(arrival.mode)}</p>`+
    (arrival.first_line?`<p class="lead">«${esc(arrival.first_line).replace(/^«|»$/g,'')}»</p>`:"")+
    (arrival.gesture?`<p class="muted">${esc(arrival.gesture)}</p>`:"")+`</div></div>`:"";

  // реакция на результат (спойлер)
  const reactionBlock = spoil && p.reaction?
    `<div class="card" style="border-color:var(--gold-dim)"><h3>Реакция на результат</h3><div class="chron"><p>${esc(p.reaction)}</p></div></div>`:"";

  host.innerHTML =
    `<div class="participant-hero" style="${fac(c)}"><div class="facbar"></div>`+
      `<div class="cinema">${heroImg}<div class="grad"></div></div>`+
      `<div class="hinfo">${avatarEl}`+
      `<div class="pname">${esc(c.name)}</div>`+
      `<div class="parch">${esc(c.arch)}</div>`+
      `<div class="pmeta"><span class="tag fac" style="${fac(c)}">${esc(c.faction)}</span>`+
      (c.role?`<span class="tag">${esc(c.role)}</span>`:"")+
      `<span class="tag">${esc(c.tier)}</span>`+
      `<span class="tag">г.р. ${esc(c.birthdate)}</span>`+
      `<span class="tag">статус: ${esc(c.status)}</span></div>`+
      `<div class="pmeta">${placeBadge}</div>`+
      (awards?`<div class="pmeta">${awards}</div>`:"")+
      `</div></div>`+

    `<div class="section"><div class="shead"><span class="n">Портреты</span></div>`+
      `<div class="portraits3">${portraits}</div>`+
      `<p class="faint mono" style="margin-top:8px;font-size:9px">Системный портрет 1:1 может быть добавлен позднее — место в интерфейсе зарезервировано.</p>`+
    `</div>`+

    `<div class="section"><div class="two-col">`+
      `<div class="card"><h3>Досье</h3><div class="chron">`+
        `<p class="lead">${esc(c.card_quote?('«'+c.card_quote.replace(/^«|»$/g,'')+'»'):c.arch)}</p>`+
        `<p>${esc((c.card_bio||c.biography||"").split("\n\n")[0])}</p>`+
        `<div class="chips" style="margin-top:10px">`+(c.abilities||[]).slice(0,6).map(a=>`<span class="tag">${esc(a)}</span>`).join("")+`</div>`+
      `</div></div>`+
      `<div class="card"><h3>Конкурсный профиль</h3><div class="drows" style="padding:0">${prof}</div></div>`+
    `</div></div>`+

    `<div class="section"><div class="shead"><span class="n">Базовые конкурсные атрибуты</span></div>`+
      window.DWattrs(c.attrs,fac(c))+`</div>`+

    (arrivalBlock?`<div class="section">${arrivalBlock}</div>`:"")+

    `<div class="section"><div class="shead big"><span class="n">Выступления по раундам</span></div>`+
      `<p class="muted" style="margin-bottom:12px">Нажмите на раунд, чтобы раскрыть образ, баллы и комментарии жюри.</p>`+
      roundBlocks+`</div>`+

    (reactionBlock?`<div class="section">${reactionBlock}</div>`:"")+

    `<div class="section center"><a class="btn ghost" href="${CB}contestants.html">← Ко всем участницам</a></div>`;
};
})();
