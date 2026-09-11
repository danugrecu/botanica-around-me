"""Server locale privato e adattatori delle fonti esterne.

Espone tre endpoint con lo stesso contratto del Worker in ``hosted/backend.mjs``:
``/api/environment``, ``/api/land`` e ``/api/around``. Gli upstream sono fissi; il server
non funziona come proxy generico e non salva coordinate o note del diario.
"""

from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlencode, urlparse, parse_qs
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json, math, re, time, threading, ssl, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
CACHE = {}
LOCK = threading.Lock()
POOL = ThreadPoolExecutor(max_workers=6)
TLS = ssl.create_default_context(
    cafile="/etc/ssl/cert.pem" if Path("/etc/ssl/cert.pem").exists() else None
)
WMS = "https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms"
SOIL = "https://www502.regione.toscana.it/ows2/com.rt.wms.RTmap/wms"
G = "{http://www.opengis.net/gml}"


def fetch(url, ttl=3600):
    with LOCK:
        hit = CACHE.get(url)
        if hit and time.time() - hit[0] < ttl:
            return hit[1]
    with urlopen(
        Request(url, headers={"User-Agent": "Botanica-private-research/3.0"}),
        timeout=25,
        context=TLS,
    ) as r:
        value = r.read(8_000_001)
        if len(value) > 8_000_000:
            raise ValueError("Risposta troppo grande")
    with LOCK:
        if len(CACHE) > 400:
            CACHE.clear()
        CACHE[url] = (time.time(), value)
    return value


def props(f):
    return {c.tag.split("}")[-1]: c.text for c in f if "geometry" not in c.tag}


def ring(node):
    return [[round(float(v), 6) for v in p.split(",")[:2]] for p in (node.text or "").split()]


def parse_gml(raw):
    text = raw.decode("utf-8")
    m = re.search(r"<ogr:FeatureCollection[\s\S]*?</ogr:FeatureCollection>", text)
    if not m:
        if "ServiceException" in text:
            raise ValueError("Cartografia: risposta di errore")
        raise ValueError("Formato cartografico non riconosciuto")
    root = ET.fromstring(m.group())
    out = []
    for member in root.findall(G + "featureMember"):
        f = member[0]
        polygons = []
        for p in f.findall(".//" + G + "Polygon"):
            rings = []
            outer = p.find(".//" + G + "outerBoundaryIs//" + G + "coordinates")
            if outer is not None:
                rings.append(ring(outer))
            for inner in p.findall(".//" + G + "innerBoundaryIs//" + G + "coordinates"):
                rings.append(ring(inner))
            if rings:
                polygons.append(rings)
        out.append(
            {
                "layer": f.tag.split("}")[-1],
                "properties": props(f),
                "geometry": {"type": "MultiPolygon", "coordinates": polygons} if polygons else None,
            }
        )
    return out


def inside_ring(lon, lat, coords):
    inside = False
    for i, a in enumerate(coords):
        b = coords[i - 1]
        if (a[1] > lat) != (b[1] > lat) and lon < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[
            0
        ]:
            inside = not inside
    return inside


def contains(f, lat, lon):
    if not f["geometry"]:
        return False
    return any(
        inside_ring(lon, lat, p[0]) and not any(inside_ring(lon, lat, r) for r in p[1:])
        for p in f["geometry"]["coordinates"]
    )


def cartography(lat, lon, soil=False):
    layers = (
        "awc_available_water_capacity"
        if soil
        else "rt_ucs.iducs.10k.2019.rt.full,rt_ucs.idvegfor.rt,rt_ucs.idift.rt.all"
    )
    params = {
        "map": "owspedologia" if soil else "wmsucs",
        "SERVICE": "WMS",
        "VERSION": "1.1.1",
        "REQUEST": "GetFeatureInfo",
        "LAYERS": layers,
        "QUERY_LAYERS": layers,
        "STYLES": "",
        "SRS": "EPSG:4326",
        "BBOX": f"{lon-.0005},{lat-.0005},{lon+.0005},{lat+.0005}",
        "WIDTH": 101,
        "HEIGHT": 101,
        "X": 50,
        "Y": 50,
        "INFO_FORMAT": "text/gml",
        "FEATURE_COUNT": 12,
    }
    features = parse_gml(fetch((SOIL if soil else WMS) + "?" + urlencode(params), 86400))
    # WMS query tolerance may return neighbors: use only polygons containing the actual point.
    features = [f for f in features if contains(f, lat, lon)]
    if soil:
        for f in features:
            f["geometry"] = None
    return {
        "features": features,
        "retrievedAt": time.time(),
        "source": "Regione Toscana",
        "status": "ok",
    }


