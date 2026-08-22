#!/usr/bin/env python3
"""
Уплотнение границ сплайном Catmull-Rom.

Кривая проходит ЧЕРЕЗ все исходные вершины — географические очертания
не смещаются. Добавляются только промежуточные точки на сегментах,
которые выглядят рублеными: длинные и с заметным изломом.

Главное правило: где граница фракции идёт по берегу, она совпадает с
береговой линией вершина в вершину — так собраны исходные данные, и так
должно остаться. Поэтому береговые сегменты уплотняются ровно один раз,
в land.js, а во фракции те же самые точки копируются как есть. Внутренние
границы — между фракциями и по краю ничьей земли — считаются отдельно,
там берега нет и сверяться не с чем.

    python3 map/tools/densify.py --target 1.5          # прикинуть и записать
    python3 map/tools/densify.py --target 1.5 --dry    # только показать
    python3 map/tools/densify.py --no-land             # берег не трогать

С --no-land береговая линия остаётся как есть, и вместе с ней остаются
как есть все береговые границы фракций: уплотнятся только внутренние.
"""
import json, math, argparse

import os
# Папка с данными карты. По умолчанию — map/data рядом со скриптом
# (скрипт лежит в map/tools/). Можно переопределить: DW_MAP_DATA=/путь
DATA = os.environ.get("DW_MAP_DATA") or os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))
GEO = f"{DATA}/factions-geo.js"
LAND = f"{DATA}/land.js"

# Насколько далеко от середины хорды может уйти новая точка — в долях
# длины сегмента. Держит сплайн от выбросов в узких заливах и проливах.
# 0.03 при среднем сегменте 25 км — отклонение не больше ~750 м.
MAX_OFFSET = 0.03

# Города на кромке контура: если уплотнение выбьет их за границу своей
# фракции или в море, значит контур поехал. Проверяются после сборки.
CONTROL = [
    ("Нью-Йорк", 40.71, -74.01, "america"),
    ("Бостон", 42.36, -71.06, "america"),
    ("Майами", 25.76, -80.19, "america"),
    ("Сан-Франциско", 37.77, -122.42, "america"),
    ("Лиссабон", 38.72, -9.14, "tenebrion"),
    ("Вена", 48.21, 16.37, "tenebrion"),
    ("Лондон", 51.51, -0.13, "arcadia"),
    ("Москва", 55.75, 37.62, "whitezone"),
    ("Дели", 28.61, 77.21, "rakshasy"),
    ("Мумбаи", 19.08, 72.88, "rakshasy"),
    ("Шанхай", 31.23, 121.47, "forge"),
    ("Багдад", 33.31, 44.36, "shumery"),
    ("Эр-Рияд", 24.71, 46.68, "jamahiriya"),
    ("Сидней", -33.87, 151.21, "australia"),
    ("Каир", 30.04, 31.24, "ekvatornaya"),
    ("Кейптаун", -33.92, 18.42, "ekvatornaya"),
]


def load_js(path, varname):
    s = open(path, encoding="utf-8").read()
    i = s.index(varname); j = s.index("=", i) + 1
    return s[:i], json.loads(s[j:].strip().rstrip(";"))


def write_js(path, head, varname, obj):
    body = json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
    with open(path, "w", encoding="utf-8") as f:
        f.write(head)
        f.write(f"{varname} = " + body + ";\n")


def seg_km(a, b):
    dlat = b[0] - a[0]
    dlon = (b[1] - a[1]) * math.cos(math.radians((a[0] + b[0]) / 2))
    return math.hypot(dlat, dlon) * 111.32


def angle_at(p0, p1, p2):
    """Угол излома в p1, в градусах. 0 = прямая, 180 = разворот."""
    v1 = (p1[0] - p0[0], p1[1] - p0[1])
    v2 = (p2[0] - p1[0], p2[1] - p1[1])
    n1 = math.hypot(*v1); n2 = math.hypot(*v2)
    if n1 == 0 or n2 == 0:
        return 0.0
    cos = max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / (n1 * n2)))
    return math.degrees(math.acos(cos))


def catmull(p0, p1, p2, p3, t=0.5):
    """Точка на сплайне между p1 и p2. Centripetal Catmull-Rom, alpha=0.5."""
    def tj(ti, pa, pb):
        d = math.hypot(pb[0] - pa[0], pb[1] - pa[1])
        return ti + (d ** 0.5 if d > 0 else 1e-9)

    t0 = 0.0
    t1 = tj(t0, p0, p1)
    t2 = tj(t1, p1, p2)
    t3 = tj(t2, p2, p3)
    tt = t1 + (t2 - t1) * t

    def lerp(pa, pb, ta, tb):
        if tb == ta:
            return pa
        w = (tb - tt) / (tb - ta)
        return (pa[0] * w + pb[0] * (1 - w), pa[1] * w + pb[1] * (1 - w))

    a1 = lerp(p0, p1, t0, t1)
    a2 = lerp(p1, p2, t1, t2)
    a3 = lerp(p2, p3, t2, t3)
    b1 = lerp(a1, a2, t0, t2)
    b2 = lerp(a2, a3, t1, t3)
    return lerp(b1, b2, t1, t2)


