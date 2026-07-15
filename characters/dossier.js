const FACTION_COLORS = {
  "Тенебрион":              { hex: "#ff9d00", rgb: "255,157,0" },
  "Единая Америка":         { hex: "#4a9eff", rgb: "74,158,255" },
  "Ракшасы":                { hex: "#a55eea", rgb: "165,94,234" },
  "Аркадия":                { hex: "#2ecc71", rgb: "46,204,113" },
  "Forge":                  { hex: "#a8d8ff", rgb: "168,216,255" },
  "Тихая гавань":           { hex: "#38bdf8", rgb: "56,189,248" },
  "Белая зона":             { hex: "#94a3b8", rgb: "148,163,184" },
  "Независимые":            { hex: "#8b8f98", rgb: "139,143,152" },
  "Экваториальная сеть":    { hex: "#d4a843", rgb: "212,168,67" },
  "Гарнизон":               { hex: "#f2f2f2", rgb: "242,242,242" },
  "Ковчег":                 { hex: "#e8e0c9", rgb: "232,224,201" },
  "Титаны":                 { hex: "#8a9a5b", rgb: "138,154,91" },
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

const TIER_FILTER_COLORS = {
  common:    { hex: "#6b7280", rgb: "107,114,128" },
  rare:      { hex: "#60a5fa", rgb: "96,165,250" },
  epic:      { hex: "#a78bfa", rgb: "167,139,250" },
  legendary: { hex: "#fbbf24", rgb: "251,191,36" },
  divine:    { hex: "#ffffff", rgb: "255,255,255" }
};

const REPO = "AlexandraHaffman/divided-world";
const TOP_FACTIONS = new Set(["Тенебрион", "Единая Америка", "Аркадия", "Forge", "Ракшасы"]);

/* Краткие пояснения характеристик — всплывают по наведению на название
   статы (радар, ползунки в досье, «перетягивание каната» в сравнении).
   Общий словарь, чтобы формулировка не расходилась между режимами. */
const STAT_INFO = {
  intelligence:     "Скорость мышления, эрудиция и способность к анализу и стратегии.",
  combat:           "Боевые навыки, физическая мощь и эффективность в прямом столкновении.",
  influence:        "Авторитет, связи и способность управлять решениями других.",
  meta_power:       "Мощь мета-способностей относительно других мета-людей.",
  cruelty:          "Готовность причинять боль и пренебрежение чужими страданиями.",
  will:             "Устойчивость к давлению, страху, боли и манипуляциям.",
  stealth:          "Умение оставаться незамеченным и действовать в тени.",
  unpredictability: "Хаотичность решений и поведения — трудно просчитать наперёд."
};

/* Порог, с которого персонаж считается легендарным — квалификация
   считается сама по threat_level, вручную ничего добавлять не нужно. */
const LEGENDARY_THREAT_THRESHOLD = 50;
function isLegendaryThreat(c) {
  return typeof c.threat_level === "number" && c.threat_level >= LEGENDARY_THREAT_THRESHOLD;
}

/* Реестр персонажей, для которых физически существует расширенная
   HTML-страница досье (characters/legendary/<slug>.html). Кнопка
   ссылки показывается только тем, кто и легендарен по угрозе, и есть
   в этом реестре — так что при добавлении новой страницы просто
   впиши сюда одну строку, без правки логики отображения. */
const LEGENDARY_DOSSIER_SLUGS = { "Элиас Дорн": "dorn/dorn", "Курт Вистнер": "wistner/wistner" };

/* ══════════════════════════════════════════
   ОБРАТНАЯ СВЯЗЬ: анонимный счётчик просмотров (counterapi.dev v1)
   ══════════════════════════════════════════ */
const COUNTER_NS = "divided-world-chars";

async function counterUp(key) {
  try {
    const res = await fetch(`https://api.counterapi.dev/v1/${COUNTER_NS}/${encodeURIComponent(key)}/up`);
    const data = await res.json();
    return typeof data.count === "number" ? data.count : null;
  } catch (e) { return null; }
}

function injectFeedbackStyles() {
  if (document.getElementById("feedback-styles")) return;
  const style = document.createElement("style");
  style.id = "feedback-styles";
  style.textContent = `
    .dossier-view-count{font-family:'Share Tech Mono',monospace;font-size:11px;color:#4a6a80;letter-spacing:0.1em;margin-top:8px;}
  `;
  document.head.appendChild(style);
}

async function incrementViewCounter(c) {
  const el = document.getElementById("dossier-view-count");
  if (!el || !c._slug) return;
  el.textContent = "";
  const n = await counterUp(`view-${c._slug}`);
  if (n !== null) el.textContent = `👁 ПРОСМОТРОВ: ${n}`;
}

let allChars = [], currentFiltered = [], currentCols = 2;
let currentFaction = "all";
let currentTier = "all";
let metaOnly = false;
let currentSort = "threat";

function hexToRgb(h) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : null;
}
function getFactionColor(c) {
  if (FACTION_COLORS[c.faction]) return FACTION_COLORS[c.faction];
  if (c.faction_color) { const r = hexToRgb(c.faction_color); if (r) return { hex: c.faction_color, rgb: r }; }
  return DEFAULT_COLOR;
}
function isTopFaction(c) { return TOP_FACTIONS.has(c.faction); }
function getTier(c) { return (c.tier || "common").toLowerCase().trim(); }

