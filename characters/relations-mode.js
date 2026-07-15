/* ══════════════════════════════════════════
   РЕЖИМ «5» — КАРТА ОКРУЖЕНИЯ
   Полноэкранный разворот-досье по связям персонажа.
   Данные: поле relations в JSON персонажей (см. data/Schema_Master.md)
   и справочник фракций data/factions.json.
   Цвета фракций — из FACTION_COLORS (dossier.js, авторитетный источник).
   ══════════════════════════════════════════ */

const REL_TYPES = {
  love:   { color: "#ff5fa2", rgb: "255,95,162", zone: "Партнёр",  legend: "партнёр" },
  family: { color: "#3d9bff", rgb: "61,155,255", zone: "Кровь",    legend: "кровь" },
  ally:   { color: "#3ddc84", rgb: "61,220,132", zone: "Союзники", legend: "союзники" },
  enemy:  { color: "#ff3b47", rgb: "255,59,71",  zone: "Враги",    legend: "враги" }
};
const REL_ORDER = ["love", "family", "ally", "enemy"];
const REL_MAX_CRUMBS = 6;
const REL_REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let relPath = [];          // хлебные крошки: имена персонажей
let relFilter = null;      // активный фильтр легенды (тип связи) или null
let relFocus = -1;         // индекс связи в фокусе (наведение/удержание)
let relThreads = [];       // нити: { path, glow, sparks[], flash, type, card, dead, phase }
let relRaf = 0;
let relFactionsMeta = null;

/* ── данные ── */

function relFindChar(name) {
  const key = String(name).trim().toLowerCase();
  return allChars.find(c => (c.name || "").trim().toLowerCase() === key) || null;
}

function relIsDead(c) { return c && (c.status || "").trim() === "Мёртв"; }

function relRelations(c) {
  return (Array.isArray(c.relations) ? c.relations : [])
    .filter(r => r && r.to && REL_TYPES[r.type]);
}

async function relEnsureFactions() {
  if (relFactionsMeta) return relFactionsMeta;
  try {
    const res = await fetch("../data/factions.json");
    relFactionsMeta = (await res.json()).factions || {};
  } catch (e) {
    relFactionsMeta = {}; // локально fetch не работает — рисуем монограммы
  }
  return relFactionsMeta;
}

/* ── оверлей ── */

function relOverlayEl() {
  let el = document.getElementById("relations-overlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "relations-overlay";
    el.className = "rel-overlay";
    document.body.appendChild(el);
  }
  return el;
}

function openRelations(gidx) {
  const c = allChars[gidx];
  if (!c) return;
  relPath = [c.name];
  relFilter = null;
  renderRelations(); // первый кадр не ждёт сети
  const overlay = relOverlayEl();
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  if (!relFactionsMeta) relEnsureFactions().then(() => {
    // дорисовываем правую колонку, когда подъехал справочник фракций
    if (overlay.classList.contains("open")) renderRelations();
  });
}

function closeRelations() {
  const overlay = document.getElementById("relations-overlay");
  if (!overlay || !overlay.classList.contains("open")) return;
  overlay.classList.remove("open");
  document.body.style.overflow = "";
  relStopLoop();
}

function relNavigate(name) {
  const c = relFindChar(name);
  if (!c) return;
  relPath.push(c.name);
  if (relPath.length > REL_MAX_CRUMBS) relPath = relPath.slice(relPath.length - REL_MAX_CRUMBS);
  relFilter = null;
  renderRelations();
}

function relCrumbTo(i) {
  if (i >= relPath.length - 1) return;
  relPath = relPath.slice(0, i + 1);
  relFilter = null;
  renderRelations();
}

function relBack() {
  if (relPath.length > 1) { relPath.pop(); relFilter = null; renderRelations(); }
  else closeRelations();
}

/* ── куски разметки ── */

function relCrumbsHTML() {
  return relPath.map((n, i) => {
    const last = i === relPath.length - 1;
    return `${i ? '<span class="rel-crumb-sep">›</span>' : ""}
      <span class="rel-crumb${last ? " active" : ""}" data-crumb="${i}">${n}</span>`;
  }).join("");
}

