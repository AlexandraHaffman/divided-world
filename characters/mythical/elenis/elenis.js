/* ══════════════════════════════════════════════════════════════
   НИМФЕЯ ЭЛЕНИС — АРХИВ
   Данные тянутся из ../../../data/nimfeya-archive.json (249 кадров,
   14 коллекций). Разметка страницы статична (elenis.html), эта
   логика строит все интерактивные механики из одного массива.

   Четыре механики, все на реальных полях архива:
   · ГЛУБИНА     — поле layers[] оказалось четырёхуровневой шкалой
                   доступа (0 витрина → 3 взгляд). Работает как линза
                   поверх всей страницы, а не как фильтр-выпадайка.
   · ДЕЛАНИЕ     — 29 стадий ALCHIMIA перекрашивают секцию по мере
                   прокрутки ленты: нигредо → альбедо → рубедо.
   · СОРОК ШЕСТЬ — скраббер по годам 2014–2061. Декорации меняются,
     ЛЕТ           она нет. Это и есть весь смысл секции.
   · ЧТЕНИЕ      — архив считает, на что смотрел зритель, и отвечает
                   ему её мета-перцепцией. Открывается сам, когда
                   насмотрел достаточно.
   ══════════════════════════════════════════════════════════════ */

const ARCHIVE_URL = "../../../data/nimfeya-archive.json";
const IMG_PREFIX = "characters/mythical/elenis/";

/* Обложки коллекций — выбраны вручную (flagship.json + отбор по описанию
   сцены). Ключ — код коллекции как в архиве, значение — хвост имени файла. */
const COVERS = {
  ALCHIMIA: "00000029-C4A5-4585-B380-A5FD01E76C0D.webp",
  CHROMA:   "1999628C-A853-4CD5-98EA-22A5333B9288.webp",
  ELENIS:   "C9055D01-DB2B-4E2A-A69A-0F92320724E7.webp",
  ICON:     "50249DA5-F889-479E-90B9-A87C5AF1832A.webp",
  LUMIERE:  "DCBFC857-AA69-46C2-8FFE-86D5B560F200.webp",
  NOCTURNE: "C8C2ABA9-1096-4078-8C09-CD04F64343B5.webp",
  PERSONA:  "DAB5E013-00FA-4A8C-99CA-43854D0057C0.webp",
  SCULPTED: "E403D5F1-1D66-4C45-B9B0-6415044F70B5.webp",
  SOIREE:   "5E192333-7DE0-4080-B467-18A3DB0D01A9.webp",
  PRIVATE:  "AE4F6748-5CD7-4D45-BB1D-3B8CA3AA67BE.webp",
  HISTORY:  "A656CA90-7E93-4D87-98B2-71B693667906.webp",
  DEBUT:    "098443C3-2DB5-4241-9814-4F00383CD5B8.webp",
  ORBIT:    "C0054C06-6269-4FA5-A62C-3894006E6CCE.webp",
  ABANDON:  "823CB744-F7F6-49F6-973C-1BF246A2E098.webp"
};

/* Коллекции: подпись + ольфакторная пирамида. Дом «Эленис» — парфюмерный,
   у каждой линии кампании есть свой состав; ноты показываются в шапке
   раскрытой коллекции. Порядок — как в сетке (ALCHIMIA идёт отдельной
   витриной выше и в сетку не входит). */