function sortChars(list) {
  const arr = [...list];
  if (currentSort === "name") {
    arr.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ru"));
  } else {
    arr.sort((a, b) => (b.threat_level || 0) - (a.threat_level || 0));
  }
  return arr;
}

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

function buildRadar(stats, rgb, size = 70) {
  const RADAR_KEYS = ["intelligence","combat","influence","cruelty","will","stealth","unpredictability"];
  const vals = RADAR_KEYS.map(k => stats[k] || 0);
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
    const tip = STAT_INFO[RADAR_KEYS[i]] || "";
    return `<g class="radar-axis-label">
      ${tip ? `<title>${tip}</title>` : ""}
      <circle cx="${lx.toFixed(1)}" cy="${(ly+4).toFixed(1)}" r="11" fill="transparent"/>
      <text x="${lx.toFixed(1)}" y="${(ly+4).toFixed(1)}" text-anchor="middle" font-size="9">${EMOJI[i]}</text>
      <text x="${lx.toFixed(1)}" y="${(ly+14).toFixed(1)}" text-anchor="middle" font-size="7" fill="rgba(${rgb},0.7)" font-family="Share Tech Mono,monospace" font-weight="700">${vals[i]}</text>
    </g>`;
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

function buildCard(c, i, cols) {
  const col = getFactionColor(c);
  const hasPhoto = !!c.avatar_web;
  const tier = getTier(c);
  const delay = Math.min(i * 0.04, 0.8);
  const factionLabel = c.faction || '—';
  const metaAttr = ((c.stats && c.stats.meta_power) || 0) >= 100 ? ' data-meta="divine"' : '';
  const globalIdx = allChars.indexOf(c);
  const isDead = (c.status || '').trim() === 'Мёртв';
  const deadAttr = isDead ? ' data-status="dead"' : '';
  const deadDelay = (Math.random() * 6).toFixed(2);
  const deadGlass = isDead ? `<div class="dead-glitch" style="animation-delay:${deadDelay}s"></div>` : '';

  if (cols >= 5 && hasPhoto) {
    return `<div class="char-card compact-5" data-tier="${tier}"${metaAttr}${deadAttr} style="--cr:${col.rgb};animation-delay:${delay}s" data-idx="${i}" data-gidx="${globalIdx}">
      <div class="card-top-bar"></div><div class="tier-corners"></div>
      <div class="card-body">
        <div class="compact-5-photo">
          <img src="${c.avatar_web}" alt="${c.name}" loading="lazy">
          ${deadGlass}
          <div class="compact-5-threat">${c.threat_level || 0}</div>
        </div>
        <div class="compact-5-name-area"><div class="compact-5-name">${c.name}</div></div>
      </div>
    </div>`;
  }

  if (cols >= 3 && hasPhoto) {
    return `<div class="char-card compact-3" data-tier="${tier}"${metaAttr}${deadAttr} style="--cr:${col.rgb};animation-delay:${delay}s" data-idx="${i}" data-gidx="${globalIdx}">
      <div class="card-top-bar"></div><div class="tier-corners"></div>
      <div class="cmp-check"></div>
      <div class="card-body">
        <div class="compact-3-photo">
          <img src="${c.avatar_web}" alt="${c.name}" loading="lazy">
          ${deadGlass}
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

  if (hasPhoto) {
    const top = isTopFaction(c);
    const factionEl = top
      ? `<div class="faction-badge">${factionLabel}</div>`
      : `<div class="card-photo-faction-bottom">${factionLabel}</div>`;
    return `<div class="char-card has-photo" data-tier="${tier}"${metaAttr}${deadAttr} style="--cr:${col.rgb};animation-delay:${delay}s" data-idx="${i}" data-gidx="${globalIdx}">
      <div class="card-top-bar"></div><div class="tier-corners"></div>
      <div class="card-body">
        <div class="card-photo-wrap">
          <img src="${c.avatar_web}" alt="${c.name}" loading="lazy">
          ${deadGlass}
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

  const radar = buildRadar(c.stats || {}, col.rgb, 70);
  const top = isTopFaction(c);
  const factionEl = top
    ? `<div class="faction-badge">${factionLabel}</div>`
    : `<div class="card-faction-bottom">${factionLabel}</div>`;
  return `<div class="char-card" data-tier="${tier}"${metaAttr}${deadAttr} style="--cr:${col.rgb};animation-delay:${delay}s" data-idx="${i}" data-gidx="${globalIdx}">
    <div class="card-top-bar"></div><div class="tier-corners"></div>
    ${deadGlass}
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

function renderGrid(chars) {
  if (currentCols === 1) { activateCarouselMode(); return; }
  document.getElementById("count-shown").textContent = chars.length;
  const grid = document.getElementById("grid");
  if (!chars.length) { grid.innerHTML = `<div class="empty-state">НЕ НАЙДЕНО</div>`; return; }
  grid.innerHTML = chars.map((c, i) => buildCard(c, i, currentCols)).join("");
  attachCardEvents();
  if (currentCols === 3 && typeof applyCompareSelectionState === "function") applyCompareSelectionState();
  applySearch();
}

function refreshFiltered() {
  let base = currentFaction === "all" ? allChars : allChars.filter(c => c.faction === currentFaction);
  if (currentTier !== "all") base = base.filter(c => getTier(c) === currentTier);
  if (metaOnly) base = base.filter(c => ((c.stats && c.stats.meta_power) || 0) > 0);
  currentFiltered = sortChars(base);
  renderGrid(currentFiltered);
}

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
  currentFaction = faction;
  document.querySelectorAll("#filters .filter-btn").forEach(b => b.classList.toggle("active", b.dataset.faction === faction));
  refreshFiltered();
}

function buildTierFilters() {
  const wrap = document.getElementById("tier-filters");
  ["common","rare","epic","legendary","divine"].forEach(t => {
    const col = TIER_FILTER_COLORS[t];
    const btn = document.createElement("button");
    btn.className = "filter-btn"; btn.dataset.tier = t; btn.textContent = t.toUpperCase();
    btn.style.cssText = `--fc:${col.hex};--fr:${col.rgb}`;
    btn.onclick = () => setTierFilter(t);
    wrap.appendChild(btn);
  });
}

function setTierFilter(tier) {
  currentTier = tier;
  document.querySelectorAll("#tier-filters .filter-btn").forEach(b => b.classList.toggle("active", b.dataset.tier === tier));
  refreshFiltered();
}

async function loadCharacters() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/data/characters`);
    const data = await res.json();
    if (!Array.isArray(data)) {
      const msg = data.message || "Неизвестная ошибка API";
      throw new Error(msg);
    }
    allChars = (await Promise.all(
      data
        .filter(f => f.name.endsWith(".json") && f.name !== ".keep")
        .map(async f => {
          const c = await (await fetch(f.download_url)).json();
          c._slug = f.name.replace(/\.json$/, "");
          return c;
        })
    )).sort((a, b) => (b.threat_level || 0) - (a.threat_level || 0));
    currentFaction = "all";
    currentFiltered = sortChars(allChars);
    buildFilters();
    buildTierFilters();
    renderGrid(currentFiltered);
    document.getElementById("count-total").textContent = allChars.length;
  } catch (e) {
    document.getElementById("grid").innerHTML =
      `<div class="empty-state">ОШИБКА: ${e.message}<br><br>Попробуйте обновить страницу через минуту.</div>`;
  }
}

