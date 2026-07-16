/* ═══════════════════════════════════════════════════════════════
   ДРЕВО МЕТА-СПОСОБНОСТЕЙ — рендер и взаимодействие.
   Один слой данных (window.META_TREE), два рендера:
   десктоп — полярное SVG-древо, мобилка — гармошка-таксономия.
   Раскладка просчитывается один раз и замораживается; анимации
   только transform/opacity, без WebGL и постоянной физики.
   ═══════════════════════════════════════════════════════════════ */
(() => {
"use strict";

const T = window.META_TREE;
const SVG_NS = "http://www.w3.org/2000/svg";
const $ = id => document.getElementById(id);
const isMobile = () => window.matchMedia("(max-width: 900px)").matches;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── ГЕОМЕТРИЯ ШКАЛЫ ─────────────────────────────────────────
   Радиус = Вистнер, сила течёт от Источника:
   W10 у ядра (R_MIN), W1 на периферии (R_MAX). */
const R_MIN = 150, R_STEP = 32;
const R_MAX = R_MIN + 9 * R_STEP;          // кольцо W1
const R_SECTOR = R_MAX + 26;                // полка классов
const CLS_ORDER = ["KIN", "VIT", "ENT", "PSI", "FLD", "COG", "NUL", "CMN"];
const ORIGIN_LABEL = { s: "стихийное · отголосок Первовсплеска", g: "дар · наделена Источником намеренно", c: "соборное · коллективный дар граждан" };
const STATUS_LABEL = { alive: "АКТИВЕН", dead: "ПОГИБ", missing: "НЕИЗВЕСТНО", captive: "В ПЛЕНУ" };
const BANDS = [
  { id: "W10+", lbl: "W10⁺ · аномалия",       test: m => m > 10 && m < 100 },
  { id: "W10",  lbl: "W10 · абсолютная",       test: m => m === 10 },
  { id: "W9",   lbl: "W9 · катастрофическая",  test: m => m === 9 },
  { id: "W7-8", lbl: "W7–8 · стратегическая",  test: m => m === 7 || m === 8 },
  { id: "W5-6", lbl: "W5–6 · оперативная",     test: m => m === 5 || m === 6 },
  { id: "W3-4", lbl: "W3–4 · личная",          test: m => m === 3 || m === 4 },
  { id: "W1-2", lbl: "W1–2 · соборный фон",    test: m => m >= 1 && m <= 2 },
];

/* ── КАТАЛОЖНЫЙ КОД: пересчитывается на лету ── */
function wistnerTag(n) {
  if (n.cls === "SRC" || n.meta_power >= 100) return "W∞";
  if (n.meta_power > 10) return "W10⁺";
  return "W" + n.meta_power;
}
function codeOf(n) {
  if (n.cls === "SRC" || n.meta_power >= 100) return "SRC-W∞";
  const cls = n.cls + (n.dual ? "²" : "");
  let code = `${cls}-${wistnerTag(n)}·${n.origin}·${n.fac}-${n.serial || "?"}`;
  if (n._suppressed) code += "·⊘";
  return code;
}
function radiusOf(n) {
  if (n.cls === "SRC" || n.meta_power >= 100) return 0;
  if (n.meta_power > 10) return R_MIN - 34;                 // аномалия: за кольцом W10, в запретной зоне
  return R_MIN + (10 - Math.max(1, Math.min(10, n.meta_power))) * R_STEP;
}
function bandOf(n) { const b = BANDS.find(b => b.test(n.meta_power)); return b ? b.id : "W1-2"; }
function nodeSize(n) { return 6.5 + Math.min(1, (n.threat || 0) / 90) * 7; } // размер = уровень угрозы
function pol(a, r) { return [Math.cos(a) * r, Math.sin(a) * r]; }

/* ── СИГИЛЫ КЛАССОВ: 8 геометрических глифов, монохром ── */
const SIGILS = {
  KIN: "M-5,4 L0,-5 L5,4 Z M-6.5,1 L6.5,1",
  VIT: "M0,-6 L0,6 M-4,-2 A4,4 0 1,0 4,-2",
  ENT: "M-5,-4 L5,-4 L0,5 Z M-6,2 L6,-1",
  PSI: "M-4,-5 L-4,0 A4,4 0 0,0 4,0 L4,-5 M0,-5 L0,6",
  FLD: "M0,0 m-5.5,0 a5.5,5.5 0 1,0 11,0 a5.5,5.5 0 1,0 -11,0 M0,-1.2 L0,1.2 M-8,0 L-6.5,0 M6.5,0 L8,0",
  COG: "M-6,0 Q0,-5.5 6,0 Q0,5.5 -6,0 Z M0,0 m-1.8,0 a1.8,1.8 0 1,0 3.6,0 a1.8,1.8 0 1,0 -3.6,0",
  NUL: "M0,0 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 M-4,4 L4,-4",
  CMN: "M0,-5 L4.5,3 L-4.5,3 Z M0,-5 m-1.4,0 a1.4,1.4 0 1,0 2.8,0 a1.4,1.4 0 1,0 -2.8,0 M4.5,3 m-1.4,0 a1.4,1.4 0 1,0 2.8,0 a1.4,1.4 0 1,0 -2.8,0 M-4.5,3 m-1.4,0 a1.4,1.4 0 1,0 2.8,0 a1.4,1.4 0 1,0 -2.8,0",
  SRC: "M0,-7 L0,7 M-7,0 L7,0 M-4.5,-4.5 L4.5,4.5 M4.5,-4.5 L-4.5,4.5",
};
function sigilSVG(cls, scale = 1, className = "sector-sigil") {
  return `<path class="${className}" d="${SIGILS[cls] || SIGILS.SRC}" transform="scale(${scale})"/>`;
}

/* ── СОСТОЯНИЕ ── */
const nodes = T.nodes;                       // живые объекты — редактор мутирует их же
const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
const srcNode = nodes.find(n => n.cls === "SRC");
const state = {
  filters: { cls: new Set(), fac: new Set(), band: new Set(), origin: new Set(), q: "" },
  selected: null, compareWith: null, comparePick: false,
  focusCls: null, editor: false, undo: [],
  layers: { codes: true, badges: true, res: false, nul: false, ghost: true },
  events: null,
};
const layout = {};                           // id → {a, r, x, y, sector}
const sectors = {};                          // cls → {a0, a1, mid, subs: {name: angle}}

/* ── РАСКЛАДКА: просчитать один раз и заморозить ── */
function computeLayout() {
  const counts = {};
  CLS_ORDER.forEach(c => counts[c] = Math.max(2, nodes.filter(n => n.cls === c && !n.review).length
    + T.ghosts.filter(g => g.cls === c && state.layers.ghost).length));
  const total = CLS_ORDER.reduce((s, c) => s + counts[c], 0);
  const GAP = 0.035;
  let a = -Math.PI / 2;                      // от вершины по часовой
  CLS_ORDER.forEach(c => {
    const span = (Math.PI * 2) * counts[c] / total - GAP;
    sectors[c] = { a0: a + GAP / 2, a1: a + GAP / 2 + span, mid: a + GAP / 2 + span / 2, subs: {} };
    a += span + GAP;
  });

  CLS_ORDER.forEach(c => {
    const sec = sectors[c];
    const members = nodes.filter(n => n.cls === c && !n.review);
    const subs = [...new Set(members.map(n => n.subclass))];
    T.ghosts.forEach(g => { if (g.cls === c && !subs.includes(g.subclass)) subs.push(g.subclass); });
    const slots = c === "CMN" ? members.length : Math.max(1, subs.length);

    if (c === "CMN") {                       // граждане висят на соборном кольце, не отдельными ветками
      members.forEach((n, i) => {
        const ang = sec.a0 + (sec.a1 - sec.a0) * (i + 0.5) / slots;
        layout[n.id] = { a: ang, r: R_MAX, x: pol(ang, R_MAX)[0], y: pol(ang, R_MAX)[1] };
      });
      return;
    }
    subs.forEach((s, i) => sec.subs[s] = sec.a0 + (sec.a1 - sec.a0) * (i + 0.5) / slots);
    // одноклассники в одной полосе Вистнера слегка разводятся по радиусу,
    // чтобы кольцо W10 не слипалось в гроздь
    const byBandCls = {};
    members.forEach(n => (byBandCls[n.meta_power] = byBandCls[n.meta_power] || []).push(n));
    members.forEach(n => {
      const ang = sec.subs[n.subclass] ?? sec.mid;
      const peers = byBandCls[n.meta_power];
      const dr = peers.length > 1 ? (peers.indexOf(n) - (peers.length - 1) / 2) * 15 : 0;
      const r = radiusOf(n) + dr;
      const [x, y] = pol(ang, r);
      layout[n.id] = { a: ang, r, x, y };
    });
  });
  if (srcNode) layout[srcNode.id] = { a: 0, r: 0, x: 0, y: 0 };
}

/* ═══ SVG-РЕНДЕР ═══ */
const svg = $("tree");
const VB0 = { x: -560, y: -560, w: 1120, h: 1120 };
let vb = { ...VB0 };
let groups = {};

function el(tag, attrs = {}, html) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function arcPath(r, a0, a1) {
  const [x0, y0] = pol(a0, r), [x1, y1] = pol(a1, r);
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
}

function buildScene() {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);

  const root = el("g", { id: "rootG", class: reducedMotion ? "" : "breath" });
  svg.appendChild(root);
  groups = { root };
  ["rings", "sectorsG", "voids", "spokes", "cmn", "res", "ghosts", "nodesG", "coreW", "nulF"].forEach(k => {
    groups[k] = el("g", { id: k });
    root.appendChild(groups[k]);
  });

  buildRings();
  buildSectors();
  buildVoid();
  buildSpokes();
  buildCMNRing();
  buildGhosts();
  buildResonance();
  buildNodes();
  buildCore();
  applyLayers();
  applyFilters();
  updateLOD();
}

/* кольца Вистнера как мишень / радар */
function buildRings() {
  const g = groups.rings;
  for (let w = 1; w <= 10; w++) {
    const r = R_MIN + (10 - w) * R_STEP;
    g.appendChild(el("circle", { class: "ring-guide" + (w === 1 || w === 10 ? " major" : ""), r }));
    const la = -Math.PI / 2 + 0.045;
    const [lx, ly] = pol(la, r + 4);
    g.appendChild(el("text", { class: "ring-lbl", x: lx.toFixed(1), y: ly.toFixed(1) }, "W" + w));
  }
  // прицельные оси + риски по ободу
  [[0, -R_SECTOR, 0, R_SECTOR], [-R_SECTOR, 0, R_SECTOR, 0]].forEach(([x1, y1, x2, y2]) =>
    g.appendChild(el("line", { class: "crosshair", x1, y1, x2, y2 })));
  for (let i = 0; i < 72; i++) {
    const a = i * Math.PI / 36;
    const [x1, y1] = pol(a, R_MAX + 8), [x2, y2] = pol(a, R_MAX + (i % 6 === 0 ? 16 : 11));
    g.appendChild(el("line", { class: "rim-tick", x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1) }));
  }
}

