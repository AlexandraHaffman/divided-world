const FACTION_COLORS = {
  "Тенебрион":              { hex: "#ff9d00", rgb: "255,157,0" },
  "Единая Америка":         { hex: "#4a9eff", rgb: "74,158,255" },
  "Ракшасы":                { hex: "#a55eea", rgb: "165,94,234" },
  "Аркадия":                { hex: "#2ecc71", rgb: "46,204,113" },
  "Forge":                  { hex: "#a8d8ff", rgb: "168,216,255" },
  "Тихая гавань":           { hex: "#38bdf8", rgb: "56,189,248" },
  "Белая зона":             { hex: "#94a3b8", rgb: "148,163,184" },
  "Независимые":            { hex: "#a3e635", rgb: "163,230,53" },
  "Экваториальная сеть":    { hex: "#d4a843", rgb: "212,168,67" },
  "Гарнизон":               { hex: "#aaaaaa", rgb: "170,170,170" },
  "Ковчег":                 { hex: "#8899bb", rgb: "136,153,187" },
  "Джамахирия Нар":         { hex: "#B8540A", rgb: "184,84,10" },
  "Австралийский протекторат": { hex: "#a0522d", rgb: "160,82,45" },
  "Отражение бездны":       { hex: "#3d5a3e", rgb: "61,90,62" },
};
const DEFAULT_COLOR = { hex: "#4fc3f7", rgb: "79,195,247" };
const STATUS_COLORS = {
  "Активен":    "#5dd98a",
  "Мёртв":      "#f87171",
  "Неизвестно": "#64748b"
};

const REPO = "AlexandraHaffman/divided-world";
const TOP_FACTIONS = new Set(["Тенебрион", "Единая Америка", "Аркадия", "Forge", "Ракшасы"]);

let allChars = [], currentFiltered = [], currentCols = 2;

/* ── Утилиты ── */
function hexToRgb(h) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : null;
}
function getFactionColor(c) {
  if (c.faction_color) { const r = hexToRgb(c.faction_color); if (r) return { hex: c.faction_color, rgb: r }; }
  return FACTION_COLORS[c.faction] || DEFAULT_COLOR;
}
function isTopFaction(c) { return TOP_FACTIONS.has(c.faction); }
function getTier(c) { return (c.tier || "common").toLowerCase().trim(); }

/* ── Мета-сила ── */
function metaGlowHTML(c) {
  const m = (c.stats && c.stats.meta_power) || 0;
  if (m <= 0) return "";
  let h, str, cls = "meta-glow";
  if (m >= 100)     { h = 40; str = 0.38; cls = "meta-glow meta-glow--pulse"; }
  else if (m >= 10) { h = 32; str = 0.30; cls = "meta-glow meta-glow--pulse"; }
  else              { h = 3 + m * 3.2; str = 0.07 + m * 0.025; }
  h = Math.round(h); str = +str.toFixed(3);
  return `<div class="${cls}" style="--mg-h:${h}px;--mg-str:${str};height:${h}px;background:linear-gradient(to top,rgba(var(--cr),${str}),transparent);"></div>`;
}