def midpoint(p0, p1, p2, p3, min_km, min_angle):
    """Точка, которую стоит вставить между p1 и p2, или None."""
    if seg_km(p1, p2) < min_km:
        return None
    if max(angle_at(p0, p1, p2), angle_at(p1, p2, p3)) < min_angle:
        return None
    q = catmull(p0, p1, p2, p3, 0.5)
    # Защита от выброса: в узких местах (устья, проливы) сплайн уходит
    # за контур. Держим новую точку рядом с серединой хорды.
    mid = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
    chord = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    off = math.hypot(q[0] - mid[0], q[1] - mid[1])
    lim = chord * MAX_OFFSET
    if off > lim and off > 0:
        s = lim / off
        q = (mid[0] + (q[0] - mid[0]) * s, mid[1] + (q[1] - mid[1]) * s)
    return [round(q[0], 3), round(q[1], 3)]


def vkey(p):
    return (round(p[0], 6), round(p[1], 6))


def open_ring(ring):
    """Кольцо без повтора первой точки + признак, был ли повтор."""
    closed = ring[0] == ring[-1]
    return (ring[:-1] if closed else ring[:]), closed


class Coast:
    """Береговая линия: уплотняет сама себя и раздаёт готовые точки
    тем сегментам границ фракций, которые идут ровно по ней."""

    def __init__(self, land):
        self.land = land
        self.rings = []        # (полигон, кольцо, точки, было ли замкнуто)
        self.where = {}        # вершина -> [(кольцо, позиция)]
        for pi, poly in enumerate(land):
            for ri, ring in enumerate(poly):
                pts, closed = open_ring(ring)
                rid = len(self.rings)
                self.rings.append((pi, ri, pts, closed))
                for i, p in enumerate(pts):
                    self.where.setdefault(vkey(p), []).append((rid, i))
        self.ins = {}          # (кольцо, позиция) -> вставленные точки

    def densify(self, min_km, min_angle):
        """Уплотнить берег. Возвращает новый land, попутно запоминая,
        что и куда вставлено, — фракции возьмут это готовым."""
        self.ins = {}
        out = [[None] * len(poly) for poly in self.land]
        for rid, (pi, ri, pts, closed) in enumerate(self.rings):
            m = len(pts)
            if m < 4:
                out[pi][ri] = list(self.land[pi][ri])
                continue
            new = []
            for i in range(m):
                p0, p1 = pts[(i - 1) % m], pts[i]
                p2, p3 = pts[(i + 1) % m], pts[(i + 2) % m]
                new.append(p1)
                q = midpoint(p0, p1, p2, p3, min_km, min_angle)
                if q is not None:
                    new.append(q)
                    self.ins[(rid, i)] = [q]
            if closed:
                new.append(new[0])
            out[pi][ri] = new
        return out

    def between(self, a, b):
        """Точки для сегмента a->b, если он береговой. None — если нет.
        Пустой список значит «берег, но уплотнять там нечего»."""
        ka, kb = vkey(a), vkey(b)
        pa = self.where.get(ka)
        pb = self.where.get(kb)
        if not pa or not pb:
            return None
        for rid, i in pa:
            m = len(self.rings[rid][2])
            for rjd, j in pb:
                if rjd != rid:
                    continue
                if (i + 1) % m == j:                      # тот же ход
                    return list(self.ins.get((rid, i), []))
                if (j + 1) % m == i:                      # встречный ход
                    return list(reversed(self.ins.get((rid, j), [])))
        return None


def densify_faction_ring(ring, coast, min_km, min_angle, tally):
    """tally = [сколько взято с берега, сколько посчитано сплайном]"""
    pts, closed = open_ring(ring)
    m = len(pts)
    if m < 4:
        return list(ring)
    out = []
    for i in range(m):
        p1, p2 = pts[i], pts[(i + 1) % m]
        out.append(p1)
        got = coast.between(p1, p2)
        if got is not None:
            out.extend(got)                # берег: точки уже посчитаны
            tally[0] += len(got)
            continue
        p0, p3 = pts[(i - 1) % m], pts[(i + 2) % m]
        q = midpoint(p0, p1, p2, p3, min_km, min_angle)
        if q is not None:
            out.append(q)
            tally[1] += 1
    if closed:
        out.append(out[0])
    return out


def count(obj):
    polys = obj if isinstance(obj, list) else [p for v in obj.values() for p in v]
    return sum(len(r) for poly in polys for r in poly)