function relCardHTML(r, i) {
  const t = REL_TYPES[r.type];
  const c = relFindChar(r.to);
  const dead = relIsDead(c);
  if (!c) {
    return `<div class="rel-card rel-ghost" data-ri="${i}" style="--zc:${t.rgb}">
      <div class="rel-card-photo"><div class="rel-noimg">?</div></div>
      <div class="rel-card-name">${r.to}</div>
      ${r.label ? `<div class="rel-card-label">${r.label}</div>` : ""}
    </div>`;
  }
  return `<div class="rel-card${dead ? " dead" : ""}" data-ri="${i}" data-name="${c.name}" style="--zc:${t.rgb}">
    <div class="rel-card-photo">
      ${c.avatar_web ? `<img src="${c.avatar_web}" alt="${c.name}" loading="lazy">` : `<div class="rel-noimg">◈</div>`}
      ${dead ? `<div class="rel-dead-tag">МЁРТВ</div>` : ""}
      <div class="rel-card-threat">${c.threat_level || 0}</div>
    </div>
    <div class="rel-card-name">${c.name}</div>
    ${r.label ? `<div class="rel-card-label">${r.label}</div>` : ""}
  </div>`;
}

function relZoneHTML(type, items) {
  if (!items.length) return "";
  const t = REL_TYPES[type];
  const density = items.length <= 3 ? "" : items.length <= 6 ? " rel-zone--md" : " rel-zone--sm";
  return `<div class="rel-zone${density}" data-zone="${type}" style="--zc:${t.rgb}">
    <div class="rel-zone-title">${t.zone} <span class="rel-zone-count">· ${items.length}</span></div>
    <div class="rel-zone-cards">${items.map(([r, i]) => relCardHTML(r, i)).join("")}</div>
  </div>`;
}

function relMonogram(name, extraCls) {
  const letter = (name || "?").replace(/^Корпус\s+/i, "").trim().charAt(0).toUpperCase() || "?";
  return `<div class="rel-crest-mono ${extraCls || ""}">${letter}</div>`;
}

function relFactionBlockHTML(c) {
  const meta = relFactionsMeta || {};
  const f = (c.faction || "").trim();
  const fm = meta[f] || {};
  const crest = fm.crest
    ? `<img class="rel-crest" src="../${fm.crest}" alt="${f}" loading="lazy">`
    : relMonogram(f);
  const sub = (c.subfaction || "").trim();
  const sm = (fm.subfactions || {})[sub] || {};
  const showSub = sub && sub !== f;
  const subBlock = showSub ? `
    <div class="rel-fblock">
      <div class="rel-flabel">Подразделение</div>
      ${sm.emblem ? `<img class="rel-crest" src="../${sm.emblem}" alt="${sub}" loading="lazy">` : relMonogram(sub, "rel-emblem-mono")}
      <div class="rel-fname">${sub}</div>
      ${sm.description ? `<div class="rel-fdesc">${sm.description}</div>` : ""}
      ${c.role ? `<div class="rel-fdivider"></div>
        <div class="rel-flabel" style="text-align:center">Положение</div>
        <div class="rel-position-val">${c.role}</div>` : ""}
    </div>` : (c.role ? `
    <div class="rel-fblock">
      <div class="rel-flabel">Положение</div>
      <div class="rel-position-val">${c.role}</div>
    </div>` : "");
  return `
    <div class="rel-fblock">
      <div class="rel-flabel">Фракция</div>
      ${crest}
      <div class="rel-fname">${f || "—"}</div>
      ${fm.description ? `<div class="rel-fdesc">${fm.description}</div>` : ""}
    </div>
    ${subBlock}`;
}

function relStatsHTML(rels) {
  if (!rels.length) {
    return `<div class="rel-isolated-msg">
      <div class="l1">СВЯЗЕЙ НЕ ЗАФИКСИРОВАНО</div>
      <div class="l2">ДЕЙСТВУЕТ ОДИН</div>
    </div>`;
  }
  const counts = {};
  REL_ORDER.forEach(t => counts[t] = rels.filter(r => r.type === t).length);
  const segs = REL_ORDER.filter(t => counts[t]).map(t =>
    `<div class="rel-statbar-seg" style="width:${counts[t] / rels.length * 100}%;background:${REL_TYPES[t].color}"></div>`
  ).join("");
  const legend = REL_ORDER.filter(t => counts[t]).map(t =>
    `<div class="rel-legend-item${relFilter === t ? " active" : ""}${relFilter && relFilter !== t ? " muted" : ""}"
       data-type="${t}" style="color:${relFilter === t ? REL_TYPES[t].color : ""}">
      <span class="rel-legend-dot" style="background:${REL_TYPES[t].color}"></span>${REL_TYPES[t].legend} ${counts[t]}
    </div>`
  ).join("");
  return `<div class="rel-statbar">${segs}</div>
    <div class="rel-legend">${legend}</div>
    <div class="rel-total">всего ${rels.length} · ${REL_ORDER.filter(t => counts[t]).map(t => `${REL_TYPES[t].legend} ${counts[t]}`).join(" · ")}</div>`;
}