def terrain(lat, lon):
    dy = 90 / 111320
    dx = dy / math.cos(math.radians(lat))
    points = [(lat, lon), (lat + dy, lon), (lat - dy, lon), (lat, lon + dx), (lat, lon - dx)]
    p = {
        "latitude": ",".join(str(a) for a, b in points),
        "longitude": ",".join(str(b) for a, b in points),
    }
    result = json.loads(fetch("https://api.open-meteo.com/v1/elevation?" + urlencode(p), 86400))[
        "elevation"
    ]
    if len(result) != 5 or any(v is None or not math.isfinite(v) for v in result):
        raise ValueError("Quota incompleta")
    c, n, s, e, w = result
    gx = (e - w) / 180
    gy = (n - s) / 180
    slope = math.degrees(math.atan(math.hypot(gx, gy)))
    aspect = (math.degrees(math.atan2(-gx, -gy)) + 360) % 360 if slope >= 2 else None
    return {
        "elevation": c,
        "slope": round(slope, 1),
        "aspect": round(aspect) if aspect is not None else None,
        "resolution": 90,
        "source": "Copernicus DEM GLO-90 / Open-Meteo",
        "status": "ok",
    }


def weather(lat, lon):
    p = {
        "latitude": lat,
        "longitude": lon,
        "timezone": "Europe/Rome",
        "past_days": 30,
        "forecast_days": 7,
        "daily": "weather_code,precipitation_sum,temperature_2m_mean,temperature_2m_min,temperature_2m_max,wind_speed_10m_max,et0_fao_evapotranspiration",
        "hourly": "soil_temperature_6cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,relative_humidity_2m,vapour_pressure_deficit",
    }
    r = json.loads(fetch("https://api.open-meteo.com/v1/forecast?" + urlencode(p), 3600))
    if "daily" not in r:
        raise ValueError("Meteo incompleto")
    r["retrievedAt"] = time.time()
    r["status"] = "ok"
    return r


