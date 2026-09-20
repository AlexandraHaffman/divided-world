#!/usr/bin/env python3
"""
Вырезание территории новой фракции из чужой.

Некоторые фракции не занимают ничью землю, а забирают кусок уже занятой:
«Отражение бездны» держит западносибирскую тайгу, которая до него
считалась частью Белой зоны. Класть её поверх нельзя — на карте это
двойная граница и двойная заливка. Поэтому кусок именно вычитается:
у новой фракции появляется своя территория, у прежней — вырез по ней.

Очертания задаются вручную десятком-другим точек по настоящей географии
(хребет, река, кромка леса). Скрипт сам:
  * сглаживает набросок сплайном Catmull-Rom, чтобы граница не выглядела
    рублеными гранями — кривая проходит ЧЕРЕЗ исходные вершины;
  * обрезает его по территории-источнику, поэтому берег, заливы и острова
    достаются новой фракции точка в точку от прежней;
  * вычитает результат из источника и проверяет, что суммарная площадь
    не изменилась и полигоны не налезают друг на друга.

Запускать можно сколько угодно раз: повторный прогон ничего не ломает,
вырез просто совпадёт с прежним.

    python3 map/tools/carve_faction.py --dry    # показать и не записывать
    python3 map/tools/carve_faction.py          # записать factions-geo.js
"""
import json, math, os, re, sys, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, '..', 'data'))
R_EARTH = 6371.0088


# ═══════════════ ЧТО ИЗ ЧЕГО ВЫРЕЗАЕТСЯ ═══════════════
# outline — набросок по часовой стрелке, [широта, долгота]. Точность
# нужна только там, где граница идёт по опознаваемому рубежу; берег
# дорисуется сам при обрезке по территории-источнику.
CARVE = {
  "abyss": {
    "title": "Отражение бездны",
    "from":  "whitezone",
    # Западная Сибирь от Урала до Енисея, вместе с Кузбассом и алтайскими
    # предгорьями. Юг — кромка лесостепи и бывшие города: под полем
    # Вестника они всё равно мертвы.
    # Север — тундра Ямала и Гыдана, сакрально-оборонительный пояс.
    "outline": [
      # южная кромка, с запада на восток
      (54.6, 58.2), (53.9, 62.0), (53.6, 66.0), (53.8, 70.0), (54.2, 74.0),
      (53.6, 78.0), (53.4, 82.0), (52.3, 84.0), (51.6, 86.2), (51.9, 88.2),
      (52.9, 90.0), (54.2, 91.6),
      # вверх по Енисею
      (56.3, 93.2), (58.0, 92.8), (60.0, 90.5), (61.5, 90.0), (63.5, 87.8),
      (65.5, 87.5), (67.0, 86.5), (68.5, 86.5), (69.8, 85.5), (70.8, 83.5),
      (71.8, 82.5), (72.8, 80.5),
      # Карское море: линия уходит в воду, берег обрежется сам
      (74.0, 76.0), (74.0, 70.0), (72.8, 66.0), (70.5, 63.6), (69.5, 62.0),
      # вниз по Уралу
      (68.0, 65.5), (66.0, 63.5), (64.0, 62.0), (62.0, 60.5), (60.0, 59.5),
      (58.0, 58.5), (56.5, 58.0), (55.0, 57.8),
    ],
  },
}


# ═══════════════ СГЛАЖИВАНИЕ ═══════════════
def catmull_rom(ring, step=0.7):
    """Промежуточные точки на длинных сегментах; вершины не смещаются."""
    n = len(ring)
    out = []
    for i in range(n):
        p0, p1 = ring[(i - 1) % n], ring[i]
        p2, p3 = ring[(i + 1) % n], ring[(i + 2) % n]
        out.append(p1)
        d = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        k = int(d / step)
        for j in range(1, k):
            t = j / k
            t2, t3 = t * t, t * t * t
            out.append(tuple(
                0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * t
                       + (2*p0[a] - 5*p1[a] + 4*p2[a] - p3[a]) * t2
                       + (-p0[a] + 3*p1[a] - 3*p2[a] + p3[a]) * t3)
                for a in (0, 1)))
    return out


