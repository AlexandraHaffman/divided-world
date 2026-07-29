/* ══════════════════════════════════════════
   ДЕСКТОП: АВТОМАСШТАБИРОВАНИЕ ГАЛЕРЕИ ПО ВЫСОТЕ ОКНА

   В режиме «галерея» карточка = портрет 4:5 + блок цитаты. Если ширину
   колонки задавать долями контейнера, высота карточки зависит от ширины
   монитора — и на одном экране карточка влезает целиком, а на другом
   обрезается. Здесь наоборот: карточка подгоняется под ВЫСОТУ ОКНА, а из
   неё уже выводится ширина колонки.

       высота карточки = ширина × 1.25 (портрет 4:5) + цитата + полоса тира

   Отсчитываем от ПОЛНОЙ высоты окна, а не от места, которое осталось под
   шапкой: шапка не липкая и прокручивается вверх, а её высота на невысоких
   ноутбуках съедала почти всё свободное место — карточки вырождались в
   марки посреди пустого экрана. Теперь строка карточек ровно равна окну:
   прокрутил на высоту шапки — и ряд занимает экран целиком.

   Результат кладём в --gal-card-w, а grid-template-columns в desktop.css
   берёт его. Пересчитываем при ресайзе окна и при каждой перерисовке грида
   (смена режима, фильтра, сортировки).

   ВАЖНО: «высота окна» — это window.innerHeight, то есть видимая область
   вкладки, а не физический экран.
   ══════════════════════════════════════════ */

(function () {
  const grid = document.getElementById("grid");
  if (!grid) return;

  const MQ = window.matchMedia("(min-width: 1024px)");
  const MIN_W = 300;    // ниже карточка уже не «основной режим», а марка
  const MAX_W = 980;    // выше двум колонкам на экране становится тесно
  const BREATH = 44;    // «запас воздуха» сверху и снизу от ряда карточек
  const root = document.documentElement;

  function px(el, prop, fallback) {
    if (!el) return fallback;
    const n = parseFloat(getComputedStyle(el)[prop]);
    return Number.isFinite(n) ? n : fallback;
  }

  function fitGallery() {
    // Режим не галерейный (или экран узкий) — отдаём управление обычному CSS.
    if (!MQ.matches || grid.dataset.cols !== "2" || grid.offsetParent === null) {
      root.style.removeProperty("--gal-card-w");
      return;
    }

    const gs = getComputedStyle(grid);
    const padL = parseFloat(gs.paddingLeft) || 0;
    const padR = parseFloat(gs.paddingRight) || 0;
    const gap  = parseFloat(gs.columnGap) || 0;

    // Всё, что в карточке не портрет: блок цитаты + верхняя полоса тира.
    const quoteH = px(grid.querySelector(".card-quote-a"), "height", 128);
    const barH   = px(grid.querySelector(".card-top-bar"), "height", 8);

    const avail = window.innerHeight - BREATH;
    let w = Math.floor((avail - quoteH - barH) / 1.25);

    // И не шире, чем позволяет сам контейнер (две колонки + зазор).
    const byWidth = Math.floor((grid.clientWidth - padL - padR - gap) / 2);

    w = Math.min(Math.max(w, MIN_W), MAX_W, byWidth);
    root.style.setProperty("--gal-card-w", w + "px");
  }

  // Грид перерисовывается через innerHTML — ловим это наблюдателем,
  // отдельных хуков в dossier.js для этого не нужно.
  new MutationObserver(() => requestAnimationFrame(fitGallery))
    .observe(grid, { childList: true, attributes: true, attributeFilter: ["data-cols", "style"] });

  window.addEventListener("resize", fitGallery);
  if (MQ.addEventListener) MQ.addEventListener("change", fitGallery);
  window.addEventListener("load", fitGallery);
  fitGallery();
})();
