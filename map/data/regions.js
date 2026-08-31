// ═════════════════════════════════════════════════════════════════════
//  РЕГИОНЫ ЕДИНОЙ АМЕРИКИ — ЭТОТ ФАЙЛ МОЖНО И НУЖНО ПРАВИТЬ РУКАМИ
// ═════════════════════════════════════════════════════════════════════
//
//  22 региона, на которые разделена территория Единой Америки.
//  Очертания собираются скриптом в regions-geo.js, здесь — только текст.
//
//  Ключ (key) трогать нельзя: он связывает регион с его территорией
//  в regions-geo.js. Поле faction — ключ фракции из factions.js, от неё
//  берётся цвет. Всё остальное меняется свободно и необязательно —
//  в карточке показывается только заполненное:
//
//    name        — название региона
//    capital     — региональная столица
//    clat / clon — куда прилетает камера при выборе региона
//                  (по умолчанию — координаты столицы)
//    population  — население, строка как для показа ("214 млн")
//    area        — площадь; посчитана по самой геометрии, менять не нужно
//    areaNote    — сноска под площадью, если оценка условная
//    status      — одна строка под названием ("Промышленное ядро")
//    governor    — наместник; несколько имён через запятую станут
//                  отдельными фигурами-чипами со ссылкой на досье
//    economy     — на чём держится хозяйство
//    defense     — что стоит из военного
//    cities      — крупные города списком: ["Торонто", "Детройт"]
//    desc        — описание, 2-4 предложения
//
//  Порядок регионов в списке = порядок в списке внутри карточки фракции.
//  Правило одно: каждая строка вида поле: "значение", — с запятой в конце,
//  а внутри текста кавычки писать как \" или заменять на «ёлочки».
//
//  Образец полностью заполненного блока:
//
//    {
//      key: "lakes",
//      faction: "america",
//      name: "Великие озёра",
//      capital: "Чикаго",
//      clat: 41.88, clon: -87.63,
//      population: "—",
//      area: "1,85 млн км²",
//      status: "Промышленное ядро",
//      governor: "—",
//      economy: "—",
//      defense: "—",
//      cities: ["Торонто", "Детройт", "Кливленд"],
//      desc: "—",
//    },
//
window.REGIONS_INFO = [
  {
    key:     "arctic",
    faction: "america",
    name:    "Арктический",
    capital: "Эдмонтон",
    clat: 53.55, clon: -113.49,
    area:    "9,65 млн км²",
  },
  {
    key:     "cascadia",
    faction: "america",
    name:    "Каскадский",
    capital: "Ванкувер",
    clat: 49.28, clon: -123.12,
    area:    "1,36 млн км²",
  },
  {
    key:     "california",
    faction: "america",
    name:    "Калифорнийский",
    capital: "Сакраменто",
    clat: 38.58, clon: -121.49,
    area:    "578 тыс. км²",
  },
  {
    key:     "rockies",
    faction: "america",
    name:    "Скалистые горы",
    capital: "Денвер",
    clat: 39.74, clon: -104.99,
    area:    "2,23 млн км²",
  },
  {
    key:     "plains",
    faction: "america",
    name:    "Великие равнины",
    capital: "Канзас-Сити",
    clat: 39.1, clon: -94.58,
    area:    "1,53 млн км²",
  },
  {
    key:     "lakes",
    faction: "america",
    name:    "Великие озёра",
    capital: "Чикаго",
    clat: 41.88, clon: -87.63,
    area:    "1,85 млн км²",
  },
  {
    key:     "laurentia",
    faction: "america",
    name:    "Св. Лаврентий",
    capital: "Монреаль",
    clat: 45.5, clon: -73.57,
    area:    "2,25 млн км²",
  },
  {
    key:     "midatlantic",
    faction: "america",
    name:    "Средняя Атлантика",
    capital: "Филадельфия",
    clat: 39.95, clon: -75.17,
    area:    "480 тыс. км²",
  },
  {
    key:     "southeast",
    faction: "america",
    name:    "Юго-Восток",
    capital: "Атланта",
    clat: 33.75, clon: -84.39,
    area:    "995 тыс. км²",
  },
  {
    key:     "gulf",
    faction: "america",
    name:    "Мексиканский залив",
    capital: "Хьюстон",
    clat: 29.76, clon: -95.37,
    area:    "1,48 млн км²",
  },
  {
    key:     "mexico",
    faction: "america",
    name:    "Мексиканское ядро",
    capital: "Мехико",
    clat: 19.43, clon: -99.13,
    area:    "1,30 млн км²",
  },
  {
    key:     "centralamerica",
    faction: "america",
    name:    "Центральная Америка",
    capital: "Панама",
    clat: 8.98, clon: -79.52,
    area:    "527 тыс. км²",
  },
  {
    key:     "caribbean",
    faction: "america",
    name:    "Карибский бассейн",
    capital: "Гавана",
    clat: 23.11, clon: -82.37,
    area:    "244 тыс. км²",
  },
  {
    key:     "northandes",
    faction: "america",
    name:    "Северные Анды",
    capital: "Богота",
    clat: 4.71, clon: -74.07,
    area:    "2,32 млн км²",
  },
  {
    key:     "centralandes",
    faction: "america",
    name:    "Центральные Анды",
    capital: "Лима",
    clat: -12.05, clon: -77.04,
    area:    "2,40 млн км²",
  },
  {
    key:     "amazonia",
    faction: "america",
    name:    "Амазония",
    capital: "Манаус",
    clat: -3.12, clon: -60.02,
    area:    "4,02 млн км²",
  },
  {
    key:     "nordeste",
    faction: "america",
    name:    "Северо-восток Бразилии",
    capital: "Ресифи",
    clat: -8.05, clon: -34.88,
    area:    "1,56 млн км²",
  },
  {
    key:     "centralbrazil",
    faction: "america",
    name:    "Центральная Бразилия",
    capital: "Бразилиа",
    clat: -15.79, clon: -47.88,
    area:    "1,89 млн км²",
  },
  {
    key:     "sudeste",
    faction: "america",
    name:    "Юго-восток Бразилии",
    capital: "Сан-Паулу",
    clat: -23.55, clon: -46.63,
    area:    "936 тыс. км²",
  },
  {
    key:     "southbrazil",
    faction: "america",
    name:    "Южная Бразилия",
    capital: "Куритиба",
    clat: -25.43, clon: -49.27,
    area:    "580 тыс. км²",
  },
  {
    key:     "laplata",
    faction: "america",
    name:    "Ла-Плата",
    capital: "Буэнос-Айрес",
    clat: -34.6, clon: -58.38,
    area:    "1,91 млн км²",
  },
  {
    key:     "southandes",
    faction: "america",
    name:    "Южные Анды",
    capital: "Сантьяго",
    clat: -33.45, clon: -70.67,
    area:    "2,28 млн км²",
  },
];
