/* ═══════════════════════════════════════════════════════════════════════════
   МИСС РАЗДЕЛЁННЫЙ МИР — 2061 · общий движок фронтенда
   Данные грузятся из data/data.js в window.DW (работает локально, без сервера).
   window.CB — относительный путь к корню проекта конкурса ('' или '../').
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const CB = window.CB || "";
const IMGROOT = CB + "../";           // от корня проекта -> корень репозитория
window.DWH = { CB, IMGROOT };

/* ── доступ к данным ── */
const DW = window.DW || {};
window.DWget = () => DW;
const bySlug = {};
(DW.contestants||[]).forEach(c=>bySlug[c.slug]=c);
window.DWby = s => bySlug[s];

/* ── утилиты ── */
function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
window.DWesc = esc;
function img(path){ return path ? IMGROOT + path : null; }
window.DWimg = img;
function facStyle(c){ return `--fc:${c.faction_color||'#c0c8d4'}`; }
window.DWfac = facStyle;
const FACRGB = {}; // не требуется
function fmt(x){ return (x==null?"—":Number(x).toFixed(1)); }
window.DWfmt = fmt;

/* ── спойлер-режим ── */
const SP_KEY="dw_miss_spoilers";
window.DWspoilers = ()=> localStorage.getItem(SP_KEY)==="1";
window.DWsetSpoilers = v => { localStorage.setItem(SP_KEY, v?"1":"0"); };