function openDossier(idx) {
  const c = allChars[idx];
  const col = getFactionColor(c);
  const tier = getTier(c);
  const isDead = (c.status || '').trim() === 'Мёртв';
  const sc = STATUS_COLORS[c.status] || STATUS_COLORS["Неизвестно"];
  const scRgb = sc === "#5dd98a" ? "93,217,138" : sc === "#f87171" ? "248,113,113" : "100,116,139";
  const artUrl = c.avatar_web_full || c.avatar_web || "";
  const legendarySlug = isLegendaryThreat(c) ? LEGENDARY_DOSSIER_SLUGS[c.name] : null;
  const stats = c.stats || {};
  const statRows = [
    ["Интеллект",         stats.intelligence,     "intelligence"],
    ["Боевые",            stats.combat,            "combat"],
    ["Влияние",           stats.influence,         "influence"],
    ["Мета-сила",         stats.meta_power,        "meta_power"],
    ["Жестокость",        stats.cruelty,           "cruelty"],
    ["Воля",              stats.will,              "will"],
    ["Скрытность",        stats.stealth,           "stealth"],
    ["Непредсказуемость", stats.unpredictability,  "unpredictability"]
  ];
  const radar = buildRadar(stats, col.rgb, 150);

  const factionBarStyle = (tier === "legendary" || tier === "divine")
    ? `style="--dr:${col.rgb}"`
    : `style="background:linear-gradient(90deg,transparent,rgb(${col.rgb}),transparent)"`;

  document.getElementById("dossier-inner").innerHTML = `
    <div class="dossier-art" style="--dr:${col.rgb}">
      <div class="dossier-faction-bar" ${factionBarStyle}></div>
      <button class="dossier-close" onclick="closeDossier()">← АРХИВ</button>
      ${legendarySlug ? `<a class="legendary-link" href="legendary/${legendarySlug}.html">▸ ЛЕГЕНДАРНОЕ ДОСЬЕ</a>` : ''}
      <div class="dossier-art-bg">
        ${artUrl
          ? `<img src="${artUrl}" alt="${c.name}">`
          : `<div class="art-placeholder"><span class="art-placeholder-text" style="--dr:${col.rgb}">[ PORTRAIT CLASSIFIED ]</span></div>`
        }
      </div>
      <div class="dossier-art-gradient"></div>
      ${isDead ? `
      <div class="dossier-terminated-stamp">
        <div class="stamp-inner">
          <span class="stamp-line1">TERMINATED</span>
          <span class="stamp-line2">SYS.RECORD CLOSED</span>
        </div>
      </div>` : ''}
      <div class="dossier-art-info">
        <div class="dossier-sys">SYS.RECORD // SUBJECT #${String(idx+1).padStart(3,"0")} // CLEARANCE: ALPHA</div>
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
        <div id="dossier-view-count" class="dossier-view-count"></div>
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
              .map(([l, v, key]) => `
                <div class="stat-row">
                  <div class="stat-name" data-tip="${STAT_INFO[key] || ''}">${l}</div>
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
  overlay.dataset.tier = tier;
  overlay.classList.add("open");
  overlay.scrollTop = 0;
  document.body.style.overflow = "hidden";

  incrementViewCounter(c);
}