/* ── Радар ── */
function buildRadar(stats, rgb, size = 70) {
  const vals = [
    stats.intelligence || 0, stats.combat || 0, stats.influence || 0,
    stats.cruelty || 0, stats.will || 0, stats.stealth || 0, stats.unpredictability || 0
  ];
  const EMOJI = ["🧠","⚔","👑","🔪","🛡","🌑","🎲"];
  const n = 7, cx = size/2, cy = size/2, R = size * 0.33;
  const angles = Array.from({length: n}, (_, i) => (Math.PI*2*i/n) - Math.PI/2);
  const pt = arr => arr.map(p => p.map(v => v.toFixed(1)).join(",")).join(" ");
  const poly = r => angles.map(a => [cx + r*Math.cos(a), cy + r*Math.sin(a)]);
  const rings = [0.33, 0.66, 1].map(f =>
    `<polygon points="${pt(poly(R*f))}" fill="none" stroke="rgba(${rgb},${f===1?0.25:0.1})" stroke-width="0.8"/>`
  ).join("");
  const spokes = angles.map(a =>
    `<line x1="${cx}" y1="${cy}" x2="${(cx+R*Math.cos(a)).toFixed(1)}" y2="${(cy+R*Math.sin(a)).toFixed(1)}" stroke="rgba(${rgb},0.12)" stroke-width="0.8"/>`
  ).join("");
  const dp = angles.map((a, i) => {
    const r = (Math.min(vals[i], 10) / 10) * R;
    return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
  });
  const labels = size > 90 ? angles.map((a, i) => {
    const lx = cx + (R+13)*Math.cos(a), ly = cy + (R+13)*Math.sin(a);
    return `<text x="${lx.toFixed(1)}" y="${(ly+4).toFixed(1)}" text-anchor="middle" font-size="9">${EMOJI[i]}</text>`
         + `<text x="${lx.toFixed(1)}" y="${(ly+14).toFixed(1)}" text-anchor="middle" font-size="7" fill="rgba(${rgb},0.7)" font-family="Share Tech Mono,monospace" font-weight="700">${vals[i]}</text>`;
  }).join("") : "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    <defs><filter id="rg${size}"><feGaussianBlur stdDeviation="1.5"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${rings}${spokes}
    <polygon points="${pt(dp)}" fill="rgba(${rgb},0.12)" stroke="none"/>
    <polygon points="${pt(dp)}" fill="none" stroke="rgba(${rgb},0.8)" stroke-width="1.2" stroke-linejoin="round"/>
    ${dp.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2" fill="rgba(${rgb},1)" filter="url(#rg${size})"/>`).join("")}
    ${labels}
  </svg>`;
}

/* ── Построение карточки ── */
function buildCard(c, i, cols) {
  const col = getFactionColor(c);
  const hasPhoto = !!c.avatar_web;
  const tier = getTier(c);
  const delay = Math.min(i * 0.04, 0.8);
  const factionLabel = c.faction || '—';
  const metaAttr = ((c.stats && c.stats.meta_power) || 0) >= 100 ? ' data-meta="divine"' : '';

  /* 5 колонок */
  if (cols >= 5 && hasPhoto) {
    return `<div class="char-card compact-5" data-tier="${tier}"${metaAttr} style="--cr:${col.rgb};animation-delay:${delay}s" data-idx="${i}">
      <div class="card-top-bar"></div><div class="tier-corners"></div>
      <div class="card-body">
        <div class="compact-5-photo">
          <img src="${c.avatar_web}" alt="${c.name}" loading="lazy">
          <div class="compact-5-threat">${c.threat_level || 0}</div>
        </div>
        <div class="compact-5-name-area"><div class="compact-5-name">${c.name}</div></div>
      </div>
    </div>`;
  }

  /* 3 колонки */
  if (cols >= 3 && hasPhoto) {
    return `<div class="char-card compact-3" data-tier="${tier}"${metaAttr} style="--cr:${col.rgb};animation-delay:${delay}s" data-idx="${i}">
      <div class="card-top-bar"></div><div class="tier-corners"></div>
      <div class="card-body">
        <div class="compact-3-photo">
          <img src="${c.avatar_web}" alt="${c.name}" loading="lazy">
          <div class="compact-3-overlay">
            <div class="compact-3-threat">
              <span class="compact-3-threat-num">${c.threat_level || 0}</span>
              <span class="compact-3-threat-lbl">THREAT</span>
            </div>
            <div class="compact-3-faction">${factionLabel}</div>
          </div>
        </div>
        <div class="compact-3-name-area"><div class="compact-3-name">${c.name}</div></div>
      </div>
    </div>`;
  }

  /* С фото (1–2 колонки) */
  if (hasPhoto) {
    const top = isTopFaction(c);
    const factionEl = top
      ? `<div class="faction-badge">${factionLabel}</div>`
      : `<div class="card-photo-faction-bottom">${factionLabel}</div>`;
    return `<div class="char-card has-photo" data-tier="${tier}"${metaAttr} style="--cr:${col.rgb};animation-delay:${delay}s" data-idx="${i}">
      <div class="card-top-bar"></div><div class="tier-corners"></div>
      <div class="card-body">
        <div class="card-photo-wrap">
          <img src="${c.avatar_web}" alt="${c.name}" loading="lazy">
          <div class="meta-glow-anchor">${metaGlowHTML(c)}</div>
          <div class="card-photo-info">
            <div class="card-photo-name">${c.name}</div>
            <div class="card-photo-role">${c.role || ''}</div>
            <div class="card-photo-bottom">
              <div class="card-photo-threat">
                <div class="card-photo-threat-num">${c.threat_level || 0}</div>
                <div class="card-photo-threat-lbl">THREAT</div>
              </div>
              ${factionEl}
            </div>
          </div>
        </div>
        ${c.card_quote ? `<div class="card-quote-a"><div class="card-quote-a-text">«${c.card_quote}»</div></div>` : ''}
      </div>
    </div>`;
  }

  /* Без фото (радар) */
  const radar = buildRadar(c.stats || {}, col.rgb, 70);
  const top = isTopFaction(c);
  const factionEl = top
    ? `<div class="faction-badge">${factionLabel}</div>`
    : `<div class="card-faction-bottom">${factionLabel}</div>`;
  return `<div class="char-card" data-tier="${tier}"${metaAttr} style="--cr:${col.rgb};animation-delay:${delay}s" data-idx="${i}">
    <div class="card-top-bar"></div><div class="tier-corners"></div>
    <div class="card-body">
      <div class="card-name">${c.name}</div>
      <div class="card-role">${c.role || ''}</div>
      <div class="card-radar-row">${radar}<div><div class="threat-num">${c.threat_level || 0}</div><div class="threat-label">THREAT</div></div></div>
      <div class="meta-glow-wrap">${metaGlowHTML(c)}</div>
      ${c.card_quote ? `<div class="card-quote">«${c.card_quote}»</div>` : ''}
      <div class="card-footer">${factionEl}<div class="card-arrow">→</div></div>
    </div>
  </div>`;
}

/* ── Рендер грида ── */
function renderGrid(chars) {
  if (currentCols === 1) { activateCarouselMode(); return; }
  document.getElementById("count-shown").textContent = chars.length;
  const grid = document.getElementById("grid");
  if (!chars.length) { grid.innerHTML = `<div class="empty-state">НЕ НАЙДЕНО</div>`; return; }
  grid.innerHTML = chars.map((c, i) => buildCard(c, i, currentCols)).join("");
  attachCardEvents();
}

/* ── Фильтры ── */
function buildFilters() {
  const factions = [...new Set(allChars.map(c => c.faction).filter(Boolean))].sort();
  const wrap = document.getElementById("filters");
  factions.forEach(f => {
    const col = FACTION_COLORS[f] || DEFAULT_COLOR;
    const btn = document.createElement("button");
    btn.className = "filter-btn"; btn.dataset.faction = f; btn.textContent = f.toUpperCase();
    btn.style.cssText = `--fc:${col.hex};--fr:${col.rgb}`;
    btn.onclick = () => setFilter(f);
    wrap.appendChild(btn);
  });
}

function setFilter(faction) {
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.faction === faction));
  currentFiltered = faction === "all" ? allChars : allChars.filter(c => c.faction === faction);
  renderGrid(currentFiltered);
}

/* ── Загрузка персонажей ── */
async function loadCharacters() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/data/characters`);
    const data = await res.json();

    // ФИX: проверяем что пришёл массив, а не сообщение об ошибке
    if (!Array.isArray(data)) {
      const msg = data.message || "Неизвестная ошибка API";
      throw new Error(msg);
    }

    allChars = (await Promise.all(
      data
        .filter(f => f.name.endsWith(".json") && f.name !== ".keep")
        .map(async f => (await fetch(f.download_url)).json())
    )).sort((a, b) => (b.threat_level || 0) - (a.threat_level || 0));

    currentFiltered = [...allChars];
    buildFilters();
    renderGrid(allChars);
    document.getElementById("count-total").textContent = allChars.length;

  } catch (e) {
    document.getElementById("grid").innerHTML =
      `<div class="empty-state">ОШИБКА: ${e.message}<br><br>Попробуйте обновить страницу через минуту.</div>`;
  }
}