function buildSectors() {
  const g = groups.sectorsG;
  CLS_ORDER.forEach(cls => {
    const sec = sectors[cls];
    const cnt = nodes.filter(n => n.cls === cls && !n.review).length;
    const sg = el("g", { class: "sector-g", "data-cls": cls });

    sg.appendChild(el("line", {
      class: "sector-sep",
      x1: pol(sec.a0 - 0.017, 46)[0].toFixed(1), y1: pol(sec.a0 - 0.017, 46)[1].toFixed(1),
      x2: pol(sec.a0 - 0.017, R_SECTOR + 16)[0].toFixed(1), y2: pol(sec.a0 - 0.017, R_SECTOR + 16)[1].toFixed(1),
    }));
    sg.appendChild(el("path", { class: "sector-arc", d: arcPath(R_SECTOR, sec.a0, sec.a1) }));
    // невидимая зона клика
    const hit = el("path", {
      class: "sector-hit",
      d: arcPath(R_SECTOR + 6, sec.a0, sec.a1),
      stroke: "transparent", "stroke-width": 78, fill: "none",
    });
    sg.appendChild(hit);

    const [cx, cy] = pol(sec.mid, R_SECTOR + 42);
    const lbl = el("g", { transform: `translate(${cx.toFixed(1)},${cy.toFixed(1)})` });
    lbl.innerHTML = `
      <g transform="translate(0,-24)">${sigilSVG(cls, 1.35)}</g>
      <text class="sector-code" y="1">${cls}</text>
      <text class="sector-name" y="15">${T.classes[cls].name.toUpperCase()}</text>
      <text class="sector-count" y="27">${cls === "ENT" || cls === "NUL" ? "▸ " + cnt + " · РЕДКИЙ" : "▸ " + cnt}</text>`;
    sg.appendChild(lbl);

    // подписи подклассов (LOD 1+)
    Object.entries(sec.subs).forEach(([name, ang]) => {
      const [sx, sy] = pol(ang, R_MAX + 13);
      const deg = ang * 180 / Math.PI + 90;
      const flip = (deg > 90 && deg < 270) ? deg + 180 : deg;
      sg.appendChild(el("text", {
        class: "subclass-lbl lod1",
        x: sx.toFixed(1), y: sy.toFixed(1),
        transform: `rotate(${flip.toFixed(1)} ${sx.toFixed(1)} ${sy.toFixed(1)})`,
      }, name.toUpperCase()));
    });

    sg.addEventListener("click", e => { e.stopPropagation(); focusClass(cls); });
    g.appendChild(sg);
  });
}

/* тёмная воронка Артура: линии рода в его зоне гаснут, фон «проваливается» */
function buildVoid() {
  const art = byId["артур-остерман"];
  if (!art || art.cls !== "NUL") return;
  const p = layout[art.id];
  if (!p) return;
  const defs = el("defs", {}, `
    <radialGradient id="voidGrad">
      <stop offset="0%" stop-color="#000502" stop-opacity="0.96"/>
      <stop offset="55%" stop-color="#000502" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#000502" stop-opacity="0"/>
    </radialGradient>`);
  groups.voids.appendChild(defs);
  groups.voids.appendChild(el("circle", {
    class: "nul-void", cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 64, fill: "url(#voidGrad)",
  }));
}

