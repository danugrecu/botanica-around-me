import sys, json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import cartography

zones = [
    ("montioni", 42.985, 10.755),
    ("scarlino", 42.89, 10.8),
    ("massa", 43.064, 10.914),
    ("cornate", 43.154, 10.96),
    ("roccastrada", 43.028, 11.101),
    ("farma", 43.082, 11.183),
    ("tirli", 42.881, 10.933),
    ("monti-leoni", 42.925, 11.115),
    ("uccellina", 42.65, 11.09),
    ("scansano", 42.706, 11.333),
    ("civitella", 42.995, 11.28),
    ("cinigiano", 42.89, 11.39),
    ("amiata", 42.875, 11.533),
    ("seggi-amiata", 42.91, 11.57),
    ("castellazzara", 42.77, 11.70),
    ("sovana", 42.655, 11.65),
    ("sorano", 42.695, 11.76),
    ("manciano", 42.56, 11.52),
    ("capalbio", 42.455, 11.43),
    ("argentario", 42.42, 11.17),
    ("giglio", 42.36, 10.90),
]


def select(z):
    id, lat, lon = z
    for dy, dx in [
        (0, 0),
        (0.008, 0.008),
        (-0.008, 0.008),
        (0.008, -0.008),
        (-0.008, -0.008),
        (0.016, 0),
        (-0.016, 0),
        (0, 0.016),
        (0, -0.016),
        (0.024, 0.012),
        (-0.024, -0.012),
    ]:
        try:
            r = cartography(lat + dy, lon + dx)
            f = next((f for f in r["features"] if "iducs.10k.2019" in f["layer"]), None)
            if f and str(f["properties"].get("ucs2019", "")).startswith(("311", "312", "313")):
                return {
                    "id": id,
                    "lat": round(lat + dy, 5),
                    "lon": round(lon + dx, 5),
                    "landcover": f["properties"]["des2019"],
                    "cartography": "UCS 2019",
                    "checkedOn": "2026-09-11",
                }
        except Exception:
            continue
    return {"id": id, "error": "Nessun punto boscato verificato tra i campioni"}


with ThreadPoolExecutor(max_workers=3) as p:
    results = list(p.map(select, zones))
print(json.dumps(results, ensure_ascii=False))
Path(__file__).resolve().parents[1].joinpath("data/forecast/forecast-points.json").write_text(
    json.dumps(results, ensure_ascii=False)
)
