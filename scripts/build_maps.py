#!/usr/bin/env python3
"""Build the Bible Geography Explorer maps and gazetteer.

Sources (downloaded once into content/geo/cache, which is not committed):
* Natural Earth 1:10m land, lakes and rivers - public domain (naturalearthdata.com).
* OpenBible.info Bible Geocoding Data (ancient.jsonl) - CC BY 4.0, attribution shown in the app.

Outputs:
* src/content/generated/maps.json  - simplified SVG paths for three map views.
* content/source/geo_places.json    - confident place identifications (score >= 700) with lon/lat.
Run: pip install shapely && python3 scripts/build_maps.py
"""
import json, math, os, urllib.request
from shapely.geometry import shape, box, mapping
from shapely.ops import unary_union

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "content", "geo", "cache"); os.makedirs(CACHE, exist_ok=True)
NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/{}.geojson"
OB = "https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/data/ancient.jsonl"

def fetch(name, url):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path): urllib.request.urlretrieve(url, path)
    return path

land = json.load(open(fetch("land.json", NE.format("ne_10m_land"))))
lakes = json.load(open(fetch("lakes.json", NE.format("ne_10m_lakes"))))
rivers = json.load(open(fetch("rivers.json", NE.format("ne_10m_rivers_lake_centerlines"))))

# Map views: west, south, east, north (degrees). Width is fixed at 1000 SVG units.
VIEWS = {
    "land": {"title": "The Holy Land", "bbox": [34.0, 30.4, 36.8, 33.6]},
    "east": {"title": "The Ancient Near East", "bbox": [24.0, 23.5, 50.0, 41.5]},
    "med":  {"title": "The Mediterranean World", "bbox": [10.0, 30.0, 38.5, 43.5]},
}
KEEP_LAKES = {"Sea of Galilee", "Dead Sea"}
KEEP_RIVERS = {"Jordan": "Jordan", "Nile": "Nile", "Rosetta Branch": "Nile", "Damietta Branch": "Nile",
               "Euphrates": "Euphrates", "Firat": "Euphrates", "Al Furat": "Euphrates", "Tigris": "Tigris", "Dicle": "Tigris",
               "Tevere": "Tiber"}

def projector(bbox):
    w, s, e, n = bbox
    k = 1000 / ((e - w) * math.cos(math.radians((s + n) / 2)))
    c = math.cos(math.radians((s + n) / 2))
    return (lambda lon, lat: ((lon - w) * c * k, (n - lat) * k)), round((n - s) * k)

def path_of(geom, proj):
    out = []
    def ring(coords, close):
        pts = [proj(x, y) for x, y in coords]
        if len(pts) < 2: return
        out.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + ("Z" if close else ""))
    def walk(g):
        t = g.geom_type
        if t == "Polygon":
            ring(g.exterior.coords, True)
            for i in g.interiors: ring(i.coords, True)
        elif t == "LineString": ring(g.coords, False)
        elif t in ("MultiPolygon", "MultiLineString", "GeometryCollection"):
            for p in g.geoms: walk(p)
    walk(geom)
    return "".join(out)

maps = {}
for vid, v in VIEWS.items():
    w, s, e, n = v["bbox"]
    clip = box(w, s, e, n)
    proj, height = projector(v["bbox"])
    tol = (e - w) / 1400
    land_geom = unary_union([shape(f["geometry"]).intersection(clip) for f in land["features"] if shape(f["geometry"]).intersects(clip)])
    lake_geoms = [shape(f["geometry"]).intersection(clip) for f in lakes["features"] if f["properties"].get("name") in KEEP_LAKES and shape(f["geometry"]).intersects(clip)]
    river_geoms = [shape(f["geometry"]).intersection(clip) for f in rivers["features"] if f["properties"].get("name") in KEEP_RIVERS and shape(f["geometry"]).intersects(clip)]
    maps[vid] = {"title": v["title"], "bbox": v["bbox"], "width": 1000, "height": height,
                 "land": path_of(land_geom.simplify(tol), proj),
                 "lakes": path_of(unary_union(lake_geoms).simplify(tol / 2), proj) if lake_geoms else "",
                 "rivers": path_of(unary_union(river_geoms).simplify(tol), proj) if river_geoms else ""}

places = {}
for line in open(fetch("ancient.jsonl", OB), encoding="utf-8"):
    r = json.loads(line)
    if not r.get("identifications"): continue
    ident = r["identifications"][0]
    res = [x for x in ident.get("resolutions", []) if x.get("lonlat")]
    score = (ident.get("score") or {}).get("time_total") or 0
    if not res or score < 700: continue
    lon, lat = map(float, res[0]["lonlat"].split(","))
    places[r["friendly_id"]] = {"lon": round(lon, 4), "lat": round(lat, 4), "score": score, "type": (r.get("types") or ["place"])[0],
                                "url": f"https://www.openbible.info/geo/ancient/{r['id']}/{r.get('url_slug', '')}"}

gen = os.path.join(ROOT, "src", "content", "generated"); os.makedirs(gen, exist_ok=True)
json.dump(maps, open(os.path.join(gen, "maps.json"), "w"), separators=(",", ":"))
json.dump(places, open(os.path.join(ROOT, "content", "source", "geo_places.json"), "w"), indent=0, sort_keys=True)
print(f"maps: {', '.join(f'{k} {len(m['land'])//1024}KB' for k, m in maps.items())}; places: {len(places)}")
