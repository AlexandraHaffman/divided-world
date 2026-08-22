#!/usr/bin/env python3
"""
Ничья суша карты «Разделённого мира».

Считает, какие куски суши не заняты ни одной фракцией, и печатает их
списком: площадь, охват по широте и долготе, точка внутри — её можно
сразу вписать в locations.js с faction: "".

    python3 map/tools/freeland.py                 # все куски от 100 тыс. км²
    python3 map/tools/freeland.py --min 20000     # и мелкие острова тоже
    python3 map/tools/freeland.py --points 5      # по 5 точек внутри каждого
    python3 map/tools/freeland.py --grid 0.5      # быстрее, но грубее

Считается по сетке: широта режется полосами, в каждой полосе ищется,
где проходит суша и где — территории фракций. Разница и есть ничья земля.
Шаг сетки (--grid, по умолчанию 0.25°) — это и точность площадей:
куски мельче шага в список не попадут.
"""
import json, math, argparse, os, sys

DATA = os.environ.get("DW_MAP_DATA") or os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))

KM_PER_DEG = 111.32


def load_js_object(path, varname):
    s = open(path, encoding="utf-8").read()
    i = s.index(varname)
    j = s.index("=", i) + 1
    return json.loads(s[j:].strip().rstrip(";"))


def edges_of(polys):
    """Все рёбра всех колец: (lat1, lon1, lat2, lon2). Дыры наравне с
    внешними кольцами — правило чёт/нечет само их вычтет."""
    out = []
    for poly in polys:
        for ring in poly:
            for k in range(len(ring)):
                a = ring[k]
                b = ring[(k + 1) % len(ring)]
                if a[0] != b[0]:            # горизонтальные рёбра не пересекаем
                    out.append((a[0], a[1], b[0], b[1]))
    return out


def bucket(edges, step=1.0):
    """Разложить рёбра по полосам широты, чтобы не перебирать все подряд."""
    bins = {}
    for e in edges:
        lo = int(math.floor(min(e[0], e[2]) / step))
        hi = int(math.floor(max(e[0], e[2]) / step))
        for b in range(lo, hi + 1):
            bins.setdefault(b, []).append(e)
    return bins


def spans_at(bins, lat, step=1.0):
    """Отрезки долгот, где на этой широте мы внутри контура."""
    xs = []
    for y1, x1, y2, x2 in bins.get(int(math.floor(lat / step)), ()):
        if (y1 > lat) != (y2 > lat):
            xs.append(x1 + (lat - y1) * (x2 - x1) / (y2 - y1))
    xs.sort()
    return [(xs[i], xs[i + 1]) for i in range(0, len(xs) - 1, 2)]


def merge(spans):
    """Слить пересекающиеся отрезки в непересекающиеся."""
    if not spans:
        return []
    spans = sorted(spans)
    out = [list(spans[0])]
    for a, b in spans[1:]:
        if a <= out[-1][1]:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def inside(spans, x):
    for a, b in spans:
        if a <= x <= b:
            return True
        if a > x:
            break
    return False


def main():
    try:                                  # чтобы `| head` не сыпал ошибкой
        from signal import signal, SIGPIPE, SIG_DFL
        signal(SIGPIPE, SIG_DFL)
    except ImportError:
        pass

    ap = argparse.ArgumentParser()
    ap.add_argument("--grid", type=float, default=0.25, help="шаг сетки в градусах")
    ap.add_argument("--min", type=float, default=100000, help="не показывать куски мельче, км²")
    ap.add_argument("--points", type=int, default=1, help="сколько точек внутри печатать")
    args = ap.parse_args()

    land = load_js_object(f"{DATA}/land.js", "window.LAND_DATA")
    geo = load_js_object(f"{DATA}/factions-geo.js", "window.FACTIONS_GEO")

    land_bins = bucket(edges_of(land))
    fac_bins = {k: bucket(edges_of(v)) for k, v in geo.items()}

    s = args.grid
    rows = int(180 / s)
    cols = int(360 / s)
    cells = {}                      # (строка, столбец) -> площадь клетки
    land_km = 0.0
    fac_km = {k: 0.0 for k in geo}

    for r in range(rows):
        lat = -90 + (r + 0.5) * s
        cell_km = (s * KM_PER_DEG) ** 2 * math.cos(math.radians(lat))
        if cell_km <= 0:
            continue
        ls = merge(spans_at(land_bins, lat))
        if not ls:
            continue
        fs = {k: merge(spans_at(b, lat)) for k, b in fac_bins.items()}
        for c in range(cols):
            lon = -180 + (c + 0.5) * s
            if not inside(ls, lon):
                continue
            land_km += cell_km
            owner = None
            for k, sp in fs.items():
                if sp and inside(sp, lon):
                    owner = k
                    break
            if owner:
                fac_km[owner] += cell_km
            else:
                cells[(r, c)] = cell_km

    free_km = sum(cells.values())
    print(f"суша всего:        {land_km:15,.0f} км²")
    print(f"занято фракциями:  {land_km - free_km:15,.0f} км²  "
          f"({(land_km - free_km) / land_km * 100:.1f}%)")
    print(f"ничья земля:       {free_km:15,.0f} км²  "
          f"({free_km / land_km * 100:.1f}%)")
    print(f"\n{'фракция':14s} {'площадь, км²':>15s}")
    for k in geo:
        print(f"{k:14s} {fac_km[k]:15,.0f}")

    # разбить ничью землю на связные куски (соседство по 8 сторонам)
    seen = set()
    regions = []
    for start in cells:
        if start in seen:
            continue
        stack = [start]
        seen.add(start)
        group = []
        while stack:
            r, c = stack.pop()
            group.append((r, c))
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    n = (r + dr, (c + dc) % cols)   # через антимеридиан тоже
                    if n in cells and n not in seen:
                        seen.add(n)
                        stack.append(n)
        regions.append(group)

    regions.sort(key=lambda g: -sum(cells[x] for x in g))
    shown = [g for g in regions if sum(cells[x] for x in g) >= args.min]
    print(f"\nкусков ничьей земли: {len(regions)}, из них крупнее "
          f"{args.min:,.0f} км² — {len(shown)}\n")

    for i, g in enumerate(shown, 1):
        area = sum(cells[x] for x in g)
        lats = [-90 + (r + 0.5) * s for r, _ in g]
        lons = [-180 + (c + 0.5) * s for _, c in g]
        clat = sum(lats) / len(lats)
        clon = sum(lons) / len(lons)
        # точки внутри: сначала ближайшая к середине куска, дальше — самые
        # удалённые от уже выбранных, чтобы разошлись по всей площади
        pts = []
        pool = sorted(zip(lats, lons), key=lambda p: (p[0] - clat) ** 2 + (p[1] - clon) ** 2)
        pts.append(pool[0])
        while len(pts) < min(args.points, len(pool)):
            best, bd = None, -1
            for p in pool:
                d = min((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 for q in pts)
                if d > bd:
                    best, bd = p, d
            pts.append(best)
        print(f"{i:3d}. {area:12,.0f} км²   широта {min(lats):7.2f}…{max(lats):7.2f}   "
              f"долгота {min(lons):8.2f}…{max(lons):8.2f}")
        for la, lo in pts:
            print(f"       точка внутри:  lat: {la:.2f}, lon: {lo:.2f},")


if __name__ == "__main__":
    main()
