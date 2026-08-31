// ═════════════════════════════════════════════════════════════════════
//  ЛОКАЦИИ «РАЗДЕЛЁННОГО МИРА» — ЭТОТ ФАЙЛ МОЖНО И НУЖНО ПРАВИТЬ РУКАМИ
// ═════════════════════════════════════════════════════════════════════
//
//  Чтобы добавить локацию, скопируйте любой блок { ... } целиком
//  и поменяйте в нём поля. Обязательных всего пять:
//
//    name    — название на карте
//    type    — вид метки, см. список ниже
//    faction — ключ фракции из factions.js (цвет метки берётся от неё).
//              Если локация ничья — напишите "" и метка будет серой
//    lat     — широта, от -90 до 90 (север положительный)
//    lon     — долгота, от -180 до 180 (восток положительный)
//
//  ── ВИДЫ МЕТОК (type) ──────────────────────────────────────────────
//    capital           столица       появляется первой, самая крупная
//    regional_capital  центр региона
//    city              город
//    base              база          квадратная метка
//    settlement        поселение     появляется только вблизи
//    landmark          объект        ромбовидная метка
//    anomaly           аномалия
//    zone              зона          крупная область
//    frontline         линия фронта  всегда красная и пульсирует
//
//  ── ФОТО ───────────────────────────────────────────────────────────
//  photos: ["loc-vienna-1.webp", "loc-vienna-2.webp"]
//  Файлы положите в data/images/locations/. Показываются лентой в карточке
//  и подгружаются только когда карточку открыли. Поля может не быть.
//  Старая запись photo: "один-файл.webp" тоже работает.
//
//  ── ТЕКСТ КАРТОЧКИ ────────────────────────────────────────────────
//    subtitle — одна строка под названием
//    desc     — короткое описание, 2-4 предложения
//    full     — полное досье, прячется под раскрывающийся заголовок.
//               Абзацы разделяйте двумя переводами строки: \n\n
//
//  ── НЕОБЯЗАТЕЛЬНЫЕ СТРОКИ СПРАВА ──────────────────────────────────
//  Показываются только если заполнены, в этом же порядке:
//    region, population, founded, management, economy, defense,
//    capacity, danger, status, intensity, purpose
//
//    chars    — ключевые фигуры, список: ["Имя", "Имя"]
//    involved — стороны конфликта, список (для фронтов)
//    children — объекты внутри локации, вложенные блоки того же вида
//    float    — true, если объект парит над поверхностью
//
//  ── ОБРАЗЕЦ БЛОКА ─────────────────────────────────────────────────
//  Сейчас в списке только 22 столицы регионов Единой Америки — по одной
//  на регион, без описаний. Скопируйте образец внутрь квадратных скобок,
//  уберите знаки комментария в начале строк и поменяйте поля:
//
//    {
//      name: "Вена",
//      type: "capital",
//      faction: "tenebrion",
//      lat: 48.21,
//      lon: 16.37,
//      region: "Венский экзархат",
//      subtitle: "Одна строка под названием",
//      desc: "Короткое описание, 2-4 предложения.",
//    },
//
//  Проверить, что точка попала на сушу и в свою фракцию:
//    python3 map/tools/whereis.py "Вена,48.21,16.37,tenebrion"
//    python3 map/tools/whereis.py --check-locations
//
// ── Столицы регионов Единой Америки ───────────────────────────────
window.LOCATIONS_DATA = [
  {
    name: "Эдмонтон",
    type: "regional_capital",
    faction: "america",
    lat: 53.55,
    lon: -113.49,
    region: "Арктический",
    subtitle: "Столица региона",
  },
  {
    name: "Ванкувер",
    type: "regional_capital",
    faction: "america",
    lat: 49.28,
    lon: -123.12,
    region: "Каскадский",
    subtitle: "Столица региона",
  },
  {
    name: "Сакраменто",
    type: "regional_capital",
    faction: "america",
    lat: 38.58,
    lon: -121.49,
    region: "Калифорнийский",
    subtitle: "Столица региона",
  },
  {
    name: "Денвер",
    type: "regional_capital",
    faction: "america",
    lat: 39.74,
    lon: -104.99,
    region: "Скалистые горы",
    subtitle: "Столица региона",
  },
  {
    name: "Канзас-Сити",
    type: "regional_capital",
    faction: "america",
    lat: 39.1,
    lon: -94.58,
    region: "Великие равнины",
    subtitle: "Столица региона",
  },
  {
    name: "Чикаго",
    type: "regional_capital",
    faction: "america",
    lat: 41.88,
    lon: -87.63,
    region: "Великие озёра",
    subtitle: "Столица региона",
  },
  {
    name: "Монреаль",
    type: "regional_capital",
    faction: "america",
    lat: 45.5,
    lon: -73.57,
    region: "Св. Лаврентий",
    subtitle: "Столица региона",
  },
  {
    name: "Филадельфия",
    type: "regional_capital",
    faction: "america",
    lat: 39.95,
    lon: -75.17,
    region: "Средняя Атлантика",
    subtitle: "Столица региона",
  },
  {
    name: "Атланта",
    type: "regional_capital",
    faction: "america",
    lat: 33.75,
    lon: -84.39,
    region: "Юго-Восток",
    subtitle: "Столица региона",
  },
  {
    name: "Хьюстон",
    type: "regional_capital",
    faction: "america",
    lat: 29.76,
    lon: -95.37,
    region: "Мексиканский залив",
    subtitle: "Столица региона",
  },
  {
    name: "Мехико",
    type: "regional_capital",
    faction: "america",
    lat: 19.43,
    lon: -99.13,
    region: "Мексиканское ядро",
    subtitle: "Столица региона",
  },
  {
    name: "Панама",
    type: "regional_capital",
    faction: "america",
    lat: 8.98,
    lon: -79.52,
    region: "Центральная Америка",
    subtitle: "Столица региона",
  },
  {
    name: "Гавана",
    type: "regional_capital",
    faction: "america",
    lat: 23.11,
    lon: -82.37,
    region: "Карибский бассейн",
    subtitle: "Столица региона",
  },
  {
    name: "Богота",
    type: "regional_capital",
    faction: "america",
    lat: 4.71,
    lon: -74.07,
    region: "Северные Анды",
    subtitle: "Столица региона",
  },
  {
    name: "Лима",
    type: "regional_capital",
    faction: "america",
    lat: -12.05,
    lon: -77.04,
    region: "Центральные Анды",
    subtitle: "Столица региона",
  },
  {
    name: "Манаус",
    type: "regional_capital",
    faction: "america",
    lat: -3.12,
    lon: -60.02,
    region: "Амазония",
    subtitle: "Столица региона",
  },
  {
    name: "Ресифи",
    type: "regional_capital",
    faction: "america",
    lat: -8.05,
    lon: -34.88,
    region: "Северо-восток Бразилии",
    subtitle: "Столица региона",
  },
  {
    name: "Бразилиа",
    type: "regional_capital",
    faction: "america",
    lat: -15.79,
    lon: -47.88,
    region: "Центральная Бразилия",
    subtitle: "Столица региона",
  },
  {
    name: "Сан-Паулу",
    type: "regional_capital",
    faction: "america",
    lat: -23.55,
    lon: -46.63,
    region: "Юго-восток Бразилии",
    subtitle: "Столица региона",
  },
  {
    name: "Куритиба",
    type: "regional_capital",
    faction: "america",
    lat: -25.43,
    lon: -49.27,
    region: "Южная Бразилия",
    subtitle: "Столица региона",
  },
  {
    name: "Буэнос-Айрес",
    type: "regional_capital",
    faction: "america",
    lat: -34.6,
    lon: -58.38,
    region: "Ла-Плата",
    subtitle: "Столица региона",
  },
  {
    name: "Сантьяго",
    type: "regional_capital",
    faction: "america",
    lat: -33.45,
    lon: -70.67,
    region: "Южные Анды",
    subtitle: "Столица региона",
  },
];