/* ── Досье: открытие ── */
function openDossier(idx) {
  const c = allChars[idx];
  const col = getFactionColor(c);
  const sc = STATUS_COLORS[c.status] || STATUS_COLORS["Неизвестно"];
  const scRgb = sc === "#5dd98a" ? "93,217,138" : sc === "#f87171" ? "248,113,113" : "100,116,139";
  const artUrl = c.avatar_web_full || c.avatar_web || "";
  const stats = c.stats || {};
  const statRows = [
    ["Интеллект",       stats.intelligence],
    ["Боевые",          stats.combat],
    ["Влияние",         stats.influence],
    ["Мета-сила",       stats.meta_power],
    ["Жестокость",      stats.cruelty],
    ["Воля",            stats.will],
    ["Скрытность",      stats.stealth],
    ["Непредсказуемость", stats.unpredictability]
  ];
  const radar = buildRadar(stats, col.rgb, 150);

  document.getElementById("dossier-inner").innerHTML = `
    <div class="dossier-art" style="--dr:${col.rgb}">
      <div class="dossier-faction-bar" style="background:linear-gradient(90deg,transparent,rgb(${col.rgb}),transparent)"></div>
      <button class="dossier-close" onclick="closeDossier()">← АРХИВ</button>
      <div class="dossier-art-bg">
        ${artUrl
          ? `<img src="${artUrl}" alt="${c.name}">`
          : `<div class="art-placeholder"><span class="art-placeholder-text" style="--dr:${col.rgb}">[ ПОРТРЕТ ЗАСЕКРЕЧЕН ]</span></div>`
        }
      </div>
      <div class="dossier-art-gradient"></div>
      <div class="dossier-art-info">
        <div class="dossier-sys">SYS.RECORD // ПЕРСОНАЖ #${String(idx+1).padStart(3,"0")} // CLEARANCE: ALPHA</div>
        <div class="dossier-faction-label">${c.faction || '—'}${c.subfaction && c.subfaction !== c.faction ? ` · ${c.subfaction}` : ''}</div>
        <div class="dossier-name">${c.name}</div>
        <div class="dossier-role">${c.role || ''}</div>
        <div class="dossier-hero-row">
          <div class="dossier-threat-big">
            <div class="dossier-threat-num">${c.threat_level || 0}</div>
            <div class="dossier-threat-lbl">THREAT</div>
          </div>
          <div class="dossier-status" style="--sc2:${sc};--sc-rgb:${scRgb};color:${sc}">${c.status || '—'}</div>
        </div>
        <div class="dossier-scroll-hint">
          <span>ДОСЬЕ</span>
          <div class="scroll-arrow" style="--dr:${col.rgb}"></div>
        </div>
      </div>
    </div>
    <div class="dossier-data" style="--dr:${col.rgb}">
      <div class="dossier-data-line"></div>
      <div class="dossier-meta">
        <div class="dossier-meta-cell"><div class="dossier-meta-label">Пол</div><div class="dossier-meta-val">${c.gender || '—'}</div></div>
        <div class="dossier-meta-cell"><div class="dossier-meta-label">Дата рождения</div><div class="dossier-meta-val">${c.birthdate || '—'}</div></div>
        <div class="dossier-meta-cell"><div class="dossier-meta-label">Локация</div><div class="dossier-meta-val">${c.location || '—'}</div></div>
      </div>
      <div class="dossier-divider"></div>
      <div class="dossier-section">
        <div class="dossier-section-title">Характеристики</div>
        <div class="dossier-stats-row">
          <div class="dossier-radar">${radar}</div>
          <div class="stat-bars">
            ${statRows
              .filter(([l, v]) => v !== undefined && !(l === "Мета-сила" && (v || 0) === 0))
              .map(([l, v]) => `
                <div class="stat-row">
                  <div class="stat-name">${l}</div>
                  <div class="stat-track"><div class="stat-fill" style="width:${Math.min((v||0)/10*100,100)}%"></div></div>
                  <div class="stat-val">${v || 0}</div>
                </div>`)
              .join("")}
          </div>
        </div>
      </div>
      ${c.card_quote ? `<div class="dossier-divider"></div><div class="dossier-section"><div class="dossier-quote">«${c.card_quote}»</div></div>` : ''}
      ${c.biography ? `<div class="dossier-divider"></div><div class="dossier-section"><div class="dossier-section-title">Биография</div><div class="dossier-bio">${c.biography.replace(/\n/g,"<br>")}</div></div>` : ''}
      ${c.current_status ? `<div class="dossier-divider"></div><div class="dossier-section"><div class="dossier-section-title">Текущий статус</div><div class="dossier-bio">${c.current_status.replace(/\n/g,"<br>")}</div></div>` : ''}
      ${c.abilities?.length ? `<div class="dossier-divider"></div><div class="dossier-section"><div class="dossier-section-title">Способности</div><div class="abilities">${c.abilities.map(a=>`<div class="chip">${a}</div>`).join("")}</div></div>` : ''}
      <div class="dossier-bottom"></div>
    </div>`;

  const overlay = document.getElementById("dossier");
  overlay.classList.add("open");
  overlay.scrollTop = 0;
  document.body.style.overflow = "hidden";
}

