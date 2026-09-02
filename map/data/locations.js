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
//  Сейчас в списке только столицы регионов: 22 у Единой Америки,
//  17 экзархатов Тенебриона и 8 провинций Forge — по одной на регион,
//  без описаний.
//  Скопируйте образец внутрь квадратных скобок, уберите знаки
//  комментария в начале строк и поменяйте поля:
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
    region: "Арктический регион",
    subtitle: "Столица региона",
  },
  {
    name: "Ванкувер",
    type: "regional_capital",
    faction: "america",
    lat: 49.28,
    lon: -123.12,
    region: "Каскадский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Сакраменто",
    type: "regional_capital",
    faction: "america",
    lat: 38.58,
    lon: -121.49,
    region: "Калифорнийский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Денвер",
    type: "regional_capital",
    faction: "america",
    lat: 39.74,
    lon: -104.99,
    region: "Горный регион",
    subtitle: "Столица региона",
  },
  {
    name: "Канзас-Сити",
    type: "regional_capital",
    faction: "america",
    lat: 39.1,
    lon: -94.58,
    region: "Равнинный регион",
    subtitle: "Столица региона",
  },
  {
    name: "Чикаго",
    type: "regional_capital",
    faction: "america",
    lat: 41.88,
    lon: -87.63,
    region: "Великоозёрный регион",
    subtitle: "Столица региона",
  },
  {
    name: "Монреаль",
    type: "regional_capital",
    faction: "america",
    lat: 45.5,
    lon: -73.57,
    region: "Северо-Атлантический регион",
    subtitle: "Столица региона",
  },
  {
    name: "Филадельфия",
    type: "regional_capital",
    faction: "america",
    lat: 39.95,
    lon: -75.17,
    region: "Средне-Атлантический регион",
    subtitle: "Столица региона",
  },
  {
    name: "Атланта",
    type: "regional_capital",
    faction: "america",
    lat: 33.75,
    lon: -84.39,
    region: "Юго-Восточный регион",
    subtitle: "Столица региона",
  },
  {
    name: "Хьюстон",
    type: "regional_capital",
    faction: "america",
    lat: 29.76,
    lon: -95.37,
    region: "Регион Мексиканского залива",
    subtitle: "Столица региона",
  },
  {
    name: "Мехико",
    type: "regional_capital",
    faction: "america",
    lat: 19.43,
    lon: -99.13,
    region: "Мексиканский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Панама",
    type: "regional_capital",
    faction: "america",
    lat: 8.98,
    lon: -79.52,
    region: "Центральноамериканский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Гавана",
    type: "regional_capital",
    faction: "america",
    lat: 23.11,
    lon: -82.37,
    region: "Карибский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Богота",
    type: "regional_capital",
    faction: "america",
    lat: 4.71,
    lon: -74.07,
    region: "Северо-Андский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Лима",
    type: "regional_capital",
    faction: "america",
    lat: -12.05,
    lon: -77.04,
    region: "Центрально-Андский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Манаус",
    type: "regional_capital",
    faction: "america",
    lat: -3.12,
    lon: -60.02,
    region: "Амазонский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Ресифи",
    type: "regional_capital",
    faction: "america",
    lat: -8.05,
    lon: -34.88,
    region: "Северо-Восточный Бразильский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Бразилиа",
    type: "regional_capital",
    faction: "america",
    lat: -15.79,
    lon: -47.88,
    region: "Центрально-Бразильский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Сан-Паулу",
    type: "regional_capital",
    faction: "america",
    lat: -23.55,
    lon: -46.63,
    region: "Юго-Восточный Бразильский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Куритиба",
    type: "regional_capital",
    faction: "america",
    lat: -25.43,
    lon: -49.27,
    region: "Южно-Бразильский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Буэнос-Айрес",
    type: "regional_capital",
    faction: "america",
    lat: -34.6,
    lon: -58.38,
    region: "Ла-Платский регион",
    subtitle: "Столица региона",
  },
  {
    name: "Сантьяго",
    type: "regional_capital",
    faction: "america",
    lat: -33.45,
    lon: -70.67,
    region: "Южно-Андский регион",
    subtitle: "Столица региона",
  },
// ── Столицы экзархатов Тенебриона ─────────────────────────────────
  {
    name: "Вена",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 48.21,
    lon: 16.37,
    region: "Венский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Прага",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 50.09,
    lon: 14.42,
    region: "Пражский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Мюнхен",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 48.14,
    lon: 11.58,
    region: "Мюнхенский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Берлин",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 52.52,
    lon: 13.4,
    region: "Берлинский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Франкфурт-на-Майне",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 50.11,
    lon: 8.68,
    region: "Франкфуртский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Брюссель",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 50.85,
    lon: 4.35,
    region: "Брюссельский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Париж",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 48.86,
    lon: 2.35,
    region: "Парижский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Лион",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 45.76,
    lon: 4.84,
    region: "Лионский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Мадрид",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 40.42,
    lon: -3.7,
    region: "Мадридский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Кадис",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 36.53,
    lon: -6.29,
    region: "Кадисский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Милан",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 45.46,
    lon: 9.19,
    region: "Миланский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Рим",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 41.9,
    lon: 12.5,
    region: "Римский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Варшава",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 52.23,
    lon: 21.01,
    region: "Варшавский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Будапешт",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 47.5,
    lon: 19.04,
    region: "Будапештский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Бухарест",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 44.43,
    lon: 26.1,
    region: "Бухарестский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Афины",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 37.98,
    lon: 23.73,
    region: "Афинский экзархат",
    subtitle: "Столица экзархата",
  },
  {
    name: "Копенгаген",
    type: "regional_capital",
    faction: "tenebrion",
    lat: 55.68,
    lon: 12.57,
    region: "Скандинавский экзархат",
    subtitle: "Столица экзархата",
  },
// ── Столицы провинций Forge ───────────────────────────────────────
  {
    name: "Нанкин",
    type: "regional_capital",
    faction: "forge",
    lat: 32.06,
    lon: 118.8,
    region: "Провинция Нижней Янцзы",
    subtitle: "Столица провинции",
  },
  {
    name: "Фучжоу",
    type: "regional_capital",
    faction: "forge",
    lat: 26.07,
    lon: 119.3,
    region: "Юго-Восточная провинция",
    subtitle: "Столица провинции",
  },
  {
    name: "Гуанчжоу",
    type: "regional_capital",
    faction: "forge",
    lat: 23.13,
    lon: 113.26,
    region: "Южная провинция",
    subtitle: "Столица провинции",
  },
  {
    name: "Ухань",
    type: "regional_capital",
    faction: "forge",
    lat: 30.59,
    lon: 114.31,
    region: "Центральная провинция",
    subtitle: "Столица провинции",
  },
  {
    name: "Сиань",
    type: "regional_capital",
    faction: "forge",
    lat: 34.34,
    lon: 108.94,
    region: "Западная провинция",
    subtitle: "Столица провинции",
  },
  {
    name: "Тяньцзинь",
    type: "regional_capital",
    faction: "forge",
    lat: 39.13,
    lon: 117.2,
    region: "Бохайская провинция",
    subtitle: "Столица провинции",
  },
  {
    name: "Шэньян",
    type: "regional_capital",
    faction: "forge",
    lat: 41.8,
    lon: 123.43,
    region: "Северо-Восточная провинция",
    subtitle: "Столица провинции",
  },
  {
    name: "Тайбэй",
    type: "regional_capital",
    faction: "forge",
    lat: 25.03,
    lon: 121.57,
    region: "Тайваньская провинция",
    subtitle: "Столица провинции",
  },
];