/* ── основной рендер ── */

function renderRelations() {
  const overlay = relOverlayEl();
  const c = relFindChar(relPath[relPath.length - 1]);
  if (!c) return;
  const col = getFactionColor(c);
  const rels = relRelations(c);
  const heroArt = c.avatar_web_full || c.avatar_web || "";
  const heroDead = relIsDead(c);
  const threat = c.threat_level || 0;
  const pulse = Math.max(0.75, 3.4 - threat / 48);

  overlay.style.setProperty("--rcr", col.rgb);
  overlay.classList.toggle("isolated", !rels.length);

  const grouped = REL_ORDER.map(t => [t, rels.map((r, i) => [r, i]).filter(([r]) => r.type === t)]);

  overlay.innerHTML = `
    <div class="rel-topbar">
      <button class="rel-back" id="rel-back">← НАЗАД</button>
      <div class="rel-crumbs" id="rel-crumbs">${relCrumbsHTML()}</div>
    </div>
    <div class="rel-main" id="rel-main">
      <svg class="rel-threads" id="rel-threads"></svg>
      <div class="rel-col" id="rel-left">
        ${rels.length
          ? grouped.map(([t, items]) => relZoneHTML(t, items)).join("")
          : ""}
      </div>
      <div class="rel-center" id="rel-center">
        <div class="rel-hero" id="rel-hero">
          <div class="rel-hero-glow" style="--pp:${pulse.toFixed(2)}s;${rels.length && !heroDead ? "" : "display:none"}"></div>
          <div class="rel-hero-card" id="rel-hero-card">
            <div class="rel-hero-face">
              ${heroArt ? `<img src="${heroArt}" alt="${c.name}" style="${heroDead ? "filter:grayscale(0.9) brightness(0.55)" : ""}">` : `<div class="rel-noimg">[ PORTRAIT CLASSIFIED ]</div>`}
              <div class="rel-hero-hint">ТАП — ДОСЬЕ</div>
            </div>
            <div class="rel-hero-face rel-hero-back">
              ${c.card_quote ? `<div class="rel-hero-back-quote">«${c.card_quote}»</div>` : ""}
              ${(c.card_bio || c.biography || "Данные засекречены.").split("\n")[0]}
            </div>
          </div>
        </div>
        <div class="rel-hero-name">${c.name}</div>
        <div class="rel-hero-role">${c.role || ""}</div>
        <div class="rel-hero-threat">угроза <b>${threat}</b>${heroDead ? " · МЁРТВ" : ""}</div>
        <div id="rel-stats">${relStatsHTML(rels)}</div>
      </div>
      <div class="rel-col" id="rel-right">${relFactionBlockHTML(c)}</div>
    </div>`;

  relAttachEvents(overlay, rels);
  relApplyFilter(overlay);
  relBuildThreads(overlay, c, rels);
  relStartLoop(overlay);
}

/* ── события ── */