function closeDossier() {
  document.getElementById("dossier").classList.remove("open");
  document.body.style.overflow = "";
}

/* ── Touch/click на карточках ── */
function attachCardEvents() {
  document.querySelectorAll(".char-card").forEach((el, i) => {
    let startX, startY, moved = false;
    el.addEventListener("touchstart", e => {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; moved = false;
      el.classList.add("tap-active");
    }, { passive: true });
    el.addEventListener("touchmove", e => {
      if (Math.abs(e.touches[0].clientX - startX) > 10 || Math.abs(e.touches[0].clientY - startY) > 10) {
        moved = true; el.classList.remove("tap-active");
      }
    }, { passive: true });
    el.addEventListener("touchend", e => {
      el.classList.remove("tap-active");
      if (!moved) { e.preventDefault(); openDossier(allChars.indexOf(currentFiltered[i])); }
    });
    el.addEventListener("click", () => {
      if (!('ontouchstart' in window)) openDossier(allChars.indexOf(currentFiltered[i]));
    });
  });
}

/* ── Переключатель колонок ── */
document.getElementById("cols-slider").addEventListener("click", e => {
  const btn = e.target.closest(".cols-opt");
  if (!btn) return;
  document.querySelectorAll(".cols-opt").forEach(b => b.classList.toggle("active", b === btn));
  currentCols = parseInt(btn.dataset.cols);
  document.getElementById("grid").dataset.cols = btn.dataset.cols;
  if (currentCols === 1) {
    renderGrid(currentFiltered);
  } else {
    deactivateCarouselMode();
    renderGrid(currentFiltered);
  }
});

/* ── Дропдаун фракций ── */
document.getElementById("filters-toggle").addEventListener("click", () => {
  document.getElementById("filters-toggle").classList.toggle("open");
  document.getElementById("filters").classList.toggle("open");
});
document.querySelector(".filter-btn[data-faction='all']").addEventListener("click", () => setFilter("all"));

/* ── Клавиша Escape ── */
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDossier(); });

/* ── Старт ── */
loadCharacters();
