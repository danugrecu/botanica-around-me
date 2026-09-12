import json
import sys
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import urlopen
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from server import Handler, parse_gml, contains, distance_km, bounds, outdoor_score

GML = """--boundary\n<?xml version="1.0"?><ogr:FeatureCollection xmlns:ogr="http://ogr.maptools.org/" xmlns:gml="http://www.opengis.net/gml"><gml:featureMember><ogr:test><ogr:geometryProperty><gml:MultiPolygon><gml:polygonMember><gml:Polygon><gml:outerBoundaryIs><gml:LinearRing><gml:coordinates>10,42 11,42 11,43 10,43 10,42</gml:coordinates></gml:LinearRing></gml:outerBoundaryIs><gml:innerBoundaryIs><gml:LinearRing><gml:coordinates>10.4,42.4 10.6,42.4 10.6,42.6 10.4,42.6 10.4,42.4</gml:coordinates></gml:LinearRing></gml:innerBoundaryIs></gml:Polygon></gml:polygonMember></gml:MultiPolygon></ogr:geometryProperty><ogr:ucs2019>311</ogr:ucs2019></ogr:test></gml:featureMember></ogr:FeatureCollection>\n--boundary"""


class GeographicTests(unittest.TestCase):
    def test_multipart_and_holes(self):
        features = parse_gml(GML.encode())
        self.assertEqual(features[0]["properties"]["ucs2019"], "311")
        self.assertTrue(contains(features[0], 42.2, 10.2))
        self.assertFalse(contains(features[0], 42.5, 10.5))
        self.assertFalse(contains(features[0], 44, 11))

    def test_service_error(self):
        with self.assertRaises(ValueError):
            parse_gml(b"<ServiceException>error</ServiceException>")

    def test_radius_geometry(self):
        self.assertAlmostEqual(distance_km(42.89, 10.8, 42.89, 10.8), 0)
        south, west, north, east = bounds(42.89, 10.8, 25)
        self.assertLess(south, 42.89)
        self.assertGreater(north, 42.89)
        self.assertLess(west, 10.8)
        self.assertGreater(east, 10.8)
        self.assertAlmostEqual(distance_km(42.89, 10.8, north, 10.8), 25, places=1)

    def test_outdoor_score_is_bounded_and_penalizes_conditions(self):
        self.assertEqual(outdoor_score(0, 24, 10), 100)
        self.assertLess(outdoor_score(8, 34, 35), outdoor_score(0, 24, 10))
        self.assertGreaterEqual(outdoor_score(100, 45, 100), 0)
        self.assertIsNone(outdoor_score(None, 24, 10))


class ApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.originals = {
            "cartography": server.cartography,
            "terrain": server.terrain,
            "weather": server.weather,
            "around_context": server.around_context,
        }
        server.cartography = lambda lat, lon, soil=False: {
            "status": "ok" if not soil else "unavailable",
            "features": [] if not soil else None,
        }
        server.terrain = lambda lat, lon: {"status": "ok", "elevation": 100}
        server.weather = lambda lat, lon: {"status": "ok", "daily": {"time": []}}
        server.around_context = lambda lat, lon, radius: {
            "lat": lat,
            "lon": lon,
            "radiusKm": radius,
            "trails": [],
            "nature": [],
            "flora": [],
            "floraSpeciesCount": 0,
            "floraSampleSize": 0,
            "weather": {"status": "unavailable"},
            "sources": {"trails": "unavailable", "flora": "ok", "weather": "unavailable"},
        }
        cls.httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.httpd.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.thread.join(timeout=2)
        cls.httpd.server_close()
        for name, value in cls.originals.items():
            setattr(server, name, value)

    def get_json(self, path):
        with urlopen(self.base_url + path) as response:
            self.assertEqual(response.status, 200)
            return json.loads(response.read())

    def test_environment_land_and_around_shapes(self):
        environment = self.get_json("/api/environment?lat=42.925&lon=11.115")
        self.assertEqual(set(("lat", "lon", "forest", "soil", "terrain", "weather")), environment.keys())

        land = self.get_json("/api/land?lat=42.925&lon=11.115")
        self.assertEqual(set(("lat", "lon", "forest", "soil", "terrain")), land.keys())
        self.assertNotIn("weather", land)

        around = self.get_json("/api/around?lat=42.925&lon=11.115&radius=10")
        self.assertEqual(around["radiusKm"], 10)
        self.assertEqual(around["weather"]["status"], "unavailable")

    def test_invalid_queries_are_rejected(self):
        for query in (
            "lat=foo&lon=bar",
            "lat=0&lon=0",
            "lat=42.925&lon=11.115&radius=7",
        ):
            with self.subTest(query=query), self.assertRaises(HTTPError) as error:
                urlopen(self.base_url + "/api/around?" + query)
            self.assertEqual(error.exception.code, 400)

    def test_non_local_api_host_is_rejected(self):
        request_url = self.base_url + "/api/land?lat=42.925&lon=11.115"
        with self.assertRaises(HTTPError) as error:
            from urllib.request import Request

            urlopen(Request(request_url, headers={"Host": "example.invalid"}))
        self.assertEqual(error.exception.code, 403)


if __name__ == "__main__":
    unittest.main()