function spokePath(n) {
  const p = layout[n.id];
  const r0 = 30, r1 = p.r - nodeSize(n) - 3;
  if (r1 <= r0) return "";
  const [x0, y0] = pol(p.a, r0);
  const bend = p.a + 0.06;                    // лёгкий изгиб — живое дерево, не спицы
  const [mx, my] = pol(bend, (r0 + r1) / 2);
  const endR = n.status === "dead" ? r0 + (r1 - r0) * 0.72 : r1;  // оборванные ветви погибших
  const [x1, y1] = pol(p.a, endR);
  return `M${x0.toFixed(1)},${y0.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
}

function buildSpokes() {
  const g = groups.spokes;
  nodes.forEach(n => {
    if (n.cls === "SRC" || n.cls === "CMN" || n.review || !layout[n.id]) return;
    const cl = ["spoke", n.origin === "g" ? "g-origin" : "s-origin"];
    if (n.status === "dead") cl.push("dead-branch");
    const attrs = { class: cl.join(" "), d: spokePath(n), "data-for": n.id };
    if (n.cls === "NUL") attrs.style = "opacity:0.1";      // линия к воронке гаснет
    g.appendChild(el("path", attrs));
  });
}

/* соборное кольцо: пульсирующая дуга, граждане — проявления коллективного */
function buildCMNRing() {
  const g = groups.cmn;
  g.innerHTML = "";
  const sec = sectors.CMN;
  const members = nodes.filter(n => n.cls === "CMN" && !n.review);
  if (!members.length) return;
  const trunkA = sec.mid;
  const [tx0, ty0] = pol(trunkA, 30);
  const [tx1, ty1] = pol(trunkA, R_MAX);
  g.appendChild(el("path", { class: "cmn-trunk s-origin spoke", d: `M${tx0.toFixed(1)},${ty0.toFixed(1)} L${tx1.toFixed(1)},${ty1.toFixed(1)}` }));
  g.appendChild(el("path", { class: "cmn-ring", d: arcPath(R_MAX, sec.a0 - 0.01, sec.a1 + 0.01) }));
}

function buildGhosts() {
  const g = groups.ghosts;
  g.innerHTML = "";
  T.ghosts.forEach((gh, i) => {
    const sec = sectors[gh.cls];
    const ang = sec.subs[gh.subclass] ?? sec.mid;
    const r = R_MIN + 5 * R_STEP;             // полая позиция в середине шкалы
    const [x, y] = pol(ang, r);
    const [x0, y0] = pol(ang, 30);
    g.appendChild(el("path", { class: "ghost-spoke", d: `M${x0.toFixed(1)},${y0.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)}` }));
    const gg = el("g", { class: "ghost lod1", "data-ghost": i, transform: `translate(${x.toFixed(1)},${y.toFixed(1)})` });
    gg.innerHTML = `
      <circle class="g-ring" r="8"/>
      <text class="g-q" y="3.5">?</text>
      <text class="g-lbl lod2" y="19">НЕ ЗАДОКУМЕНТИРОВАНО</text>`;
    gg.addEventListener("mouseenter", e => showHover(e, {
      code: `${gh.cls}-W?·?·———`, name: gh.subclass.toUpperCase(), sub: "ПУСТОЙ СЛОТ ТАКСОНОМИИ", note: gh.hint,
    }));
    gg.addEventListener("mouseleave", hideHover);
    g.appendChild(gg);
  });
}

/* резонансные нити: тонкие безье между родственными силами разных классов */
function buildResonance() {
  const g = groups.res;
  g.innerHTML = "";
  T.resonance.forEach(t => {
    const pts = t.members.map(id => layout[id]).filter(Boolean);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const mx = (a.x + b.x) / 2 * 0.55, my = (a.y + b.y) / 2 * 0.55; // изгиб к центру
      g.appendChild(el("path", {
        class: "res-thread",
        "data-res": t.label,
        d: `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`,
      }));
    }
    if (pts.length) {
      const m = pts[Math.floor(pts.length / 2)];
      g.appendChild(el("text", { class: "res-lbl", x: (m.x * 0.72).toFixed(1), y: (m.y * 0.72).toFixed(1) }, t.label.toUpperCase()));
    }
  });
}

function nodeArc(n, R) {
  const frac = Math.min(1, Math.max(0.06, n.meta_power / 10));
  const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * frac * 0.999;
  return arcPath(R, a0, a1);
}

function buildNodes() {
  const g = groups.nodesG;
  g.innerHTML = "";
  const clsCounter = {};                     // чередуем подписи низ/верх, чтобы коды соседей не слипались
  nodes.forEach(n => {
    if (n.cls === "SRC" || n.review || !layout[n.id]) return;
    const flip = !n.anomaly && (clsCounter[n.cls] = (clsCounter[n.cls] || 0) + 1) % 2 === 0;
    const p = layout[n.id];
    const R = nodeSize(n);
    const fc = T.factions[n.fac]?.color || "#46e8a4";
    const cl = ["node", "lod1"];
    if (n.status === "dead") cl.push("dead");
    if (n.status === "missing") cl.push("missing");
    if (n.anomaly) cl.push("anomaly");
    const ng = el("g", {
      class: cl.join(" "), "data-id": n.id,
      transform: `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`,
      style: `color:${fc}`,
    });
    const pulse = reducedMotion || n.status === "dead" ? "" : "pulse";
    const pulseDur = Math.max(1.1, 6 - n.meta_power * 0.42).toFixed(2);
    ng.innerHTML = `
      <circle class="n-rim" r="${(R + 3.2).toFixed(1)}" stroke="${fc}"/>
      <circle class="n-track" r="${R.toFixed(1)}"/>
      <path class="n-arc" d="${nodeArc(n, R)}"/>
      <circle class="n-core ${pulse}" r="${(R * 0.34).toFixed(1)}" style="--pulse:${pulseDur}s"/>
      ${state.layers.badges ? `<g class="n-badge lod2" transform="translate(${(R + 8).toFixed(1)},${(-R - 6).toFixed(1)}) scale(0.72)">${sigilSVG(n.cls, 1, "n-sigil")}</g>` : ""}
      <text class="n-code lod2" y="${(flip ? -(R + 18) : R + 14).toFixed(1)}">${codeOf(n)}</text>
      <text class="n-name lod3" y="${(flip ? -(R + 9) : R + 24).toFixed(1)}">${n.name}</text>`;

    if (n.anomaly && n.meta_power > 10) {      // шип Маркуса сквозь кольцо W10
      const spike = el("g");
      const [sx0, sy0] = pol(p.a, R_MIN + 14), [sx1, sy1] = pol(p.a, Math.max(46, p.r - R - 4));
      spike.appendChild(el("line", { class: "anomaly-spike", x1: sx0.toFixed(1), y1: sy0.toFixed(1), x2: sx1.toFixed(1), y2: sy1.toFixed(1) }));
      groups.spokes.appendChild(spike);
      ng.insertAdjacentHTML("beforeend", `<text class="w-plus-lbl lod1" y="${(-R - 8).toFixed(1)}">W10⁺</text>`);
    }

    ng.addEventListener("click", e => { e.stopPropagation(); selectNode(n.id); });
    ng.addEventListener("mouseenter", e => {
      showHover(e, {
        code: codeOf(n), name: n.name,
        sub: `${T.classes[n.cls]?.name || n.cls} · ${n.subclass} · ${T.factions[n.fac]?.name || n.fac}`,
        note: n.note || T.class_notes[n.cls] || "",
      });
      if (!state.layers.res) highlightThreads(n.id, true);
    });
    ng.addEventListener("mouseleave", () => { hideHover(); if (!state.layers.res) highlightThreads(n.id, false); });
    g.appendChild(ng);
  });
}

function buildCore() {
  const g = groups.coreW;
  g.innerHTML = "";
  const core = el("g", { id: "coreG" });
  core.innerHTML = `
    <circle class="core-halo" r="26" opacity="0.5"/>
    <circle class="core-halo" r="17" opacity="0.8"/>
    <circle class="core-blaze" r="7" filter="url(#coreGlow)"/>
    <text class="core-lbl" y="44">SRC-W∞</text>
    <text class="core-lbl" y="56" style="font-size:7px;fill:var(--text-dim);letter-spacing:2px">ИСТОЧНИК</text>`;
  const defs = el("defs", {}, `
    <filter id="coreGlow" x="-300%" y="-300%" width="700%" height="700%">
      <feGaussianBlur stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`);
  g.appendChild(defs);
  core.addEventListener("click", e => { e.stopPropagation(); selectSource(); });
  core.addEventListener("mouseenter", e => showHover(e, {
    code: "SRC-W∞", name: srcNode ? srcNode.name : "Источник",
    sub: "ЯДРО ДРЕВА · ВНЕ КЛАССОВ", note: srcNode?.note || "",
  }));
  core.addEventListener("mouseleave", hideHover);
  g.appendChild(core);
}

/* ═══ LOD-КУЛЛИНГ ═══
   z<1.3 — только классы; 1.3–2.1 — подклассы и узлы-точки;
   >2.1 — коды/бейджи; >3 — имена. Невидимое скрыто display:none. */
function zoomFactor() { return VB0.w / vb.w; }
function updateLOD() {
  const z = zoomFactor();
  const lod = z < 1.3 ? 0 : z < 2.1 ? 1 : z < 3 ? 2 : 3;
  svg.dataset.lod = lod;
  svg.querySelectorAll(".lod1").forEach(e => e.style.display = lod >= 1 ? "" : "none");
  svg.querySelectorAll(".lod2").forEach(e => e.style.display = lod >= 2 ? "" : "none");
  svg.querySelectorAll(".lod3").forEach(e => e.style.display = lod >= 3 ? "" : "none");
  groups.spokes.style.display = lod >= 1 ? "" : "none";
  groups.cmn.style.display = lod >= 1 ? "" : "none";
  if (lod >= 1) $("lodHint").classList.add("gone");
}

/* ═══ ZOOM / PAN + лёгкий параллакс колец ═══ */
function applyVB() {
  svg.setAttribute("viewBox", `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`);
  const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
  groups.rings.setAttribute("transform", `translate(${(cx * 0.04).toFixed(1)},${(cy * 0.04).toFixed(1)})`);
  updateLOD();
}
function zoomAt(f, px, py) {
  const nw = Math.max(160, Math.min(VB0.w * 1.4, vb.w / f));
  const k = nw / vb.w;
  const mx = px !== undefined ? vb.x + (px / svg.clientWidth) * vb.w : vb.x + vb.w / 2;
  const my = py !== undefined ? vb.y + (py / svg.clientHeight) * vb.h : vb.y + vb.h / 2;
  vb = { x: mx - (mx - vb.x) * k, y: my - (my - vb.y) * k, w: nw, h: nw * (VB0.h / VB0.w) };
  applyVB();
}
function flyTo(x, y, w, instant) {
  const target = { x: x - w / 2, y: y - w / 2 * (VB0.h / VB0.w), w, h: w * (VB0.h / VB0.w) };
  if (instant || reducedMotion) { vb = target; applyVB(); return; }
  const from = { ...vb }, t0 = performance.now(), dur = 550;
  (function step(t) {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    vb = {
      x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e,
      w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e,
    };
    applyVB();
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

svg.addEventListener("wheel", e => {
  e.preventDefault();
  zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.offsetX, e.offsetY);
}, { passive: false });

let panning = null;
svg.addEventListener("pointerdown", e => {
  if (e.target.closest(".node") && state.editor) return;   // редактор перетаскивает узлы
  panning = { x: e.clientX, y: e.clientY };
  svg.classList.add("panning");
  svg.setPointerCapture(e.pointerId);
});
svg.addEventListener("pointermove", e => {
  if (!panning) return;
  const kx = vb.w / svg.clientWidth, ky = vb.h / svg.clientHeight;
  vb.x -= (e.clientX - panning.x) * kx;
  vb.y -= (e.clientY - panning.y) * ky;
  panning = { x: e.clientX, y: e.clientY };
  applyVB();
});
["pointerup", "pointercancel"].forEach(ev => svg.addEventListener(ev, () => { panning = null; svg.classList.remove("panning"); }));
svg.addEventListener("click", e => { if (e.target === svg || e.target.closest("#rings")) clearFocus(); });

$("zoomIn").onclick = () => zoomAt(1.3);
$("zoomOut").onclick = () => zoomAt(1 / 1.3);
$("zoomFit").onclick = () => { clearFocus(); flyTo(0, 0, VB0.w); };

/* ═══ ФОКУС / ТРАССИРОВКА ═══ */
function svgToScreen(x, y) {
  const r = svg.getBoundingClientRect();
  return [((x - vb.x) / vb.w) * r.width + r.left, ((y - vb.y) / vb.h) * r.height + r.top];
}
function setVignette(x, y) {
  const [sx, sy] = svgToScreen(x, y);
  const st = $("stage").getBoundingClientRect();
  $("vignette").style.setProperty("--vx", ((sx - st.left) / st.width * 100).toFixed(1) + "%");
  $("vignette").style.setProperty("--vy", ((sy - st.top) / st.height * 100).toFixed(1) + "%");
}

function focusClass(cls) {
  clearSelection();
  state.focusCls = cls;
  $("stage").classList.add("focused");
  const sec = sectors[cls];
  document.querySelectorAll(".sector-g").forEach(s => s.classList.toggle("dimmed", s.dataset.cls !== cls));
  document.querySelectorAll(".sector-g").forEach(s => s.classList.toggle("active", s.dataset.cls === cls));
  svg.querySelectorAll(".node").forEach(nd => nd.classList.toggle("dimmed", byId[nd.dataset.id]?.cls !== cls));
  svg.querySelectorAll(".spoke[data-for]").forEach(sp => sp.classList.toggle("dimmed", byId[sp.dataset.for]?.cls !== cls));
  const [mx, my] = pol(sec.mid, (R_MIN + R_MAX) / 2);
  setVignette(mx, my);
  flyTo(mx * 0.72, my * 0.72, VB0.w / 1.9);
  showClassDossier(cls);
}

function selectNode(id, skipFly) {
  const n = byId[id];
  if (!n) return;
  clearSelection(true);
  state.selected = id;
  $("stage").classList.add("focused");
  const p = layout[id];
  svg.querySelectorAll(".node").forEach(nd => {
    nd.classList.toggle("selected", nd.dataset.id === id);
    nd.classList.toggle("dimmed", nd.dataset.id !== id);
  });
  svg.querySelectorAll(".spoke[data-for]").forEach(sp => {
    const mine = sp.dataset.for === id;
    sp.classList.toggle("trace", mine);
    sp.classList.toggle("dimmed", !mine);
  });
  document.querySelectorAll(".sector-g").forEach(s => s.classList.toggle("dimmed", s.dataset.cls !== n.cls));
  if (p) {
    setVignette(p.x, p.y);
    if (!skipFly && !isMobile()) flyTo(p.x, p.y, Math.min(vb.w, VB0.w / 2.6));
  }
  if (state.comparePick && state.compareWith && state.compareWith !== id) {
    showCompare(state.compareWith, id);
    return;
  }
  showNodeDossier(n);
}

function clearSelection(keepPanel) {
  state.selected = null;
  svg.querySelectorAll(".node").forEach(nd => nd.classList.remove("selected", "dimmed"));
  svg.querySelectorAll(".spoke").forEach(sp => sp.classList.remove("trace", "dimmed"));
  document.querySelectorAll(".sector-g").forEach(s => s.classList.remove("dimmed", "active"));
  if (!keepPanel) closeDossier();
}
function clearFocus() {
  state.focusCls = null;
  state.comparePick = false; state.compareWith = null;
  $("stage").classList.remove("focused");
  clearSelection();
}

function highlightThreads(id, on) {
  svg.querySelectorAll(".res-thread").forEach(th => {
    const t = T.resonance.find(r => r.label === th.dataset.res);
    if (t && t.members.includes(id)) th.style.display = on ? "" : (state.layers.res ? "" : "none");
  });
}

/* ═══ ХОВЕР-КАРТОЧКА ═══ */
const hover = $("hovercard");
function showHover(e, d) {
  if (isMobile()) return;
  hover.innerHTML = `
    <div class="hc-code">${d.code}</div>
    <div class="hc-name">${d.name}</div>
    <div class="hc-sub">${d.sub}</div>
    ${d.note ? `<div class="hc-note">«${d.note}»<div class="d-note-src" style="margin-top:3px">— ПОЛЕВЫЕ ЗАМЕТКИ К. ВИСТНЕРА</div></div>` : ""}`;
  hover.hidden = false;
  positionHover(e);
}
function positionHover(e) {
  const st = $("stage").getBoundingClientRect();
  let x = e.clientX - st.left + 16, y = e.clientY - st.top + 12;
  if (x + 260 > st.width) x -= 280;
  if (y + 130 > st.height) y -= 140;
  hover.style.left = x + "px";
  hover.style.top = y + "px";
}
svg.addEventListener("pointermove", e => { if (!hover.hidden) positionHover(e); });
function hideHover() { hover.hidden = true; }

/* ═══ ДОСЬЕ ═══ */
const dossier = $("dossier"), dBody = $("dossierBody");
function openDossier() { dossier.hidden = false; $("analytics").hidden = true; }
function closeDossier() { dossier.hidden = true; }
$("dossierClose").onclick = () => { closeDossier(); if (!isMobile()) clearFocus(); };

function wistnerDial(n, size = 56) {
  const frac = n.meta_power >= 100 ? 1 : Math.min(1, n.meta_power / 10);
  const r = size / 2 - 5, c = size / 2;
  const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * frac * 0.999;
  const [x0, y0] = [c + r * Math.cos(a0), c + r * Math.sin(a0)];
  const [x1, y1] = [c + r * Math.cos(a1), c + r * Math.sin(a1)];
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(70,232,164,0.14)" stroke-width="3"/>
    <path d="M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)}" fill="none" stroke="#46e8a4" stroke-width="3" stroke-linecap="round"/>
    <text x="${c}" y="${c + 4}" text-anchor="middle" style="font-family:var(--mono);font-size:${size / 4.2}px;fill:#46e8a4">${wistnerTag(n)}</text>
  </svg>`;
}