function relAttachEvents(overlay, rels) {
  overlay.querySelector("#rel-back").onclick = relBack;
  overlay.querySelector("#rel-crumbs").onclick = e => {
    const el = e.target.closest(".rel-crumb");
    if (el) relCrumbTo(parseInt(el.dataset.crumb));
  };

  const heroCard = overlay.querySelector("#rel-hero-card");
  heroCard.onclick = () => overlay.querySelector("#rel-hero").classList.toggle("flipped");

  overlay.querySelectorAll(".rel-card").forEach(card => {
    const ri = parseInt(card.dataset.ri);
    const name = card.dataset.name;
    let startX, startY, moved = false, holdT = 0;

    // фокус: наведение (десктоп)
    card.addEventListener("pointerenter", () => { relFocus = ri; relApplyFocus(overlay); });
    card.addEventListener("pointerleave", () => { if (relFocus === ri) { relFocus = -1; relApplyFocus(overlay); } });

    // тач: удержание — фокус, короткий тап — переход
    card.addEventListener("touchstart", e => {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; moved = false;
      holdT = setTimeout(() => { relFocus = ri; relApplyFocus(overlay); }, 180);
    }, { passive: true });
    card.addEventListener("touchmove", e => {
      if (Math.abs(e.touches[0].clientX - startX) > 10 || Math.abs(e.touches[0].clientY - startY) > 10) {
        moved = true; clearTimeout(holdT);
        if (relFocus === ri) { relFocus = -1; relApplyFocus(overlay); }
      }
    }, { passive: true });
    card.addEventListener("touchend", e => {
      clearTimeout(holdT);
      const wasFocused = relFocus === ri;
      relFocus = -1; relApplyFocus(overlay);
      if (!moved && name) { e.preventDefault(); relNavigate(name); }
      else if (!moved && !name && wasFocused) { /* призрачная карточка — некуда идти */ }
    });
    card.addEventListener("click", () => {
      if (!("ontouchstart" in window) && name) relNavigate(name);
    });
  });

  const stats = overlay.querySelector("#rel-stats");
  if (stats) stats.onclick = e => {
    const item = e.target.closest(".rel-legend-item");
    if (!item) return;
    relFilter = relFilter === item.dataset.type ? null : item.dataset.type;
    const c = relFindChar(relPath[relPath.length - 1]);
    stats.innerHTML = relStatsHTML(relRelations(c));
    relApplyFilter(overlay);
    relBuildThreads(overlay, c, relRelations(c));
  };
}

function relApplyFilter(overlay) {
  overlay.querySelectorAll(".rel-zone").forEach(z => {
    z.classList.toggle("rel-hidden", !!relFilter && z.dataset.zone !== relFilter);
  });
}

function relApplyFocus(overlay) {
  overlay.querySelectorAll(".rel-card").forEach(card => {
    const ri = parseInt(card.dataset.ri);
    card.classList.toggle("focused", relFocus === ri);
    card.classList.toggle("dimmed", relFocus >= 0 && relFocus !== ri);
  });
}

/* ── нити ── */

