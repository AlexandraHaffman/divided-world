#!/usr/bin/env python3
"""
Уплотнение границ фракций сплайном Catmull-Rom.

Кривая проходит ЧЕРЕЗ все исходные вершины — географические очертания
не смещаются. Добавляются только промежуточные точки на сегментах,
которые выглядят рублеными: длинные и с заметным изломом.

    python3 map/tools/densify.py --target 1.5          # прикинуть и записать
    python3 map/tools/densify.py --target 1.5 --dry    # только показать, что будет
"""
import json, math, argparse, subprocess

import os
# Папка с данными карты. По умолчанию — map/data рядом со скриптом
# (скрипт лежит в map/tools/). Можно переопределить: DW_MAP_DATA=/путь
DATA = os.environ.get("DW_MAP_DATA") or os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))
GEO = f"{DATA}/factions-geo.js"

# Насколько далеко от середины хорды может уйти новая точка — в долях
# длины сегмента. Держит сплайн от выбросов в узких заливах и проливах.
# 0.03 при среднем сегменте 25 км — отклонение не больше ~750 м.
MAX_OFFSET = 0.03

# Города на кромке контура: если уплотнение выбьет их за границу своей
# фракции, значит контур поехал. Проверяются после каждой сборки.
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


def load_geo():
    s = open(GEO, encoding="utf-8").read()
    i = s.index("window.FACTIONS_GEO"); j = s.index("=", i) + 1
    head = s[:i]
    return head, json.loads(s[j:].strip().rstrip(";"))


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


def densify_ring(ring, min_km, min_angle):
    """Вставляет точку в середину сегментов, которые длинные и с изломом."""
    n = len(ring)
    if n < 4:
        return list(ring)
    closed = ring[0] == ring[-1]
    pts = ring[:-1] if closed else ring[:]
    m = len(pts)
    if m < 4:
        return list(ring)

    out = []
    for i in range(m):
        p0 = pts[(i - 1) % m]
        p1 = pts[i]
        p2 = pts[(i + 1) % m]
        p3 = pts[(i + 2) % m]
        out.append(p1)
        d = seg_km(p1, p2)
        # излом оценивается по обоим концам сегмента
        bend = max(angle_at(p0, p1, p2), angle_at(p1, p2, p3))
        if d >= min_km and bend >= min_angle:
            q = catmull(p0, p1, p2, p3, 0.5)
            # Защита от выброса: в узких местах (устья, проливы) сплайн
            # уходит за контур. Держим новую точку рядом с серединой хорды.
            mid = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
            chord = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
            off = math.hypot(q[0] - mid[0], q[1] - mid[1])
            lim = chord * MAX_OFFSET
            if off > lim and off > 0:
                s = lim / off
                q = (mid[0] + (q[0] - mid[0]) * s, mid[1] + (q[1] - mid[1]) * s)
            out.append([round(q[0], 3), round(q[1], 3)])
    if closed:
        out.append(out[0])
    return out


def count(geo):
    return sum(len(r) for polys in geo.values() for p in polys for r in p)


def run(geo, min_km, min_angle):
    res = {}
    for k, polys in geo.items():
        res[k] = [[densify_ring(r, min_km, min_angle) for r in poly] for poly in polys]
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=float, default=1.5)
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    head, geo = load_geo()
    base = count(geo)
    want = base * args.target

    # подбираем порог длины сегмента: чем ниже, тем больше точек добавится
    lo, hi = 0.5, 300.0
    best = None
    for _ in range(40):
        mid = (lo + hi) / 2
        got = count(run(geo, mid, 4.0))
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

    dense = run(geo, min_km, 4.0)
    print(f"{'фракция':14s} {'было':>7s} {'стало':>7s} {'прирост':>8s}")
    for k in geo:
        a = sum(len(r) for p in geo[k] for r in p)
        b = sum(len(r) for p in dense[k] for r in p)
        pct = f"+{(b/a-1)*100:.0f}%" if a else "—"
        print(f"{k:14s} {a:7d} {b:7d} {pct:>8s}")

    # контроль: города на кромке должны остаться в своих фракциях
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from whereis import point_in_polys
    print()
    bad = []
    for nm, la, lo, key in CONTROL:
        was = point_in_polys(la, lo, geo.get(key, []))
        now = point_in_polys(la, lo, dense.get(key, []))
        if was and not now:
            bad.append(nm)
            print(f"  ✗ {nm} выпал из {key}")
    print("  ✓ все контрольные города на местах" if not bad
          else f"  СБОЙ: выпало {len(bad)}")

    if args.dry:
        print("\n(dry run — файл не тронут)")
        return
    if bad:
        print("\nфайл не записан — сначала почини контур")
        return

    body = json.dumps(dense, separators=(",", ":"), ensure_ascii=False)
    with open(GEO, "w", encoding="utf-8") as f:
        f.write(head)
        f.write("window.FACTIONS_GEO = " + body + ";\n")
    print(f"\nзаписано в {GEO}")


if __name__ == "__main__":
    main()
