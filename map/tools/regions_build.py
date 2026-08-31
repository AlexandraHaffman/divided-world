#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Разрезает территорию Единой Америки на 22 региона и пишет геометрию
в map/data/regions-geo.js.

Что делает
──────────
Границы регионов не выдумываются с нуля: где это разумно, они идут по
бывшим государственным и внутренним границам (штаты США, провинции
Канады, штаты Мексики, Бразилии и Аргентины, целые бывшие страны в
Центральной Америке, Карибском бассейне и Андах). Таблица соответствия
лежит прямо здесь, ниже: BY_COUNTRY — страна целиком в один регион,
BY_STATE — страна, разрезанная между регионами по своим штатам.

Внешний контур регионов совпадает с контуром самой фракции точка в
точку: территория режется линиями, а не собирается заново, поэтому
щелей и нахлёстов вдоль побережья не бывает. Внутренние линии упрощены
до ~5 км, чтобы файл не распухал.

Запуск
──────
    python3 map/tools/regions_build.py            # собрать и записать
    python3 map/tools/regions_build.py --dry      # только показать отчёт

Нужен shapely (pip install shapely) и справочник Natural Earth admin-1 —
скрипт скачает его сам в map/tools/.cache/ (~40 МБ) и переиспользует.
Свой файл можно подсунуть ключом --ne ПУТЬ.