function bandLabel(n) {
  const b = BANDS.find(b => b.test(n.meta_power));
  if (n.meta_power >= 100) return "W∞ · Источник";
  return b ? b.lbl : "—";
}

function showNodeDossier(n) {
  const fc = T.factions[n.fac]?.color || "#46e8a4";
  const isNul = n.cls === "NUL";
  const idx = nodes.indexOf(n) + 1;
  dBody.innerHTML = `
    <div class="d-sys">SYS.TAXA // ЗАПИСЬ #${String(idx).padStart(3, "0")} // ${n.undocumented ? "КАРТОЧКА ДАМПА ОТСУТСТВУЕТ" : "СВЕРЕНО С ДАМПОМ"}</div>
    <div class="d-code">${codeOf(n)}</div>
    <div class="d-name">${n.name}</div>
    <div class="d-role">${n.role || ""}</div>
    ${portraitHTML(n)}
    <div class="d-wistner">${wistnerDial(n)}<div class="d-wistner-txt">ШКАЛА ВИСТНЕРА<br><b>${bandLabel(n)}</b><br>МЕТА-СИЛА: ${n.meta_power}</div></div>
    <div class="d-grid">
      <div class="d-cell"><div class="d-cap">КЛАСС</div><div class="d-val"><b>${n.cls}${n.dual ? "²" : ""}</b> ${T.classes[n.cls]?.name || ""}</div></div>
      <div class="d-cell"><div class="d-cap">ПОДКЛАСС</div><div class="d-val">${n.subclass}</div></div>
      <div class="d-cell"><div class="d-cap">ФРАКЦИЯ</div><div class="d-val"><span class="fac-dot" style="background:${fc};box-shadow:0 0 6px ${fc}"></span>${T.factions[n.fac]?.name || n.fac}</div></div>
      <div class="d-cell"><div class="d-cap">УГРОЗА</div><div class="d-val"><b>${n.threat || "—"}</b></div></div>
      <div class="d-cell"><div class="d-cap">СТАТУС</div><div class="d-val" style="${n.status === "dead" ? "color:var(--err)" : ""}">${STATUS_LABEL[n.status] || "—"}</div></div>
      <div class="d-cell"><div class="d-cap">ПРОИСХОЖДЕНИЕ</div><div class="d-val">${n.origin}</div></div>
      <div class="d-cell wide"><div class="d-cap">ТИП ЛИНИИ РОДА</div><div class="d-val" style="font-size:10px">${ORIGIN_LABEL[n.origin] || ""}</div></div>
    </div>
    ${n.review ? `<div class="d-review"><b>⚠ НА РЕВЬЮ</b><br>${n.review_note || ""}</div>` : ""}
    ${n.abilities?.length ? `<div class="d-sec"><div class="d-sec-cap">ЗАФИКСИРОВАННЫЕ ПРОЯВЛЕНИЯ</div><div class="d-chips">${n.abilities.map(a => `<span class="d-chip">${a}</span>`).join("")}</div></div>` : ""}
    ${n.note ? `<div class="d-sec"><div class="d-sec-cap">ПОЛЕВЫЕ ЗАМЕТКИ</div><div class="d-note">«${n.note}»<div class="d-note-src">— К. ВИСТНЕР, АРХИВ АРКАДИИ</div></div></div>` : ""}
    <div class="d-sec" id="dEvents" hidden><div class="d-sec-cap">БАЗА СОБЫТИЙ</div><div class="d-events" id="dEventsList"></div></div>
    <div class="d-btnrow">
      ${isNul ? `<button class="d-btn danger" id="btnScan">▸ СКАНИРОВАТЬ ОБЪЕКТ</button>` : ""}
      <button class="d-btn" id="btnTrace">◈ ТРАССИРОВКА К ИСТОЧНИКУ</button>
      <button class="d-btn" id="btnCompare">⇄ СРАВНИТЬ С ДРУГИМ НОСИТЕЛЕМ</button>
      ${n.slug ? `<a class="d-btn" href="../characters/index.html">▤ КАРТОЧКА В АРХИВЕ ПЕРСОНАЖЕЙ</a>` : ""}
    </div>
    <div id="dExtra"></div>
    ${state.editor ? editorHTML(n) : ""}`;
  openDossier();
  loadEvents(n);
  $("btnTrace").onclick = () => { if (!isMobile()) selectNode(n.id); };
  $("btnCompare").onclick = () => {
    state.comparePick = true;
    state.compareWith = n.id;
    $("dExtra").innerHTML = `<div class="cmp-hint">ВЫБЕРИТЕ ВТОРОГО НОСИТЕЛЯ НА ДРЕВЕ ИЛИ В СПИСКЕ</div>`;
  };
  if (isNul) $("btnScan").onclick = scanGlitch;
  if (state.editor) bindEditor(n);
}

