#!/usr/bin/env python3
"""
Тихая гавань: семь Домов, зоны влияния и морские пути.

Гавань — не государство со сплошной территорией, а сеть защищённых
анклавов. Поэтому на карте у неё не полигоны стран, а:
  * зона влияния вокруг каждого Дома — эллипс, вытянутый по берегу
    (Большая Ялта тянется вдоль южного берега, Куршская коса — на
    северо-восток, Андаманы — с севера на юг);
  * морские пути между Домами — магистраль от Лофотен до Хайнаня
    и три ответвления: в Балтику, в Чёрное море и в Персидский залив.

Пути проложены по воде вручную, и скрипт это проверяет: каждая точка
маршрута сверяется с очертаниями суши из land.js, и если хоть одна
оказалась на берегу, файл не записывается. Опорные точки Домов из
проверки исключены: Дом — это порт, он и должен стоять на берегу.

Два места на пути уже той точности, с какой обведена суша: Суэцкий канал
и Дарданеллы. Точки по обе стороны от них лежат в воде, а между ними
линия идёт по прямой — то есть ровно там, где канал и пролив и есть.

    python3 map/tools/quiet_harbor.py --dry    # показать и не записывать
    python3 map/tools/quiet_harbor.py          # записать
"""
import json, math, os, re, sys, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, '..', 'data'))
R_EARTH = 6371.0088
KEY = 'quiet_harbor'

# ═══════════════ СЕМЬ ДОМОВ ═══════════════
# a, b — полуоси зоны влияния в километрах, az — азимут длинной оси
# (0° — на север, 90° — на восток): им зона разворачивается вдоль берега.
# Последние две колонки — центр зоны, если он не совпадает с опорной
# точкой. У Дома лазури так и есть: сама Пальма стоит на урезе воды, и
# зона, построенная вокруг неё, почти целиком ушла бы в залив вместо
# побережья, внутри которого этот анклав и признан.
HOUSES = [
  ("lazur",    "Дом лазури",    25.130,  55.117, 50, 31,  55, 25.19, 55.25),
  ("zhemchug", "Дом жемчуга",   18.252, 109.512, 55, 25,  80),
  ("kiparis",  "Дом кипарисов", 44.491,  34.153, 45, 18,  65),
  ("yantar",   "Дом янтаря",    54.960,  20.475, 40, 20,  45),
  ("musson",   "Дом муссонов",  11.623,  92.726, 70, 30,   5),
  ("korall",   "Дом кораллов",   5.112,  73.078, 33, 33,   0),
  ("fjord",    "Дом фьордов",   68.234,  14.568, 45, 20,  55),
]

# ═══════════════ МОРСКИЕ ПУТИ ═══════════════
# Магистраль идёт от Свольвера вокруг Европы, через Суэц и Малаккский
# пролив до Саньи; Дома кораллов и муссонов стоят прямо на ней.
TRUNK = [
  (68.234, 14.568), (67.5, 12.5), (66.0, 10.0), (64.0, 7.0), (62.0, 4.5),
  (60.0, 3.0), (58.0, 2.5), (56.5, 2.0), (55.0, 1.8), (53.5, 1.8),
  (52.0, 2.2), (51.3, 1.6), (50.6, 0.0), (50.0, -2.0), (49.6, -5.0),
  (48.6, -6.5), (46.5, -5.8), (44.5, -5.0), (43.5, -9.5), (41.0, -9.8),
  (38.5, -9.9), (37.0, -9.4), (36.3, -7.5), (36.0, -6.3), (35.9, -5.6),
  (36.1, -3.0), (36.8, 0.5), (37.4, 5.0), (37.5, 10.4), (37.0, 11.4),
  (36.0, 13.0), (34.8, 18.0), (34.4, 22.5), (33.6, 27.0), (32.2, 30.5),
  (31.4, 31.9), (31.4, 32.2), (29.4, 32.6), (27.5, 34.3),
  (24.0, 36.3), (20.0, 38.7), (17.0, 40.6), (14.5, 42.4), (12.6, 43.5),
  (12.5, 45.5), (12.2, 48.5), (12.0, 52.0), (10.0, 55.5), (8.0, 60.0),
  (6.5, 66.0), (5.3, 70.0), (5.112, 73.078), (5.5, 78.0), (6.5, 84.0),
  (8.5, 89.0), (11.623, 92.726), (9.5, 94.5), (7.0, 96.3), (5.0, 97.8),
  (3.0, 100.0), (1.8, 102.6), (1.3, 104.3), (3.0, 106.0), (6.0, 107.5),
  (9.5, 108.8), (14.0, 109.8), (18.252, 109.512),
]
SPURS = [
  # в Балтику, к Дому янтаря — Скагеррак, Каттегат, датские проливы
  [(56.5, 2.0), (57.3, 6.0), (57.8, 9.0), (57.5, 10.7), (56.5, 11.4),
   (55.9, 11.0), (54.9, 12.4), (54.9, 14.5), (55.2, 17.0), (55.3, 19.5),
   (54.960, 20.475)],
  # в Чёрное море, к Дому кипарисов — Эгейское, Дарданеллы, Босфор
  [(34.4, 22.5), (35.5, 24.6), (37.0, 25.3), (38.6, 25.6), (40.2, 26.2),
   (40.45, 26.9), (40.6, 27.6), (40.9, 28.8), (41.15, 29.15),
   (41.8, 30.5), (43.0, 32.5), (44.0, 33.8), (44.491, 34.153)],
  # в Персидский залив, к Дому лазури — вдоль Омана и через Ормуз
  [(12.0, 52.0), (15.5, 55.0), (19.0, 58.0), (22.0, 59.8), (24.8, 58.2),
   (26.3, 56.6), (25.9, 55.8), (25.3, 55.25), (25.130, 55.117)],
]