/* ── ПАРОЛЬНЫЕ ВОРОТА (SHA-256, как в закрытых разделах мира) ── */
const ACCESS_HASH = "666902c1ce084c518f5480e69e8ec8a424da6351631bfe329686735ffee80eb0";
const GATE_KEY = "dw_miss_access";
window.DWunlocked = ()=> localStorage.getItem(GATE_KEY)===ACCESS_HASH;
async function sha256hex(str){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
window.DWsha = sha256hex;
window.DWgate = function(onOpen){
  // если уже открыто — просто продолжаем
  if(window.DWunlocked()){ const g=document.getElementById("gate"); if(g) g.remove(); onOpen&&onOpen(); return; }
  const g = document.getElementById("gate");
  if(!g){ onOpen&&onOpen(); return; }
  g.style.display="flex";
  const form=document.getElementById("gateForm"), input=document.getElementById("gateInput"), err=document.getElementById("gateErr");
  setTimeout(()=>input&&input.focus(),80);
  if(!(window.crypto&&crypto.subtle)){ if(err) err.textContent="ОТКРОЙТЕ СТРАНИЦУ ПО HTTPS"; if(input) input.disabled=true; return; }
  form.addEventListener("submit", async e=>{
    e.preventDefault(); err.textContent="";
    const v=input.value.trim(); if(!v) return;
    let h; try{ h=await sha256hex(v); }catch(_){ return; }
    if(h===ACCESS_HASH){
      localStorage.setItem(GATE_KEY, ACCESS_HASH);
      g.classList.add("ok");
      setTimeout(()=>{ g.remove(); onOpen&&onOpen(); }, 480);
    } else {
      err.textContent="НЕВЕРНЫЙ КОД ДОСТУПА";
      g.classList.add("shake"); setTimeout(()=>g.classList.remove("shake"),420);
      input.value=""; input.focus();
    }
  });
};
/* охрана внутренних страниц: если не разблокировано — на индекс с воротами */
window.DWguard = function(){
  if(window.DWunlocked()) return true;
  location.href = CB + "index.html";
  return false;
};

/* ── ВЕРХНЯЯ НАВИГАЦИЯ ── */
const NAV = [
  ["Хроника","chronology.html"],
  ["Участницы","contestants.html"],
  ["Рейтинг","leaderboard.html"],
  ["Жюри","jury.html"],
  ["Награды","awards.html"],
  ["Финал","final.html"],
  ["Эпилог","epilogue.html"],
  ["Правила","rules.html"],
];
window.DWtopbar = function(active){
  const host=document.getElementById("topbar"); if(!host) return;
  host.className="topbar";
  host.innerHTML =
    `<a class="brand" href="${CB}index.html">МИСС <b>РАЗДЕЛЁННЫЙ МИР</b> · 2061</a>`+
    `<div class="sp"></div>`+
    `<button class="menu-toggle" aria-label="Меню">≡</button>`+
    `<div class="topbar-links">`+
      NAV.map(([t,h])=>`<a class="nav${active===h?' active':''}" href="${CB}${h}">${t}</a>`).join("")+
    `</div>`;
  const btn=host.querySelector(".menu-toggle"), links=host.querySelector(".topbar-links");
  btn.addEventListener("click",()=>links.classList.toggle("open"));
};

/* ── подвал ── */
window.DWfoot = function(){
  const f=document.getElementById("foot"); if(!f) return;
  f.className="foot";
  f.innerHTML = `MISS DIVIDED WORLD · 2061 &nbsp;//&nbsp; ВНУТРЕННЯЯ ТРАНСЛЯЦИЯ РАЗДЕЛЁННОГО МИРА &nbsp;//&nbsp; `+
    `<a href="${IMGROOT}index.html">← ТЕРМИНАЛ МИРА</a>`;
};

/* ════════════ ОБЩИЕ РЕНДЕРЕРЫ ════════════ */

/* карточка участницы для сеток */
window.DWcard = function(c, opts={}){
  const spoil = opts.showPlace!==false && window.DWspoilers();
  const src = img(c.img.system_1x1) || img(c.img.reference);
  const ph = src
    ? `<img src="${src}" alt="${esc(c.name)}" loading="lazy">`
    : `<div class="noimg"><span class="glyph">◈</span><span class="mono">ПОРТРЕТ 1:1<br>ОЖИДАЕТСЯ</span></div>`;
  const place = spoil ? `<div class="place">#${c.placement}</div>` : "";
  const href = `${opts.base||CB}contestants/participant.html?slug=${c.slug}`;
  return `<a class="pcard" style="${facStyle(c)}" href="${href}">`+
    `<div class="facbar"></div>${place}`+
    `<div class="ph">${ph}</div>`+
    `<div class="meta"><div class="nm">${esc(c.name)}</div>`+
    `<div class="rl">${esc(c.arch)}</div>`+
    `<div class="fc">${esc(c.faction)}</div></div></a>`;
};

/* палитра-полоса из массива названий цветов -> приблизительные хексы */
const COLORMAP = {
 'золот':'#d9b678','золото':'#d9b678','золотой':'#d9b678','старое золото':'#b8945a','тёплое золото':'#d9b678','белое золото':'#e8e0c8','тёмное золото':'#a8863f',
 'серебро':'#c8d2e2','жидкое серебро':'#c8d2e2','эфирное серебро':'#cdd6e4','тёмное серебро':'#8b93a3','тусклое серебро':'#9aa0ab','ледяное серебро':'#dfe6f0',
 'чёрн':'#111318','чёрный':'#14161c','обсидиан':'#0d0f14','полночный чёрный':'#0e1016','чернильн':'#161b28','чернильный':'#141826',
 'бел':'#f0f2f6','белый':'#f0f2f6','чистейший белый':'#fbfcff','снежно-белый':'#f4f7fc','белоснежный':'#f6f8fc','стерильно-белый':'#eef1f6','молочный жемчуг':'#e9e5da','кремовый':'#ece3d0','слоновая кость':'#efe7d3',
 'графит':'#3a4150','графитово-синий':'#2a3346','антрацит':'#2b303b',
 'сталь':'#7f8b9c','стальной':'#7f8b9c','вороненый металл':'#3d434e','вороненая сталь':'#4a515e','светлый титан':'#b9c6d6','гранёный титан':'#9fb0c3','хромовый':'#cfd6e0',
 'лазурь':'#2aa7c9','лазурный':'#2aa7c9','глубокая лазурь':'#1f7fa0','аквамарин':'#57c7c2','бирюза':'#3fb8b0','бирюзовый':'#3fb8b0','глубокий бирюзовый':'#2a8f95','перламутр':'#dfe6e8','перламутровый':'#dfe6e8',
 'изумруд':'#2e9e6a','изумрудн':'#2e9e6a','изумрудно-синий':'#1f7a86','росток-зелёный':'#6bbf6b','живая зелень':'#5fae5f','нежно-зелёный':'#a9d6a9','светло-серо-зелёный':'#b9c9b6','зелёный кристалл':'#3fbf7a',
 'пурпур':'#8e44ad','королевский пурпур':'#7d3ca0','фиолетов':'#a55eea',
 'алый':'#d64545','кроваво-алый':'#c0392b','кроваво-чёрный':'#5a1e1e','тёмно-алый':'#8f2d2d','кроваво-золотой':'#b5762e','кроваво-красный':'#b22222','красный оттиск':'#a33',
 'синий':'#3d6fb0','тёмно-синий':'#2d4a72','полночно-синий':'#1e2c48','полночная синь':'#1c2740','имперский синий':'#2b4a80','электрик-синий':'#2f7de0','технический синий':'#2e5a86','глубокий синий':'#274b78',
 'индиго':'#33406b','глубокий индиго':'#2a3560','сливовый':'#5a3a55','глубокий сливовый':'#4d2f48',
 'песок':'#c9b48a','тёплый песок':'#cdb98f','песочный':'#c9b48a','обнажённое золото':'#d8bd8f','шампань':'#e6d3ab','телесный':'#dcc3a8','охр':'#b4884a','охристый':'#c19653','землисто-охристый':'#a67f4a','закатно-золотой':'#cf9f52',
 'коралл':'#e07a5f','шафран':'#e0a83a','приглушённый шафран':'#c79a52','янтар':'#d99f5a','тёмно-янтарный':'#a5763a','медь':'#b87333','медный акцент':'#b87333',
 'серый':'#7a8394','дымчатый серый':'#8a8f99','пепел':'#9aa0a8','пепельно-серый':'#8d939c','штормовой серый':'#6d7681','газетно-серый':'#8b929c','бетонно-серый':'#7c828b','дорожно-серый':'#8a8f96',
 'неон':'#39d3c0','неоновый циан':'#26e0d0','неоновая бирюза':'#2fe0d0','святой неон':'#4fd6c8','неоновый зелёный':'#5fe07a',
 'хаки':'#7a7a4e','выцветший хаки':'#8a8a5c','выцветшая охра':'#b39a63','ржавое серебро':'#9a8f7f','ржаво-серый':'#8a7f70','ржаво-красный':'#a5563a','ржаво-серый':'#8a7f70',
 'бордовый':'#7a2438','глубокий бордовый':'#6a1f30','винный':'#5c2333','пастельн':'#cbd0c9','бледный жемчуг':'#e4e0d6','бледное золото':'#d8c68f','бледно-голубой':'#bcd4e6','небесно-голубой':'#8fb8d8','небесный':'#8fb8d8','маячно-золотой':'#e0b24a',
 'платина':'#d6dbe4','платиновый блеск':'#dfe4ec','хромовый блеск':'#d5dbe4','хромовый белый':'#e6eaf0','дисциплинарный белый':'#eef1f6',
 'мятный':'#9fe0c0','ярко-зелёный':'#3fbf5a','мертвенно-белый':'#e8ecef','пепел розы':'#b79aa0','приглушённое серебро':'#a6adba','приглушённое золото':'#c4a86a','серебро схемы':'#aeb8c9','серебро галуна':'#d9c78a',
 'тревожный чёрный':'#12141a','тревожная бирюза':'#2f9fb0','энергетическая бирюза':'#33b7c0','стеклянный блик':'#cfe0ee','холодный блик':'#dfe8f2','радужный блик':'#b9c6d6','радужный перелив':'#8fd0c4','золотая заря':'#e6c98a','звёздное серебро':'#cdd6e6','сумеречно-синий':'#2a3554','божественный свет':'#f2e6c0','святой':'#e6d9b0',
 'траурный шафран':'#b78a3a','приглушённый чёрный':'#141821','дымчатое серебро':'#b8c0cd','прозрачный хрусталь':'#dfe8f2','тёплый пепел':'#b7ab97','холодный белый':'#eef1f6','холодная синь':'#4a6a9a','гранёное серебро':'#b8c2d0'
};
function colorFor(name){
  const n=(name||"").toLowerCase().trim();
  if(COLORMAP[n]) return COLORMAP[n];
  for(const k in COLORMAP){ if(n.indexOf(k)>=0) return COLORMAP[k]; }
  return '#5a687e';
}
window.DWpalette = function(arr){
  return `<div class="palette">`+(arr||[]).map(c=>`<span style="background:${colorFor(c)}" title="${esc(c)}"></span>`).join("")+`</div>`;
};

/* модное досье (купальник/платье/костюм/финальный образ) */
window.DWdossier = function(d, fc){
  if(!d) return "";
  const rowsSpec = d.kind==="Фракционный костюм"
    ? [["Силуэт","silhouette"],["Материалы","materials"],["Символы","symbols"],["Головной убор","headpiece"],["Появление","entrance"],["Техника","tech"],["Свет","light"],["Музыка","music"]]
    : d.kind==="Купальник"
    ? [["Силуэт","silhouette"],["Деталь","detail"],["Обувь","footwear"],["Причёска","hair"],["Свет","light"],["Музыка","music"],["Походка","walk"]]
    : [["Силуэт","silhouette"],["Ткань","fabric"],["Деталь","detail"],["Спина","back"],["Обувь","footwear"],["Украшения","jewelry"],["Свет","light"],["Музыка","music"],["Поворот","turn"]];
  const rows = rowsSpec.filter(([_,k])=>d[k]).map(([lbl,k])=>
    `<div class="drow"><div class="k">${lbl}</div><div class="v">${esc(d[k])}</div></div>`).join("");
  const extra = [];
  if(d.faction_reaction) extra.push(`<div class="drow"><div class="k">Реакция фракции</div><div class="v">${esc(d.faction_reaction)}</div></div>`);
  if(d.controversy) extra.push(`<div class="drow"><div class="k">Полемика</div><div class="v">${esc(d.controversy)}</div></div>`);
  if(d.crowd) extra.push(`<div class="drow"><div class="k">Реакция зала</div><div class="v">${esc(d.crowd)}</div></div>`);
  return `<div class="dossier" style="${fc||''}">`+
    `<div class="dh"><div class="dkind">${esc(d.kind)}</div>`+
    `<div class="dconcept">${esc(d.concept)}</div>`+
    window.DWpalette(d.palette)+`</div>`+
    `<div class="drows">${rows}${extra.join("")}</div>`+
    (d.climax?`<div class="climax">Кульминация. ${esc(d.climax)}</div>`:"")+
    (d.impression?`<div class="impression"><b>Впечатление</b>${esc(d.impression)}</div>`:"")+
  `</div>`;
};

/* протокол баллов раунда (7 судей) */
window.DWprotocol = function(rk, slug, title){
  const sc = (DW.scores[rk]||{})[slug]; if(!sc) return "";
  const jmap = {}; (DW.jury||[]).forEach(j=>jmap[j.id]=j);
  const rows = Object.entries(sc.judges).map(([jid,val])=>{
    const j=jmap[jid]||{name:jid,role:""};
    return `<div class="jrow"><div class="jn"><b>${esc(j.name)}</b><span>${esc(j.role)}</span></div>`+
      `<div class="bar"><i style="width:${val*10}%"></i></div><div class="sc">${fmt(val)}</div></div>`;
  }).join("");
  return `<div class="protocol"><div class="ph"><span class="ttl">${esc(title||'Официальный протокол')}</span>`+
    `<span class="avg">${fmt(sc.avg)}</span></div>${rows}</div>`;
};

/* интервью Q&A */
window.DWinterview = function(iv, fc){
  if(!iv) return "";
  const qa = (iv.questions||[]).map(p=>
    `<div class="qa" style="${fc||''}"><div class="q">— ${esc(p.q)}</div><div class="a">${esc(p.a)}</div></div>`).join("");
  const notes=[];
  if(iv.strongest) notes.push(`<div class="drow"><div class="k">Сильнейший ответ</div><div class="v">${esc(iv.strongest)}</div></div>`);
  if(iv.weakest) notes.push(`<div class="drow"><div class="k">Слабейший момент</div><div class="v">${esc(iv.weakest)}</div></div>`);
  if(iv.jury_note) notes.push(`<div class="drow"><div class="k">Комментарий жюри</div><div class="v">${esc(iv.jury_note)}</div></div>`);
  return qa + (notes.length?`<div class="drows" style="padding-left:0">${notes.join("")}</div>`:"");
};

/* речь / манифест / последнее слово */
window.DWspeech = function(sp){
  if(!sp) return "";
  const meta=[];
  const M=[["Постановка","staging"],["Появление","entrance"],["Свет","light"],["Музыка","music"],
           ["Тишина","silence"],["Выражение","face"],["Жесты","gestures"],["Реакция зала","crowd"],
           ["Соперницы","rivals"],["Фракция","faction"],["Комментарий жюри","jury"]];
  M.forEach(([lbl,k])=>{ if(sp[k]) meta.push(`<div class="m"><b>${lbl}</b>${esc(sp[k])}</div>`); });
  return `<div class="speech">`+
    (sp.text?`<div class="txt">«${esc(sp.text).replace(/^«|»$/g,"")}»</div>`:"")+
    (meta.length?`<div class="meta">${meta.join("")}</div>`:"")+
  `</div>`;
};

/* блок атрибутов */
const ATTR_RU = {beauty:"Красота",sex:"Сексуальность",physique:"Пластика/форма",individ:"Индивидуальность",
  charisma:"Харизма",intellect:"Интеллект",rhetoric:"Речь",style:"Стиль",command:"Владение залом",
  coherence:"Цельность",memorable:"Запоминаемость",presence:"Сцен. сила"};
// порядок показа: красота и чувственность впереди (конкурс красоты)
const ATTR_ORDER = ["beauty","sex","physique","style","individ","charisma","command","presence","memorable","coherence","intellect","rhetoric"];
window.DWattrs = function(attrs, fc){
  const keys = ATTR_ORDER.filter(k=>k in attrs).concat(Object.keys(attrs).filter(k=>ATTR_ORDER.indexOf(k)<0));
  return `<div class="attrs" style="${fc||''}">`+keys.map(k=>{const v=attrs[k];
    return `<div class="attr"><div class="k">${ATTR_RU[k]||k}</div><div class="bar"><i style="width:${v*10}%"></i></div><div class="n">${v}</div></div>`;
  }).join("")+`</div>`;
};

/* глава: навигация prev/next по хронологии */
window.DWchapnav = function(currentKey){
  const tl = DW.timeline||[];
  const i = tl.findIndex(t=>t.key===currentKey);
  const prev = i>0?tl[i-1]:null, next = i>=0&&i<tl.length-1?tl[i+1]:null;
  const link = (t,dir,cls)=> t
    ? `<a class="${cls}" href="${CB}${t.href}"><span class="dir">${dir}</span><span class="t">${esc(t.title)}</span></a>`
    : `<a class="${cls} disabled"><span class="dir">${dir}</span><span class="t">—</span></a>`;
  return `<div class="chapnav">${link(prev,"← ПРЕДЫДУЩАЯ","")}${link(next,"СЛЕДУЮЩАЯ →","next")}</div>`;
};

/* индикатор прогресса конкурса */
window.DWprogress = function(currentKey){
  const tl=DW.timeline||[]; const i=tl.findIndex(t=>t.key===currentKey);
  return `<div class="progress">`+tl.map((t,j)=>`<i class="${j<i?'done':j===i?'here':''}"></i>`).join("")+`</div>`;
};

/* инициализация каркаса страницы */
window.DWinit = function(active){
  window.DWtopbar(active);
  window.DWfoot();
};
})();