const COLLECTION_INFO = [
  { code: "NOCTURNE", title: "Nocturne", line: "После полуночи власть меняет лицо.",
    notes: ["чёрный перец, дым сигары", "дамасская роза, кожа", "уд, ветивер, тёмная смола"] },
  { code: "PERSONA",  title: "Persona",  line: "Двадцать четыре роли — один и тот же взгляд.",
    notes: ["горький апельсин, анис", "шафран, табачный лист", "пачули, замша"] },
  { code: "CHROMA",   title: "Chroma",   line: "Свет как пигмент: кампания в чистом цвете.",
    notes: ["неоновый бергамот, розовый перец", "тубероза, свежий лак", "белый мускус, винил"] },
  { code: "ELENIS",   title: "Elenis",   line: "Лицо парфюмерного дома, флакон в кадре.",
    notes: ["нероли, грушевый нектар", "жасмин самбак, ирис", "сандал, амбра, ваниль"] },
  { code: "LUMIERE",  title: "Lumière",  line: "Свет вместо короны.",
    notes: ["лимонная цедра, шампанское", "мимоза, солнечный жасмин", "белое дерево, мёд"] },
  { code: "ICON",     title: "Icon",     line: "Крупный план. Ничего лишнего, кроме взгляда.",
    notes: ["альдегиды, озон", "ирис, рисовая пудра", "мускус, тёплая кожа"] },
  { code: "SCULPTED", title: "Sculpted", line: "Тело прочитано как архитектура.",
    notes: ["мокрый камень, металлическая стружка", "ветивер, ирис", "цемент, кедр"] },
  { code: "SOIREE",   title: "Soirée",   line: "Вечер, который не собирается заканчиваться.",
    notes: ["шампанское, лайм", "гардения, губная помада", "мускус, сигаретный дым"] },
  { code: "HISTORY",  title: "History",  line: "Архив десятилетий, до всех должностей.",
    notes: ["архивная пыль, старая бумага", "фиалка, печатный воск", "сандал, шёлк"] },
  { code: "ORBIT",    title: "Orbit",    line: "Металл, свет и орбита кампании.",
    notes: ["озон, холодный металл", "неоновый ирис", "минеральная амбра"] },
  { code: "DEBUT",    title: "Debut",    line: "Первый кастинг — до того, как всё началось.",
    notes: ["зелёный лист, мыло", "фрезия", "чистый мускус"] },
  { code: "ABANDON",  title: "Abandon",  line: "Неопубликованные дубли, оставленные как есть.",
    notes: ["соль, разогретая кожа", "—", "—"] },
  { code: "PRIVATE",  title: "Private",  line: "Не для публикации. Личный архив.",
    notes: ["кожа после душа", "хлопок, тёплая шея", "белый мускус, и всё"] }
];

/* 29 стадий Великого Делания — алхимический символ, музейный комментарий
   и фаза цикла. Фаза перекрашивает секцию, пока лента прокручивается. */
const ALCHIMIA_GLOSS = {
  "ALC-001": { n: "I",     sym: "◎", ph: "materia",  note: "Материя без формы — начало Делания." },
  "ALC-002": { n: "II",    sym: "🜂", ph: "materia",  note: "Первый из четырёх элементов: огонь, что испытывает металл." },
  "ALC-003": { n: "III",   sym: "🜄", ph: "materia",  note: "Растворение — форма встречает волну." },
  "ALC-004": { n: "IV",    sym: "🜃", ph: "materia",  note: "Плотность и тяжесть; тело возвращается к земле." },
  "ALC-005": { n: "V",     sym: "🜁", ph: "materia",  note: "Невесомость между вдохом и словом." },
  "ALC-006": { n: "VI",    sym: "🜀", ph: "materia",  note: "Пятый элемент — то, что нельзя увидеть, только преломить." },
  "ALC-007": { n: "VII",   sym: "⚭", ph: "metalla",  note: "Алхимическая свадьба: соединение противоположностей." },
  "ALC-008": { n: "VIII",  sym: "⚡", ph: "metalla",  note: "Искра, высвобожденная их союзом." },
  "ALC-009": { n: "IX",    sym: "♂", ph: "metalla",  note: "Первый металл — Марс: воля, сопротивление." },
  "ALC-010": { n: "X",     sym: "♀", ph: "metalla",  note: "Венера в металле: медь, влечение." },
  "ALC-011": { n: "XI",    sym: "☽", ph: "metalla",  note: "Луна в серебре — отражение без искажения." },
  "ALC-012": { n: "XII",   sym: "☉", ph: "metalla",  note: "Солнце в золоте — цель Делания." },
  "ALC-013": { n: "XIII",  sym: "🜆", ph: "metalla",  note: "Возгонка: тяжёлое поднимается светом." },
  "ALC-014": { n: "XIV",   sym: "☿", ph: "metalla",  note: "Ртуть — летучий дух металлов." },
  "ALC-015": { n: "XV",    sym: "🜍", ph: "essentia", note: "Сера — душа, горючая воля превращения." },
  "ALC-016": { n: "XVI",   sym: "🜖", ph: "essentia", note: "V.I.T.R.I.O.L. — посети недра земли, очищая обрящешь скрытый камень." },
  "ALC-017": { n: "XVII",  sym: "✧", ph: "essentia", note: "Дух, отделённый от тела в процессе." },
  "ALC-018": { n: "XVIII", sym: "🜔", ph: "essentia", note: "Соль — тело, что остаётся после огня." },
  "ALC-019": { n: "XIX",   sym: "❖", ph: "essentia", note: "Кристаллизация: беспорядок обретает решётку." },
  "ALC-020": { n: "XX",    sym: "●", ph: "nigredo",  note: "Nigredo — почернение. Первая философская стадия: всё гниёт, прежде чем очиститься." },
  "ALC-021": { n: "XXI",   sym: "○", ph: "albedo",   note: "Albedo — побеление. Омытая материя впервые видит свет." },
  "ALC-022": { n: "XXII",  sym: "◉", ph: "rubedo",   note: "Rubedo — покраснение. Цвет совершенного камня, конец трёх стадий." },
  "ALC-023": { n: "XXIII", sym: "❄", ph: "mutatio",  note: "Лёд — застывшее время между стадиями." },
  "ALC-024": { n: "XXIV",  sym: "▲", ph: "mutatio",  note: "Расплав, что помнит форму огня." },
  "ALC-025": { n: "XXV",   sym: "☁", ph: "mutatio",  note: "Дым — то, что остаётся, когда форма сгорает." },
  "ALC-026": { n: "XXVI",  sym: "◆", ph: "mutatio",  note: "Вулканическое стекло: тьма, отполированная до зеркала." },
  "ALC-027": { n: "XXVII", sym: "❋", ph: "lapis",    note: "Философский камень — то, ради чего затевалось всё остальное." },
  "ALC-028": { n: "XXVIII",sym: "⚗", ph: "lapis",    note: "Эликсир жизни — камень, растворённый в вине." },
  "ALC-029": { n: "XXIX",  sym: "✺", ph: "lapis",    note: "Квинтэссенция: всё Делание, собранное в одном кадре." }
};