Чтобы передвинуть штат из региона в регион — поправьте таблицу ниже
и запустите скрипт заново. Отчёт покажет площади и проверит, что
столица каждого региона осталась внутри своих границ.
"""

import argparse, json, math, os, sys, time, urllib.request

HERE     = os.path.dirname(os.path.abspath(__file__))
MAP_DIR  = os.path.dirname(HERE)
DATA_DIR = os.path.join(MAP_DIR, 'data')
CACHE    = os.path.join(HERE, '.cache')
NE_URL   = ('https://raw.githubusercontent.com/nvkelso/natural-earth-vector'
            '/master/geojson/ne_10m_admin_1_states_provinces.geojson')
FACTION  = 'america'
TOL      = 0.05      # упрощение внутренних линий, градусы (~5 км)

# ═══════════════ РЕГИОНЫ ═══════════════
# ключ, название, столица, широта и долгота столицы
REGIONS = [
    ("arctic",         "Арктический",            "Эдмонтон",       53.55, -113.49),
    ("cascadia",       "Каскадский",             "Ванкувер",       49.28, -123.12),
    ("california",     "Калифорнийский",         "Сакраменто",     38.58, -121.49),
    ("rockies",        "Скалистые горы",         "Денвер",         39.74, -104.99),
    ("plains",         "Великие равнины",        "Канзас-Сити",    39.10,  -94.58),
    ("lakes",          "Великие озёра",          "Чикаго",         41.88,  -87.63),
    ("laurentia",      "Св. Лаврентий",          "Монреаль",       45.50,  -73.57),
    ("midatlantic",    "Средняя Атлантика",      "Филадельфия",    39.95,  -75.17),
    ("southeast",      "Юго-Восток",             "Атланта",        33.75,  -84.39),
    ("gulf",           "Мексиканский залив",     "Хьюстон",        29.76,  -95.37),
    ("mexico",         "Мексиканское ядро",      "Мехико",         19.43,  -99.13),
    ("centralamerica", "Центральная Америка",    "Панама",          8.98,  -79.52),
    ("caribbean",      "Карибский бассейн",      "Гавана",         23.11,  -82.37),
    ("northandes",     "Северные Анды",          "Богота",          4.71,  -74.07),
    ("centralandes",   "Центральные Анды",       "Лима",          -12.05,  -77.04),
    ("amazonia",       "Амазония",               "Манаус",         -3.12,  -60.02),
    ("nordeste",       "Северо-восток Бразилии", "Ресифи",         -8.05,  -34.88),
    ("centralbrazil",  "Центральная Бразилия",   "Бразилиа",      -15.79,  -47.88),
    ("sudeste",        "Юго-восток Бразилии",    "Сан-Паулу",     -23.55,  -46.63),
    ("southbrazil",    "Южная Бразилия",         "Куритиба",      -25.43,  -49.27),
    ("laplata",        "Ла-Плата",               "Буэнос-Айрес",  -34.60,  -58.38),
    ("southandes",     "Южные Анды",             "Сантьяго",      -33.45,  -70.67),
]

# ═══════════════ БЫВШИЕ ГРАНИЦЫ → РЕГИОН ═══════════════
# Страна целиком уходит в один регион (ключ — поле admin в Natural Earth).
BY_COUNTRY = {
    "Greenland": "arctic",

    "Guatemala": "centralamerica", "Belize": "centralamerica",
    "El Salvador": "centralamerica", "Honduras": "centralamerica",
    "Nicaragua": "centralamerica", "Costa Rica": "centralamerica",
    "Panama": "centralamerica",

    "Cuba": "caribbean", "Haiti": "caribbean", "Dominican Republic": "caribbean",
    "Jamaica": "caribbean", "The Bahamas": "caribbean", "Puerto Rico": "caribbean",
    "Turks and Caicos Islands": "caribbean", "Cayman Islands": "caribbean",
    "United States Virgin Islands": "caribbean", "British Virgin Islands": "caribbean",
    "Anguilla": "caribbean", "Antigua and Barbuda": "caribbean",
    "Saint Kitts and Nevis": "caribbean", "Montserrat": "caribbean",
    "Dominica": "caribbean", "Saint Lucia": "caribbean",
    "Saint Vincent and the Grenadines": "caribbean", "Barbados": "caribbean",
    "Grenada": "caribbean", "Trinidad and Tobago": "caribbean",
    "Aruba": "caribbean", "Curaçao": "caribbean", "Sint Maarten": "caribbean",
    "Saint Martin": "caribbean", "Saint Barthelemy": "caribbean",
    "Caribbean Netherlands": "caribbean", "US Naval Base Guantanamo Bay": "caribbean",

    "Bermuda": "midatlantic",
    "Saint Pierre and Miquelon": "laurentia",

    "Colombia": "northandes", "Venezuela": "northandes", "Ecuador": "northandes",
    "Guyana": "amazonia", "Suriname": "amazonia",
    "Peru": "centralandes", "Bolivia": "centralandes",
    "Chile": "southandes", "Falkland Islands": "southandes",
    "South Georgia and the Islands": "southandes",
    "Uruguay": "laplata", "Paraguay": "laplata",
}

# Страна разрезана между регионами по своим бывшим штатам и провинциям.
BY_STATE = {
"Canada": {
    "Yukon": "arctic", "Northwest Territories": "arctic", "Nunavut": "arctic",
    "Alberta": "arctic", "Saskatchewan": "arctic", "Manitoba": "arctic",
    "British Columbia": "cascadia",
    "Ontario": "lakes",
    "Québec": "laurentia", "New Brunswick": "laurentia", "Nova Scotia": "laurentia",
    "Prince Edward Island": "laurentia", "Newfoundland and Labrador": "laurentia",
},
"United States of America": {
    "Alaska": "arctic",
    "Washington": "cascadia", "Oregon": "cascadia",
    "California": "california", "Hawaii": "california",
    "Idaho": "rockies", "Montana": "rockies", "Wyoming": "rockies",
    "Nevada": "rockies", "Utah": "rockies", "Colorado": "rockies",
    "Arizona": "rockies", "New Mexico": "rockies",
    "North Dakota": "plains", "South Dakota": "plains", "Nebraska": "plains",
    "Kansas": "plains", "Minnesota": "plains", "Iowa": "plains",
    "Missouri": "plains", "Oklahoma": "plains",
    "Wisconsin": "lakes", "Michigan": "lakes", "Illinois": "lakes",
    "Indiana": "lakes", "Ohio": "lakes",
    "Maine": "laurentia", "New Hampshire": "laurentia", "Vermont": "laurentia",
    "Massachusetts": "laurentia", "Rhode Island": "laurentia",
    "Connecticut": "laurentia",
    "New York": "midatlantic", "New Jersey": "midatlantic",
    "Pennsylvania": "midatlantic", "Delaware": "midatlantic",
    "Maryland": "midatlantic", "District of Columbia": "midatlantic",
    "Virginia": "midatlantic", "West Virginia": "midatlantic",
    "Kentucky": "southeast", "Tennessee": "southeast",
    "North Carolina": "southeast", "South Carolina": "southeast",
    "Georgia": "southeast", "Florida": "southeast",
    "Alabama": "southeast", "Mississippi": "southeast",
    "Texas": "gulf", "Louisiana": "gulf", "Arkansas": "gulf",
},
"Mexico": {
    "Baja California": "california", "Baja California Sur": "california",
    "Coahuila": "gulf", "Nuevo León": "gulf", "Tamaulipas": "gulf",
    "Veracruz": "gulf", "Tabasco": "gulf", "Campeche": "gulf",
    "Yucatán": "gulf", "Quintana Roo": "gulf",
    "Sonora": "mexico", "Chihuahua": "mexico", "Sinaloa": "mexico",
    "Durango": "mexico", "Zacatecas": "mexico", "San Luis Potosí": "mexico",
    "Nayarit": "mexico", "Jalisco": "mexico", "Aguascalientes": "mexico",
    "Guanajuato": "mexico", "Querétaro": "mexico", "Hidalgo": "mexico",
    "México": "mexico", "Distrito Federal": "mexico", "Morelos": "mexico",
    "Tlaxcala": "mexico", "Puebla": "mexico", "Michoacán": "mexico",
    "Colima": "mexico", "Guerrero": "mexico", "Oaxaca": "mexico",
    "Chiapas": "mexico",
},
"Brazil": {
    "Amazonas": "amazonia", "Pará": "amazonia", "Roraima": "amazonia",
    "Amapá": "amazonia", "Acre": "amazonia", "Rondônia": "amazonia",
    "Maranhão": "nordeste", "Piauí": "nordeste", "Ceará": "nordeste",
    "Rio Grande do Norte": "nordeste", "Paraíba": "nordeste",
    "Pernambuco": "nordeste", "Alagoas": "nordeste", "Sergipe": "nordeste",
    "Bahia": "nordeste",
    "Tocantins": "centralbrazil", "Goiás": "centralbrazil",
    "Distrito Federal": "centralbrazil", "Mato Grosso": "centralbrazil",
    "Mato Grosso do Sul": "centralbrazil",
    "Minas Gerais": "sudeste", "Espírito Santo": "sudeste",
    "Rio de Janeiro": "sudeste", "São Paulo": "sudeste",
    "Paraná": "southbrazil", "Santa Catarina": "southbrazil",
    "Rio Grande do Sul": "southbrazil",
},
"Argentina": {
    "Jujuy": "southandes", "Salta": "southandes", "Tucumán": "southandes",
    "Catamarca": "southandes", "La Rioja": "southandes", "San Juan": "southandes",
    "Mendoza": "southandes", "Neuquén": "southandes", "Río Negro": "southandes",
    "Chubut": "southandes", "Santa Cruz": "southandes",
    "Tierra del Fuego": "southandes",
    "Buenos Aires": "laplata", "Ciudad de Buenos Aires": "laplata",
    "Córdoba": "laplata", "Santa Fe": "laplata", "Entre Ríos": "laplata",
    "Corrientes": "laplata", "Misiones": "laplata", "Chaco": "laplata",
    "Formosa": "laplata", "Santiago del Estero": "laplata",
    "San Luis": "laplata", "La Pampa": "laplata",
},
# Заморские владения: Гвиана уходит в Амазонию, Антильские острова —
# в Карибский бассейн.
"France": {
    "Guyane française": "amazonia", "Martinique": "caribbean",
    "Guadeloupe": "caribbean",
},
"Netherlands": {"St. Eustatius": "caribbean", "Saba": "caribbean"},
}

KEYS = [k for k, *_ in REGIONS]


# ═══════════════ ЧТЕНИЕ ИСХОДНИКОВ ═══════════════
def read_js_object(path, var):
    src = open(path, encoding='utf-8').read()
    i = src.index('{', src.index(var))
    # в файле может лежать несколько присваиваний подряд, поэтому берём
    # ровно один объект, а не всё до последней скобки
    return json.JSONDecoder().raw_decode(src, i)[0]


def load_faction(key):
    """Территория фракции из factions-geo.js -> shapely (долгота, широта)."""
    from shapely.geometry import Polygon
    from shapely.ops import unary_union
    from shapely import make_valid
    geo = read_js_object(os.path.join(DATA_DIR, 'factions-geo.js'), 'window.FACTIONS_GEO')
    parts = []
    for poly in geo[key]:
        rings = [[(lo, la) for la, lo in ring] for ring in poly]
        p = Polygon(rings[0], rings[1:])
        parts.append(p if p.is_valid else make_valid(p))
    return unary_union(parts)


def fetch_ne(path):
    if os.path.exists(path):
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    print(f"скачиваю справочник Natural Earth admin-1 (~40 МБ)\n  {NE_URL}")
    tmp = path + '.part'
    with urllib.request.urlopen(NE_URL, timeout=600) as r, open(tmp, 'wb') as out:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            out.write(chunk)
    os.replace(tmp, path)
    return path


def build_templates(ne_path):
    """Бывшие единицы, собранные в 22 куска-образца."""
    from shapely.geometry import shape
    from shapely.ops import unary_union
    from shapely import make_valid
    feats = json.load(open(ne_path, encoding='utf-8'))['features']
    groups = {k: [] for k in KEYS}
    seen_states = {a: set() for a in BY_STATE}
    for f in feats:
        p = f['properties']
        adm, nm = p.get('admin'), p.get('name')
        if adm in BY_STATE:
            key = BY_STATE[adm].get(nm)
            if key is None:
                continue
            seen_states[adm].add(nm)
        elif adm in BY_COUNTRY:
            key = BY_COUNTRY[adm]
        else:
            continue
        g = shape(f['geometry'])
        groups[key].append(g if g.is_valid else make_valid(g))
    # предупреждаем о штатах, которых в справочнике не нашлось: опечатка
    # в таблице выше молча выкинула бы кусок территории в «остаток»
    for adm, table in BY_STATE.items():
        lost = sorted(set(table) - seen_states[adm])
        if lost:
            print(f"  ВНИМАНИЕ: в справочнике нет таких единиц {adm}: {', '.join(lost)}")
    return {k: unary_union(v) for k, v in groups.items() if v}


# ═══════════════ РАЗРЕЗАНИЕ ═══════════════
def cut_regions(area, templates):
    """Территория -> {ключ региона: полигон} + внутренние линии границ."""
    from shapely.geometry import LineString, Point
    from shapely.ops import unary_union, linemerge, polygonize
    from shapely.strtree import STRtree

    # 1. общие границы соседних образцов — это и есть будущие межрегиональные
    #    линии, унаследованные от бывших границ
    lines = []
    for i in range(len(KEYS)):
        for j in range(i + 1, len(KEYS)):
            a, b = templates.get(KEYS[i]), templates.get(KEYS[j])
            if a is None or b is None or not a.envelope.intersects(b.envelope):
                continue
            inter = a.boundary.intersection(b.boundary)
            if inter.is_empty:
                continue
            for g in getattr(inter, 'geoms', [inter]):
                if g.geom_type == 'LineString' and g.length > 0:
                    lines.append(g)

    arcs = linemerge(unary_union(lines))
    arcs = [a.simplify(TOL, preserve_topology=False)
            for a in getattr(arcs, 'geoms', [arcs])]
    arcs = [a for a in arcs if len(a.coords) >= 2 and a.length > 0]

    # 2. свободные концы (те, что упираются в берег) продлеваем за берег —
    #    только чтобы линия дорезала территорию до самого края, не больше.
    #    Направление продления берётся из последнего отрезка дуги, а у
    #    стыков трёх и более регионов оно иногда указывает не в сторону
    #    ближайшего берега, а вглубь чужой территории (эти пары дуг сами
    #    сходятся не бит-в-бит, потому и остаются «свободными» вместо
    #    обычного узла). Итоговые полигоны регионов это не портит —
    #    каждая грань после разрезания приписывается региону заново по
    #    содержащему её образцу, — но саму линию продления в отрисовку
    #    брать нельзя, ею и рисуются лишние «усы» через чужую территорию.
    #    Поэтому линии для отрисовки берутся отдельно, в конце функции,
    #    из уже готовых, проверенных полигонов регионов.
    #    линия, не дошедшая до края территории, ничего не разрежет
    def node(pt):
        return (round(pt[0], 9), round(pt[1], 9))
    deg = {}
    for a in arcs:
        for pt in (a.coords[0], a.coords[-1]):
            deg[node(pt)] = deg.get(node(pt), 0) + 1

    def extended(a):
        cs = list(a.coords)
        for tail in (0, 1):
            pt = cs[-1] if tail else cs[0]
            if deg[node(pt)] != 1:
                continue
            nb = cs[-2] if tail else cs[1]
            dx, dy = pt[0] - nb[0], pt[1] - nb[1]
            n = math.hypot(dx, dy)
            if n == 0:
                continue
            dx, dy = dx / n, dy / n
            total = 0.0
            while total < 4.0:                     # ищем, где линия выйдет с суши
                total += 0.25
                if not area.covers(Point(pt[0] + dx * total, pt[1] + dy * total)):
                    break
            total += 0.15
            newpt = (pt[0] + dx * total, pt[1] + dy * total)
            cs.append(newpt) if tail else cs.insert(0, newpt)
        return LineString(cs)

    arcs = [extended(a) for a in arcs]

    # 3. режем территорию линиями и раскладываем куски по регионам
    faces = list(polygonize(unary_union([area.boundary] + arcs)))
    tmpl = [templates[k] for k in KEYS if k in templates]
    tkeys = [k for k in KEYS if k in templates]
    tree = STRtree(tmpl)
    bucket = {k: [] for k in KEYS}
    for f in faces:
        rp = f.representative_point()
        if not area.contains(rp):
            continue                                # обрезки за пределами берега
        hit = [i for i in tree.query(rp) if tmpl[i].contains(rp)]
        idx = hit[0] if hit else min(range(len(tmpl)),
                                     key=lambda i: tmpl[i].distance(rp))
        bucket[tkeys[idx]].append(f)

    regions = {k: unary_union(v) for k, v in bucket.items() if v}
    return regions, region_borders(regions)


def region_borders(regions):
    """Линии для отрисовки: там, где два готовых полигона регионов реально
    соприкасаются. В отличие от продлённых дуг разрезания, тут нечему
    продлеваться и некуда убегать — общий край двух уже посчитанных
    полигонов сам обрывается именно там, где кончается на самом деле:
    на берегу или в стыке с третьим регионом."""
    from shapely.ops import unary_union, linemerge
    keys = list(regions)
    pieces = []
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            a, b = regions[keys[i]], regions[keys[j]]
            if not a.envelope.intersects(b.envelope):
                continue
            inter = a.boundary.intersection(b.boundary)
            if inter.is_empty:
                continue
            for g in getattr(inter, 'geoms', [inter]):
                if g.geom_type == 'LineString' and g.length > 0:
                    pieces.append(g)
    merged = linemerge(unary_union(pieces))
    merged = [g.simplify(TOL, preserve_topology=False)
              for g in getattr(merged, 'geoms', [merged])]
    return [g for g in merged if g.length > 0 and len(g.coords) >= 2]


# ═══════════════ ОТЧЁТ И ЗАПИСЬ ═══════════════
R_EARTH = 6371.0088


def area_km2(geom):
    def ring(cs):
        s = 0.0
        for i in range(len(cs) - 1):
            lo1, la1 = math.radians(cs[i][0]), math.radians(cs[i][1])
            lo2, la2 = math.radians(cs[i + 1][0]), math.radians(cs[i + 1][1])
            s += (lo2 - lo1) * (2 + math.sin(la1) + math.sin(la2))
        return abs(s * R_EARTH * R_EARTH / 2)
    total = 0.0
    for poly in getattr(geom, 'geoms', [geom]):
        total += ring(list(poly.exterior.coords))
        for hole in poly.interiors:
            total -= ring(list(hole.coords))
    return total


def rings_of(geom, nd=3):
    """shapely -> [[кольцо, дыра...], ...], кольцо = [[широта, долгота], ...]"""
    out = []
    for poly in getattr(geom, 'geoms', [geom]):
        if poly.geom_type != 'Polygon' or poly.is_empty:
            continue
        polyout = []
        for src in [poly.exterior] + list(poly.interiors):
            ring, prev = [], None
            for lo, la in src.coords:
                pt = [round(la, nd), round(lo, nd)]
                if pt != prev:
                    ring.append(pt)
                    prev = pt
            if len(ring) >= 4:
                polyout.append(ring)
        if polyout:
            out.append(polyout)
    return out


def lines_of(geom, nd=3):
    out = []
    src = geom if isinstance(geom, list) else getattr(geom, 'geoms', [geom])
    for ln in src:
        if ln.geom_type != 'LineString' or ln.is_empty:
            continue
        pts, prev = [], None
        for lo, la in ln.coords:
            pt = [round(la, nd), round(lo, nd)]
            if pt != prev:
                pts.append(pt)
                prev = pt
        if len(pts) >= 2:
            out.append(pts)
    return out


def dumps_compact(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))


def main():
    ap = argparse.ArgumentParser(description='Разрезать Единую Америку на регионы')
    ap.add_argument('--ne', default=os.path.join(CACHE, 'ne_10m_admin_1_states_provinces.geojson'),
                    help='файл Natural Earth admin-1 (скачается сам, если нет)')
    ap.add_argument('--dry', action='store_true', help='ничего не записывать')
    args = ap.parse_args()

    try:
        import shapely  # noqa: F401
    except ImportError:
        sys.exit('нужен shapely:  pip install shapely')

    t0 = time.time()
    area = load_faction(FACTION)
    print(f"территория «{FACTION}»: {area_km2(area) / 1e6:.3f} млн км²")

    templates = build_templates(fetch_ne(args.ne))
    missing = [k for k in KEYS if k not in templates]
    if missing:
        sys.exit(f"не собрались образцы регионов: {', '.join(missing)}")

    regions, border_lines = cut_regions(area, templates)
    print(f"разрезано за {time.time() - t0:.1f} с\n")

    # ── проверки ──
    print(f"{'регион':26s}{'площадь':>12s}   столица")
    total = 0.0
    ok = True
    from shapely.geometry import Point
    for key, name, cap, la, lo in REGIONS:
        g = regions.get(key)
        if g is None:
            print(f"{name:26s}   ПУСТО"); ok = False; continue
        a = area_km2(g); total += a
        inside = g.contains(Point(lo, la))
        ok = ok and inside
        print(f"{name:26s}{a / 1e6:9.3f} млн   {cap}{'' if inside else '  ← НЕ ВНУТРИ РЕГИОНА!'}")
    print(f"{'ИТОГО':26s}{total / 1e6:9.3f} млн   ({len(regions)} регионов)")

    gap = area_km2(area) - total
    print(f"расхождение с территорией фракции: {gap:+.1f} км²")
    if abs(gap) > 1000:
        print("  ВНИМАНИЕ: куски территории потерялись или посчитались дважды")
        ok = False
    for i in range(len(KEYS)):
        for j in range(i + 1, len(KEYS)):
            a, b = regions.get(KEYS[i]), regions.get(KEYS[j])
            if a is not None and b is not None and a.intersection(b).area > 1e-9:
                print(f"  ВНИМАНИЕ: {KEYS[i]} и {KEYS[j]} налезают друг на друга")
                ok = False
    if not ok:
        sys.exit("проверки не прошли, файл не записан")

    if args.dry:
        print("\n--dry: файл не записан")
        return

    geo = {k: rings_of(regions[k]) for k in KEYS}
    borders = lines_of(border_lines)
    pts = sum(len(r) for v in geo.values() for poly in v for r in poly)
    out = os.path.join(DATA_DIR, 'regions-geo.js')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(
            "// СГЕНЕРИРОВАННЫЙ ФАЙЛ — РУКАМИ НЕ ПРАВИТЬ.\n"
            "// Собран скриптом map/tools/regions_build.py: территория Единой\n"
            "// Америки, разрезанная по бывшим границам штатов, провинций и стран.\n"
            "// Названия, столицы и досье регионов — в соседнем regions.js.\n"
            "// REGIONS_GEO:     ключ региона -> [ [внешнее кольцо, дыра...], ... ],\n"
            "//                  кольцо = [[широта, долгота], ...]\n"
            "// REGIONS_BORDERS: ключ фракции -> только внутренние линии между\n"
            "//                  регионами, чтобы карта не обводила побережье\n"
            "//                  второй раз поверх границы самой фракции.\n"
            f"window.REGIONS_GEO = {dumps_compact(geo)};\n"
            f"window.REGIONS_BORDERS = {dumps_compact({FACTION: borders})};\n")
    print(f"\nзаписано {out}")
    print(f"  колец: {sum(len(poly) for v in geo.values() for poly in v)}, "
          f"точек: {pts}, линий границ: {len(borders)}, "
          f"размер: {os.path.getsize(out) / 1024:.0f} КБ")


if __name__ == '__main__':
    main()
