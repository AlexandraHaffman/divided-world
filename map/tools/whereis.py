#!/usr/bin/env python3
"""
Проверка координат для карты «Разделённого мира».

Отвечает на два вопроса по каждой точке:
  1. попала ли она на сушу (land.js)
  2. на территорию какой фракции (factions-geo.js)

Использование:
    python3 map/tools/whereis.py "Вена,48.21,16.37" "Каир,30.04,31.24"
    python3 map/tools/whereis.py --file points.txt      # строки "имя,lat,lon"
    python3 map/tools/whereis.py --check-locations      # проверить весь locations.js
"""
import json, sys, os, re

import os
# Папка с данными карты. По умолчанию — map/data рядом со скриптом
# (скрипт лежит в map/tools/). Можно переопределить: DW_MAP_DATA=/путь
DATA = os.environ.get("DW_MAP_DATA") or os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))


def load_js_object(path, varname):
    s = open(path, encoding="utf-8").read()
    i = s.index(varname)
    j = s.index("=", i) + 1
    return json.loads(s[j:].strip().rstrip(";"))


def point_in_ring(lat, lon, ring):
    """Ray casting. Кольцо — список [lat, lon]."""
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        yi, xi = ring[i][0], ring[i][1]
        yj, xj = ring[j][0], ring[j][1]
        if (xi > lon) != (xj > lon):
            t = (lon - xi) / (xj - xi) if xj != xi else 0
            if lat < yi + t * (yj - yi):
                inside = not inside
        j = i
    return inside


def point_in_polys(lat, lon, polys):
    """polys = [ [внешнее кольцо, дыра, дыра...], ... ]"""
    for poly in polys:
        if not poly:
            continue
        if point_in_ring(lat, lon, poly[0]):
            in_hole = any(point_in_ring(lat, lon, h) for h in poly[1:])
            if not in_hole:
                return True
    return False


class World:
    def __init__(self):
        self.geo = load_js_object(f"{DATA}/factions-geo.js", "window.FACTIONS_GEO")
        try:
            self.land = load_js_object(f"{DATA}/land.js", "window.LAND_DATA")
        except Exception:
            self.land = None
        # быстрые bbox
        self.bbox = {}
        for k, polys in self.geo.items():
            lats, lons = [], []
            for poly in polys:
                for ring in poly:
                    for p in ring:
                        lats.append(p[0]); lons.append(p[1])
            if lats:
                self.bbox[k] = (min(lats), max(lats), min(lons), max(lons))

    def faction(self, lat, lon):
        hits = []
        for k, polys in self.geo.items():
            b = self.bbox.get(k)
            if not b:
                continue
            if not (b[0] - .5 <= lat <= b[1] + .5 and b[2] - .5 <= lon <= b[3] + .5):
                continue
            if point_in_polys(lat, lon, polys):
                hits.append(k)
        return hits

    def on_land(self, lat, lon):
        if self.land is None:
            return None
        return point_in_polys(lat, lon, self.land)

    def check(self, name, lat, lon, expect=None):
        facs = self.faction(lat, lon)
        land = self.on_land(lat, lon)
        got = facs[0] if facs else ""
        ok = True
        notes = []
        if land is False:
            notes.append("В МОРЕ")
            ok = False
        if expect is not None:
            if expect == "":
                if facs:
                    notes.append(f"ничья, но попала в {'/'.join(facs)}")
            elif expect not in facs:
                notes.append(f"ожидалось {expect}, а тут {'/'.join(facs) or 'ничья земля'}")
                ok = False
        if len(facs) > 1:
            notes.append(f"пересечение: {'/'.join(facs)}")
        return ok, got, land, "; ".join(notes)


def main():
    w = World()
    args = sys.argv[1:]

    if args and args[0] == "--check-locations":
        s = open(f"{DATA}/locations.js", encoding="utf-8").read()
        # закомментированный образец в шапке — не локация
        s = "\n".join(ln for ln in s.splitlines() if not ln.lstrip().startswith("//"))
        blocks = re.findall(
            r'name:\s*"([^"]+)".*?type:\s*"([^"]*)".*?faction:\s*"([^"]*)".*?lat:\s*(-?[\d.]+).*?lon:\s*(-?[\d.]+)',
            s, re.S)
        bad = 0
        for name, typ, fac, lat, lon in blocks:
            ok, got, land, notes = w.check(name, float(lat), float(lon), fac)
            flag = "  " if ok and not notes else "!!"
            if not ok or notes:
                bad += 1
            print(f"{flag} {name:32s} {typ:17s} {fac:12s} {lat:>7s},{lon:>8s}  {notes}")
        print(f"\nвсего {len(blocks)}, с замечаниями {bad}")
        return

    if args and args[0] == "--file":
        lines = open(args[1], encoding="utf-8").read().splitlines()
    else:
        lines = args

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split(",")]
        name, lat, lon = parts[0], float(parts[1]), float(parts[2])
        expect = parts[3] if len(parts) > 3 else None
        ok, got, land, notes = w.check(name, lat, lon, expect)
        landtxt = "суша" if land else ("МОРЕ" if land is False else "?")
        print(f"{name:32s} {lat:7.3f},{lon:9.3f}  {landtxt:5s} -> {got or '(ничья)':12s} {notes}")


if __name__ == "__main__":
    main()
