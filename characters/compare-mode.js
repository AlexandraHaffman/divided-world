/* ══════════════════════════════════════════
   РЕЖИМ СРАВНЕНИЯ (3 колонки) — РАСШИРЕННЫЙ ОТЧЁТ
   Зависит от глобальных вещей из dossier.js:
   allChars, getFactionColor(), buildRadar()
   ══════════════════════════════════════════ */

const COMPARE_MAX = 5;      // максимум персонажей в одном сравнении
let compareSelection = [];  // индексы персонажей в allChars

/* Тап по карточке в режиме 3 колонок — выбрать/снять выбор */
function toggleCompareSelect(idx, el) {
  const pos = compareSelection.indexOf(idx);
  if (pos >= 0) {
    compareSelection.splice(pos, 1);
    el.classList.remove("cmp-selected");
  } else {
    if (compareSelection.length >= COMPARE_MAX) {
      flashCompareLimit(el);
      return;
    }
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

/* Достигнут лимит — короткая красная тряска карточки + сообщение в панели */
function flashCompareLimit(el) {
  injectCompareStyles();
  if (el) {
    el.classList.add("cmp-shake");
    setTimeout(() => el.classList.remove("cmp-shake"), 360);
  }
  const bar = document.getElementById("compare-bar");
  const countEl = document.getElementById("compare-bar-count");
  bar.classList.add("show");
  countEl.innerHTML = `<b style="color:#f87171">Максимум ${COMPARE_MAX}</b><span class="compare-bar-hint">Сними выбор с кого-то другого</span>`;
  clearTimeout(window.__cmpLimitTO);
  window.__cmpLimitTO = setTimeout(updateCompareBar, 1600);
}

function updateCompareBar() {
  const bar = document.getElementById("compare-bar");
  const countEl = document.getElementById("compare-bar-count");
  const goBtn = document.getElementById("compare-bar-go");
  if (compareSelection.length > 0) {
    bar.classList.add("show");
    const atMax = compareSelection.length >= COMPARE_MAX;
    const hint = atMax
      ? `<span class="compare-bar-hint">Максимум ${COMPARE_MAX} — больше не влезет</span>`
      : '';
    countEl.innerHTML = `Выбрано: <b>${compareSelection.length}</b> / ${COMPARE_MAX}${hint}`;
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

/* ── Русские склонения ── */
function pluralRu(n, one, few, many) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

/* Пол персонажа для согласования по роду: 'f' | 'm' (по умолчанию мужской). */
function genderOf(c) {
  return /^жен/i.test((c && c.gender || "").trim()) ? "f" : "m";
}

/* Короткое имя — только личное имя без фамилии, для повторных упоминаний.
   Одиночные имена («Маро», «Барон») и эпитеты-словосочетания, где второе
   слово со строчной буквы («Смотрящий в бездну», «Вестник тишины»), не
   режем — там сокращать нечего и получится нелепо. */
function firstNameRu(c) {
  const n = (c && c.name || "").trim();
  const parts = n.split(/\s+/);
  if (parts.length < 2) return n;
  if (!/^[А-ЯЁA-Z]/.test(parts[1])) return n;
  return parts[0];
}

/* ══════════════════════════════════════════
   ЦВЕТА: разведение совпадающих фракций
   ══════════════════════════════════════════ */
function rgbStrToHsl(str) {
  let [r, g, b] = str.split(",").map(Number).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}
function hslToRgbStr(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
  }
  return [r, g, b].map(v => Math.round(v * 255)).join(",");
}
function rgbStrToHex(str) {
  return "#" + str.split(",").map(x => (+x).toString(16).padStart(2, "0")).join("");
}
function distinctColors(chars) {
  const base = chars.map(c => getFactionColor(c));
  const seen = {};
  const dashes = ["none", "6 4", "2 4", "10 4 2 4"];
  return base.map(col => {
    const key = col.rgb;
    if (seen[key] === undefined) { seen[key] = 0; return { ...col, dash: "none" }; }
    seen[key]++;
    const n = seen[key];
    let [h, s, l] = rgbStrToHsl(col.rgb);
    const dir = n % 2 === 1 ? 1 : -1;
    const step = Math.ceil(n / 2);
    l = Math.max(28, Math.min(82, l + dir * step * 16));
    h = (h + dir * step * 18 + 360) % 360;
    const rgb = hslToRgbStr(h, s, l);
    return { rgb, hex: rgbStrToHex(rgb), dash: dashes[n % dashes.length] };
  });
}

/* ══════════════════════════════════════════
   ПОРТРЕТ-КВАДРАТ + ФРАКЦИОННЫЕ СИГИЛЫ-ЗАГЛУШКИ
   Приоритет: portrait_web (лицо на чёрном) → сигил фракции.
   Чтобы вернуть запасной вариант через avatar_web — добавь его
   строкой ниже, где помечено (*).
   ══════════════════════════════════════════ */

/* Геометрические эмблемы фракций (viewBox 0 0 24 24, цвет = currentColor) */
const FACTION_SIGILS = {
  "Тенебрион":           `<path d="M12 4L20 18H4Z" fill="currentColor"/>`,
  "Единая Америка":      `<path d="M12 2.5l2.6 6.4 6.9.5-5.3 4.4 1.7 6.7L12 16.9l-5.9 3.9 1.7-6.7L2.5 9.4l6.9-.5z" fill="currentColor"/>`,
  "Ракшасы":             `<g stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><path d="M4 7h16"/><path d="M6 7V4M18 7V4M12 7V3"/><path d="M12 7v14"/><path d="M9 18l3 3 3-3"/></g>`,
  "Аркадия":             `<path d="M12 3C7 8 6 14 12 21C18 14 17 8 12 3Z" fill="currentColor"/>`,
  "Forge":               `<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`,
  "Тихая гавань":        `<g stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><path d="M3 9c3-3 6 3 9 0s6-3 9 0"/><path d="M3 15c3-3 6 3 9 0s6-3 9 0"/></g>`,
  "Белая зона":          `<g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M4 7l16 10M20 7L4 17"/></g>`,
  "Независимые":         `<path d="M12 3l7.5 9-7.5 9-7.5-9z" fill="none" stroke="currentColor" stroke-width="2"/>`,
  "Экваториальная сеть": `<g stroke="currentColor" stroke-width="1.6" fill="none"><path d="M12 5L5 16h14z"/></g><g fill="currentColor"><circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="16" r="2.2"/><circle cx="19" cy="16" r="2.2"/></g>`,
  "Гарнизон":            `<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" fill="currentColor"/>`,
  "Ковчег":              `<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" fill="none" stroke="currentColor" stroke-width="2"/>`,
  "Титаны":              `<path d="M3 19l6-11 4 6 3-4 5 9z" fill="currentColor"/>`,
  "Джамахирия Нар":      `<circle cx="12" cy="12" r="4" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></g>`,
  "Австралийский протекторат": `<path d="M5 6c8 0 13 5 13 13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`,
  "Отражение бездны":    `<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>`
};

function factionSigil(faction) {
  const s = FACTION_SIGILS[faction];
  if (s) return `<svg viewBox="0 0 24 24" class="cv-sigil-svg">${s}</svg>`;
  const init = (faction || "?").split(/\s+/).slice(0, 2).map(w => (w[0] || "").toUpperCase()).join("");
  return `<span class="cv-monogram">${init || "?"}</span>`;
}

function portraitBox(c, rgb, size = 46) {
  const url = c.portrait_web;               // (*) при желании: c.portrait_web || c.avatar_web
  if (url) {
    return `<div class="cv-portrait" style="--pc:${rgb};width:${size}px;height:${size}px"><img src="${url}" alt="${c.name}" loading="lazy"></div>`;
  }
  return `<div class="cv-portrait cv-portrait--ph" style="--pc:${rgb};width:${size}px;height:${size}px">
    <div class="cv-sigil">${factionSigil(c.faction)}</div>
  </div>`;
}

/* ══════════════════════════════════════════
   АНАЛИТИКА (всё детерминированно, без ИИ)
   ══════════════════════════════════════════ */
const CMP_STAT_KEYS = ["intelligence","combat","influence","cruelty","will","stealth","unpredictability","meta_power"];
const st = (c, k) => (c.stats && c.stats[k]) || 0;

/* Боевая мощь — взвешенная формула для дуэли/рейтинга */
function powerScore(c) {
  return st(c,"combat")*1.0 + st(c,"meta_power")*1.1 + st(c,"will")*0.6
       + st(c,"unpredictability")*0.5 + st(c,"stealth")*0.4
       + st(c,"intelligence")*0.3 + st(c,"cruelty")*0.2 + st(c,"influence")*0.15;
}

/* Ранг по угрозе среди всей базы */
function archiveRank(c) {
  const total = allChars.length || 1;
  const byThreat = [...allChars].sort((a, b) => (b.threat_level || 0) - (a.threat_level || 0));
  const rank = byThreat.indexOf(c) + 1;
  const pct = Math.max(1, Math.round(rank / total * 100));
  return { rank, total, pct };
}

/* Разброс статов — узкий специалист vs универсал */
function statSpread(c) {
  const vs = CMP_STAT_KEYS.map(k => st(c, k));
  const m = vs.reduce((a, b) => a + b, 0) / vs.length;
  return Math.sqrt(vs.reduce((a, v) => a + (v - m) ** 2, 0) / vs.length);
}

/* ── Банк фраз для авто-разбора: подгружается один раз из JSON ──
   Файл должен лежать рядом: characters/analysis-phrases.json
   Если не найден/не грузится — используется маленький запасной набор,
   чтобы фича не отваливалась целиком. */
const PHRASE_BANK_PATH = "analysis-phrases.json";
let phraseBankPromise = null;
const FALLBACK_PHRASES = {
  combat_leader: ["⚔️ <b>{name}</b> сильнее в прямом столкновении."],
  shadow_leader: ["🌑 <b>{name}</b> — теневой игрок: тень и хаос на {g|name|его|её} стороне."],
  mind_leader: ["🧠 <b>{name}</b> действует умом и влиянием, а не силой."],
  stat_gap: ["↔ Наибольшая пропасть — в {stat}: {hi} против {lo} (<b>{name}</b> впереди)."],
  specialist_generalist: ["◆ <b>{specialist}</b> — узкий специалист с резкими пиками, <b>{generalist}</b> ровнее и универсальнее."],
  dominance: ["▲ <b>{name}</b> доминирует по совокупной боевой мощи."],
  close_power: ["⚖ <b>{a}</b> и <b>{b}</b> подозрительно близки по силе — исход решит случай."],
  same_faction: ["👥 {names} — из одной фракции ({faction}), это скорее внутреннее соперничество."],
  tier_gap: ["🎖 <b>{highName}</b> ({highTier}) на голову выше по значимости, чем <b>{lowName}</b> ({lowTier})."],
  status_mix: ["💀 <b>{deadName}</b> уже {g|deadName|мёртв|мертва} — сравнение с живым <b>{aliveName}</b> скорее теоретическое."],
  threat_gap: ["📈 Разница в угрозе — {diff} пунктов в пользу <b>{name}</b>."]
};

function loadPhraseBank() {
  if (!phraseBankPromise) {
    phraseBankPromise = fetch(PHRASE_BANK_PATH)
      .then(r => { if (!r.ok) throw new Error("no bank"); return r.json(); })
      .catch(() => FALLBACK_PHRASES);
  }
  return phraseBankPromise;
}

/* Случайный шаблон из категории (без подстановки — её делает renderPhrase). */
function pickTemplate(bank, category) {
  const arr = (bank && bank[category] && bank[category].length) ? bank[category] : (FALLBACK_PHRASES[category] || []);
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/* Рендер одной фразы с учётом:
   • имён-слотов (slots: имя-слота → индекс персонажа) — при ПЕРВОМ упоминании
     персонажа в блоке подставляется полное имя, при повторном — только личное
     имя (общий Set `seen` копится между строками в порядке показа);
   • гендерных токенов {g|слот|муж|жен} — форма выбирается по полу персонажа,
     привязанного к слоту;
   • группы имён (groupIdxs) для {names} и обычных подстановок (extra). */
function renderPhrase(tpl, entry, chars, seen) {
  const slots = entry.slots || {};
  const extra = entry.extra || {};

  const nameFor = idx => {
    const c = chars[idx];
    if (seen.has(idx)) return firstNameRu(c);
    seen.add(idx);
    return c.name;
  };

  // 1) гендерные токены {g|слот|муж.форма|жен.форма} — не расходуют «упоминание»
  tpl = tpl.replace(/\{g\|([a-zA-Zа-яёА-ЯЁ]+)\|([^|}]*)\|([^}]*)\}/g, (_, slot, m, f) => {
    const idx = slots[slot];
    return (idx != null && genderOf(chars[idx]) === "f") ? f : m;
  });

  // 2) обычные токены слева направо — так «первое упоминание» = порядку чтения
  tpl = tpl.replace(/\{([a-zA-Z]+)\}/g, (whole, key) => {
    if (key in slots) return nameFor(slots[key]);
    if (key === "names" && entry.groupIdxs) return joinNamesRu(entry.groupIdxs.map(nameFor));
    if (key in extra) return String(extra[key]);
    return whole;
  });

  return tpl;
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function joinNamesRu(names) {
  if (names.length <= 1) return names[0] || "";
  if (names.length === 2) return `${names[0]} и ${names[1]}`;
  return names.slice(0, -1).join(", ") + " и " + names[names.length - 1];
}

const TIER_RANK = { divine: 0, legendary: 1, epic: 2, rare: 3, common: 4 };

/* Авто-вердикт словами: собираем ВСЕ сработавшие условия, перемешиваем,
   показываем до 5 — каждый раз с новой случайной формулировкой из банка.
   Имена вводятся полностью один раз, потом сокращаются; формы согласуются
   по полу. */
async function autoVerdictLines(chars) {
  const bank = await loadPhraseBank();
  const triggered = [];

  const soloLeader = keys => {
    const sc = chars.map(c => keys.reduce((a, k) => a + st(c, k), 0));
    const mx = Math.max(...sc);
    if (mx <= 0) return null;
    const idxs = sc.reduce((a, v, i) => { if (v === mx) a.push(i); return a; }, []);
    return idxs.length === 1 ? idxs[0] : null;
  };

  let li;
  if ((li = soloLeader(["combat","meta_power"])) !== null)        triggered.push({ cat: "combat_leader", slots: { name: li } });
  if ((li = soloLeader(["stealth","unpredictability"])) !== null) triggered.push({ cat: "shadow_leader", slots: { name: li } });
  if ((li = soloLeader(["intelligence","influence"])) !== null)   triggered.push({ cat: "mind_leader", slots: { name: li } });

  // наибольший разрыв по одному стату
  const gapDefs = [
    ["интеллекте","intelligence"],["боевых","combat"],["влиянии","influence"],["жестокости","cruelty"],
    ["воле","will"],["скрытности","stealth"],["непредсказуемости","unpredictability"],["мета-силе","meta_power"]
  ];
  let gap = { d: -1 };
  gapDefs.forEach(([lbl, k]) => {
    const vals = chars.map(c => st(c, k));
    const hi = Math.max(...vals), lo = Math.min(...vals), d = hi - lo;
    if (d > gap.d) gap = { d, lbl, hi, lo, whoIdx: vals.indexOf(hi) };
  });
  if (gap.d >= 4) triggered.push({ cat: "stat_gap", slots: { name: gap.whoIdx }, extra: { stat: gap.lbl, hi: gap.hi, lo: gap.lo } });

  // специалист vs универсал
  const sp = chars.map(statSpread);
  const gi = sp.indexOf(Math.max(...sp)), lI = sp.indexOf(Math.min(...sp));
  if (gi !== lI) triggered.push({ cat: "specialist_generalist", slots: { specialist: gi, generalist: lI } });

  // доминирование ИЛИ подозрительное равенство сил
  const ps = chars.map(powerScore);
  const pmax = Math.max(...ps), pidx = ps.indexOf(pmax);
  const rest = ps.filter((_, i) => i !== pidx);
  const second = rest.length ? Math.max(...rest) : 0;
  if (pmax > 0 && pmax >= second * 1.4) {
    triggered.push({ cat: "dominance", slots: { name: pidx } });
  } else if (pmax > 0 && second > 0 && (pmax - second) / pmax < 0.08) {
    const sorted = chars.map((c, i) => ({ i, p: ps[i] })).sort((a, b) => b.p - a.p);
    triggered.push({ cat: "close_power", slots: { a: sorted[0].i, b: sorted[1].i } });
  }

  // общая фракция
  const factionGroups = {};
  chars.forEach((c, i) => { const f = c.faction || "—"; (factionGroups[f] = factionGroups[f] || []).push(i); });
  Object.entries(factionGroups).forEach(([f, idxs]) => {
    if (idxs.length >= 2) triggered.push({ cat: "same_faction", groupIdxs: idxs, extra: { faction: f } });
  });

  // разрыв тиров (например legendary против common)
  const tiers = chars.map(c => getTier(c));
  const ranks = tiers.map(t => TIER_RANK[t] ?? 4);
  const minR = Math.min(...ranks), maxR = Math.max(...ranks);
  if (maxR - minR >= 2) {
    const hiI = ranks.indexOf(minR), loI = ranks.indexOf(maxR);
    triggered.push({ cat: "tier_gap", slots: { highName: hiI, lowName: loI }, extra: { highTier: tiers[hiI].toUpperCase(), lowTier: tiers[loI].toUpperCase() } });
  }

  // живой против мёртвого
  const deadFlags = chars.map((c, i) => ({ i, dead: (c.status || "").trim() === "Мёртв" }));
  const deadOnes = deadFlags.filter(x => x.dead), aliveOnes = deadFlags.filter(x => !x.dead);
  if (deadOnes.length && aliveOnes.length) {
    triggered.push({ cat: "status_mix", slots: { deadName: deadOnes[0].i, aliveName: aliveOnes[0].i } });
  }

  // разрыв по чистой угрозе (threat_level)
  const threats = chars.map(c => c.threat_level || 0);
  const tmax = Math.max(...threats), tmin = Math.min(...threats), tdiff = tmax - tmin;
  if (tdiff >= 15) triggered.push({ cat: "threat_gap", slots: { name: threats.indexOf(tmax) }, extra: { diff: tdiff, pts: pluralRu(tdiff, "пункт", "пункта", "пунктов") } });

  const seen = new Set();
  const chosen = shuffleArr(triggered).slice(0, 5);
  return chosen
    .map(t => { const tpl = pickTemplate(bank, t.cat); return tpl ? renderPhrase(tpl, t, chars, seen) : null; })
    .filter(Boolean);
}

/* ── Радар с наложением (пунктир для разведённых цветов) ── */
function buildCompareRadar(chars, cols, size = 220) {
  const n = 7, cx = size/2, cy = size/2, R = size * 0.34;
  const EMOJI = ["🧠","⚔️","👑","🔪","🛡️","🌑","🎲"];
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
    const tip = (typeof STAT_INFO !== "undefined" && STAT_INFO[keys[i]]) || "";
    return `<g class="radar-axis-label">
      ${tip ? `<title>${tip}</title>` : ""}
      <circle cx="${lx.toFixed(1)}" cy="${(ly+4).toFixed(1)}" r="12" fill="transparent"/>
      <text x="${lx.toFixed(1)}" y="${(ly+4).toFixed(1)}" text-anchor="middle" font-size="12">${EMOJI[i]}</text>
    </g>`;
  }).join("");
  const order = chars.map((c, i) => i).sort((a, b) => {
    const sum = c => keys.reduce((s, k) => s + ((c.stats && c.stats[k]) || 0), 0);
    return sum(chars[b]) - sum(chars[a]);
  });
  const shapes = order.map(ci => {
    const rgb = cols[ci].rgb;
    const dash = (cols[ci].dash && cols[ci].dash !== "none") ? ` stroke-dasharray="${cols[ci].dash}"` : "";
    const stats = chars[ci].stats || {};
    const dp = angles.map((a, i) => {
      const r = (Math.min(stats[keys[i]] || 0, 10) / 10) * R;
      return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
    });
    return `<polygon points="${pt(dp)}" fill="rgba(${rgb},0.10)" stroke="rgba(${rgb},0.9)" stroke-width="1.5" stroke-linejoin="round"${dash}/>
      ${dp.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.3" fill="rgb(${rgb})"/>`).join("")}`;
  }).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">
    ${rings}${spokes}${shapes}${labels}
  </svg>`;
}

/* ── «Перетягивание каната» ── */
function buildTugRow(label, vals, cols, tip) {
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
    <div class="compare-stat-label"${tip ? ` data-tip="${tip}"` : ""}>${label}</div>
    <div class="compare-tug-nums">${numsHTML}</div>
    <div class="compare-tug-track">${segsHTML}</div>
  </div>`;
}

/* ── Дуэль (2) / боевой рейтинг (3+) ── */
function buildDuelBlock(chars, cols) {
  const ps = chars.map(powerScore);
  if (chars.length === 2) {
    const total = ps[0] + ps[1] || 1;
    const p0 = Math.round(ps[0] / total * 100);
    const p1 = 100 - p0;
    const lead = p0 >= p1 ? 0 : 1;
    const diff = Math.abs(p0 - p1);
    const w = `<b>${chars[lead].name}</b>`;
    const f = genderOf(chars[lead]) === "f";
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    let verdict;
    if (diff < 8) {
      verdict = pick([
        "почти равны — исход решит случай и условия",
        "силы зеркальны: в реальном бою всё решат нервы",
        "паритет — любой перекос, и чаша качнётся в другую сторону"
      ]);
    } else if (diff < 24) {
      verdict = pick([
        `небольшой перевес у ${w}`,
        `${w} вероятнее возьмёт верх`,
        `в затяжной схватке ${w} скорее дожмёт соперника`
      ]);
    } else {
      verdict = pick([
        `уверенная победа ${w}`,
        `${w} выйдет ${f ? "победительницей" : "победителем"} без особого труда`,
        `здесь ${w} — безоговорочн${f ? "ая фаворитка" : "ый фаворит"}, разрыв огромен`
      ]);
    }
    return `<div class="compare-verdict">
      <div class="cv-title">SYS.DUEL // ВЕРОЯТНЫЙ ИСХОД</div>
      <div class="cv-duel-nums">
        <span style="color:rgb(${cols[0].rgb})">${p0}%</span>
        <span style="color:rgb(${cols[1].rgb})">${p1}%</span>
      </div>
      <div class="cv-duel-track">
        <div style="width:${p0}%;background:rgb(${cols[0].rgb})"></div>
        <div style="width:${p1}%;background:rgb(${cols[1].rgb})"></div>
      </div>
      <div class="cv-duel-verdict">${verdict}</div>
    </div>`;
  }
  const order = chars.map((c, i) => i).sort((a, b) => ps[b] - ps[a]);
  const pmax = Math.max(...ps) || 1;
  const rows = order.map(i => {
    const w = Math.round(ps[i] / pmax * 100);
    return `<div class="cv-rank-row">
      <span class="cv-dot" style="color:rgb(${cols[i].rgb})"></span>
      <span class="cv-rank-name">${chars[i].name}</span>
      <div class="cv-rank-track"><div style="width:${w}%;background:rgb(${cols[i].rgb})"></div></div>
      <span class="cv-rank-val" style="color:rgb(${cols[i].rgb})">${ps[i].toFixed(0)}</span>
    </div>`;
  }).join("");
  return `<div class="compare-verdict">
    <div class="cv-title">SYS.COMBAT // БОЕВОЙ РЕЙТИНГ</div>
    ${rows}
  </div>`;
}

/* ── Мета-оси: 8 статов → 4 группы ── */
function buildMetaAxes(chars, cols) {
  const AXES = [
    ["⚔️ МОЩЬ",  ["combat","meta_power"]],
    ["🧠 РАЗУМ", ["intelligence","influence"]],
    ["🌑 ТЕНЬ",  ["stealth","unpredictability"]],
    ["🔥 НРАВ",  ["will","cruelty"]]
  ];
  return AXES.map(([label, keys]) => {
    const vals = chars.map(c => keys.reduce((s, k) => s + st(c, k), 0));
    return buildTugRow(label, vals, cols);
  }).join("");
}

/* ── Стили новых блоков (вшиты, чтобы не трогать style.css) ── */
function injectCompareStyles() {
  if (document.getElementById("compare-enhance-styles")) return;
  const s = document.createElement("style");
  s.id = "compare-enhance-styles";
  s.textContent = `
    .compare-verdict{padding:16px 16px 0;}
    .cv-title{font-family:'Share Tech Mono',monospace;font-size:8px;letter-spacing:0.2em;color:var(--dim);text-transform:uppercase;margin-bottom:10px;}
    .cv-row{display:flex;align-items:center;gap:9px;padding:8px 10px;border:1px solid rgba(255,255,255,0.06);border-radius:6px;margin-bottom:6px;background:rgba(255,255,255,0.02);}
    /* портрет + заглушка-сигил */
    .cv-portrait{position:relative;flex-shrink:0;overflow:hidden;background:#05080f;border:1px solid rgba(var(--pc),0.6);box-shadow:0 0 10px rgba(var(--pc),0.25);clip-path:polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px));}
    .cv-portrait img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;}
    .cv-portrait--ph{background:radial-gradient(circle at 50% 42%,rgba(var(--pc),0.30),rgba(5,8,15,0.96) 72%);}
    .cv-portrait--ph::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.30) 2px,rgba(0,0,0,0.30) 3px);pointer-events:none;}
    .cv-sigil{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgb(var(--pc));}
    .cv-sigil-svg{width:58%;height:58%;filter:drop-shadow(0 0 4px rgba(var(--pc),0.7));}
    .cv-monogram{font-family:'Share Tech Mono',monospace;font-weight:900;font-size:14px;letter-spacing:0.02em;text-shadow:0 0 8px rgba(var(--pc),0.6);}
    /* строки вердикта */
    .cv-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;box-shadow:0 0 8px currentColor;background:currentColor;}
    .cv-sep{align-self:stretch;width:1px;margin:1px 3px;flex-shrink:0;background:linear-gradient(180deg,transparent,rgba(var(--rc,79,195,247),0.75),transparent);box-shadow:0 0 6px rgba(var(--rc,79,195,247),0.45);}
    .cv-name{flex:1;font-size:13px;font-weight:700;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;padding-left:2px;}
    .cv-crown{font-size:12px;}
    .cv-metric{display:flex;flex-direction:column;align-items:center;min-width:44px;}
    .cv-metric-lbl{font-family:'Share Tech Mono',monospace;font-size:6px;letter-spacing:0.06em;color:var(--dim);text-transform:uppercase;margin-bottom:1px;}
    .cv-metric-val{font-family:'Share Tech Mono',monospace;font-size:16px;font-weight:900;line-height:1;transition:text-shadow 0.2s;}
    .cv-metric.lead .cv-metric-val{text-shadow:0 0 12px currentColor;}
    .cv-metric.lead .cv-metric-lbl{color:var(--white);}
    .cv-note{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--dim);text-align:center;padding:6px 0 2px;letter-spacing:0.05em;}
    /* авто-разбор */
    .cv-auto{padding:0;}
    .cv-auto-line{font-size:12px;color:var(--text);line-height:1.5;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);}
    .cv-auto-line:last-child{border-bottom:none;}
    .cv-auto-line b{color:var(--white);}
    /* ранги по базе */
    .cv-arch-row{display:flex;align-items:center;gap:9px;padding:6px 10px;margin-bottom:5px;border-radius:5px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);}
    .cv-arch-name{flex:1;font-size:12px;font-weight:600;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .cv-arch-val{font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:0.04em;}
    .cv-arch-val b{font-size:13px;}
    /* дуэль */
    .cv-duel-nums{display:flex;justify-content:space-between;font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:900;margin-bottom:4px;text-shadow:0 0 12px currentColor;}
    .cv-duel-track{display:flex;height:16px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,0.05);}
    .cv-duel-track>div{height:100%;transition:width 0.4s;}
    .cv-duel-verdict{font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--dim);text-align:center;padding-top:8px;letter-spacing:0.04em;}
    .cv-duel-verdict b{color:var(--white);}
    /* боевой рейтинг 3+ */
    .cv-rank-row{display:flex;align-items:center;gap:8px;padding:5px 0;}
    .cv-rank-name{width:96px;flex-shrink:0;font-size:11px;font-weight:600;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .cv-rank-track{flex:1;height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;}
    .cv-rank-track>div{height:100%;border-radius:4px;transition:width 0.4s;}
    .cv-rank-val{font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:900;width:28px;text-align:right;flex-shrink:0;}
    /* тряска при лимите */
    @keyframes cmpShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
    .char-card.cmp-shake{animation:cmpShake 0.35s ease;border-color:#f87171 !important;box-shadow:0 0 16px rgba(248,113,113,0.4) !important;}
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════
   ОТКРЫТИЕ ОТЧЁТА
   ══════════════════════════════════════════ */
async function openCompare() {
  if (compareSelection.length < 2) return;
  injectCompareStyles();
  const chars = compareSelection.map(idx => allChars[idx]);
  const cols = distinctColors(chars);

  const legend = chars.map((c, i) => `
    <div class="compare-legend-item" style="color:rgb(${cols[i].rgb})">
      <span class="compare-legend-dot" style="background:rgb(${cols[i].rgb})"></span>
      ${c.name}
      <span class="compare-legend-faction">${c.faction || ''}</span>
    </div>`).join("");

  const statDefs = [
    ["Интеллект", "intelligence"], ["Боевые", "combat"], ["Влияние", "influence"],
    ["Жестокость", "cruelty"], ["Воля", "will"], ["Скрытность", "stealth"],
    ["Непредсказуемость", "unpredictability"], ["Мета-сила", "meta_power"]
  ];

  // ── Вердикт: победы по категориям ──
  const wins = chars.map(() => 0);
  let contested = 0;
  statDefs.forEach(([, key]) => {
    const vals = chars.map(c => st(c, key));
    const mx = Math.max(...vals);
    if (mx <= 0) return;
    const leaders = vals.reduce((a, v, i) => { if (v === mx) a.push(i); return a; }, []);
    if (leaders.length === 1) wins[leaders[0]]++; else contested++;
  });
  const totals  = chars.map(c => statDefs.reduce((s, [, k]) => s + st(c, k), 0));
  const threats = chars.map(c => c.threat_level || 0);
  const maxThreat = Math.max(...threats);
  const maxWins   = Math.max(...wins);
  const maxTotal  = Math.max(...totals);

  const verdictRows = chars.map((c, i) => {
    const rgb = cols[i].rgb;
    const tLead = threats[i] === maxThreat && maxThreat > 0;
    const wLead = wins[i]    === maxWins   && maxWins   > 0;
    const sLead = totals[i]  === maxTotal  && maxTotal  > 0;
    return `<div class="cv-row" style="--rc:${rgb}">
      ${portraitBox(c, rgb)}
      <span class="cv-sep"></span>
      <span class="cv-name">${c.name}${wLead ? '<span class="cv-crown">👑</span>' : ''}</span>
      <span class="cv-metric ${tLead ? 'lead' : ''}"><span class="cv-metric-lbl">Threat</span><span class="cv-metric-val" style="color:rgb(${rgb})">${threats[i]}</span></span>
      <span class="cv-metric ${wLead ? 'lead' : ''}"><span class="cv-metric-lbl">Победы</span><span class="cv-metric-val" style="color:rgb(${rgb})">${wins[i]}</span></span>
      <span class="cv-metric ${sLead ? 'lead' : ''}"><span class="cv-metric-lbl">Σ статы</span><span class="cv-metric-val" style="color:rgb(${rgb})">${totals[i]}</span></span>
    </div>`;
  }).join("");
  const contestedNote = contested > 0
    ? `<div class="cv-note">${contested} ${pluralRu(contested, 'категория', 'категории', 'категорий')} — ничья, не засчитано</div>`
    : '';
  const verdictHTML = `<div class="compare-verdict">
    <div class="cv-title">SYS.VERDICT // ИТОГ</div>
    ${verdictRows}${contestedNote}
  </div>`;

  // ── Авто-разбор словами ──
  const autoLines = await autoVerdictLines(chars);
  const autoHTML = autoLines.length ? `<div class="compare-verdict">
    <div class="cv-title">SYS.ANALYSIS // АВТО-РАЗБОР</div>
    <div class="cv-auto">${autoLines.map(l => `<div class="cv-auto-line">${l}</div>`).join("")}</div>
  </div>` : "";

  // ── Ранги по всей базе ──
  const archHTML = `<div class="compare-verdict">
    <div class="cv-title">SYS.ARCHIVE // РАНГ В БАЗЕ · ${allChars.length} ${pluralRu(allChars.length, 'ЗАПИСЬ', 'ЗАПИСИ', 'ЗАПИСЕЙ')}</div>
    ${chars.map((c, i) => {
      const r = archiveRank(c);
      return `<div class="cv-arch-row">
        <span class="cv-dot" style="color:rgb(${cols[i].rgb})"></span>
        <span class="cv-arch-name">${c.name}</span>
        <span class="cv-arch-val" style="color:rgb(${cols[i].rgb})">Угроза <b>#${r.rank}</b>/${r.total} · топ&nbsp;${r.pct}%</span>
      </div>`;
    }).join("")}
  </div>`;

  // ── Дуэль / боевой рейтинг ──
  const duelHTML = buildDuelBlock(chars, cols);

  // ── Радар ──
  const radar = buildCompareRadar(chars, cols, 220);

  // ── Мета-оси ──
  const metaAxesHTML = `<div class="compare-section-title">Мета-оси</div>
    <div class="compare-stats">${buildMetaAxes(chars, cols)}</div>`;

  // ── Детальные характеристики ──
  const statsHTML = statDefs.map(([label, key]) => {
    const vals = chars.map(c => st(c, key));
    return buildTugRow(label, vals, cols, STAT_INFO[key]);
  }).join("");

  document.getElementById("compare-inner").innerHTML = `
    <div class="compare-header">
      <button class="compare-close" onclick="closeCompare()">← НАЗАД</button>
      <div class="compare-title">SYS.COMPARE // ${chars.length} ${pluralRu(chars.length, 'ЗАПИСЬ', 'ЗАПИСИ', 'ЗАПИСЕЙ')}</div>
      <div class="compare-legend">${legend}</div>
    </div>
    ${verdictHTML}
    ${autoHTML}
    ${archHTML}
    ${duelHTML}
    <div class="compare-radar-wrap">${radar}</div>
    ${metaAxesHTML}
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