def distance_km(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    dlat = (lat2 - lat1) * p
    dlon = (lon2 - lon1) * p
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin(dlon / 2) ** 2
    return 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bounds(lat, lon, radius):
    dy = radius / 111.32
    dx = radius / (111.32 * math.cos(math.radians(lat)))
    return lat - dy, lon - dx, lat + dy, lon + dx


def overpass_context(lat, lon, radius):
    south, west, north, east = bounds(lat, lon, radius)
    box = f"{south:.5f},{west:.5f},{north:.5f},{east:.5f}"
    query = f'[out:json][timeout:20];(rel["type"="route"]["route"="hiking"]({box});nwr["leisure"="nature_reserve"]({box});nwr["boundary"="protected_area"]({box}););out tags center 140;'
    raw = None
    last_error = None
    for endpoint in (
        "https://overpass-api.de/api/interpreter?",
        "https://overpass.kumi.systems/api/interpreter?",
    ):
        try:
            raw = json.loads(fetch(endpoint + urlencode({"data": query}), 3600))
            break
        except Exception as error:
            last_error = error
    if raw is None:
        raise last_error
    trails = []
    natural = []
    seen_trails = set()
    seen_nature = set()
    for e in raw.get("elements", []):
        c = e.get("center") or (
            {"lat": e.get("lat"), "lon": e.get("lon")} if e.get("lat") is not None else {}
        )
        if not isinstance(c.get("lat"), (int, float)) or not isinstance(c.get("lon"), (int, float)):
            continue
        distance = distance_km(lat, lon, c["lat"], c["lon"])
        if distance > radius:
            continue
        tags = e.get("tags") or {}
        url = f"https://www.openstreetmap.org/{e.get('type')}/{e.get('id')}"
        if tags.get("route") == "hiking":
            key = (e.get("type"), e.get("id"))
            if key in seen_trails:
                continue
            seen_trails.add(key)
            ref = tags.get("ref")
            name = tags.get("name") or (f"Sentiero {ref}" if ref else "Itinerario escursionistico")
            trails.append(
                {
                    "id": f"{e.get('type')}/{e.get('id')}",
                    "name": name,
                    "ref": ref,
                    "operator": tags.get("operator"),
                    "difficulty": tags.get("sac_scale"),
                    "surface": tags.get("surface"),
                    "lat": round(c["lat"], 6),
                    "lon": round(c["lon"], 6),
                    "distanceKm": round(distance, 2),
                    "url": url,
                }
            )
        elif tags.get("name"):
            name = tags["name"]
            key = name.casefold()
            if key in seen_nature:
                continue
            seen_nature.add(key)
            kind = (
                "Riserva naturale" if tags.get("leisure") == "nature_reserve" else "Area protetta"
            )
            natural.append(
                {
                    "id": f"{e.get('type')}/{e.get('id')}",
                    "name": name,
                    "kind": kind,
                    "protectClass": tags.get("protect_class"),
                    "lat": round(c["lat"], 6),
                    "lon": round(c["lon"], 6),
                    "distanceKm": round(distance, 2),
                    "url": url,
                }
            )
    trails.sort(key=lambda x: x["distanceKm"])
    natural.sort(key=lambda x: x["distanceKm"])
    return {
        "trails": trails[:40],
        "nature": natural[:30],
        "status": "ok",
        "source": "OpenStreetMap / Overpass",
    }


def flora_context(lat, lon, radius):
    south, west, north, east = bounds(lat, lon, radius)
    year = time.gmtime().tm_year
    p = {
        "taxon_key": 6,
        "has_coordinate": "true",
        "occurrence_status": "present",
        "decimal_latitude": f"{south:.5f},{north:.5f}",
        "decimal_longitude": f"{west:.5f},{east:.5f}",
        "year": f"{year-5},{year}",
        "limit": 300,
    }
    raw = json.loads(fetch("https://api.gbif.org/v1/occurrence/search?" + urlencode(p), 1800))
    by_species = {}
    for e in raw.get("results", []):
        la = e.get("decimalLatitude")
        lo = e.get("decimalLongitude")
        name = e.get("species") or e.get("scientificName")
        key = e.get("speciesKey") or name
        if (
            not isinstance(la, (int, float))
            or not isinstance(lo, (int, float))
            or not name
            or not key
        ):
            continue
        distance = distance_km(lat, lon, la, lo)
        if distance > radius:
            continue
        item = {
            "id": str(e.get("key")),
            "scientificName": name,
            "family": e.get("family"),
            "eventDate": (e.get("eventDate") or "")[:10] or None,
            "year": e.get("year"),
            "lat": round(la, 6),
            "lon": round(lo, 6),
            "distanceKm": round(distance, 2),
            "uncertaintyMeters": e.get("coordinateUncertaintyInMeters"),
            "basisOfRecord": e.get("basisOfRecord"),
            "url": f"https://www.gbif.org/occurrence/{e.get('key')}",
        }
        old = by_species.get(key)
        if not old or (item["distanceKm"], item["eventDate"] or "") < (
            old["distanceKm"],
            old["eventDate"] or "",
        ):
            by_species[key] = item
    flora = sorted(by_species.values(), key=lambda x: x["distanceKm"])[:35]
    return {
        "flora": flora,
        "floraSpeciesCount": len(by_species),
        "floraSampleSize": len(raw.get("results", [])),
        "status": "ok",
        "source": "GBIF Occurrence",
    }


def outdoor_score(rain, tmax, wind):
    if not all(isinstance(x, (int, float)) for x in (rain, tmax, wind)):
        return None
    score = (
        100
        - min(45, rain * 9)
        - max(0, wind - 18) * 1.8
        - max(0, 8 - tmax) * 5
        - max(0, tmax - 30) * 4
    )
    return round(max(0, min(100, score)))


def around_context(lat, lon, radius):
    jobs = {
        "osm": POOL.submit(safe, overpass_context, lat, lon, radius),
        "flora": POOL.submit(safe, flora_context, lat, lon, radius),
        "weather": POOL.submit(safe, weather, lat, lon),
    }
    result = {name: job.result() for name, job in jobs.items()}
    osm = result["osm"] if result["osm"].get("status") == "ok" else {}
    fl = result["flora"] if result["flora"].get("status") == "ok" else {}
    w = result["weather"]
    daily = None
    if w.get("status") == "ok" and w.get("daily"):
        d = w["daily"]
        start = (
            d.get("time", []).index(time.strftime("%Y-%m-%d"))
            if time.strftime("%Y-%m-%d") in d.get("time", [])
            else max(0, len(d.get("time", [])) - 7)
        )
        end = start + 7
        keys = [
            "time",
            "precipitation_sum",
            "temperature_2m_min",
            "temperature_2m_max",
            "wind_speed_10m_max",
            "weather_code",
        ]
        daily = {k: d.get(k, [])[start:end] for k in keys}
        daily["outdoor_score"] = [
            outdoor_score(*x)
            for x in zip(
                daily["precipitation_sum"], daily["temperature_2m_max"], daily["wind_speed_10m_max"]
            )
        ]
    return {
        "lat": lat,
        "lon": lon,
        "radiusKm": radius,
        "trails": osm.get("trails", []),
        "nature": osm.get("nature", []),
        "flora": fl.get("flora", []),
        "floraSpeciesCount": fl.get("floraSpeciesCount", 0),
        "floraSampleSize": fl.get("floraSampleSize", 0),
        "weather": {"daily": daily, "status": "ok"} if daily else {"status": "unavailable"},
        "sources": {
            "trails": result["osm"].get("status"),
            "flora": result["flora"].get("status"),
            "weather": w.get("status"),
        },
        "retrievedAt": time.time(),
    }


def safe(fn, *args):
    try:
        return fn(*args)
    except Exception as e:
        return {"status": "unavailable", "error": str(e)[:180]}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "dist"), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def log_message(self, *args):
        pass  # Do not log private coordinates or notes.

    def do_GET(self):
        u = urlparse(self.path)
        if u.path.startswith("/api/"):
            host = self.headers.get("Host", "").split(":")[0]
            origin = self.headers.get("Origin")
            if host not in ("localhost", "127.0.0.1") or (
                origin and urlparse(origin).hostname not in ("localhost", "127.0.0.1")
            ):
                return self.send_error(403)
            try:
                q = parse_qs(u.query)
                lat = float(q["lat"][0])
                lon = float(q["lon"][0])
                if not (42.35 <= lat <= 43.25 and 10.55 <= lon <= 11.85):
                    raise ValueError("Seleziona un punto nell’area pilota della Maremma")
                lat, lon = round(lat, 5), round(lon, 5)
                if u.path == "/api/environment":
                    jobs = {
                        name: POOL.submit(safe, fn, *args)
                        for name, fn, args in [
                            ("forest", cartography, (lat, lon)),
                            ("soil", cartography, (lat, lon, True)),
                            ("terrain", terrain, (lat, lon)),
                            ("weather", weather, (lat, lon)),
                        ]
                    }
                    result = {name: job.result() for name, job in jobs.items()}
                    result.update({"lat": lat, "lon": lon})
                elif u.path == "/api/land":
                    result = {
                        "lat": lat,
                        "lon": lon,
                        "forest": safe(cartography, lat, lon),
                        "terrain": safe(terrain, lat, lon),
                        "soil": safe(cartography, lat, lon, True),
                    }
                elif u.path == "/api/around":
                    radius = float(q.get("radius", ["25"])[0])
                    if radius not in (5, 10, 25, 50):
                        raise ValueError("Raggio non valido")
                    result = around_context(lat, lon, radius)
                else:
                    return self.send_error(404)
                raw = json.dumps(result, allow_nan=False).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
            except (ValueError, KeyError):
                self.send_error(400, "Coordinate non valide")
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        return super().do_GET()


if __name__ == "__main__":
    print("Botanica privata: http://localhost:4173", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 4173), Handler).serve_forever()
