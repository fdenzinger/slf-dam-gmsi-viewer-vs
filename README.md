# GMSI Wallis – web viewer

Browser viewer for the Ground Motion Sensitivity Index (GMSI, Jacquemart & Manconi 2025) in canton Valais/Wallis. Shows where Sentinel-1 InSAR can and cannot monitor ground motion. Developed within the DAM project (WP1), SLF.

Static site (HTML/JS/CSS, no build step). The GeoTIFF data is meant to be hosted remotely (Zenodo or Envidat) and streamed via HTTP range requests; set the record ID / base URL in `app.js` (`ZENODO_RECORD_ID` / `RASTER_BASE_URL`) once published — currently unset (`data/` is local-only and gitignored).

Run locally: `python3 -m http.server 8000`, then open http://localhost:8000. Until the remote data is published, use the "Ordner auswählen" picker or drag-and-drop to load the `data/` folder directly (or `data/rasters`).

Tracks: unlike canton Graubünden (A015, A088, A117, D066, D168), Valais is covered by a different set of Sentinel-1 relative orbits. Of the 6 Swiss-wide tracks available from the data provider, only A015, A088, D066 and D139 reach Valais (A117 and D168 have zero coverage there). Combined, these four cover an estimated ~42% of the canton (rest is radar shadow/layover or outside all four swaths).

Data: GMSI © Jacquemart & Manconi (2025); Copernicus Sentinel-1 (ESA); basemaps © swisstopo.

License: All rights reserved (see `LICENSE`) — prototype, not yet open source.
