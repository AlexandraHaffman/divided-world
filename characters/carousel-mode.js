/* ══════════════════════════════════════════
   РЕЖИМ «ПО 1» — КАРУСЕЛИ ПО ТИРАМ
   ══════════════════════════════════════════ */

const TIER_ORDER = ["divine", "legendary", "epic", "rare", "common"];
const TIER_LABELS = { divine:"DIVINE", legendary:"LEGENDARY", epic:"EPIC", rare:"RARE", common:"COMMON" };
const TIER_COLORS = { divine:"255,157,0", legendary:"200,160,255", epic:"79,195,247", rare:"79,195,247", common:"79,195,247" };

function injectCarouselContainer() {
  if (document.getElementById("carousel-mode")) return;
  const el = document.createElement("div");
  el.className = "carousel-mode";
  el.id = "carousel-mode";
  el.innerHTML = `
    <div class="carousel-group-switch">
      <button class="carousel-group-btn active" data-group="tier">ПО ТИРАМ</button>
      <button class="carousel-group-btn" data-group="faction">ПО ФРАКЦИЯМ</button>
    </div>
    <div id="carousel-shelves"></div>
  `;
  const grid = document.getElementById("grid");
  grid.parentNode.insertBefore(el, grid);
  el.querySelectorAll(".carousel-group-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      el.querySelectorAll(".carousel-group-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderCarousel(currentFiltered, btn.dataset.group);
    });
  });
}