function portraitHTML(n) {
  if (n.status === "dead") {
    return `<div class="d-portrait">${n.avatar ? `<img src="${n.avatar}" alt="" style="filter:saturate(0) contrast(1.1) brightness(0.6)">` : ""}<div class="dead-stamp">ЗАПИСЬ ЗАКРЫТА</div></div>`;
  }
  return n.avatar
    ? `<div class="d-portrait"><img src="${n.avatar}" alt="${n.name}" loading="lazy"></div>`
    : `<div class="d-portrait none">[ ИЗОБРАЖЕНИЕ НЕ ЗАДОКУМЕНТИРОВАНО ]</div>`;
}

function showClassDossier(cls) {
  const c = T.classes[cls];
  const members = nodes.filter(n => n.cls === cls && !n.review).sort((a, b) => b.meta_power - a.meta_power);
  dBody.innerHTML = `
    <div class="d-sys">SYS.TAXA // КЛАСС // ${cls}</div>
    <div class="d-code">${cls} — ${c.name.toUpperCase()}</div>
    <div class="d-role">${c.full}</div>
    <div class="d-sec" style="margin-top:12px"><div class="d-note">${c.desc}</div></div>
    ${T.class_notes[cls] ? `<div class="d-sec"><div class="d-sec-cap">ПОЛЕВЫЕ ЗАМЕТКИ</div><div class="d-note">«${T.class_notes[cls]}»<div class="d-note-src">— К. ВИСТНЕР</div></div></div>` : ""}
    <div class="d-sec"><div class="d-sec-cap">НОСИТЕЛИ · ${members.length}</div>
      <div class="d-events">${members.map(m => `<div class="d-event" style="cursor:pointer" data-go="${m.id}"><b>${codeOf(m)}</b>${m.name}</div>`).join("")}</div>
    </div>`;
  openDossier();
  dBody.querySelectorAll("[data-go]").forEach(e => e.onclick = () => selectNode(e.dataset.go));
}

function selectSource() {
  clearSelection(true);
  $("stage").classList.add("focused");
  setVignette(0, 0);
  svg.querySelectorAll(".node").forEach(nd => nd.classList.add("dimmed"));
  svg.querySelectorAll(".spoke[data-for]").forEach(sp => sp.classList.add("dimmed"));
  dBody.innerHTML = `
    <div class="d-sys">SYS.TAXA // ЗАПИСЬ #000 // УРОВЕНЬ ДОПУСКА ПРЕВЫШЕН</div>
    <div class="d-code">SRC-W∞</div>
    <div class="d-name">${srcNode?.name || "Источник"}</div>
    <div class="d-role">${srcNode?.role || ""}</div>
    <div class="d-sec" style="margin-top:12px"><div class="d-sec-cap">МИФ О ПЕРВОВСПЛЕСКЕ</div><div class="d-myth">${T.myth}</div></div>
    ${srcNode?.note ? `<div class="d-sec"><div class="d-sec-cap">ПОЛЕВЫЕ ЗАМЕТКИ</div><div class="d-note">«${srcNode.note}»<div class="d-note-src">— К. ВИСТНЕР, ПОСЛЕДНЯЯ ЗАПИСЬ</div></div></div>` : ""}
    <div class="d-btnrow"><button class="d-btn danger" id="btnAccess">▸ ЗАПРОСИТЬ ПОЛНЫЙ ДОСТУП</button></div>
    <div id="dExtra"></div>`;
  openDossier();
  $("btnAccess").onclick = () => {
    $("dExtra").innerHTML = `<div class="d-denied">ДОСТУП ЗАПРЕЩЁН</div>`;
  };
}

function scanGlitch() {
  const ov = $("glitchOverlay");
  ov.hidden = false;
  setTimeout(() => { ov.hidden = true; }, 1600);
}

/* база событий: сцепка с волтом хронологии */
async function loadEvents(n) {
  try {
    if (!state.events) {
      const res = await fetch("../timeline/data/events.json");
      state.events = await res.json();
    }
    const names = [n.name, ...(n.aliases || [])];
    const hits = state.events.filter(e => (e.chars || []).some(c => names.includes(c))).slice(0, 5);
    if (!hits.length || state.selected !== n.id) return;
    $("dEvents").hidden = false;
    $("dEventsList").innerHTML = hits.map(e => `<div class="d-event"><b>${e.year}</b>${e.text}</div>`).join("");
  } catch (err) { /* хронология недоступна — секция остаётся скрытой */ }
}

