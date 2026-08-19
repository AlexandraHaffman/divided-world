/* ══════════════════════════════════════════════════════════════
   НИМФЕЯ ЭЛЕНИС — АРХИВ
   Данные тянутся из ../../../data/nimfeya-archive.json (249 кадров,
   13 коллекций). Разметка страницы статична (elenis.html), эта
   логика строит: ленту АЛХИМИИ, сетку коллекций, оверлей коллекции
   и лайтбокс — из одного и того же массива.
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

/* Порядок и голос подписи для сетки коллекций (ALCHIMIA не входит —
   у неё отдельная витрина выше по странице). */
const COLLECTION_INFO = [
  { code: "NOCTURNE", title: "Nocturne",  line: "После полуночи власть меняет лицо." },
  { code: "PERSONA",  title: "Persona",   line: "Двадцать четыре роли — один и тот же взгляд." },
  { code: "CHROMA",   title: "Chroma",    line: "Свет как пигмент: кампания в чистом цвете." },
  { code: "ELENIS",   title: "Elenis",    line: "Лицо парфюмерного дома, флакон в кадре." },
  { code: "LUMIERE",  title: "Lumière",   line: "Свет вместо короны." },
  { code: "ICON",     title: "Icon",      line: "Крупный план. Ничего лишнего, кроме взгляда." },
  { code: "SCULPTED", title: "Sculpted",  line: "Тело прочитано как архитектура." },
  { code: "SOIREE",   title: "Soirée",    line: "Вечер, который не собирается заканчиваться." },
  { code: "HISTORY",  title: "History",   line: "Архив десятилетий, до всех должностей." },
  { code: "ORBIT",    title: "Orbit",     line: "Металл, свет и орбита кампании." },
  { code: "DEBUT",    title: "Debut",     line: "Первый кастинг — до того, как всё началось." },
  { code: "ABANDON",  title: "Abandon",   line: "Неопубликованные дубли, оставленные как есть." },
  { code: "PRIVATE",  title: "Private",   line: "Не для публикации. Личный архив." }
];

/* 29 стадий Великого Делания — алхимический символ + краткий музейный
   комментарий на карточку. Ключ — id кадра в архиве (ALC-001…ALC-029). */
const ALCHIMIA_GLOSS = {
  "ALC-001": { n: "I",     sym: "◎", note: "Материя без формы — начало Делания." },
  "ALC-002": { n: "II",    sym: "🜂", note: "Первый из четырёх элементов: огонь, что испытывает металл." },
  "ALC-003": { n: "III",   sym: "🜄", note: "Растворение — форма встречает волну." },
  "ALC-004": { n: "IV",    sym: "🜃", note: "Плотность и тяжесть; тело возвращается к земле." },
  "ALC-005": { n: "V",     sym: "🜁", note: "Невесомость между вдохом и словом." },
  "ALC-006": { n: "VI",    sym: "🜀", note: "Пятый элемент — то, что нельзя увидеть, только преломить." },
  "ALC-007": { n: "VII",   sym: "⚭", note: "Алхимическая свадьба: соединение противоположностей." },
  "ALC-008": { n: "VIII",  sym: "⚡", note: "Искра, высвобожденная их союзом." },
  "ALC-009": { n: "IX",    sym: "♂", note: "Первый металл — Марс, воля, сопротивление." },
  "ALC-010": { n: "X",     sym: "♀", note: "Венера в металле: медь, влечение." },
  "ALC-011": { n: "XI",    sym: "☽", note: "Луна в серебре — отражение без искажения." },
  "ALC-012": { n: "XII",   sym: "☉", note: "Солнце в золоте — цель Делания." },
  "ALC-013": { n: "XIII",  sym: "🜆", note: "Возгонка: тяжёлое поднимается светом." },
  "ALC-014": { n: "XIV",   sym: "☿", note: "Ртуть — летучий дух металлов." },
  "ALC-015": { n: "XV",    sym: "🜍", note: "Сера — душа, горючая воля превращения." },
  "ALC-016": { n: "XVI",   sym: "🜖", note: "V.I.T.R.I.O.L. — посети недра земли, очищая обрящешь скрытый камень." },
  "ALC-017": { n: "XVII",  sym: "✧", note: "Дух, отделённый от тела в процессе." },
  "ALC-018": { n: "XVIII", sym: "🜔", note: "Соль — тело, что остаётся после огня." },
  "ALC-019": { n: "XIX",   sym: "❖", note: "Кристаллизация: беспорядок обретает решётку." },
  "ALC-020": { n: "XX",    sym: "●", note: "Nigredo — почернение, первая из трёх философских стадий." },
  "ALC-021": { n: "XXI",   sym: "○", note: "Albedo — побеление, очищение после тьмы." },
  "ALC-022": { n: "XXII",  sym: "◉", note: "Rubedo — покраснение, финальный цвет совершенного камня." },
  "ALC-023": { n: "XXIII", sym: "❄", note: "Лёд — застывшее время между стадиями." },
  "ALC-024": { n: "XXIV",  sym: "▲", note: "Расплав, что помнит форму огня." },
  "ALC-025": { n: "XXV",   sym: "☁", note: "Дым — то, что остаётся, когда форма сгорает." },
  "ALC-026": { n: "XXVI",  sym: "◆", note: "Вулканическое стекло: тьма, отполированная до зеркала." },
  "ALC-027": { n: "XXVII", sym: "❋", note: "Философский камень — цель, которую искали веками." },
  "ALC-028": { n: "XXVIII",sym: "⚗", note: "Эликсир жизни — камень, растворённый в вине." },
  "ALC-029": { n: "XXIX",  sym: "✺", note: "Квинтэссенция: всё Делание, собранное в одном кадре." }
};

