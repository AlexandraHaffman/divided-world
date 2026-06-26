/* ══════════════════════════════════════════
   РЕЖИМ «ПО 1» — JS
   Добавить в конец dossier.js
   (после строки loadCharacters();)
   ══════════════════════════════════════════ */

/* ── Конфиг тиров (сверху вниз) ── */
const TIER_ORDER = ["divine", "legendary", "epic", "rare", "common"];
const TIER_LABELS = {
  divine:    "DIVINE",
  legendary: "LEGENDARY",
  epic:      "EPIC",
  rare:      "RARE",
  common:    "COMMON"
};

/* ── Вставляем HTML карусельного режима в DOM ── */
function injectCarouselContainer() {
  if (document.getElementById("carousel-mode")) return;
  const el = document.createElement("div");
  el.className = "carousel-mode";
  el.id = "carousel-mode";
  // Переключатель группировки
  el.innerHTML = `
    <div class="carousel-group-switch">
      <button class="carousel-group-btn active" data-group="tier">ПО ТИРАМ</button>
      <button class="carousel-group-btn" data-group="faction">ПО ФРАКЦИЯМ</button>
    </div>
    <div id="carousel-shelves"></div>
  `;
  // Вставляем перед гридом
  const grid = document.getElementById("grid");
  grid.parentNode.insertBefore(el, grid);

  // Переключатель группировки
  el.querySelectorAll(".carousel-group-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      el.querySelectorAll(".carousel-group-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderCarousel(currentFiltered, btn.dataset.group);
    });
  });
}

/* ── Цвет полки (тир) ── */
const TIER_COLORS = {
  divine:    "255,157,0",
  legendary: "200,160,255",
  epic:      "79,195,247",
  rare:      "79,195,247",
  common:    "79,195,247"
};

/* ── Рендер одной карточки карусели ── */
function buildCarouselCard(c, idx) {
  const col = getFactionColor(c);
  const tier = getTier(c);
  const sc = STATUS_COLORS[c.status] || STATUS_COLORS["Неизвестно"];
  const scRgb = sc === "#5dd98a" ? "93,217,138" : sc === "#f87171" ? "248,113,113" : "100,116,139";
  const stats = c.stats || {};

  const statRows = [
    ["Интеллект",    stats.intelligence],
    ["Боевые",       stats.combat],
    ["Влияние",      stats.influence],
    ["Жестокость",   stats.cruelty],
    ["Воля",         stats.will],
    ["Скрытность",   stats.stealth],
    ["Непредсказ.",  stats.unpredictability],
    ["Мета-сила",    stats.meta_power]
  ].filter(([, v]) => v !== undefined && v !== null && !(arguments[0].name && v === 0 && arguments[0] === "Мета-сила"));

  const statsHTML = statRows.filter(([, v]) => v > 0).map(([l, v]) =>
    `<div class="c-stat-row">
      <span class="c-stat-name">${l}</span>
      <div class="c-stat-track"><div class="c-stat-fill" style="width:${Math.min((v||0)/10*100,100)}%"></div></div>
      <span class="c-stat-val">${v}</span>
    </div>`
  ).join("");

  const abilitiesHTML = c.abilities?.length
    ? `<div class="c-back-abilities">${c.abilities.map(a => `<div class="c-back-chip">${a}</div>`).join("")}</div>`
    : "";

  const bioHTML = c.biography
    ? `<div class="c-back-bio">${c.biography.replace(/\n/g,"<br>").substring(0, 300)}${c.biography.length > 300 ? "…" : ""}</div>`
    : "";

  const facePhoto = c.avatar_web
    ? `<div class="c-card-photo"><img src="${c.avatar_web}" alt="${c.name}" loading="lazy"></div>`
    : `<div class="c-card-no-photo"><span class="c-card-no-photo-text">NO SIGNAL</span></div>`;

  return `<div class="c-card" data-tier="${tier}" data-idx="${idx}" style="--cr:${col.rgb}">
    <!-- ЛИЦО -->
    <div class="c-card-face" style="border:1px solid rgba(${col.rgb},0.35);background:linear-gradient(160deg,#0d1020,#05080f);">
      <div class="c-card-bar"></div>
      ${facePhoto}
      <div class="c-card-info">
        <div class="c-card-sys">SYS.RECORD // ПЕРСОНАЖ #${String(idx+1).padStart(3,"0")} // CLEARANCE: ALPHA</div>
        <div class="c-card-name">${c.name}</div>
        <div class="c-card-role">${c.role || ""}</div>
        <div class="c-card-bottom-row">
          <div class="c-card-threat">
            <div class="c-card-threat-num">${c.threat_level || 0}</div>
            <div class="c-card-threat-lbl">THREAT</div>
          </div>
          <div class="c-card-status" style="--sc:${sc};--sc-rgb:${scRgb}">${c.status || "—"}</div>
        </div>
      </div>
      <div class="c-card-tap-hint">ТАП → ДОСЬЕ</div>
    </div>
    <!-- ИЗНАНКА -->
    <div class="c-card-back" style="--cr:${col.rgb}">
      <div class="c-card-bar"></div>
      <div class="c-back-header">
        <div>
          <div class="c-back-sys">SYS.RECORD // ДОСЬЕ</div>
          <div class="c-back-name">${c.name}</div>
          <div class="c-back-role">${c.role || ""}</div>
        </div>
        <div class="c-back-faction">${c.faction || "—"}</div>
      </div>
      ${c.card_quote ? `<div class="c-back-quote">«${c.card_quote}»</div>` : ""}
      <div class="c-back-meta">
        ${c.gender ? `<div class="c-back-meta-cell"><div class="c-back-meta-label">Пол</div><div class="c-back-meta-val">${c.gender}</div></div>` : ""}
        ${c.birthdate ? `<div class="c-back-meta-cell"><div class="c-back-meta-label">Дата рождения</div><div class="c-back-meta-val">${c.birthdate}</div></div>` : ""}
        ${c.location ? `<div class="c-back-meta-cell"><div class="c-back-meta-label">Локация</div><div class="c-back-meta-val">${c.location}</div></div>` : ""}
      </div>
      ${statsHTML ? `<div class="c-back-stats"><div class="c-back-stat-label">Характеристики</div>${statsHTML}</div>` : ""}
      ${bioHTML}
      ${abilitiesHTML}
    </div>
  </div>`;
}

