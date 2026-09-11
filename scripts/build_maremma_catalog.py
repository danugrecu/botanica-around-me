import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRAILS = Path("/private/tmp/maremma-trails.json")
NATURE = Path("/private/tmp/maremma-nature.json")
BOUNDARY = Path("/private/tmp/grosseto-province.geojson")


def inside_ring(lon, lat, ring):
    inside = False
    for i, a in enumerate(ring):
        b = ring[i - 1]
        if (a[1] > lat) != (b[1] > lat) and lon < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[
            0
        ]:
            inside = not inside
    return inside


def inside_geometry(lon, lat, geometry):
    polygons = (
        geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
    )
    return any(
        inside_ring(lon, lat, p[0]) and not any(inside_ring(lon, lat, hole) for hole in p[1:])
        for p in polygons
    )


def center(element):
    c = element.get("center") or element
    if isinstance(c.get("lat"), (int, float)) and isinstance(c.get("lon"), (int, float)):
        return round(c["lat"], 6), round(c["lon"], 6)


def territory(lat, lon):
    if lat < 42.48 and lon < 11.02:
        return "Arcipelago maremmano"
    if lat < 42.56 and lon < 11.38:
        return "Argentario e costa meridionale"
    if lat < 42.79 and lon >= 11.35:
        return "Bassa Maremma e ripiani tufacei"
    if lat < 42.75 and lon < 11.25:
        return "Uccellina e costa del Parco"
    if lat >= 42.79 and lon >= 11.38:
        return "Amiata e alta valle dell’Albegna"
    if lat >= 42.93 and lon < 11.08:
        return "Colline Metallifere e Montioni"
    if lon < 11.05:
        return "Bandite, Tirli e costa nord"
    return "Maremma grossetana centrale"


official = {
    "A1": (17.6, "Alta"),
    "A1/b": (7.9, "Media"),
    "A2": (11.3, "Media"),
    "A3": (9.6, "Bassa"),
    "A4": (17.4, "Medio/alta"),
    "A5": (1.8, "Bassa"),
    "A6": (2.2, "Bassa"),
    "A7": (5.6, "Bassa"),
    "A8": (10.0, "Bassa"),
    "C1": (11.2, "Alta"),
    "C2": (7.6, "Alta"),
    "T1": (3.9, "Media"),
    "T2": (8.8, "Alta"),
    "T3": (14.8, "Alta"),
}

boundary = json.loads(BOUNDARY.read_text())["features"][0]["geometry"]
trail_elements = json.loads(TRAILS.read_text())["elements"]
nature_elements = json.loads(NATURE.read_text())["elements"]

trails = []
for e in trail_elements:
    c = center(e)
    if not c or not inside_geometry(c[1], c[0], boundary):
        continue
    tags = e.get("tags") or {}
    ref = tags.get("ref")
    name = tags.get("name") or (f"Sentiero {ref}" if ref else "Itinerario escursionistico")
    item = {
        "id": f"{e['type']}/{e['id']}",
        "name": name,
        "ref": ref,
        "operator": tags.get("operator"),
        "lat": c[0],
        "lon": c[1],
        "territory": territory(*c),
        "source": "OpenStreetMap · relazione escursionistica",
        "sourceType": "catalogo cartografico",
        "url": f"https://www.openstreetmap.org/{e['type']}/{e['id']}",
    }
    if tags.get("operator") == "Parco Regionale della Maremma" and ref in official:
        item.update(
            lengthKm=official[ref][0],
            difficulty=official[ref][1],
            officialUrl="https://parco-maremma.it/itinerari/a-piedi/",
            source="Parco Regionale della Maremma + OpenStreetMap",
            sourceType="scheda ufficiale + geometria cartografica",
        )
    trails.append(item)

nature = []
seen = set()
for e in nature_elements:
    c = center(e)
    tags = e.get("tags") or {}
    name = tags.get("name")
    if not c or not name or not inside_geometry(c[1], c[0], boundary):
        continue
    key = name.casefold()
    if key in seen:
        continue
    seen.add(key)
    nature.append(
        {
            "id": f"{e['type']}/{e['id']}",
            "name": name,
            "kind": (
                "Riserva naturale" if tags.get("leisure") == "nature_reserve" else "Area protetta"
            ),
            "protectClass": tags.get("protect_class"),
            "lat": c[0],
            "lon": c[1],
            "territory": territory(*c),
            "source": "OpenStreetMap · perimetro o punto nominato",
            "sourceType": "catalogo cartografico",
            "url": f"https://www.openstreetmap.org/{e['type']}/{e['id']}",
        }
    )

# Cala di Forno is a named destination inside the Park rather than a protected-area
# object in OSM. Keep the coordinate derived from the Park's official A4 GPX.
nature.append(
    {
        "id": "parco-maremma/cala-di-forno",
        "name": "Cala di Forno",
        "kind": "Luogo naturale · Parco della Maremma",
        "protectClass": None,
        "lat": 42.617226,
        "lon": 11.08939,
        "territory": "Uccellina e costa del Parco",
        "source": "Parco Regionale della Maremma · GPX A4",
        "sourceType": "traccia ufficiale",
        "url": "https://parco-maremma.it/itinerari/a-piedi/a4-cala-di-forno/",
    }
)

trails.sort(key=lambda x: (x["territory"], x.get("operator") or "", x.get("ref") or "", x["name"]))
nature.sort(key=lambda x: (x["territory"], x["name"]))
catalog = {
    "verifiedAt": "2026-09-11",
    "scope": "Provincia di Grosseto; il filtro usa il confine amministrativo OSM acquisito il 2026-09-11.",
    "sources": [
        {
            "name": "Regione Toscana · Sentieristica REI",
            "url": "https://www502.regione.toscana.it/geoscopio/servizi/wms/SENTIERISTICA.htm",
        },
        {
            "name": "Regione Toscana · Aree protette e Natura 2000",
            "url": "https://www502.regione.toscana.it/geoscopio/servizi/wms/AREE_PROTETTE.htm",
        },
        {
            "name": "Parco Regionale della Maremma · itinerari",
            "url": "https://parco-maremma.it/itinerari/a-piedi/",
        },
        {"name": "OpenStreetMap", "url": "https://www.openstreetmap.org/copyright"},
    ],
    "stats": {"trails": len(trails), "nature": len(nature)},
    "trails": trails,
    "nature": nature,
}
(ROOT / "data" / "catalog" / "trekking-fallback.json").write_text(
    json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
)
print(json.dumps(catalog["stats"]))
