# GMSI Wallis – web viewer

Browser viewer for the Ground Motion Sensitivity Index (GMSI, Jacquemart & Manconi 2025) in canton Valais. Shows where Sentinel-1 InSAR can and cannot monitor ground motion. DAM project (WP1), SLF.

Static site, no build step. GeoTIFF data is hosted on Zenodo and streamed via HTTP range requests (`ZENODO_RECORD_ID` in `app.js`); `data/` is local-only and gitignored.

Run locally: `python3 -m http.server 8000`, then open http://localhost:8000.

Of the 6 Swiss-wide Sentinel-1 tracks available, only A015/A088/D066/D139 reach Valais, covering ~42% of the canton combined.

Data: GMSI © Jacquemart & Manconi (2025); Copernicus Sentinel-1 (ESA); basemaps © swisstopo.

License: All rights reserved (see `LICENSE`) — prototype, not yet open source.
