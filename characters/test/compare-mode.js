/* ══════════════════════════════════════════
   РЕЖИМ СРАВНЕНИЯ (3 колонки)
   Зависит от глобальных вещей из dossier.js:
   allChars, getFactionColor(), buildRadar()
   ══════════════════════════════════════════ */

let compareSelection = []; // индексы персонажей в allChars

/* Тап по карточке в режиме 3 колонок — выбрать/снять выбор */
function toggleCompareSelect(idx, el) {
  const pos = compareSelection.indexOf(idx);
  if (pos >= 0) {
    compareSelection.splice(pos, 1);
    el.classList.remove("cmp-selected");
  } else {
    compareSelection.push(idx);
    el.classList.add("cmp-selected");
  }
  updateCompareBar();
}

/* Восстановить визуальное состояние выбора после перерисовки грида (фильтр и т.п.) */
function applyCompareSelectionState() {
  document.querySelectorAll(".char-card.compact-3").forEach(el => {
    const gidx = parseInt(el.dataset.gidx);
    el.classList.toggle("cmp-selected", compareSelection.includes(gidx));
  });
}

function updateCompareBar() {
  const bar = document.getElementById("compare-bar");
  const countEl = document.getElementById("compare-bar-count");
  const goBtn = document.getElementById("compare-bar-go");
  if (compareSelection.length > 0) {
    bar.classList.add("show");
    const hint = compareSelection.length > 3
      ? `<span class="compare-bar-hint">Больше 3 — радар станет менее читаемым</span>` : '';
    countEl.innerHTML = `Выбрано: <b>${compareSelection.length}</b>${hint}`;
    goBtn.disabled = compareSelection.length < 2;
  } else {
    bar.classList.remove("show");
  }
}

function clearCompareSelection() {
  compareSelection = [];
  document.querySelectorAll(".char-card.cmp-selected").forEach(el => el.classList.remove("cmp-selected"));
  updateCompareBar();
}

/* Радар с наложением нескольких персонажей друг на друга */
function buildCompareRadar(chars, cols, size = 220) {
  const n = 7, cx = size/2, cy = size/2, R = size * 0.34;
  const EMOJI = ["🧠","⚔","👑","🔪","🛡","🌑","🎲"];
  const keys = ["intelligence","combat","influence","cruelty","will","stealth","unpredictability"];
  const angles = Array.from({length: n}, (_, i) => (Math.PI*2*i/n) - Math.PI/2);
  const pt = arr => arr.map(p => p.map(v => v.toFixed(1)).join(",")).join(" ");
  const poly = r => angles.map(a => [cx + r*Math.cos(a), cy + r*Math.sin(a)]);
  const rings = [0.33, 0.66, 1].map(f =>
    `<polygon points="${pt(poly(R*f))}" fill="none" stroke="rgba(255,255,255,${f===1?0.15:0.06})" stroke-width="0.8"/>`
  ).join("");
  const spokes = angles.map(a =>
    `<line x1="${cx}" y1="${cy}" x2="${(cx+R*Math.cos(a)).toFixed(1)}" y2="${(cy+R*Math.sin(a)).toFixed(1)}" stroke="rgba(255,255,255,0.08)" stroke-width="0.8"/>`
  ).join("");
  const labels = angles.map((a, i) => {
    const lx = cx + (R+17)*Math.cos(a), ly = cy + (R+17)*Math.sin(a);
    return `<text x="${lx.toFixed(1)}" y="${(ly+4).toFixed(1)}" text-anchor="middle" font-size="12">${EMOJI[i]}</text>`;
  }).join("");

  // сначала рисуем персонажа с наибольшей суммой статов, чтобы мелкие фигуры не тонули под большими
  const order = chars.map((c, i) => i).sort((a, b) => {
    const sum = c => keys.reduce((s, k) => s + ((c.stats && c.stats[k]) || 0), 0);
    return sum(chars[b]) - sum(chars[a]);
  });

  const shapes = order.map(ci => {
    const rgb = cols[ci].rgb;
    const stats = chars[ci].stats || {};
    const dp = angles.map((a, i) => {
      const r = (Math.min(stats[keys[i]] || 0, 10) / 10) * R;
      return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
    });
    return `<polygon points="${pt(dp)}" fill="rgba(${rgb},0.10)" stroke="rgba(${rgb},0.9)" stroke-width="1.5" stroke-linejoin="round"/>
      ${dp.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.3" fill="rgb(${rgb})"/>`).join("")}`;
  }).join("");

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    ${rings}${spokes}${shapes}${labels}
  </svg>`;
}

