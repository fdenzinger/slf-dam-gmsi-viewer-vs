# GMSI Wallis – web viewer

Browser viewer for the Ground Motion Sensitivity Index (GMSI, Jacquemart & Manconi 2025) in canton Valais. Shows where Sentinel-1 InSAR can and cannot monitor ground motion. DAM project (WP1), SLF.

Static site, no build step. GeoTIFF data is hosted on Zenodo and streamed via HTTP range requests (`ZENODO_RECORD_ID` in `app.js`); `data/` is local-only and gitignored.

Run locally: `python3 -m http.server 8000`, then open http://localhost:8000.

Data: GMSI © Jacquemart & Manconi (2025); Copernicus Sentinel-1 (ESA); basemaps © swisstopo.

License: All rights reserved (see `LICENSE`) — prototype, not yet open source.

## Citation

Jacquemart, M., & Manconi, A. (2025). TASK 5.1b – A ground motion sensitivity index (GMSI) to facilitate the interpretation of satellite-based radar measurements in alpine terrain. In A. Bast, M. Bründl, & M. Phillips (Eds.), *WSL Berichte: Vol. 181. WSL research programme Climate Change Impacts on Alpine Mass Movements - CCAMM: project report* (pp. 149–153). https://doi.org/10.55419/wsl:41914
