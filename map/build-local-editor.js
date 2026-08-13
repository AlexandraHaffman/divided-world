// Собирает editor-local.html — самодостаточную версию конструктора локаций
// для работы с диска, без сервера.
//
// Отличия от editor.html:
//   • данные (суша, фракции, локации) вшиты прямо в файл, а не тянутся
//     из соседней папки;
//   • нет кода доступа: на file:// он всё равно не работает, да и незачем;
//   • ссылка «← КАРТА» убрана — с диска карты рядом нет.
//
// Запуск из папки map:   node build-local-editor.js
// Пересобирать нужно после правок editor.html или данных.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

let html = read('editor.html');

const DATA = ['data/land.js', 'data/factions.js', 'data/factions-geo.js', 'data/locations.js'];
for (const f of DATA){
  const tag = '<script src="' + f + '"></script>';
  if (!html.includes(tag)) throw new Error('не найден тег для ' + f);
  // </script> внутри данных сломал бы разметку; в наших файлах его нет,
  // но экранируем на всякий случай
  const body = read(f).replace(/<\/script>/gi, '<\\/script>');
  html = html.replace(tag, '<script>\n' + body + '\n</script>');
}

// ворота доступа: вырезаем целиком, вместо них — прямой запуск
const gateStart = html.indexOf('// ═══════════════ ВОРОТА ДОСТУПА ═══════════════');
const gateEnd = html.indexOf('})();\n\n})();');
if (gateStart < 0 || gateEnd < 0) throw new Error('не найден блок ворот доступа');
html = html.slice(0, gateStart) + 'start();\n\n})();' + html.slice(gateEnd + '})();\n\n})();'.length);

// разметка ворот больше не нужна
html = html.replace(/<div id="gate">[\s\S]*?<\/div>\n<\/div>\n/, '');

// ссылка на карту с диска никуда не ведёт
html = html.replace('<a class="back" href="index.html">← КАРТА</a>\n  ', '');
html = html.replace('КОНСТРУКТОР <span>ЛОКАЦИЙ</span>',
                    'КОНСТРУКТОР <span>ЛОКАЦИЙ</span>');
html = html.replace('<title>Конструктор локаций — Разделённый мир</title>',
                    '<title>Конструктор локаций — Разделённый мир (локально)</title>');

// черновик локальной версии храним отдельно от браузерной
html = html.replace("const STORE = 'dw_loc_draft';", "const STORE = 'dw_loc_draft_local';");

const out = path.join(dir, 'editor-local.html');
fs.writeFileSync(out, html);
console.log('собран editor-local.html —', (fs.statSync(out).size / 1024).toFixed(0), 'КБ');