const PHASE_LABEL = {
  materia:  "ЭЛЕМЕНТЫ",
  metalla:  "МЕТАЛЛЫ",
  essentia: "СУЩНОСТИ",
  nigredo:  "NIGREDO · ПОЧЕРНЕНИЕ",
  albedo:   "ALBEDO · ПОБЕЛЕНИЕ",
  rubedo:   "RUBEDO · ПОКРАСНЕНИЕ",
  mutatio:  "ПРЕВРАЩЕНИЯ",
  lapis:    "КАМЕНЬ"
};

/* ГЛУБИНА. Поле layers[] в архиве — не декор: каждая коллекция занимает
   свой диапазон от 0 (то, что продаётся) до 3 (то, что она не объясняет).
   Слой 3 населяют ровно три коллекции, и это исчерпывающий портрет. */
const DEPTH_LEVELS = [
  { id: 0, name: "ВИТРИНА", line: "Кампании. То, что покупают вместе с флаконом." },
  { id: 1, name: "СЦЕНА",   line: "Редакционные съёмки. То, что она согласилась показать." },
  { id: 2, name: "КОМНАТА", line: "После съёмки. Свет выключили, камеру — нет." },
  { id: 3, name: "ВЗГЛЯД",  line: "Три коллекции, которые она не объясняет никому." }
];

let ARCHIVE = [];
let currentGallery = [];
let currentIndex = 0;
let currentDepth = null;      // null = линза снята, показаны все слои
let yearIndex = 0;
let YEARS = [];               // [{year, photo}]

/* ── ЧТЕНИЕ: что архив успел заметить за зрителем ── */
const seen = {
  photos: new Set(),
  collections: new Set(),
  revealed: 0,
  maxDepth: -1,
  alchimiaStages: new Set(),
  photographers: {},
  yearsScrubbed: 0,
  delivered: false
};
const READING_THRESHOLD = 6;  // столько открытых кадров — и она отвечает

function toSrc(file) {
  return file.startsWith(IMG_PREFIX) ? file.slice(IMG_PREFIX.length) : file;
}
function byCollection(code) {
  return ARCHIVE.filter(d => d.collection === code);
}
function findCover(code) {
  const suffix = COVERS[code];
  return ARCHIVE.find(d => d.file.endsWith(suffix)) || byCollection(code)[0];
}
/* Слои у всех кадров коллекции одинаковы — берём с первого. */
function layersOf(code) {
  const first = byCollection(code)[0];
  return (first && first.layers) || [];
}

