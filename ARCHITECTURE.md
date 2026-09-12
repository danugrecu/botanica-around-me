# ARCHITECTURE.md

## High-level architecture

```text
Browser
  ↓
generated dist
  ↓
frontend modules
  ↓
Botanica API
  ↓
Python local backend / hosted Worker
  ↓
external providers
```

The app is a browser-first frontend that sends requests to the local backend or the hosted Worker, which in turn call the external data providers. The frontend modules are organized by responsibility and the runtime output is generated under `dist/` from source under `src/`, `data/` and `vendor/`.

## Repository structure

```text
.
├── README.md
├── ARCHITECTURE.md
├── AGENTS.md
├── DATA_SOURCES.md
├── ON-BOARDING.md
├── package.json
├── server.py
├── src/
│   ├── backend/
│   │   └── hosted/
│   │       └── backend.mjs
│   └── frontend/
│       ├── app/
│       ├── analysis/
│       ├── around/
│       ├── clients/
│       ├── diary/
│       ├── ecology/
│       ├── forecast/
│       ├── map/
│       ├── shared/
│       ├── index.html
│       └── styles/
├── data/
│   ├── catalog/
│   └── forecast/
├── vendor/
│   └── leaflet/
├── scripts/
│   ├── build-assets.mjs
│   ├── build-hosted.mjs
│   ├── build_maremma_catalog.py
│   └── select_forecast_points.py
├── tests/
├── dist/
└── .gitignore
```

## Frontend modules

### `src/frontend/app/main.mjs`

This is the main application orchestrator. It still keeps a non-trivial amount of UI state, render coordination, navigation and event wiring, but it no longer owns the Leaflet setup itself or the Botanica API request composition.

### `src/frontend/map/map.mjs`

Dedicated Leaflet controller. It owns:

- map creation;
- base tile layer and WMS overlays;
- point marker;
- radius circle;
- polygon layer;
- near-layer updates;
- basic click handling.

It does not compute Ecology scores, diary data or external provider calls.

### `src/frontend/analysis/grid-scan.mjs`

Generates the nine nearby points used by the 3x3 comparison. It preserves the same nominal 500 m step and ordering and is testable without DOM logic.

### `src/frontend/around/around.mjs`

Handles Around Me, including the center/radius, regional overlays, live data merging, catalog fallback, flora and nature points, and the resulting view state.

### `src/frontend/forecast/forecast.mjs`

Loads forecast points, keeps the local cache, requests the environment for each point, ranks the results and renders the best contiguous favorable window.

### `src/frontend/ecology/ecology.mjs`

Contains the ecological scoring logic, species profiles, weather summaries and the heuristic model used for fungal compatibility and context scoring.

### `src/frontend/ecology/model.mjs`

Contains the static model metadata and compatibility catalog. It is still relevant for the current prototype, including the legacy `estimate()` compatibility path.

### `src/frontend/diary/diary.mjs`

Manages localStorage persistence, diary normalization, CSV export and JSON backup for the browser-only log.

### `src/frontend/clients/botanica-api.mjs`

Centralizes all frontend requests to:

- `/api/environment`
- `/api/land`
- `/api/around`

This is the canonical browser-side request layer for Botanica endpoints.

### `src/frontend/clients/weather.mjs`

Browser fallback client for Open-Meteo and outdoor-score logic used when the backend response is not available or incomplete.

### `src/frontend/shared/*`

Shared helpers for display formatting and geographic calculations, mainly:

- `display.mjs`
- `geo.mjs`

## Backend local

`server.py` remains the local backend entry point. It serves the generated static files from `dist/` and exposes the URLs:

- `GET /api/environment`
- `GET /api/land`
- `GET /api/around`

It still performs the full request composition and provider orchestration in one file. This is intentionally monolithic for now and is not being refactored in this phase.

## Hosted backend

`src/backend/hosted/backend.mjs` is the hosted Worker equivalent of the local backend. It duplicates the same runtime logic contract, with the same external provider structure and the same endpoint URLs, but is packaged for hosted deployment. The two backends are intentionally similar, but not yet merged into a shared service layer.

## Runtime data

The runtime datasets live under:

- `data/catalog/trekking-fallback.json`
- `data/forecast/forecast-points.json`

These are static runtime inputs used by the app and are published into `dist/` by the build process.

## Vendor

Leaflet is vendored locally under:

- `vendor/leaflet/`

This keeps the third-party JS/CSS assets under repository control and avoids a package install requirement for the UI map library.

## Build

The runtime output is generated from source, data and vendor assets:

```text
src + data + vendor
  → scripts/build-assets.mjs
  → dist/
```

`scripts/build-assets.mjs` copies the frontend and static runtime assets into the generated output directory. `scripts/build-hosted.mjs` packages the hosted backend and the generated asset tree into the Worker bundle. `dist/` is generated output only and is not a source directory.

## Storage

The browser persists local data in localStorage under the following keys:

- `fungapp-logs-v1`
- `botanica-around-v3:*`
- `fungapp-prediction-v2:*`

These keys are intentionally preserved for compatibility with the existing application behavior.

## API contracts

The current API contract is deliberately minimal and consistent with the current implementation:

### `GET /api/environment?lat=...&lon=...`

Returns the full environmental context for the selected point, including forest, soil, terrain and weather data.

### `GET /api/land?lat=...&lon=...`

Returns land, forest and terrain context without the weather payload. It is used for the 3x3 comparison around the selected point.

### `GET /api/around?lat=...&lon=...&radius=...`

Returns the surrounding local context for trails, nature, flora, and the day weather, within the requested radius.

All responses may carry partial availability via `status: "unavailable"` or missing fields; the UI is expected to handle partial data without converting missing values to zero.

## Known technical debt

These are real and still relevant, but they are not blocker-level issues for the current MVP:

- `server.py` is still monolithic and not split into services/providers.
- `src/backend/hosted/backend.mjs` duplicates the local backend logic.
- `src/frontend/app/main.mjs` still carries a meaningful amount of orchestration and rendering work.
- The 3x3 comparison is functionally there but not fully extracted into a dedicated runtime-only module.
- Python/Worker contract testing is still improvable.
- The legacy `estimate()` path in `model.mjs` remains as compatibility code.

These are documented as technical debt, not as a reason to avoid the current product baseline.