/* ═══ СРАВНЕНИЕ ═══ */
function showCompare(idA, idB) {
  const a = byId[idA], b = byId[idB];
  state.comparePick = false; state.compareWith = null;
  const col = n => `
    <div class="cmp-col">
      <div class="d-code">${codeOf(n)}</div>
      <div class="d-name">${n.name}</div>
      <div class="cmp-stat"><div class="d-cap">ВИСТНЕР · ${wistnerTag(n)}</div><div class="cmp-bar"><i style="width:${Math.min(100, n.meta_power * 10)}%"></i></div></div>
      <div class="cmp-stat"><div class="d-cap">УГРОЗА · ${n.threat || 0}</div><div class="cmp-bar"><i style="width:${Math.min(100, (n.threat || 0) / 1.3)}%"></i></div></div>
      <div class="cmp-stat"><div class="d-cap">КЛАСС</div><div class="d-val" style="font-size:10px">${n.cls}${n.dual ? "²" : ""} · ${n.subclass}</div></div>
      <div class="cmp-stat"><div class="d-cap">ФРАКЦИЯ</div><div class="d-val" style="font-size:10px">${T.factions[n.fac]?.name || n.fac}</div></div>
    </div>`;
  dBody.innerHTML = `
    <div class="d-sys">SYS.TAXA // РЕЖИМ СРАВНЕНИЯ</div>
    <div class="d-code">⇄ СОПОСТАВЛЕНИЕ НОСИТЕЛЕЙ</div>
    <div class="cmp-cols">${col(a)}${col(b)}</div>
    <div class="d-btnrow"><button class="d-btn" id="cmpBack">← ВЕРНУТЬСЯ К ДОСЬЕ</button></div>`;
  openDossier();
  $("cmpBack").onclick = () => selectNode(idA);
}

/* ═══ ФИЛЬТРЫ / СМАРТ-ПОИСК ═══ */
function buildFilterChips() {
  const mk = (wrap, items, set, extra) => {
    wrap.innerHTML = "";
    items.forEach(([val, lbl, color]) => {
      const b = document.createElement("button");
      b.className = "chip" + (extra || "");
      b.textContent = lbl;
      if (color) b.style.setProperty("--fc", color);
      b.onclick = () => {
        set.has(val) ? set.delete(val) : set.add(val);
        b.classList.toggle("on");
        applyFilters();
      };
      wrap.appendChild(b);
    });
  };
  mk($("fClass"), CLS_ORDER.map(c => [c, c]), state.filters.cls);
  const facs = [...new Set(nodes.filter(n => n.cls !== "SRC").map(n => n.fac))];
  mk($("fFaction"), facs.map(f => [f, f, T.factions[f]?.color]), state.filters.fac, " fac");
  mk($("fBand"), BANDS.map(b => [b.id, b.id]), state.filters.band);
  mk($("fOrigin"), [["s", "s · стихийное"], ["g", "g · дар"], ["c", "c · соборное"]], state.filters.origin);
}

function matchQuery(n, q) {
  if (!q) return true;
  const code = codeOf(n).toUpperCase();
  const name = n.name.toLowerCase();
  return q.split(/[\s,]+/).every(tok => {
    if (!tok) return true;
    const up = tok.toUpperCase();
    if (up.includes("·")) return up.split("·").every(p => code.includes(p));
    return code.includes(up) || name.includes(tok.toLowerCase()) || (n.subclass || "").toLowerCase().includes(tok.toLowerCase());
  });
}
function nodeMatches(n) {
  const f = state.filters;
  if (f.cls.size && !f.cls.has(n.cls)) return false;
  if (f.fac.size && !f.fac.has(n.fac)) return false;
  if (f.band.size && !f.band.has(bandOf(n))) return false;
  if (f.origin.size && !f.origin.has(n.origin)) return false;
  return matchQuery(n, f.q.trim());
}
function applyFilters() {
  let shown = 0, total = 0;
  nodes.forEach(n => {
    if (n.cls === "SRC" || n.review) return;
    total++;
    const ok = nodeMatches(n);
    if (ok) shown++;
    const nd = svg.querySelector(`.node[data-id="${CSS.escape(n.id)}"]`);
    const sp = svg.querySelector(`.spoke[data-for="${CSS.escape(n.id)}"]`);
    if (nd) nd.classList.toggle("filtered", !ok);
    if (sp) sp.classList.toggle("filtered", !ok);
  });
  $("hudCount").textContent = `НОСИТЕЛЕЙ: ${shown} / ${total} · ИСТОЧНИК: 1`;
  renderMobile();
}

let qTimer;
$("query").addEventListener("input", e => {
  clearTimeout(qTimer);
  qTimer = setTimeout(() => {
    const v = e.target.value;
    if (v.trim() === "/edit") { toggleEditor(); e.target.value = ""; state.filters.q = ""; applyFilters(); return; }
    state.filters.q = v;
    applyFilters();
  }, 140);
});
$("query").addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const v = e.target.value.trim();
  if (v === "/edit") { toggleEditor(); e.target.value = ""; state.filters.q = ""; applyFilters(); return; }
  const hits = nodes.filter(n => n.cls !== "SRC" && !n.review && nodeMatches(n));
  if (hits.length === 1 && !isMobile()) selectNode(hits[0].id);
});
$("btnClear").onclick = () => {
  state.filters = { cls: new Set(), fac: new Set(), band: new Set(), origin: new Set(), q: "" };
  $("query").value = "";
  document.querySelectorAll(".chip.on").forEach(c => c.classList.remove("on"));
  clearFocus();
  applyFilters();
};
$("panelToggle").onclick = () => $("panel").classList.toggle("open");

/* ═══ СЛОИ ═══ */
function applyLayers() {
  const L = state.layers;
  groups.res.style.display = "";
  svg.querySelectorAll(".res-thread, .res-lbl").forEach(e => e.style.display = L.res ? "" : "none");
  svg.querySelectorAll(".n-code").forEach(e => { if (!L.codes) e.style.display = "none"; });
  svg.querySelectorAll(".n-badge").forEach(e => { if (!L.badges) e.style.display = "none"; });
  groups.ghosts.style.display = L.ghost ? "" : "none";
  updateLOD();                               // LOD переопределит видимость включённых
  if (!L.codes) svg.querySelectorAll(".n-code").forEach(e => e.style.display = "none");
  if (!L.badges) svg.querySelectorAll(".n-badge").forEach(e => e.style.display = "none");
  nulField(L.nul);
}
["Codes", "Badges", "Res", "Nul", "Ghost"].forEach(k => {
  $("tgl" + k).addEventListener("change", e => {
    state.layers[k.toLowerCase()] = e.target.checked;
    applyLayers();
  });
});

/* ── симуляция поля Артура: таскаешь радиус — узлы в зоне гаснут ── */
let nulPos = null, nulR = 100, nulDrag = null;
function nulField(on) {
  groups.nulF.innerHTML = "";
  nodes.forEach(n => { n._suppressed = false; });
  if (!on) { refreshSuppression(); return; }
  const art = byId["артур-остерман"];
  const base = art && layout[art.id] ? layout[art.id] : { x: 0, y: 0 };
  if (!nulPos) nulPos = { x: base.x, y: base.y };
  const c = el("circle", { cx: nulPos.x, cy: nulPos.y, r: nulR });
  const t = el("text", { x: nulPos.x, y: nulPos.y - nulR - 8 }, "ПОЛЕ ПОДАВЛЕНИЯ NUL · ПЕРЕТАЩИТЕ");
  groups.nulF.append(c, t);
  c.addEventListener("pointerdown", e => {
    e.stopPropagation();
    nulDrag = true;
    c.setPointerCapture(e.pointerId);
  });
  c.addEventListener("pointermove", e => {
    if (!nulDrag) return;
    const pt = clientToSVG(e.clientX, e.clientY);
    nulPos = pt;
    c.setAttribute("cx", pt.x); c.setAttribute("cy", pt.y);
    t.setAttribute("x", pt.x); t.setAttribute("y", pt.y - nulR - 8);
    refreshSuppression();
  });
  ["pointerup", "pointercancel"].forEach(ev => c.addEventListener(ev, () => nulDrag = null));
  refreshSuppression();
}
function refreshSuppression() {
  nodes.forEach(n => {
    if (n.cls === "SRC" || n.review || !layout[n.id]) return;
    const on = state.layers.nul && n.cls !== "NUL" &&
      Math.hypot(layout[n.id].x - (nulPos?.x ?? 0), layout[n.id].y - (nulPos?.y ?? 0)) <= nulR;
    n._suppressed = on;
    const nd = svg.querySelector(`.node[data-id="${CSS.escape(n.id)}"]`);
    if (!nd) return;
    nd.classList.toggle("suppressed", on);
    const code = nd.querySelector(".n-code");
    if (code) code.textContent = codeOf(n);
  });
}
function clientToSVG(cx, cy) {
  const r = svg.getBoundingClientRect();
  return { x: vb.x + (cx - r.left) / r.width * vb.w, y: vb.y + (cy - r.top) / r.height * vb.h };
}