# ═══════════════ ПЛОЩАДЬ И ФОРМАТ ═══════════════
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
        for h in p.interiors:
            tot -= ring(list(h.coords))
    return tot


def rings_of(geom, nd=3):
    """Полигоны -> [ [внешнее кольцо, дыра...], ... ], кольцо = [[шир, дол]]."""
    out = []
    for p in getattr(geom, 'geoms', [geom]):
        if p.is_empty or p.geom_type != 'Polygon':
            continue
        poly = []
        for cs in [p.exterior] + list(p.interiors):
            r = [[round(y, nd), round(x, nd)] for x, y in cs.coords]
            if len(r) >= 4:
                poly.append(r)
        if poly:
            out.append(poly)
    return out


def polys_of(rings):
    from shapely.geometry import Polygon, MultiPolygon
    ps = []
    for poly in rings:
        ps.append(Polygon([(lo, la) for la, lo in poly[0]],
                          [[(lo, la) for la, lo in h] for h in poly[1:]]))
    return MultiPolygon(ps) if len(ps) > 1 else ps[0]


def main():
    ap = argparse.ArgumentParser(description='Вырезать территорию фракции из чужой')
    ap.add_argument('--dry', action='store_true', help='ничего не записывать')
    args = ap.parse_args()
    try:
        from shapely.geometry import Polygon
        from shapely import make_valid
    except ImportError:
        sys.exit('нужен shapely:  pip install shapely')

    path = os.path.join(DATA, 'factions-geo.js')
    src = open(path, encoding='utf-8').read()
    m = re.search(r'window\.FACTIONS_GEO\s*=\s*(\{.*\});\s*$', src, re.S)
    geo = json.loads(m.group(1))

    for key, spec in CARVE.items():
        host_key = spec['from']
        host = make_valid(polys_of(geo[host_key]))
        # уже вырезанный кусок возвращаем хозяину, чтобы прогон был
        # повторяемым: считаем всегда от целой территории
        if key in geo:
            host = make_valid(host.union(make_valid(polys_of(geo[key]))))
        whole = area_km2(host)

        ring = catmull_rom([(la, lo) for la, lo in spec['outline']])
        sketch = make_valid(Polygon([(lo, la) for la, lo in ring]))
        cut = make_valid(sketch.intersection(host))
        rest = make_valid(host.difference(cut))

        a_cut, a_rest = area_km2(cut), area_km2(rest)
        print(f"\n═══ {spec['title']} ({key}) вырезается из «{host_key}» ═══")
        print(f"  территория-источник целиком {whole/1e6:8.3f} млн км²")
        print(f"  новая фракция               {a_cut/1e6:8.3f} млн км²")
        print(f"  остаток источника           {a_rest/1e6:8.3f} млн км²")
        gap = whole - a_cut - a_rest
        print(f"  расхождение                 {gap:+.1f} км²")
        ok = abs(gap) < 1000 and cut.intersection(rest).area < 1e-9
        if not ok:
            sys.exit('  куски потерялись или налезают друг на друга — файл не записан')
        geo[key] = rings_of(cut)
        geo[host_key] = rings_of(rest)

    if args.dry:
        print('\n--dry: файл не записан')
        return
    out = src[:m.start(1)] + json.dumps(geo, ensure_ascii=False, separators=(',', ':')) + src[m.end(1):]
    open(path, 'w', encoding='utf-8').write(out)
    pts = sum(len(r) for v in geo.values() for poly in v for r in poly)
    print(f"\nзаписано {path}")
    print(f"  фракций: {len(geo)}, точек: {pts}, размер: {os.path.getsize(path)/1024:.0f} КБ")


if __name__ == '__main__':
    main()