def run(land, geo, min_km, min_angle, do_land=True):
    coast = Coast(land)
    new_land = coast.densify(min_km, min_angle) if do_land else land
    tally = [0, 0]
    new_geo = {k: [[densify_faction_ring(r, coast, min_km, min_angle, tally)
                    for r in poly] for poly in polys]
               for k, polys in geo.items()}
    return new_land, new_geo, tally


def on_coast(land, geo):
    """Сколько сегментов границ фракций — это ровно сегменты берега
    (обе вершины подряд на одном кольце land.js). Возвращает (их, всего)."""
    coast = Coast(land)
    hit = tot = 0
    for polys in geo.values():
        for poly in polys:
            for ring in poly:
                pts, _ = open_ring(ring)
                m = len(pts)
                for i in range(m):
                    tot += 1
                    hit += coast.between(pts[i], pts[(i + 1) % m]) is not None
    return hit, tot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=float, default=1.5)
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--no-land", action="store_true",
                    help="берег не трогать (и береговые границы тоже)")
    args = ap.parse_args()

    do_land = not args.no_land
    ghead, geo = load_js(GEO, "window.FACTIONS_GEO")
    lhead, land = load_js(LAND, "window.LAND_DATA")
    base = count(geo)
    base_land = count(land)
    want = base * args.target

    # подбираем порог длины сегмента: чем ниже, тем больше точек добавится
    lo, hi = 0.5, 300.0
    best = None
    for _ in range(30):
        mid = (lo + hi) / 2
        got = count(run(land, geo, mid, 4.0, do_land)[1])
        # (сам подбор порога — только по числу точек у фракций)
        if best is None or abs(got - want) < abs(best[1] - want):
            best = (mid, got)
        if got > want:
            lo = mid
        else:
            hi = mid
    min_km, got = best

    print(f"исходно точек:      {base:,}")
    print(f"цель (×{args.target}):        {want:,.0f}")
    print(f"получится:          {got:,}  (×{got/base:.2f})")
    print(f"порог сегмента:     {min_km:.1f} км, минимальный излом 4°")
    print()

    dense_land, dense, tally = run(land, geo, min_km, 4.0, do_land)
    print(f"{'фракция':14s} {'было':>7s} {'стало':>7s} {'прирост':>8s}")
    for k in geo:
        a = sum(len(r) for p in geo[k] for r in p)
        b = sum(len(r) for p in dense[k] for r in p)
        pct = f"+{(b/a-1)*100:.0f}%" if a else "—"
        print(f"{k:14s} {a:7d} {b:7d} {pct:>8s}")
    nl = count(dense_land)
    print(f"{'берег':14s} {base_land:7d} {nl:7d} "
          f"{f'+{(nl/base_land-1)*100:.0f}%':>8s}")

    print(f"\nдобавлено точек: {tally[0]} взято с береговой линии, "
          f"{tally[1]} посчитано сплайном на внутренних границах")

    # Берег и границы фракций обязаны совпадать вершина в вершину.
    # Сегмент границы считается береговым, если обе его вершины идут
    # подряд по кольцу land.js. Береговой сегмент после уплотнения
    # обязан распасться только на береговые же; внутренних сегментов
    # должно стать ровно на столько больше, сколько точек вставил сплайн.
    was_h, was_t = on_coast(land, geo)
    now_h, now_t = on_coast(dense_land, dense)
    print(f"\nсегментов границ по берегу: было {was_h}/{was_t} "
          f"({was_h/was_t*100:.1f}%), стало {now_h}/{now_t} ({now_h/now_t*100:.1f}%)")
    ok_coast = now_h >= was_h and (now_t - now_h) == (was_t - was_h) + tally[1]
    print("  ✓ берег и границы фракций совпадают вершина в вершину" if ok_coast
          else f"  СБОЙ: {(now_t - now_h) - (was_t - was_h) - tally[1]} "
               f"сегментов ушло с берега")

    # контроль: города на кромке должны остаться на суше и в своих фракциях
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from whereis import point_in_polys
    print()
    bad = []
    for nm, la, lo_, k in CONTROL:
        if point_in_polys(la, lo_, geo.get(k, [])) and \
                not point_in_polys(la, lo_, dense.get(k, [])):
            bad.append(f"{nm} выпал из {k}")
        if point_in_polys(la, lo_, land) and not point_in_polys(la, lo_, dense_land):
            bad.append(f"{nm} оказался в море")
    for b in bad:
        print(f"  ✗ {b}")
    print("  ✓ все контрольные города на местах" if not bad
          else f"  СБОЙ: замечаний {len(bad)}")

    if args.dry:
        print("\n(dry run — файлы не тронуты)")
        return
    if bad or not ok_coast:
        print("\nфайлы не записаны — сначала почини контур")
        return

    write_js(GEO, ghead, "window.FACTIONS_GEO", dense)
    print(f"\nзаписано в {GEO}")
    if do_land:
        write_js(LAND, lhead, "window.LAND_DATA", dense_land)
        print(f"записано в {LAND}")


if __name__ == "__main__":
    main()
