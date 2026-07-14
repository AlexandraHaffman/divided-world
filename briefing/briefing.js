/* ============================================================
   БРИФИНГ // Разделённый мир — interactions
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Image error fallback ---------- */
  $$('img').forEach(function (img) {
    img.addEventListener('error', function () {
      var wrap = img.closest('.earth-stage, .scan-frame, .collapse-viewport, .zones-map-wrap');
      if (wrap) wrap.classList.add('has-error');
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(function (el) { revealObs.observe(el); });

  /* ---------- 02 — Meta-factor scanner ---------- */
  var META = {
    mental:        { head: '// МЕНТАЛЬНОЕ',     text: 'Воздействие на восприятие, память, эмоции и сознание.',                         scan: 'MENTAL',    obj: '04-M' },
    physical:      { head: '// ФИЗИЧЕСКОЕ',     text: 'Изменение силы, скорости, прочности и регенерации.',                            scan: 'PHYSICAL',  obj: '04-P' },
    energetic:     { head: '// ЭНЕРГЕТИЧЕСКОЕ', text: 'Управление светом, температурой, электричеством и другими формами энергии.',    scan: 'ENERGETIC', obj: '04-E' },
    environmental: { head: '// СРЕДОВОЕ',       text: 'Воздействие на материю, гравитацию, погоду и окружающее пространство.',          scan: 'ENVIRON.',  obj: '04-S' }
  };
  var scanTabs = $$('.scan-tab');
  var scanZones = $$('.scan-svg [data-zone]');
  var scanHead = $('#scanHead'), scanText = $('#scanText'), scanMeta = $('#scanMeta'), scanObj = $('#scanObj');
  function setMeta(cat) {
    var d = META[cat]; if (!d) return;
    scanTabs.forEach(function (t) { t.classList.toggle('active', t.dataset.cat === cat); });
    scanZones.forEach(function (g) { g.classList.toggle('on', g.getAttribute('data-zone') === cat); });
    scanText.style.opacity = 0;
    setTimeout(function () {
      scanHead.textContent = d.head; scanText.textContent = d.text; scanText.style.opacity = 1;
    }, reduce ? 0 : 160);
    scanMeta.innerHTML = 'OBJ.CLASS: META<br>SCAN: ' + d.scan;
    scanObj.textContent = d.obj;
  }
  scanTabs.forEach(function (t) { t.addEventListener('click', function () { setMeta(t.dataset.cat); }); });

  /* ---------- 04 — World zones map ---------- */
  var ZONES = {
    stable:    { head: '// СТАБИЛЬНЫЕ СИСТЕМЫ', text: 'Города, институты, экономика, армия и централизованная власть.',              status: 'STABLE',   c: '#bfe6ff', f: 0.26 },
    closed:    { head: '// ЗАКРЫТЫЕ СИСТЕМЫ',   text: 'Изолированные общества, контролирующие доступ и информацию.',                 status: 'CLOSED',   c: '#4fc3f7', f: 0.80 },
    frontier:  { head: '// ФРОНТИР',            text: 'Пограничные территории, где власть остаётся нестабильной.',                   status: 'FRONTIER', c: '#ff9d00', f: 0.66 },
    collapse:  { head: '// ЗОНЫ РАСПАДА',       text: 'Руины, малые группировки, аномалии и отсутствие единой власти.',             status: 'COLLAPSE', c: '#ff4d4d', f: 0.30 },
    anomalous: { head: '// АНОМАЛЬНЫЕ РЕГИОНЫ', text: 'Территории, физически изменённые деятельностью сильнейших мета-людей.',       status: 'ANOMALY',  c: '#a55eea', f: 0.70 }
  };
  var zoneTabs = $$('.zone-tab');
  var zoneGroups = $$('.zones-svg [data-zone]');
  var zonesWrap = $('#zonesWrap'), zonesTrack = $('#zonesTrack'), zonesMap = $('#zonesMap');
  var zonesHead = $('#zonesHead'), zonesText = $('#zonesText'), zonesStatus = $('#zonesStatus'), zonesReadout = $('#zonesReadout');
  var curZone = 'stable';

  function panZones(f) {
    if (!zonesMap.offsetWidth || !zonesWrap.offsetWidth) return;
    var trackW = zonesMap.offsetWidth, contW = zonesWrap.offsetWidth;
    var tx = contW / 2 - f * trackW;
    tx = Math.min(0, Math.max(contW - trackW, tx));
    zonesTrack.style.transform = 'translateX(' + tx + 'px)';
  }
  function setZone(z) {
    var d = ZONES[z]; if (!d) return;
    curZone = z;
    zoneTabs.forEach(function (t) { t.classList.toggle('active', t.dataset.zone === z); });
    zoneGroups.forEach(function (g) { g.classList.toggle('on', g.getAttribute('data-zone') === z); });
    zonesHead.textContent = d.head; zonesText.textContent = d.text;
    zonesStatus.textContent = d.status; zonesStatus.style.color = d.c;
    zonesReadout.style.setProperty('--c', d.c);
    zonesReadout.style.borderLeftColor = d.c;
    zonesHead.style.color = d.c;
    zonesWrap.classList.add('dimmed');
    panZones(d.f);
  }
  zoneTabs.forEach(function (t) { t.addEventListener('click', function () { setZone(t.dataset.zone); }); });
  // initial pan once the map knows its size
  function initZones() { panZones(ZONES[curZone].f); }
  if (zonesMap.complete && zonesMap.naturalWidth) initZones();
  else zonesMap.addEventListener('load', initZones);

  /* ---------- 03 — Collapse scrollytelling ---------- */
  var CODES = ['01 // ПОЯВЛЕНИЕ', '02 // КОНТРОЛЬ', '03 // КРИЗИС', '04 // РАЗДЕЛЕНИЕ'];
  var steps = $$('.collapse-step');
  var cViewport = $('#collapseViewport'), cTrack = $('#collapseTrack'), cImg = $('#collapseImg');
  var cCode = $('#collapseCode'), cOf = $('#collapseOf'), cFill = $('#collapseFill');
  var curStep = -1;

  function setStep(i) {
    if (i === curStep) return;
    curStep = i;
    steps.forEach(function (s) { s.classList.toggle('active', +s.dataset.step === i); });
    // pan panorama
    if (cImg.offsetWidth && cViewport.offsetWidth) {
      var maxShift = cImg.offsetWidth - cViewport.offsetWidth;
      var tx = -(i / 3) * maxShift;
      cTrack.style.transform = 'translateX(' + tx + 'px)';
    }
    var crisis = (i === 2);
    cCode.textContent = CODES[i];
    cCode.classList.toggle('crisis', crisis);
    cOf.textContent = 'STAGE ' + (i + 1) + ' / 4';
    cFill.style.width = ((i + 1) / 4 * 100) + '%';
    cFill.classList.toggle('crisis', crisis);
  }

  var stepObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) setStep(+e.target.dataset.step);
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  steps.forEach(function (s) { stepObs.observe(s); });
  function initCollapse() { if (curStep === -1) setStep(0); }
  if (cImg.complete && cImg.naturalWidth) initCollapse();
  else cImg.addEventListener('load', initCollapse);

  /* ---------- Section progress rail ---------- */
  var dots = $$('.brief-progress .p-dot');
  var pCount = $('#progressCount');
  var sections = $$('main [data-section]');
  var finalSec = $('#sec-final');
  function setActiveSection(i) {
    dots.forEach(function (d, k) { d.classList.toggle('active', k === i); });
    pCount.textContent = '0' + (i + 1) + ' / 04';
  }
  var secObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        var i = e.target === finalSec ? 3 : +e.target.dataset.section;
        setActiveSection(i);
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  sections.forEach(function (s) { secObs.observe(s); });
  if (finalSec) secObs.observe(finalSec);

  /* ---------- Earth parallax ---------- */
  var earthImg = $('#earthImg');
  if (earthImg && !reduce) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < window.innerHeight * 1.2) {
          earthImg.style.transform = 'translateY(' + (y * 0.18) + 'px)';
        }
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Recompute pans on resize ---------- */
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      panZones(ZONES[curZone].f);
      if (curStep >= 0) { var k = curStep; curStep = -1; setStep(k); }
    }, 150);
  });
})();
