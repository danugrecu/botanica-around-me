import sys, unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import parse_gml, contains, distance_km, bounds, outdoor_score

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


if __name__ == "__main__":
    unittest.main()