/* ═══ АНАЛИТИКА ═══ */
$("btnAnalytics").onclick = () => {
  const an = $("analytics");
  if (!an.hidden) { an.hidden = true; return; }
  closeDossier();
  const carriers = nodes.filter(n => n.cls !== "SRC" && !n.review);
  const bar = (rows, cyan) => rows.map(([lbl, v, max, extra]) => `
    <div class="an-row">
      <div class="an-lbl">${lbl}${extra || ""}</div>
      <div class="an-bar${cyan ? " cy" : ""}"><i style="width:${(v / max * 100).toFixed(0)}%"></i></div>
      <div class="an-val">${v}</div>
    </div>`).join("");
  const byCls = CLS_ORDER.map(c => [c + " · " + T.classes[c].name, carriers.filter(n => n.cls === c).length]);
  const byBand = BANDS.map(b => [b.lbl, carriers.filter(n => b.test(n.meta_power)).length]);
  const facs = [...new Set(carriers.map(n => n.fac))];
  const byFac = facs.map(f => [T.factions[f]?.name || f, carriers.filter(n => n.fac === f).length]).sort((a, b) => b[1] - a[1]);
  const mx = a => Math.max(1, ...a.map(r => r[1]));
  $("analyticsBody").innerHTML = `
    <div class="an-note">ПО КЛАССАМ</div>${bar(byCls.map(r => [...r, mx(byCls)]))}
    <div class="an-note">ПО ПОЛОСАМ ВИСТНЕРА</div>${bar(byBand.map(r => [...r, mx(byBand)]), true)}
    <div class="an-note">ПО ФРАКЦИЯМ</div>${bar(byFac.map(r => [...r, mx(byFac)]))}
    <div class="an-note" style="margin-top:12px">РЕДЧАЙШИЕ КЛАССЫ: ${byCls.filter(r => r[1] === 1).map(r => r[0].split(" ·")[0]).join(", ") || "—"} · ПО ОДНОМУ НОСИТЕЛЮ</div>`;
  an.hidden = false;
};
$("analyticsClose").onclick = () => $("analytics").hidden = true;

/* ═══ ОЧЕРЕДЬ «⚠ СПОРНЫЕ» ═══ */
function reviewList() { return nodes.filter(n => n.review); }
$("btnReview").onclick = () => {
  const list = reviewList();
  dBody.innerHTML = `
    <div class="d-sys">SYS.TAXA // ОЧЕРЕДЬ РЕВЬЮ</div>
    <div class="d-code">⚠ СПОРНЫЕ · ${list.length}</div>
    <div class="d-role">Узлы, не прошедшие автоплейсмент или ожидающие переклассификации.</div>
    <div class="d-sec" style="margin-top:12px">
      ${list.map(n => `
        <div class="d-review" style="margin-bottom:8px;cursor:pointer" data-rv="${n.id}">
          <b>${n.name}</b> · Мета-сила ${n.meta_power} · ${T.factions[n.fac]?.name || n.fac}<br>
          <span style="font-size:10.5px;color:var(--text-dim)">${n.review_note || ""}</span>
        </div>`).join("") || `<div class="d-note">Очередь пуста.</div>`}
    </div>
    ${state.editor ? `<div class="cmp-hint">РЕДАКТОР АКТИВЕН: откройте узел, чтобы приписать класс и снять флаг ревью</div>` : ""}`;
  openDossier();
  dBody.querySelectorAll("[data-rv]").forEach(e => e.onclick = () => showNodeDossier(byId[e.dataset.rv]));
};
$("reviewCount").textContent = reviewList().length ? `· ${reviewList().length}` : "";