/* ── Рендер карусельного режима ── */
function renderCarousel(chars, groupBy = "tier") {
  const container = document.getElementById("carousel-shelves");
  if (!container) return;

  let groups = [];

  if (groupBy === "tier") {
    TIER_ORDER.forEach(tier => {
      const items = chars.filter(c => getTier(c) === tier);
      if (items.length) groups.push({ key: tier, label: TIER_LABELS[tier], items, color: TIER_COLORS[tier] });
    });
  } else {
    // По фракциям — топ-5 первыми, потом остальные
    const factionMap = {};
    chars.forEach(c => {
      const f = c.faction || "Без фракции";
      if (!factionMap[f]) factionMap[f] = [];
      factionMap[f].push(c);
    });
    const top5 = ["Тенебрион", "Единая Америка", "Аркадия", "Forge", "Ракшасы"];
    const ordered = [
      ...top5.filter(f => factionMap[f]),
      ...Object.keys(factionMap).filter(f => !top5.includes(f)).sort()
    ];
    ordered.forEach(f => {
      const col = FACTION_COLORS[f] || DEFAULT_COLOR;
      groups.push({ key: f, label: f.toUpperCase(), items: factionMap[f], color: col.rgb });
    });
  }

  container.innerHTML = groups.map(({ key, label, items, color }) => `
    <div class="carousel-shelf" style="--shelf-cr:${color}">
      <div class="carousel-shelf-header">
        <div class="carousel-shelf-title">${label}</div>
        <div class="carousel-shelf-count">${items.length} ЗАПИСЕЙ</div>
      </div>
      <div class="carousel-shelf-line"></div>
      <div class="carousel-track">
        ${items.map((c, i) => buildCarouselCard(c, allChars.indexOf(c))).join("")}
      </div>
    </div>
  `).join("");

  attachCarouselEvents();
}

/* ── Глитч-переворот ── */
function glitchFlip(card) {
  if (card.dataset.glitching) return;
  card.dataset.glitching = "1";

  const isFlipped = card.classList.contains("flipped");

  if (!isFlipped) {
    // Лицо → изнанка
    card.classList.add("glitch-out");
    setTimeout(() => {
      card.classList.remove("glitch-out");
      card.classList.add("flipped");
      card.classList.add("glitch-in");
      setTimeout(() => {
        card.classList.remove("glitch-in");
        delete card.dataset.glitching;
      }, 400);
    }, 450);
  } else {
    // Изнанка → лицо
    card.classList.add("glitch-out-rev");
    setTimeout(() => {
      card.classList.remove("glitch-out-rev");
      card.classList.remove("flipped");
      card.classList.add("glitch-in-rev");
      setTimeout(() => {
        card.classList.remove("glitch-in-rev");
        delete card.dataset.glitching;
      }, 400);
    }, 450);
  }
}

/* ── Touch события карточек карусели ── */
function attachCarouselEvents() {
  document.querySelectorAll(".c-card").forEach(card => {
    let startX, startY, moved = false;

    card.addEventListener("touchstart", e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      moved = false;
    }, { passive: true });

    card.addEventListener("touchmove", e => {
      if (
        Math.abs(e.touches[0].clientX - startX) > 8 ||
        Math.abs(e.touches[0].clientY - startY) > 8
      ) moved = true;
    }, { passive: true });

    card.addEventListener("touchend", e => {
      if (!moved) {
        e.preventDefault();
        glitchFlip(card);
      }
    });

    // Десктоп
    card.addEventListener("click", () => {
      if (!('ontouchstart' in window)) glitchFlip(card);
    });
  });
}

/* ── Переключение режима ── */
function activateCarouselMode() {
  injectCarouselContainer();
  document.getElementById("carousel-mode").classList.add("active");
  document.getElementById("grid").style.display = "none";
  const chars = (typeof currentFiltered !== "undefined" && currentFiltered.length)
    ? currentFiltered
    : (typeof allChars !== "undefined" ? allChars : []);
  const activeGroup = document.querySelector(".carousel-group-btn.active");
  const groupBy = activeGroup ? activeGroup.dataset.group : "tier";
  renderCarousel(chars, groupBy);
}
function deactivateCarouselMode() {
  const cm = document.getElementById("carousel-mode");
  if (cm) cm.classList.remove("active");
  document.getElementById("grid").style.display = "";
}