function relBuildThreads(overlay, hero, rels) {
  const svg = overlay.querySelector("#rel-threads");
  relThreads = [];
  if (!svg) return;
  svg.innerHTML = "";
  const NS = "http://www.w3.org/2000/svg";
  rels.forEach((r, i) => {
    if (relFilter && r.type !== relFilter) return;
    const card = overlay.querySelector(`.rel-card[data-ri="${i}"]`);
    if (!card) return;
    const t = REL_TYPES[r.type];
    const target = relFindChar(r.to);
    const dead = relIsDead(target);
    const mk = (tag, attrs) => {
      const el = document.createElementNS(NS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      svg.appendChild(el);
      return el;
    };
    const glow = mk("path", { fill: "none", stroke: t.color, "stroke-width": 4, "stroke-linecap": "round", opacity: 0.12 });
    const path = mk("path", { fill: "none", stroke: t.color, "stroke-width": 1.4, "stroke-linecap": "round", opacity: dead ? 0.4 : 0.6 });
    if (dead) path.setAttribute("stroke-dasharray", "5 4");
    const sparks = [];
    let flash = null;
    if (!dead && !REL_REDUCED) {
      const n = r.type === "enemy" ? 2 : 1;
      for (let s = 0; s < n; s++)
        sparks.push(mk("circle", { r: 2.2, fill: "#fff", opacity: 0.9, style: `filter:drop-shadow(0 0 4px ${t.color})` }));
      if (r.type === "enemy")
        flash = mk("circle", { r: 4, fill: t.color, opacity: 0, style: `filter:drop-shadow(0 0 8px ${t.color})` });
    }
    relThreads.push({ glow, path, sparks, flash, type: r.type, card, dead, ri: i, phase: Math.random() * Math.PI * 2 });
  });
  relLayoutThreads(overlay, performance.now());
}

function relLayoutThreads(overlay, now) {
  const main = overlay.querySelector("#rel-main");
  const heroEl = overlay.querySelector("#rel-hero-card");
  if (!main || !heroEl) return;
  const mr = main.getBoundingClientRect();
  const hr = heroEl.getBoundingClientRect();
  const t = now / 1000;
  const visible = relThreads.filter(th => th.card.offsetParent !== null);
  visible.forEach((th, vi) => {
    // дрейф карточки
    if (!REL_REDUCED) {
      const dx = Math.sin(t * 0.55 + th.phase) * 2.2;
      const dy = Math.cos(t * 0.4 + th.phase * 1.7) * 2.8;
      th.card.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
    }
    const cr = th.card.getBoundingClientRect();
    // старт: левый край героя, распределяем по высоте; конец: правый край карточки
    const x1 = hr.left - mr.left;
    const y1 = hr.top - mr.top + hr.height * (vi + 1) / (visible.length + 1);
    const x2 = cr.right - mr.left;
    const y2 = cr.top - mr.top + cr.height / 2;
    const bend = Math.max(30, (x1 - x2) * 0.45);
    let d = `M${x1},${y1} C${x1 - bend},${y1} ${x2 + bend},${y2} ${x2},${y2}`;

    if (th.dead) {
      // оборванная нить: не доходит до карточки и подрагивает
      th.path.setAttribute("d", d);
      const len = th.path.getTotalLength();
      const cut = len * (0.76 + (REL_REDUCED ? 0 : Math.sin(t * 7 + th.phase) * 0.03));
      const pts = [];
      const STEPS = 14;
      for (let s = 0; s <= STEPS; s++) {
        const p = th.path.getPointAtLength(cut * s / STEPS);
        const jx = REL_REDUCED ? 0 : Math.sin(t * 11 + th.phase + s) * (s / STEPS) * 1.6;
        pts.push(`${s ? "L" : "M"}${(p.x + jx).toFixed(1)},${(p.y + (REL_REDUCED ? 0 : Math.cos(t * 9 + s) * (s / STEPS) * 1.6)).toFixed(1)}`);
      }
      d = pts.join(" ");
    }
    th.path.setAttribute("d", d);
    th.glow.setAttribute("d", d);

    // фокус/затухание
    const focused = relFocus >= 0;
    const on = relFocus === th.ri;
    th.path.setAttribute("opacity", focused ? (on ? 0.95 : 0.08) : (th.dead ? 0.4 : 0.6));
    th.glow.setAttribute("opacity", focused ? (on ? 0.35 : 0.02) : 0.12);
    th.sparks.forEach(sp => sp.setAttribute("opacity", focused && !on ? 0.05 : 0.9));
    // огоньки
    if (th.sparks.length && !th.dead) {
      const len = th.path.getTotalLength();
      const place = (el, frac) => {
        const p = th.path.getPointAtLength(len * Math.min(Math.max(frac, 0), 1));
        el.setAttribute("cx", p.x); el.setAttribute("cy", p.y);
      };
      if (th.type === "love") {
        place(th.sparks[0], 0.5 + 0.5 * Math.sin(t * 2.4 + th.phase));
      } else if (th.type === "family") {
        place(th.sparks[0], ((t * 0.11 + th.phase) % 1 + 1) % 1);
      } else if (th.type === "ally") {
        place(th.sparks[0], ((t * 0.22 + th.phase) % 1 + 1) % 1);
      } else if (th.type === "enemy") {
        const f = ((t * 0.3 + th.phase) % 1 + 1) % 1;
        place(th.sparks[0], f);
        place(th.sparks[1], 1 - f);
        if (th.flash) {
          const near = Math.abs(f - 0.5) < 0.05;
          if (near) { const p = th.path.getPointAtLength(len * 0.5); th.flash.setAttribute("cx", p.x); th.flash.setAttribute("cy", p.y); }
          th.flash.setAttribute("opacity", near && !(focused && !on) ? (1 - Math.abs(f - 0.5) / 0.05) * 0.85 : 0);
        }
      }
    }
  });
  // скрытые фильтром — прячем целиком
  relThreads.forEach(th => {
    if (th.card.offsetParent === null) {
      th.path.setAttribute("opacity", 0);
      th.glow.setAttribute("opacity", 0);
      th.sparks.forEach(sp => sp.setAttribute("opacity", 0));
      if (th.flash) th.flash.setAttribute("opacity", 0);
    }
  });
}

/* ── цикл анимации ── */

function relStopLoop() {
  if (relRaf) { cancelAnimationFrame(relRaf); relRaf = 0; }
}

function relStartLoop(overlay) {
  relStopLoop();
  if (REL_REDUCED) {
    // статика: перерисовка только по скроллу/резайзу
    const redraw = () => relLayoutThreads(overlay, 0);
    overlay.querySelector("#rel-left").addEventListener("scroll", redraw, { passive: true });
    window.addEventListener("resize", redraw);
    redraw();
    return;
  }
  const tick = now => {
    if (!overlay.classList.contains("open")) { relRaf = 0; return; }
    relLayoutThreads(overlay, now);
    relRaf = requestAnimationFrame(tick);
  };
  relRaf = requestAnimationFrame(tick);
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeRelations();
});