/* ══════════════════════════════════════════
   АЛХИМИЯ — лента 29 стадий + трансмутация
   ══════════════════════════════════════════ */
function renderAlchimia() {
  const items = byCollection("ALCHIMIA").sort((a, b) => a.id.localeCompare(b.id));
  const strip = document.getElementById("alcStrip");
  strip.innerHTML = items.map((d, i) => {
    const g = ALCHIMIA_GLOSS[d.id] || { n: i + 1, sym: "✦", ph: "materia", note: "" };
    return `
    <button class="alc-card" data-idx="${i}" data-phase="${g.ph}" style="--ac:${d.accent}">
      <div class="alc-card-img"><img src="${toSrc(d.file)}" alt="${d.title}" loading="lazy"></div>
      <div class="alc-card-scrim"></div>
      <div class="alc-card-num">${g.n}<span class="alc-card-sym">${g.sym}</span></div>
      <div class="alc-card-body">
        <div class="alc-card-title">${d.title}</div>
        <div class="alc-card-note">${g.note}</div>
      </div>
    </button>`;
  }).join("");

  strip.querySelectorAll(".alc-card").forEach(btn => {
    btn.addEventListener("click", () => openLightbox(items, parseInt(btn.dataset.idx), "alchimia"));
  });

  /* Трансмутация: стадия в центре ленты задаёт фазу всей секции.
     Считаем по scrollLeft, а не по IntersectionObserver — лента
     горизонтальная и внутри неё наблюдатель ведёт себя капризно. */
  const meterFill = document.getElementById("alcMeterFill");
  const meterLbl = document.getElementById("alcPhase");
  const meterStage = document.getElementById("alcStage");
  const section = document.getElementById("alchimia");

  function syncPhase() {
    const cards = [...strip.querySelectorAll(".alc-card")];
    if (!cards.length) return;
    /* Точка фокуса едет от левого края ленты к правому по мере прокрутки.
       Просто «центр вьюпорта» здесь не годится: на краях он физически не
       может совпасть с первой и последней карточкой, и прибор показывал
       бы III вместо I и XXVII вместо XXIX. */
    const max = strip.scrollWidth - strip.clientWidth;
    const progress = max > 0 ? strip.scrollLeft / max : 0;
    const focus = strip.scrollLeft + strip.clientWidth * progress;
    let best = 0, bestDist = Infinity;
    cards.forEach((c, i) => {
      const centre = c.offsetLeft + c.offsetWidth / 2;
      const dist = Math.abs(centre - focus);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    const d = items[best];
    const g = ALCHIMIA_GLOSS[d.id];
    section.dataset.phase = g.ph;
    meterLbl.textContent = PHASE_LABEL[g.ph];
    meterStage.textContent = `${g.n} · ${d.title}`;
    meterFill.style.width = `${((best + 1) / items.length) * 100}%`;
    seen.alchimiaStages.add(d.id);
  }

  let ticking = false;
  strip.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { syncPhase(); ticking = false; });
  }, { passive: true });
  syncPhase();
}

/* ══════════════════════════════════════════
   СОРОК ШЕСТЬ ЛЕТ — скраббер по годам
   ══════════════════════════════════════════ */
function buildYears() {
  const byYear = {};
  ARCHIVE.forEach(d => {
    const y = d.date.slice(0, 4);
    /* На год берём первый кадр по дате — стабильно и без случайности,
       чтобы при каждом заходе год выглядел одинаково. */
    if (!byYear[y] || d.date < byYear[y].date) byYear[y] = d;
  });
  YEARS = Object.keys(byYear).sort().map(y => ({ year: y, photo: byYear[y] }));

  const slider = document.getElementById("yearSlider");
  slider.max = String(YEARS.length - 1);
  slider.value = "0";
  slider.addEventListener("input", e => {
    yearIndex = parseInt(e.target.value);
    seen.yearsScrubbed++;
    renderYear();
  });

  document.getElementById("yearSpan").textContent = `${YEARS[0].year}—${YEARS[YEARS.length - 1].year}`;
  renderYear();
}