function closeDossier() {
  document.getElementById("dossier").classList.remove("open");
  document.body.style.overflow = "";
}

function attachCardEvents() {
  document.querySelectorAll(".char-card").forEach(el => {
    let startX, startY, moved = false;
    const gidx = parseInt(el.dataset.gidx);
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
      if (!moved) {
        e.preventDefault();
        if (currentCols === 3 && typeof toggleCompareSelect === "function") toggleCompareSelect(gidx, el);
        else openDossier(gidx);
      }
    });
    el.addEventListener("click", () => {
      if (!('ontouchstart' in window)) {
        if (currentCols === 3 && typeof toggleCompareSelect === "function") toggleCompareSelect(gidx, el);
        else openDossier(gidx);
      }
    });
  });
}

document.getElementById("cols-slider").addEventListener("click", e => {
  const btn = e.target.closest(".cols-opt");
  if (!btn) return;
  document.querySelectorAll(".cols-opt").forEach(b => b.classList.toggle("active", b === btn));
  currentCols = parseInt(btn.dataset.cols);
  document.getElementById("grid").dataset.cols = btn.dataset.cols;
  deactivateCarouselMode();
  if (currentCols !== 3 && typeof clearCompareSelection === "function") clearCompareSelection();
  if (currentCols !== 1) renderGrid(currentFiltered);
  else activateCarouselMode();
});