/* Одна строка сравнения в стиле «перетягивание каната»:
   единый трек делится на сегменты пропорционально значениям.
   Для 2 персонажей это выглядит как классическое перетягивание,
   для 3+ — как честное деление по долям. */
function buildTugRow(label, vals, cols) {
  const sum = vals.reduce((a, b) => a + b, 0);
  const max = Math.max(...vals);
  const tie = vals.every(v => v === max);
  const allZero = sum <= 0;

  const numsHTML = vals.map((v, i) => {
    const w = allZero ? (100 / vals.length) : (v / sum * 100);
    return `<span style="width:${w}%;color:rgb(${cols[i].rgb})">${v}</span>`;
  }).join("");

  const segsHTML = vals.map((v, i) => {
    const w = allZero ? (100 / vals.length) : (v / sum * 100);
    const isWinner = v === max && max > 0 && !tie;
    const bg = allZero ? "rgba(255,255,255,0.08)" : `rgb(${cols[i].rgb})`;
    return `<div class="compare-tug-seg${isWinner ? ' winner' : ''}" style="width:${w}%;background:${bg}"></div>`;
  }).join("");

  return `<div class="compare-stat-row">
    <div class="compare-stat-label">${label}</div>
    <div class="compare-tug-nums">${numsHTML}</div>
    <div class="compare-tug-track">${segsHTML}</div>
  </div>`;
}

/* Открыть полноэкранный оверлей сравнения */
function openCompare() {
  if (compareSelection.length < 2) return;
  const chars = compareSelection.map(idx => allChars[idx]);
  const cols = chars.map(c => getFactionColor(c));

  const legend = chars.map((c, i) => `
    <div class="compare-legend-item" style="color:rgb(${cols[i].rgb})">
      <span class="compare-legend-dot" style="background:rgb(${cols[i].rgb})"></span>
      ${c.name}
      <span class="compare-legend-faction">${c.faction || ''}</span>
    </div>`).join("");

  const radar = buildCompareRadar(chars, cols, 220);

  const statDefs = [
    ["Интеллект", "intelligence"], ["Боевые", "combat"], ["Влияние", "influence"],
    ["Жестокость", "cruelty"], ["Воля", "will"], ["Скрытность", "stealth"],
    ["Непредсказуемость", "unpredictability"], ["Мета-сила", "meta_power"]
  ];

  const statsHTML = statDefs.map(([label, key]) => {
    const vals = chars.map(c => (c.stats && c.stats[key]) || 0);
    return buildTugRow(label, vals, cols);
  }).join("");

  document.getElementById("compare-inner").innerHTML = `
    <div class="compare-header">
      <button class="compare-close" onclick="closeCompare()">← НАЗАД</button>
      <div class="compare-title">SYS.COMPARE // ${chars.length} ЗАПИСИ</div>
      <div class="compare-legend">${legend}</div>
    </div>
    <div class="compare-radar-wrap">${radar}</div>
    <div class="compare-section-title">Характеристики</div>
    <div class="compare-stats">${statsHTML}</div>
  `;

  document.getElementById("compare-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCompare() {
  document.getElementById("compare-overlay").classList.remove("open");
  document.body.style.overflow = "";
}
