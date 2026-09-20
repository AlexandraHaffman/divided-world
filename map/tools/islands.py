#!/usr/bin/env python3
"""
Острова, которых нет в очертаниях суши.

`land.js` собран из Natural Earth Admin-0 и сглажен: мелкие архипелаги
при этом теряются. Обычно это неважно, но если на острове стоит метка —
он оказывается посреди пустой воды. Скрипт достаёт нужные острова из
того же Natural Earth (кэш `tools/.cache/`, его качает regions_build.py)
и дописывает их в `land.js`.

Повторный запуск безопасен: сначала из файла убираются все кольца,
целиком лежащие внутри объявленных ниже рамок, потом добавляются
свежие. Поэтому правки в ISLANDS достаточно применить запуском.

    python3 map/tools/islands.py --dry   # показать и не записывать
    python3 map/tools/islands.py         # записать
"""
import json, math, os, argparse

from shapely.geometry import Polygon

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, '..', 'data'))
CACHE = os.path.join(HERE, '.cache', 'ne_10m_admin_1_states_provinces.geojson')
R_EARTH = 6371.0088

# ne_name — поле name в Natural Earth Admin-1; box — рамка
# (lat0, lat1, lon0, lon1), внутри которой скрипт считает кольца своими;
# min_km2 — порог, мельче не берём. Контур упрощается до SIMPLIFY градусов,
# чтобы острова были не подробнее остального берега.
SIMPLIFY = 0.01          # ≈1 км
ISLANDS = [
    {"title": "Андаманские и Никобарские острова",
     "ne_name": "Andaman and Nicobar",
     "box": (5.5, 14.5, 91.5, 94.5),
     "min_km2": 100},
]


def area_km2(ring):
    s = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        s += math.radians(x2 - x1) * (2 + math.sin(math.radians(y1))
                                        + math.sin(math.radians(y2)))
    return abs(s) * R_EARTH ** 2 / 2


def load_land():
    s = open(f'{DATA}/land.js', encoding='utf-8').read()
    j = s.index('=', s.index('window.LAND_DATA')) + 1
    while s[j] in ' \t\r\n':
        j += 1
    data, end = json.JSONDecoder().raw_decode(s, j)
    return s[:j], data, s[end:]


def inside(poly, box):
    la0, la1, lo0, lo1 = box
    return all(la0 <= p[0] <= la1 and lo0 <= p[1] <= lo1
               for ring in poly for p in ring)


def main():
    ap = argparse.ArgumentParser(description='Дописать острова в land.js')
    ap.add_argument('--dry', action='store_true')
    args = ap.parse_args()

    head, land, tail = load_land()
    print(f'в land.js колец: {len(land)}')

    ne = json.load(open(CACHE, encoding='utf-8'))
    for isl in ISLANDS:
        before = len(land)
        land = [p for p in land if not inside(p, isl['box'])]
        if before != len(land):
            print(f'  убрано прежних колец: {before - len(land)}')

        geoms = [f['geometry'] for f in ne['features']
                 if f['properties'].get('name') == isl['ne_name']]
        if not geoms:
            raise SystemExit(f'в Natural Earth нет «{isl["ne_name"]}»')

        rings = []
        for g in geoms:
            parts = (g['coordinates'] if g['type'] == 'MultiPolygon'
                     else [g['coordinates']])
            for part in parts:
                shp = Polygon(part[0]).simplify(SIMPLIFY)
                if shp.is_empty:
                    continue
                ext = [[round(y, 4), round(x, 4)]
                       for x, y in shp.exterior.coords]
                if area_km2([(p[1], p[0]) for p in ext]) >= isl['min_km2']:
                    rings.append([ext])

        rings.sort(key=lambda p: -area_km2([(q[1], q[0]) for q in p[0]]))
        print(f'{isl["title"]}: добавлено {len(rings)} '
              f'(от {isl["min_km2"]} км²)')
        for p in rings:
            a = area_km2([(q[1], q[0]) for q in p[0]])
            lats = [q[0] for q in p[0]]; lons = [q[1] for q in p[0]]
            print(f'   {a:8.0f} км²  {len(p[0]):4d} точек  '
                  f'lat {min(lats):6.2f}..{max(lats):6.2f} '
                  f'lon {min(lons):7.2f}..{max(lons):7.2f}')
        land += rings

    if args.dry:
        print('\n--dry: ничего не записано')
        return
    with open(f'{DATA}/land.js', 'w', encoding='utf-8') as f:
        f.write(head + json.dumps(land, ensure_ascii=False,
                                  separators=(',', ':')) + tail)
    print(f'\nland.js: {len(land)} колец, '
          f'{os.path.getsize(f"{DATA}/land.js")/1024:.0f} КБ')


if __name__ == '__main__':
    main()