/* ═══ РЕДАКТОР-РЕЖИМ (вход: команда /edit в строке поиска) ═══ */
function snapshot() {
  state.undo.push(JSON.stringify(nodes));
  if (state.undo.length > 60) state.undo.shift();
}
function toggleEditor() {
  state.editor = !state.editor;
  $("editorBadge").hidden = !state.editor;
  if (state.selected) showNodeDossier(byId[state.selected]);
  bindNodeDrag();
}
function editorHTML(n) {
  const clsOpts = [...CLS_ORDER, "SRC"].map(c => `<option value="${c}" ${n.cls === c ? "selected" : ""}>${c}</option>`).join("");
  return `
    <div class="ed-block">
      <div class="ed-cap">◉ РЕДАКТОР · ${n._draft ? "ЧЕРНОВИК" : "КАНОН"}</div>
      <div class="ed-row"><label>КЛАСС</label><select id="edCls">${clsOpts}</select></div>
      <div class="ed-row"><label>ПОДКЛАСС</label><input type="text" id="edSub" value="${n.subclass || ""}"></div>
      <div class="ed-row"><label>ВИСТНЕР</label><input type="range" id="edW" min="1" max="12" value="${Math.min(12, n.meta_power)}"><span class="ed-wval" id="edWval">${wistnerTag(n)}</span></div>
      <div class="ed-row"><label>ПРОИСХ.</label><div class="ed-orow">
        ${["s", "g", "c"].map(o => `<button class="chip ${n.origin === o ? "on" : ""}" data-eo="${o}">${o}</button>`).join("")}
      </div></div>
      <div class="ed-row ed-flags">
        <label class="tgl"><input type="checkbox" id="edDraft" ${n._draft ? "checked" : ""}><span>черновик</span></label>
        <label class="tgl"><input type="checkbox" id="edReview" ${n.review ? "checked" : ""}><span>⚠ ревью</span></label>
      </div>
      <div class="ed-btns">
        <button class="d-btn" id="edUndo">↶ UNDO</button>
        <button class="d-btn" id="edExport">⇩ ЭКСПОРТ JSON</button>
      </div>
    </div>`;
}
function bindEditor(n) {
  const apply = () => {
    snapshot();
    n.cls = $("edCls").value;
    n.subclass = $("edSub").value.trim() || n.subclass;
    n.meta_power = +$("edW").value;
    n._draft = $("edDraft").checked;
    n.review = $("edReview").checked || undefined;
    if (!n.review) delete n.review_note;
    rebuild(n.id);
  };
  $("edCls").onchange = apply;
  $("edSub").onchange = apply;
  $("edW").oninput = () => { $("edWval").textContent = "W" + (+$("edW").value > 10 ? "10⁺" : $("edW").value); };
  $("edW").onchange = apply;
  dBody.querySelectorAll("[data-eo]").forEach(b => b.onclick = () => { snapshot(); n.origin = b.dataset.eo; rebuild(n.id); });
  $("edDraft").onchange = apply;
  $("edReview").onchange = apply;
  $("edUndo").onclick = () => {
    const prev = state.undo.pop();
    if (!prev) return;
    JSON.parse(prev).forEach((s, i) => Object.keys(nodes[i]).forEach(k => delete nodes[i][k]) || Object.assign(nodes[i], s));
    rebuild(n.id);
  };
  $("edExport").onclick = exportRoster;
}
function rebuild(keepId) {
  computeLayout();
  buildScene();
  $("reviewCount").textContent = reviewList().length ? `· ${reviewList().length}` : "";
  if (keepId && byId[keepId] && !byId[keepId].review) selectNode(keepId, true);
  else if (keepId) showNodeDossier(byId[keepId]);
}
/* экспорт обратно в волт: формат tree/tools/roster.json */
function exportRoster() {
  const carriers = nodes.map(n => {
    const r = { slug: n.slug || null, cls: n.cls, subclass: n.subclass, origin: n.origin, fac: n.fac, serial: n.serial };
    if (!n.slug) Object.assign(r, { id: n.id, name: n.name, meta_power: n.meta_power, threat: n.threat, status: n.status, role: n.role, abilities: n.abilities });
    if (n.dual) r.dual = true;
    if (n.anomaly) r.anomaly = true;
    if (n.lobe) r.lobe = n.lobe;
    if (n.review) { r.review = true; r.review_note = n.review_note || ""; }
    if (n._draft) r.draft = true;
    return r;
  });
  const blob = new Blob([JSON.stringify({ _exported: new Date().toISOString(), carriers, ghosts: T.ghosts, resonance: T.resonance }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "roster.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
/* драг узла в другой сектор → класс и код пересчитываются вживую */
function bindNodeDrag() {
  svg.querySelectorAll(".node").forEach(nd => {
    nd.onpointerdown = state.editor ? e => {
      e.stopPropagation();
      const id = nd.dataset.id;
      const move = ev => {
        const pt = clientToSVG(ev.clientX, ev.clientY);
        let ang = Math.atan2(pt.y, pt.x);
        document.querySelectorAll(".sector-g").forEach(s => {
          const sec = sectors[s.dataset.cls];
          const norm = a => { let x = a - sec.a0; while (x < 0) x += Math.PI * 2; return x; };
          s.classList.toggle("active", norm(ang) <= (sec.a1 - sec.a0));
        });
        nd.setAttribute("transform", `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
      };
      const up = ev => {
        svg.removeEventListener("pointermove", move);
        svg.removeEventListener("pointerup", up);
        const pt = clientToSVG(ev.clientX, ev.clientY);
        const ang = Math.atan2(pt.y, pt.x);
        const target = CLS_ORDER.find(c => {
          const sec = sectors[c];
          let x = ang - sec.a0; while (x < 0) x += Math.PI * 2;
          return x <= (sec.a1 - sec.a0);
        });
        const n = byId[id];
        if (target && target !== n.cls) { snapshot(); n.cls = target; n._draft = true; }
        rebuild(id);
      };
      svg.addEventListener("pointermove", move);
      svg.addEventListener("pointerup", up);
    } : null;
  });
}

/* ═══ ШТАМП БАЗЫ ═══ */
$("dbVersion").textContent = `${T.version} // ${nodes.length} ЗАПИСЕЙ`;
$("dbChangelog").innerHTML = `ЖУРНАЛ ПЕРЕКЛАССИФИКАЦИЙ:<br>${T.changelog.join("<br>")}<br>СБОРКА: ${T.built}`;
$("dbStamp").onclick = () => $("dbStamp").classList.toggle("open");

/* ═══ КЛАВИАТУРА ═══ */
document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") {
    if (e.key === "Escape") e.target.blur();
    return;
  }
  if (e.key === "Escape") { closeDossier(); $("analytics").hidden = true; clearFocus(); }
  if (e.key === "+" || e.key === "=") zoomAt(1.25);
  if (e.key === "-") zoomAt(1 / 1.25);
  if (e.key === "0") { clearFocus(); flyTo(0, 0, VB0.w); }
  if (e.key === "/") { e.preventDefault(); $("panel").classList.add("open"); $("query").focus(); }
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    const list = nodes.filter(n => n.cls !== "SRC" && !n.review && nodeMatches(n));
    if (!list.length) return;
    let i = list.findIndex(n => n.id === state.selected);
    i = (i + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length;
    selectNode(list[i].id);
  }
});

/* ═══ МОБИЛКА: ГАРМОШКА-ТАКСОНОМИЯ ═══ */
function miniRing(n, size = 30) {
  const fc = T.factions[n.fac]?.color || "#46e8a4";
  const frac = n.meta_power >= 100 ? 1 : Math.min(1, n.meta_power / 10);
  const r = size / 2 - 3, c = size / 2;
  const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * frac * 0.999;
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  return `<svg class="m-node-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(70,232,164,0.15)" stroke-width="2"/>
    <path d="M${c},${c - r} A${r},${r} 0 ${large} 1 ${(c + r * Math.cos(a1)).toFixed(1)},${(c + r * Math.sin(a1)).toFixed(1)}" fill="none" stroke="#46e8a4" stroke-width="2"/>
    <circle cx="${c}" cy="${c}" r="3.4" fill="none" stroke="${fc}" stroke-width="1.6"/>
  </svg>`;
}
function renderMobile() {
  const wrap = $("mobileTaxa");
  if (!wrap || !isMobile()) return;
  const open = new Set([...wrap.querySelectorAll(".m-class.open")].map(e => e.dataset.cls));
  let html = `
    <div class="m-core" id="mCore">
      <div class="m-core-code">SRC-W∞ · ЯДРО ДРЕВА</div>
      <div class="m-core-name">${srcNode?.name || "ИСТОЧНИК"}</div>
      <div class="m-core-sub">ВСЯ МЕТА-СИЛА МИРА ИСХОДИТ ОТСЮДА · НАЖМИТЕ</div>
    </div>`;
  CLS_ORDER.forEach(cls => {
    const members = nodes.filter(n => n.cls === cls && !n.review && nodeMatches(n)).sort((a, b) => b.meta_power - a.meta_power);
    const ghosts = state.layers.ghost ? T.ghosts.filter(g => g.cls === cls) : [];
    if (!members.length && !ghosts.length) return;
    const bands = BANDS.filter(b => members.some(m => b.test(m.meta_power)));
    html += `
      <div class="m-class ${open.has(cls) ? "open" : ""}" data-cls="${cls}">
        <div class="m-class-head">
          <svg width="20" height="20" viewBox="-10 -10 20 20">${sigilSVG(cls, 1)}</svg>
          <span class="m-class-code">${cls}</span>
          <span class="m-class-name">${T.classes[cls].name.toUpperCase()}</span>
          <span class="m-class-count">${members.length}</span>
          <span class="m-class-arrow">▸</span>
        </div>
        <div class="m-class-body">
          <div class="m-class-desc">${T.classes[cls].desc}</div>
          ${bands.map(b => `
            <div class="m-band-cap">${b.lbl.toUpperCase()}</div>
            ${members.filter(m => b.test(m.meta_power)).map(m => `
              <div class="m-node ${m.status === "dead" ? "dead" : ""}" data-open="${m.id}">
                ${miniRing(m)}
                <div class="m-node-main">
                  <div class="m-node-code">${codeOf(m)}</div>
                  <div class="m-node-name">${m.name}</div>
                </div>
                <div class="m-node-w">${wistnerTag(m)}</div>
              </div>`).join("")}`).join("")}
          ${ghosts.map(g => `
            <div class="m-node ghost-row">
              <svg class="m-node-ring" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="11" fill="none" stroke="rgba(70,232,164,0.35)" stroke-dasharray="3 4"/><text x="15" y="19" text-anchor="middle" style="font-family:var(--mono);font-size:10px;fill:rgba(70,232,164,0.4)">?</text></svg>
              <div class="m-node-main">
                <div class="m-node-code">${g.cls}-W?·?·———</div>
                <div class="m-node-name">${g.subclass} · НЕ ЗАДОКУМЕНТИРОВАНО</div>
              </div>
            </div>`).join("")}
        </div>
      </div>`;
  });
  const rv = reviewList();
  if (rv.length) {
    html += `<div class="m-review-banner">⚠ СПОРНЫЕ · ${rv.length} — ${rv.map(n => n.name).join(", ")} · ОЖИДАЮТ РЕВЬЮ</div>`;
  }
  wrap.innerHTML = html;
  $("mCore").onclick = selectSource;
  wrap.querySelectorAll(".m-class-head").forEach(h => h.onclick = () => h.parentElement.classList.toggle("open"));
  wrap.querySelectorAll("[data-open]").forEach(e => e.onclick = () => showNodeDossier(byId[e.dataset.open]));
}

/* ═══ ВОРОТА ДОСТУПА (механизм глобальной карты, один в один) ═══
   В исходнике хранится только SHA-256-хэш кода, не сам код.
   Сменить код: printf '%s' 'новый-код' | sha256sum                */
const ACCESS_HASH = "c5bb4ef4cf1c3e749f1bc451c824755fa16f0d7b9ca636f38c1284009076e3b4";
const GATE_KEY = "dw_tree_access";

async function sha256hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function unlockAndStart() {
  const g = $("gate");
  if (g) g.remove();
  start();
}
(function gate() {
  const gateEl = $("gate");
  if (localStorage.getItem(GATE_KEY) === ACCESS_HASH) { unlockAndStart(); return; }
  gateEl.style.display = "flex";
  const form = $("gateForm"), input = $("gateInput"), err = $("gateErr");
  setTimeout(() => input.focus(), 60);
  if (!(window.crypto && crypto.subtle)) {
    err.textContent = "ОТКРОЙТЕ СТРАНИЦУ ПО HTTPS";
    input.disabled = true;
    return;
  }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    err.textContent = "";
    const val = input.value.trim();
    if (!val) return;
    let h;
    try { h = await sha256hex(val); } catch (_) { return; }
    if (h === ACCESS_HASH) {
      localStorage.setItem(GATE_KEY, ACCESS_HASH);
      gateEl.classList.add("ok");
      setTimeout(unlockAndStart, 380);
    } else {
      err.textContent = "НЕВЕРНЫЙ КОД ДОСТУПА";
      gateEl.classList.add("shake");
      setTimeout(() => gateEl.classList.remove("shake"), 420);
      input.value = "";
      input.focus();
    }
  });
})();

/* ═══ СТАРТ ═══ */
function start() {
  $("app").hidden = false;
  computeLayout();
  buildFilterChips();
  buildScene();
  applyFilters();
  renderMobile();
  window.addEventListener("resize", renderMobile);
}

})();
