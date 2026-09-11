/**
 * Leaflet map controller.
 *
 * Purpose:
 * - isolate map creation and Leaflet layer management;
 * - keep the app bootstrap small and reduce Leaflet-specific logic from main.mjs.
 *
 * Inputs:
 * - an element id for the map container and optional runtime settings.
 *
 * Outputs:
 * - a configured Leaflet map plus commonly used layers for the app.
 * - no Ecology or forecast scoring logic.
 */

export function createMap(containerId, options = {}) {
  const map = L.map(containerId, {
    zoomControl: false,
    scrollWheelZoom: true,
    ...options.map,
  });

  L.control.zoom({ position: 'topright' }).addTo(map);

  const base = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
    ...options.base,
  }).addTo(map);

  const forest = L.tileLayer.wms(
    'https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms?map=wmsucs',
    {
      layers: 'rt_ucs.iducs.10k.2019.rt.full',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      opacity: 0.45,
      attribution: 'Regione Toscana · UCS 2019',
      ...options.forest,
    },
  );

  const vegetation = L.tileLayer.wms(
    'https://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms?map=wmsucs',
    {
      layers: 'rt_ucs.idvegfor.rt',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      opacity: 0.5,
      attribution: 'Regione Toscana · vegetazione storica',
      ...options.vegetation,
    },
  );

  const radiusLayer = L.circle([options.center?.lat ?? 42.82, options.center?.lon ?? 11.13], {
    radius: (options.radiusKm ?? 25) * 1000,
    color: '#61736c',
    weight: 2,
    dashArray: '7 7',
    fillColor: '#dce7da',
    fillOpacity: 0.05,
    interactive: false,
  }).addTo(map);

  const forecastAreas = L.layerGroup().addTo(map);
  const polygon = L.geoJSON(null, {
    style: { color: '#173c34', weight: 4, fillColor: '#dcec98', fillOpacity: 0.16 },
    interactive: false,
  }).addTo(map);
  const nearLayer = L.layerGroup().addTo(map);
  const pointMarker = L.circleMarker([options.point?.lat ?? 42.925, options.point?.lon ?? 11.115], {
    radius: 8,
    color: '#fff',
    weight: 3,
    fillColor: '#173c34',
    fillOpacity: 1,
  }).addTo(map);

  L.control
    .layers(
      { OpenStreetMap: base },
      { 'Copertura del suolo · 2019': forest, 'Vegetazione · carta storica': vegetation },
      { position: 'bottomright' },
    )
    .addTo(map);

  return {
    map,
    base,
    forest,
    vegetation,
    radiusLayer,
    forecastAreas,
    polygon,
    nearLayer,
    pointMarker,
  };
}