function buildCarouselCard(c, idx) {
  const col = getFactionColor(c);
  const tier = getTier(c);
  const stats = c.stats || {};
  const photoUrl = c.avatar_web_full || c.avatar_web || "";

  /* Радар 120px для лицевой стороны */
  const radarFace = buildRadar(stats, col.rgb, 120);

  /* Стат-бары для оборотной стороны */
  const statsHTML = [
    ["Интеллект",   stats.intelligence],
    ["Боевые",      stats.combat],
    ["Влияние",     stats.influence],
    ["Жестокость",  stats.cruelty],
    ["Воля",        stats.will],
    ["Скрытность",  stats.stealth],
    ["Непредсказ.", stats.unpredictability],
    ["Мета-сила",   stats.meta_power]
  ].filter(([, v]) => v > 0).map(([l, v]) =>
    `<div class="c-stat-row">
      <span class="c-stat-name">${l}</span>
      <div class="c-stat-track"><div class="c-stat-fill" style="width:${Math.min(v/10*100,100)}%"></div></div>
      <span class="c-stat-val">${v}</span>
    </div>`
  ).join("");

  const abilitiesHTML = c.abilities?.length
    ? `<div class="c-back-abilities">${c.abilities.map(a=>`<div class="c-back-chip">${a}</div>`).join("")}</div>` : "";

  const bioHTML = c.biography
    ? `<div class="c-back-bio">${c.biography.replace(/\n/g,"<br>").substring(0,300)}${c.biography.length>300?"…":""}</div>` : "";

  /* ── ЛИЦЕВАЯ СТОРОНА ──
     Структура:
     - сверху: SYS.RECORD + бейдж фракции
     - снизу: [имя / роль / THREAT]  [радар 120px]
  */
  const faceContent = photoUrl
    ? `<div class="c-card-photo">
        <img src="${photoUrl}" alt="${c.name}" loading="lazy">
        <div class="c-card-gradient"></div>
        <div class="c-card-top">
          <div class="c-card-sys">SYS.RECORD // #${String(idx+1).padStart(3,"0")} // CLEARANCE: ALPHA</div>
          <div class="c-face-faction">${c.faction || "—"}</div>
        </div>
        <div class="c-card-bottom">
          <div class="c-card-text">
            <div class="c-card-name">${c.name}</div>
            <div class="c-card-role">${c.role || ""}</div>
            <div class="c-card-threat">
              <div class="c-card-threat-num">${c.threat_level || 0}</div>
              <div class="c-card-threat-lbl">THREAT</div>
            </div>
          </div>
          <div class="c-face-radar">${radarFace}</div>
        </div>
      </div>`
    : `<div class="c-card-no-photo">
        <div class="c-card-top">
          <div class="c-card-sys">SYS.RECORD // #${String(idx+1).padStart(3,"0")} // CLEARANCE: ALPHA</div>
          <div class="c-face-faction">${c.faction || "—"}</div>
        </div>
        <div class="c-card-bottom">
          <div class="c-card-text">
            <div class="c-card-name">${c.name}</div>
            <div class="c-card-role">${c.role || ""}</div>
            <div class="c-card-threat">
              <div class="c-card-threat-num">${c.threat_level || 0}</div>
              <div class="c-card-threat-lbl">THREAT</div>
            </div>
          </div>
          <div class="c-face-radar">${radarFace}</div>
        </div>
        <span class="c-card-no-photo-text">NO SIGNAL</span>
      </div>`;

  return `<div class="c-card" data-tier="${tier}" data-idx="${idx}" style="--cr:${col.rgb}">
    <div class="c-card-face" style="border:1px solid rgba(${col.rgb},0.35);background:linear-gradient(160deg,#0d1020,#05080f);">
      <div class="c-card-bar"></div>
      ${faceContent}
    </div>
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

function renderCarousel(chars, groupBy = "tier") {
  const container = document.getElementById("carousel-shelves");
  if (!container) return;
  let groups = [];
  if (groupBy === "tier") {
    TIER_ORDER.forEach(tier => {
      const items = chars.filter(c => getTier(c) === tier);
      if (items.length) groups.push({ label: TIER_LABELS[tier], items, color: TIER_COLORS[tier] });
    });
  } else {
    const factionMap = {};
    chars.forEach(c => { const f = c.faction||"Без фракции"; if(!factionMap[f]) factionMap[f]=[]; factionMap[f].push(c); });
    const top5 = ["Тенебрион","Единая Америка","Аркадия","Forge","Ракшасы"];
    [...top5.filter(f=>factionMap[f]), ...Object.keys(factionMap).filter(f=>!top5.includes(f)).sort()]
      .forEach(f => { const col=FACTION_COLORS[f]||DEFAULT_COLOR; groups.push({label:f.toUpperCase(),items:factionMap[f],color:col.rgb}); });
  }
  container.innerHTML = groups.map(({ label, items, color }) => `
    <div class="carousel-shelf" style="--shelf-cr:${color}">
      <div class="carousel-shelf-header">
        <div class="carousel-shelf-title">${label}</div>
        <div class="carousel-shelf-count">${items.length} ЗАПИСЕЙ</div>
      </div>
      <div class="carousel-shelf-line"></div>
      <div class="carousel-track ${items.length === 1 ? 'carousel-track--single' : ''}">
        ${items.map(c => buildCarouselCard(c, allChars.indexOf(c))).join("")}
      </div>
    </div>
  `).join("");
  attachCarouselEvents();
}

function glitchFlip(card) {
  if (card.dataset.glitching) return;
  card.dataset.glitching = "1";
  const isFlipped = card.classList.contains("flipped");
  if (!isFlipped) {
    card.classList.add("glitch-out");
    setTimeout(() => {
      card.classList.remove("glitch-out");
      card.classList.add("flipped","glitch-in");
      setTimeout(() => { card.classList.remove("glitch-in"); delete card.dataset.glitching; }, 400);
    }, 450);
  } else {
    card.classList.add("glitch-out-rev");
    setTimeout(() => {
      card.classList.remove("glitch-out-rev","flipped");
      card.classList.add("glitch-in-rev");
      setTimeout(() => { card.classList.remove("glitch-in-rev"); delete card.dataset.glitching; }, 400);
    }, 450);
  }
}

function attachCarouselEvents() {
  document.querySelectorAll(".c-card").forEach(card => {
    let startX, startY, moved = false;
    card.addEventListener("touchstart", e => { startX=e.touches[0].clientX; startY=e.touches[0].clientY; moved=false; }, {passive:true});
    card.addEventListener("touchmove", e => { if(Math.abs(e.touches[0].clientX-startX)>8||Math.abs(e.touches[0].clientY-startY)>8) moved=true; }, {passive:true});
    card.addEventListener("touchend", e => { if(!moved){e.preventDefault();glitchFlip(card);} });
    card.addEventListener("click", () => { if(!('ontouchstart' in window)) glitchFlip(card); });
  });
}

function activateCarouselMode() {
  injectCarouselContainer();
  document.getElementById("carousel-mode").classList.add("active");
  document.getElementById("grid").style.display = "none";
  const chars = (typeof currentFiltered!=="undefined"&&currentFiltered.length) ? currentFiltered : (typeof allChars!=="undefined"?allChars:[]);
  const activeGroup = document.querySelector(".carousel-group-btn.active");
  renderCarousel(chars, activeGroup ? activeGroup.dataset.group : "tier");
}

function deactivateCarouselMode() {
  const cm = document.getElementById("carousel-mode");
  if (cm) cm.classList.remove("active");
  document.getElementById("grid").style.display = "";
}