def ellipse(la, lo, a_km, b_km, az_deg, n=64):
    """Эллипс вокруг точки: полуоси в км, длинная ось развёрнута по азимуту."""
    az = math.radians(az_deg)
    klo = 111.32 * math.cos(math.radians(la))
    out = []
    for i in range(n):
        t = 2 * math.pi * i / n
        u, v = a_km * math.cos(t), b_km * math.sin(t)     # вдоль оси и поперёк
        north = u * math.cos(az) - v * math.sin(az)
        east  = u * math.sin(az) + v * math.cos(az)
        out.append((round(la + north / 111.32, 4), round(lo + east / klo, 4)))
    return out


def area_km2(geom):
    def ring(cs):
        s = 0.0
        for (x1, y1), (x2, y2) in zip(cs, cs[1:]):
            s += math.radians(x2 - x1) * (2 + math.sin(math.radians(y1))
                                            + math.sin(math.radians(y2)))
        return abs(s) * R_EARTH ** 2 / 2
    tot = 0.0
    for p in getattr(geom, 'geoms', [geom]):
        if p.is_empty or p.geom_type != 'Polygon':
            continue
        tot += ring(list(p.exterior.coords))
    return tot


def load_js(path, var):
    s = open(path, encoding='utf-8').read()
    i = s.index(var); j = s.index('=', i) + 1
    k = s.rindex(';')
    return json.loads(s[j:k].strip())


def main():
    ap = argparse.ArgumentParser(description='Зоны влияния и морские пути Тихой гавани')
    ap.add_argument('--dry', action='store_true', help='ничего не записывать')
    args = ap.parse_args()
    try:
        from shapely.geometry import Polygon, Point
        from shapely.ops import unary_union
        from shapely.strtree import STRtree
    except ImportError:
        sys.exit('нужен shapely:  pip install shapely')

    # ── проверка: все точки путей должны лежать в воде ──
    land = load_js(os.path.join(DATA, 'land.js'), 'LAND_DATA')
    polys = [Polygon([(lo, la) for la, lo in poly[0]],
                     [[(lo, la) for la, lo in h] for h in poly[1:]])
             for poly in land]
    tree = STRtree(polys)
    routes = [TRUNK] + SPURS
    ports = {(round(la, 3), round(lo, 3)) for _, _, la, lo, *_ in HOUSES}
    onshore = []
    for ri, r in enumerate(routes):
        for la, lo in r:
            if (round(la, 3), round(lo, 3)) in ports:
                continue                      # Дом — это порт, он на берегу
            pt = Point(lo, la)
            if any(polys[i].contains(pt) for i in tree.query(pt)):
                onshore.append((ri, la, lo))
    print(f"точек в маршрутах: {sum(len(r) for r in routes)}, "
          f"на суше: {len(onshore) or '—'}")
    for ri, la, lo in onshore:
        print(f"  ✗ маршрут {ri}: {la}, {lo}")
    if onshore:
        sys.exit('маршрут идёт по суше — файлы не записаны')

    # ── зоны влияния ──
    zones, rings = [], []
    print(f"\n{'Дом':16}{'зона':>10}   опорная точка")
    for key, name, la, lo, a, b, az, *ctr in HOUSES:
        cla, clo = (ctr[0], ctr[1]) if ctr else (la, lo)
        ring = ellipse(cla, clo, a, b, az)
        g = Polygon([(x, y) for y, x in ring])
        if not g.contains(Point(lo, la)):
            sys.exit(f'{name}: опорная точка вне своей зоны')
        zones.append(g)
        rings.append([[list(p) for p in ring] + [list(ring[0])]])
        print(f"{name:16}{area_km2(g):8.0f} км²   {la}, {lo}")
    total = area_km2(unary_union(zones))
    print(f"{'ВСЕГО':16}{total:8.0f} км²   ({len(zones)} Домов)")

    if args.dry:
        print('\n--dry: файлы не записаны')
        return

    # ── записываем зоны в factions-geo.js ──
    p = os.path.join(DATA, 'factions-geo.js')
    src = open(p, encoding='utf-8').read()
    m = re.search(r'window\.FACTIONS_GEO\s*=\s*(\{.*\});\s*$', src, re.S)
    geo = json.loads(m.group(1))
    geo[KEY] = rings
    open(p, 'w', encoding='utf-8').write(
        src[:m.start(1)] + json.dumps(geo, ensure_ascii=False, separators=(',', ':'))
        + src[m.end(1):])
    print(f"\nзаписано {p}")

    # ── и пути в routes.js ──
    p = os.path.join(DATA, 'routes.js')
    body = json.dumps({KEY: [[list(pt) for pt in r] for r in routes]},
                      ensure_ascii=False, separators=(',', ':'))
    open(p, 'w', encoding='utf-8').write(
        "// СГЕНЕРИРОВАННЫЙ ФАЙЛ — РУКАМИ НЕ ПРАВИТЬ.\n"
        "// Морские пути фракций: ключ фракции -> [ линия, ... ],\n"
        "// линия = [[широта, долгота], ...]. Собран скриптом\n"
        "// map/tools/quiet_harbor.py, там же лежат сами маршруты.\n"
        f"window.SEA_ROUTES = {body};\n")
    print(f"записано {p}")


if __name__ == '__main__':
    main()