let ARCHIVE = [];
let currentGallery = [];
let currentIndex = 0;

function toSrc(file) {
  return file.startsWith(IMG_PREFIX) ? file.slice(IMG_PREFIX.length) : file;
}

function findCover(code) {
  const suffix = COVERS[code];
  return ARCHIVE.find(d => d.file.endsWith(suffix)) || ARCHIVE.find(d => d.collection === code);
}

/* ── лента АЛХИМИИ ── */
function renderAlchimia() {
  const items = ARCHIVE.filter(d => d.collection === "ALCHIMIA")
    .sort((a, b) => a.id.localeCompare(b.id));
  const strip = document.getElementById("alcStrip");
  strip.innerHTML = items.map((d, i) => {
    const g = ALCHIMIA_GLOSS[d.id] || { n: i + 1, sym: "✦", note: "" };
    return `
    <button class="alc-card" data-idx="${i}" style="--ac:${d.accent}">
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
}

/* ── сетка коллекций ── */
function renderCollections() {
  const grid = document.getElementById("collGrid");
  grid.innerHTML = COLLECTION_INFO.map(c => {
    const items = ARCHIVE.filter(d => d.collection === c.code);
    const cover = findCover(c.code);
    const restricted = items.length && items.every(d => d.restricted);
    return `
    <button class="coll-tile${restricted ? " is-private" : ""}" data-code="${c.code}">
      <div class="coll-tile-img"><img src="${toSrc(cover.file)}" alt="${c.title}" loading="lazy"></div>
      <div class="coll-tile-scrim"></div>
      ${restricted ? `<div class="coll-tile-lock">🔒 ЛИЧНОЕ</div>` : ""}
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

/* ── оверлей коллекции: полная сетка кадров ── */
function openCollectionView(code) {
  const info = COLLECTION_INFO.find(c => c.code === code);
  const items = ARCHIVE.filter(d => d.collection === code).sort((a, b) => a.id.localeCompare(b.id));
  const overlay = document.getElementById("collectionView");
  document.getElementById("cvTitle").textContent = info ? info.title : code;
  document.getElementById("cvCount").textContent = `${items.length} КАДРОВ`;
  const grid = document.getElementById("cvGrid");
  grid.innerHTML = items.map((d, i) => `
    <button class="cv-thumb${d.restricted ? " is-restricted" : ""}" data-idx="${i}">
      <img src="${toSrc(d.file)}" alt="${d.title}" loading="lazy">
      ${d.restricted ? `<span class="cv-thumb-lock">🔒</span>` : ""}
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

/* ── лайтбокс ── */
function lightboxCaption(d, ctxLabel) {
  const g = ctxLabel === "alchimia" ? ALCHIMIA_GLOSS[d.id] : null;
  return `
    <div class="lb-cap-top">
      <div class="lb-cap-coll">${d.collection}${g ? ` · СТАДИЯ ${g.n}` : ""}</div>
      <div class="lb-cap-title">${d.title}</div>
    </div>
    <div class="lb-cap-grid">
      <div><span>Фотограф</span>${d.photographer || "—"}</div>
      <div><span>Публикация</span>${d.publication || "—"}</div>
      <div><span>Стиль</span>${d.styling || "—"}</div>
      <div><span>Локация</span>${d.location || "—"}</div>
      <div><span>Волосы</span>${d.hair || "—"}</div>
      <div><span>Макияж</span>${d.makeup || "—"}</div>
      <div><span>Свет</span>${d.light || "—"}</div>
      <div><span>Тираж</span>${d.edition || "—"}</div>
    </div>
    ${d.set_design ? `<div class="lb-cap-set"><span>Декорация</span>${d.set_design}</div>` : ""}
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

/* ── масштаб-строка публикаций (marquee из данных) ── */
function renderMasthead() {
  const pubs = [...new Set(ARCHIVE.map(d => d.publication).filter(Boolean))];
  const track = document.getElementById("mastheadTrack");
  const line = pubs.join("   ·   ");
  track.innerHTML = `<span>${line}</span><span aria-hidden="true">${line}</span>`;
}

/* ── мягкий fallback для отсутствующей картинки: гасим рамку в тёплый
   градиент вместо битой иконки, без alert и без остановки рендера ── */
document.addEventListener("error", e => {
  if (e.target.tagName !== "IMG") return;
  const host = e.target.closest(".alc-card, .coll-tile, .cv-thumb, .hero-bg, #lbImgWrap");
  if (host) host.classList.add("img-broken");
}, true);

/* ── инициализация ── */
async function init() {
  try {
    const res = await fetch(ARCHIVE_URL);
    ARCHIVE = await res.json();
  } catch (e) {
    document.getElementById("alcStrip").innerHTML = `<div class="load-error">АРХИВ НЕДОСТУПЕН: ${e.message}</div>`;
    return;
  }
  document.getElementById("frameCount").textContent = ARCHIVE.length;
  renderMasthead();
  renderAlchimia();
  renderCollections();

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
  });

  document.addEventListener("keydown", e => {
    if (!document.getElementById("lightbox").classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.getElementById("collectionView").classList.contains("open")
        && !document.getElementById("lightbox").classList.contains("open")) {
      closeCollectionView();
    }
  });
}

init();