document.getElementById("sort-toggle").addEventListener("click", () => {
  currentSort = currentSort === "threat" ? "name" : "threat";
  document.getElementById("sort-label").textContent = currentSort === "threat" ? "УГРОЗА ↓" : "ИМЯ А-Я";
  refreshFiltered();
});

document.getElementById("filters-toggle").addEventListener("click", () => {
  document.getElementById("filters-toggle").classList.toggle("open");
  document.getElementById("filters").classList.toggle("open");
});
document.querySelector("#filters .filter-btn[data-faction='all']").addEventListener("click", () => setFilter("all"));

document.getElementById("tier-toggle").addEventListener("click", () => {
  document.getElementById("tier-toggle").classList.toggle("open");
  document.getElementById("tier-filters").classList.toggle("open");
});
document.querySelector("#tier-filters .filter-btn[data-tier='all']").addEventListener("click", () => setTierFilter("all"));

document.getElementById("meta-toggle").addEventListener("click", () => {
  metaOnly = !metaOnly;
  document.getElementById("meta-toggle").classList.toggle("active", metaOnly);
  refreshFiltered();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeDossier();
    if (typeof closeCompare === "function") closeCompare();
  }
});

/* ══════════════════════════════════════════
   ПОИСК ПО ИМЕНИ
   ══════════════════════════════════════════ */
let searchQuery = "";

function highlightMatch(name, query) {
  const i = name.toLowerCase().indexOf(query);
  if (i === -1) return name;
  return name.slice(0, i) + "<mark>" + name.slice(i, i + query.length) + "</mark>" + name.slice(i + query.length);
}

function getSearchMatches() {
  if (!searchQuery) return [];
  return currentFiltered.filter(c => c.name.toLowerCase().includes(searchQuery));
}

function applySearch() {
  const wrap = document.getElementById("search-wrap");
  const clearBtn = document.getElementById("search-clear");
  const suggBox = document.getElementById("search-suggestions");
  const input = document.getElementById("search-input");

  document.querySelectorAll(".char-card.search-match").forEach(el => el.classList.remove("search-match"));
  clearBtn.classList.toggle("show", !!searchQuery);

  if (!searchQuery) {
    wrap.classList.remove("no-match");
    suggBox.classList.remove("show");
    suggBox.innerHTML = "";
    document.getElementById("count-shown").textContent = currentFiltered.length;
    return;
  }

  const matches = getSearchMatches();
  document.getElementById("count-shown").textContent = matches.length;
  wrap.classList.toggle("no-match", matches.length === 0);

  document.querySelectorAll("#grid .char-card").forEach(el => {
    const idx = parseInt(el.dataset.idx);
    if (matches.includes(currentFiltered[idx])) el.classList.add("search-match");
  });

  if (document.activeElement === input && matches.length) {
    suggBox.innerHTML = matches.slice(0, 8).map(c => {
      const gidx = allChars.indexOf(c);
      return `<div class="search-sugg-item" data-gidx="${gidx}">${highlightMatch(c.name, searchQuery)}</div>`;
    }).join("");
    suggBox.classList.add("show");
  } else {
    suggBox.classList.remove("show");
  }

  if (matches.length === 1) {
    const idx = currentFiltered.indexOf(matches[0]);
    const el = document.querySelector(`#grid .char-card[data-idx="${idx}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function clearSearch() {
  searchQuery = "";
  document.getElementById("search-input").value = "";
  applySearch();
}

document.getElementById("search-input").addEventListener("input", e => {
  searchQuery = e.target.value.trim().toLowerCase();
  applySearch();
});
document.getElementById("search-input").addEventListener("focus", applySearch);

document.getElementById("search-clear").addEventListener("click", () => {
  clearSearch();
  document.getElementById("search-input").focus();
});

document.getElementById("search-suggestions").addEventListener("click", e => {
  const item = e.target.closest(".search-sugg-item");
  if (!item) return;
  const gidx = parseInt(item.dataset.gidx);
  const c = allChars[gidx];
  if (!currentFiltered.includes(c)) setFilter("all");
  document.getElementById("search-input").value = c.name;
  searchQuery = c.name.toLowerCase();
  applySearch();
  document.getElementById("search-suggestions").classList.remove("show");
  document.getElementById("search-input").blur();
});

document.addEventListener("click", e => {
  if (!e.target.closest("#search-wrap")) {
    document.getElementById("search-suggestions").classList.remove("show");
  }
});

injectFeedbackStyles();
loadCharacters();