function renderYear() {
  const { year, photo } = YEARS[yearIndex];
  const img = document.getElementById("yearImg");
  img.src = toSrc(photo.file);
  img.alt = photo.title;
  document.getElementById("yearBig").textContent = year;
  document.getElementById("yearCaption").innerHTML =
    `<b>${photo.title}</b> · ${photo.collection}<br>${photo.location || "—"} · ${photo.photographer || "—"}`;
  const age = parseInt(year) - 2014;
  document.getElementById("yearElapsed").textContent =
    age === 0 ? "ПЕРВЫЙ КАДР АРХИВА" : `${age} ${plural(age, "ГОД", "ГОДА", "ЛЕТ")} СПУСТЯ`;
  document.getElementById("years").style.setProperty("--yc", photo.accent || "#c5a66e");
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/* ══════════════════════════════════════════
   ГЛУБИНА — линза поверх всей страницы
   ══════════════════════════════════════════ */
function buildDepthDial() {
  const dial = document.getElementById("depthDial");
  dial.innerHTML = DEPTH_LEVELS.map(l => {
    const n = ARCHIVE.filter(d => (d.layers || []).includes(l.id)).length;
    return `<button class="depth-btn" data-depth="${l.id}">
      <span class="depth-btn-n">${l.id}</span>
      <span class="depth-btn-name">${l.name}</span>
      <span class="depth-btn-count">${n}</span>
    </button>`;
  }).join("");
  dial.querySelectorAll(".depth-btn").forEach(btn => {
    btn.addEventListener("click", () => setDepth(parseInt(btn.dataset.depth)));
  });
  document.getElementById("depthReset").addEventListener("click", () => setDepth(null));
  setDepth(null);
}

function setDepth(depth) {
  /* Повторный клик по активному слою снимает линзу — так дозируется
     возврат к полному архиву без отдельной заметной кнопки. */
  currentDepth = (depth !== null && currentDepth === depth) ? null : depth;
  const d = currentDepth;
  if (d !== null) seen.maxDepth = Math.max(seen.maxDepth, d);

  document.body.dataset.depth = d === null ? "" : String(d);
  document.querySelectorAll(".depth-btn").forEach(b =>
    b.classList.toggle("active", d !== null && parseInt(b.dataset.depth) === d));
  document.getElementById("depthReset").classList.toggle("show", d !== null);

  const lvl = d === null ? null : DEPTH_LEVELS[d];
  document.getElementById("depthLine").textContent =
    lvl ? lvl.line : "Архив открыт целиком. Выбери слой — увидишь, сколько из него на самом деле предназначалось тебе.";

  /* Коллекции не исчезают — они перестают предлагать себя. Гасим те,
     что не достают до выбранной глубины. */
  let lit = 0;
  document.querySelectorAll(".coll-tile").forEach(tile => {
    const layers = (tile.dataset.layers || "").split(",").filter(Boolean).map(Number);
    const on = d === null || layers.includes(d);
    tile.classList.toggle("dimmed", !on);
    tile.disabled = !on;
    if (on) lit++;
  });

  /* ALCHIMIA в сетке не лежит — у неё своя витрина, но в счёт коллекций
     слоя она входит наравне с остальными (иначе на слое 3 счётчик
     разойдётся с подписью «три коллекции»). */
  const alcOn = d === null || layersOf("ALCHIMIA").includes(d);
  document.getElementById("alchimia").classList.toggle("dimmed", !alcOn);
  if (alcOn) lit++;

  document.getElementById("depthLit").textContent =
    `${lit} ${plural(lit, "КОЛЛЕКЦИЯ", "КОЛЛЕКЦИИ", "КОЛЛЕКЦИЙ")}`;
}

/* ══════════════════════════════════════════
   СЕТКА КОЛЛЕКЦИЙ
   ══════════════════════════════════════════ */
function renderCollections() {
  const grid = document.getElementById("collGrid");
  grid.innerHTML = COLLECTION_INFO.map(c => {
    const items = byCollection(c.code);
    const cover = findCover(c.code);
    const restricted = items.length && items.every(d => d.restricted);
    const layers = layersOf(c.code);
    return `
    <button class="coll-tile${restricted ? " is-private" : ""}" data-code="${c.code}" data-layers="${layers.join(",")}">
      <div class="coll-tile-img"><img src="${toSrc(cover.file)}" alt="${c.title}" loading="lazy"></div>
      <div class="coll-tile-scrim"></div>
      ${restricted ? `<div class="coll-tile-lock">🔒 ЛИЧНОЕ</div>` : ""}
      <div class="coll-tile-depth" title="глубина архива">${
        [0,1,2,3].map(l => `<i class="${layers.includes(l) ? "on" : ""}"></i>`).join("")
      }</div>
      <div class="coll-tile-body">
        <div class="coll-tile-count">${String(items.length).padStart(2, "0")} КАДРОВ</div>
        <div class="coll-tile-title">${c.title}</div>
        <div class="coll-tile-line">${c.line}</div>
      </div>
    </button>`;
  }).join("");

  grid.querySelectorAll(".coll-tile").forEach(btn => {
    btn.addEventListener("click", () => openCollectionView(btn.dataset.code));
  });
}

/* ══════════════════════════════════════════
   ОВЕРЛЕЙ КОЛЛЕКЦИИ + контактный лист
   ══════════════════════════════════════════ */
function openCollectionView(code) {
  const info = COLLECTION_INFO.find(c => c.code === code);
  const items = byCollection(code).sort((a, b) => a.id.localeCompare(b.id));
  const overlay = document.getElementById("collectionView");
  seen.collections.add(code);

  document.getElementById("cvTitle").textContent = info ? info.title : code;
  document.getElementById("cvCount").textContent = `${items.length} КАДРОВ · СЛОЙ ${layersOf(code).join("–")}`;

  /* Ольфакторная пирамида: дом парфюмерный, у каждой линии свой состав. */
  const notes = info ? info.notes : null;
  document.getElementById("cvNotes").innerHTML = notes ? `
    <div class="cv-note"><span>ВЕРХНИЕ</span>${notes[0]}</div>
    <div class="cv-note"><span>СЕРДЦЕ</span>${notes[1]}</div>
    <div class="cv-note"><span>БАЗА</span>${notes[2]}</div>` : "";

  const grid = document.getElementById("cvGrid");
  grid.innerHTML = items.map((d, i) => `
    <button class="cv-thumb${d.restricted ? " is-restricted" : ""}" data-idx="${i}">
      <img src="${toSrc(d.file)}" alt="${d.title}" loading="lazy">
      ${d.restricted ? `<span class="cv-thumb-lock">🔒</span>` : ""}
      <span class="cv-thumb-frame">${String(i + 1).padStart(2, "0")}A</span>
      <span class="cv-thumb-title">${d.title}</span>
    </button>`).join("");
  grid.querySelectorAll(".cv-thumb").forEach(btn => {
    btn.addEventListener("click", () => openLightbox(items, parseInt(btn.dataset.idx), code.toLowerCase()));
  });

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCollectionView() {
  document.getElementById("collectionView").classList.remove("open");
  if (!document.getElementById("lightbox").classList.contains("open")) {
    document.body.style.overflow = "";
  }
}

/* ══════════════════════════════════════════
   ЛАЙТБОКС
   ══════════════════════════════════════════ */
function lightboxCaption(d, ctxLabel) {
  const g = ctxLabel === "alchimia" ? ALCHIMIA_GLOSS[d.id] : null;
  return `
    <div class="lb-cap-top">
      <div class="lb-cap-coll">${d.collection}${g ? ` · СТАДИЯ ${g.n}` : ""}</div>
      <div class="lb-cap-title">${d.title}</div>
      ${g ? `<div class="lb-cap-gloss">${g.sym} ${g.note}</div>` : ""}
    </div>
    <div class="lb-cap-grid">
      <div><span>Фотограф</span>${d.photographer || "—"}</div>
      <div><span>Публикация</span>${d.publication || "—"}</div>
      <div><span>Стиль</span>${d.styling || "—"}</div>
      <div><span>Локация</span>${d.location || "—"}</div>
      <div><span>Волосы</span>${d.hair || "—"}</div>
      <div><span>Макияж</span>${d.makeup || "—"}</div>
      <div><span>Свет</span>${d.light || "—"}${d.flash ? " · вспышка" : ""}</div>
      <div><span>Тираж</span>${d.edition || "—"}</div>
    </div>
    ${d.set_design ? `<div class="lb-cap-set"><span>Декорация</span>${d.set_design}</div>` : ""}
    <div class="lb-cap-date">${d.date}</div>
  `;
}

function renderLightbox() {
  const d = currentGallery[currentIndex];
  if (!d) return;
  const img = document.getElementById("lbImg");
  img.src = toSrc(d.file);
  img.alt = d.title;
  document.getElementById("lbCaption").innerHTML = lightboxCaption(d, currentGallery._ctx);
  document.getElementById("lbPos").textContent = `${currentIndex + 1} / ${currentGallery.length}`;
  const wrap = document.getElementById("lbImgWrap");
  wrap.classList.toggle("is-restricted", !!d.restricted);
  wrap.classList.remove("revealed");
  document.getElementById("lightbox").style.setProperty("--ac", d.accent || "#c5a66e");

  /* CHROMA — единственная коллекция, снятая со вспышкой (flash:true у всех
     29 кадров). Пусть она и вспыхивает при открытии. */
  if (d.flash) {
    const fl = document.getElementById("lbFlash");
    fl.classList.remove("fire");
    void fl.offsetWidth;
    fl.classList.add("fire");
  }

  seen.photos.add(d.id);
  seen.collections.add(d.collection);
  if (d.photographer) seen.photographers[d.photographer] = (seen.photographers[d.photographer] || 0) + 1;
  maybeUnlockReading();
}

function openLightbox(list, index, ctx) {
  currentGallery = list;
  currentGallery._ctx = ctx;
  currentIndex = index;
  renderLightbox();
  document.getElementById("lightbox").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
  if (!document.getElementById("collectionView").classList.contains("open")) {
    document.body.style.overflow = "";
  }
}

function stepLightbox(delta) {
  if (!currentGallery.length) return;
  currentIndex = (currentIndex + delta + currentGallery.length) % currentGallery.length;
  renderLightbox();
}

/* ══════════════════════════════════════════
   ЧТЕНИЕ — мета-перцепция, направленная на зрителя
   Её способность не подчиняет и не читает мысли: она считывает
   поведение. Страница делает ровно это — считает, куда смотрели,
   и возвращает наблюдение. Никаких данных никуда не уходит.
   ══════════════════════════════════════════ */
function maybeUnlockReading() {
  if (seen.delivered || seen.photos.size < READING_THRESHOLD) return;
  const eye = document.getElementById("eyeBtn");
  if (!eye.classList.contains("show")) {
    eye.classList.add("show");
    eye.setAttribute("aria-hidden", "false");
  }
}

function buildReading() {
  const lines = [];
  const n = seen.photos.size;

  lines.push(`Ты открыл <b>${n}</b> ${plural(n, "кадр", "кадра", "кадров")} из двухсот сорока девяти. Никто не считал — кроме архива.`);

  if (seen.revealed > 0) {
    lines.push(`<b>${seen.revealed}</b> ${plural(seen.revealed, "из них был помечен", "из них были помечены", "из них были помечены")} как личные. Пароля не было — только пометка. Тебе хватило пометки, чтобы захотеть посмотреть.`);
  }

  if (seen.maxDepth === 3) {
    lines.push(`Ты дошёл до третьего слоя. Большинство останавливается на первом: там красиво и ничего не просят взамен.`);
  } else if (seen.maxDepth >= 0) {
    lines.push(`Глубже ${seen.maxDepth}-го слоя ты не спускался. Это не осторожность. Это вкус — и он у тебя есть.`);
  }

  const stages = seen.alchimiaStages.size;
  if (stages >= 20) {
    lines.push(`Ты досмотрел Делание почти до конца — <b>${stages}</b> ${plural(stages, "стадия", "стадии", "стадий")} из двадцати девяти. Сорок шесть лет съёмок, и ни одного объяснения зачем. Объяснение тебе и не понадобилось.`);
  } else if (stages >= 8) {
    lines.push(`Ты прошёл <b>${stages}</b> ${plural(stages, "стадию", "стадии", "стадий")} Делания и остановился. Все останавливаются. Она — нет.`);
  }

  const ph = Object.entries(seen.photographers).sort((a, b) => b[1] - a[1])[0];
  if (ph && ph[1] >= 3) {
    lines.push(`Больше всего кадров, что ты открыл, снял <b>${ph[0]}</b>. Ты не выбирал фотографа — ты выбирал свет. У него он всегда один и тот же.`);
  }

  if (seen.collections.has("PRIVATE") && seen.collections.has("DEBUT")) {
    lines.push(`Ты заходил и в <b>Debut</b>, и в <b>Private</b> — в самое начало и в то, что после. Тебе интересна не съёмка. Тебе интересно, что между.`);
  } else if (seen.collections.has("ABANDON")) {
    lines.push(`Ты открыл <b>Abandon</b> — два неопубликованных дубля, где она смеётся не по команде. Из всего архива это единственное, что она не контролировала.`);
  }

  if (seen.yearsScrubbed > 12) {
    lines.push(`Ты долго возил ползунок по годам. Искал, где она начнёт меняться. Не нашёл.`);
  }

  const c = seen.collections.size;
  lines.push(`Коллекций открыто: <b>${c}</b> из четырнадцати. Остальные никуда не денутся — в отличие от твоего любопытства.`);

  return lines;
}

function openReading() {
  const box = document.getElementById("readingLines");
  box.innerHTML = buildReading().map((l, i) =>
    `<p class="reading-line" style="animation-delay:${0.25 + i * 0.5}s">${l}</p>`).join("");
  document.getElementById("reading").classList.add("open");
  document.body.style.overflow = "hidden";
  seen.delivered = true;
}

function closeReading() {
  document.getElementById("reading").classList.remove("open");
  document.body.style.overflow = "";
}

/* ── бегущая строка публикаций ── */
function renderMasthead() {
  const pubs = [...new Set(ARCHIVE.map(d => d.publication).filter(Boolean))];
  const line = pubs.join("   ·   ");
  document.getElementById("mastheadTrack").innerHTML =
    `<span>${line}</span><span aria-hidden="true">${line}</span>`;
}

/* ── мягкий fallback для отсутствующей картинки: гасим рамку в тёплый
   градиент вместо битой иконки, без alert и без остановки рендера ── */
document.addEventListener("error", e => {
  if (e.target.tagName !== "IMG") return;
  const host = e.target.closest(".alc-card, .coll-tile, .cv-thumb, .hero-bg, #lbImgWrap, .year-frame");
  if (host) host.classList.add("img-broken");
}, true);

/* ══════════════════════════════════════════
   ИНИЦИАЛИЗАЦИЯ
   ══════════════════════════════════════════ */
async function init() {
  try {
    const res = await fetch(ARCHIVE_URL);
    ARCHIVE = await res.json();
  } catch (e) {
    document.getElementById("alcStrip").innerHTML =
      `<div class="load-error">АРХИВ НЕДОСТУПЕН: ${e.message}</div>`;
    return;
  }

  document.getElementById("frameCount").textContent = ARCHIVE.length;
  renderMasthead();
  renderAlchimia();
  buildYears();
  renderCollections();
  buildDepthDial();

  document.getElementById("cvClose").addEventListener("click", closeCollectionView);
  document.getElementById("collectionView").addEventListener("click", e => {
    if (e.target.id === "collectionView") closeCollectionView();
  });

  document.getElementById("lbClose").addEventListener("click", closeLightbox);
  document.getElementById("lbPrev").addEventListener("click", () => stepLightbox(-1));
  document.getElementById("lbNext").addEventListener("click", () => stepLightbox(1));
  document.getElementById("lightbox").addEventListener("click", e => {
    if (e.target.id === "lightbox") closeLightbox();
  });
  document.getElementById("lbReveal").addEventListener("click", () => {
    document.getElementById("lbImgWrap").classList.add("revealed");
    seen.revealed++;
    maybeUnlockReading();
  });

  document.getElementById("eyeBtn").addEventListener("click", openReading);
  document.getElementById("readingClose").addEventListener("click", closeReading);

  document.addEventListener("keydown", e => {
    const lb = document.getElementById("lightbox").classList.contains("open");
    const cv = document.getElementById("collectionView").classList.contains("open");
    const rd = document.getElementById("reading").classList.contains("open");
    if (e.key === "Escape") {
      if (rd) return closeReading();
      if (lb) return closeLightbox();
      if (cv) return closeCollectionView();
    }
    if (lb && e.key === "ArrowLeft") stepLightbox(-1);
    if (lb && e.key === "ArrowRight") stepLightbox(1);
  });
}

init();
