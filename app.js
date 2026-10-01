// GMSI Wallis – standalone browser viewer
// No server required: the project folder is loaded via drag-and-drop or a
// folder picker, and rasters are read directly as local Files/Blobs
// (avoids the file:// CORS restriction that blocks fetch() of sibling files).

if (typeof proj4 !== "undefined") {
  proj4.defs(
    "EPSG:2056",
    "+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 " +
    "+x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs"
  );
}

// Zenodo rate-limits anonymous requests (~133 per minute per IP) and geotiff.js
// has no retry logic, so a 429 would show up as blank tiles. Wait for the
// window to reset (X-RateLimit-Reset is exposed to cross-origin scripts) and
// retry instead.
(function () {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input && input.url;
    if (!url || !url.startsWith("https://zenodo.org/")) return nativeFetch(input, init);
    for (let attempt = 0; ; attempt++) {
      const resp = await nativeFetch(input, init);
      if (resp.status !== 429 || attempt >= 3) return resp;
      const reset = Number(resp.headers.get("x-ratelimit-reset"));
      const wait = reset ? reset * 1000 - Date.now() + 500 : 2000 * (attempt + 1);
      await new Promise((r) => setTimeout(r, Math.min(Math.max(wait, 1000), 65000)));
    }
  };
})();

const state = {
  map: null,
  mode: "easy",
  layers: {}, // file -> { manifest, leafletLayer, checked }
  basemaps: {}, // "hillshade" | "grau" | "swissimage" -> Leaflet layer
  currentBasemap: "grau",
};

// ---------------------------------------------------------------- custom EPSG:2056 (LV95) CRS
//
// The GMSI rasters are natively EPSG:2056. Rather than reprojecting that
// data (lossy, and re-warping per pixel at render time is far too slow --
// tried it, ~65k proj4 calls per tile), the map itself is set up to run
// natively in EPSG:2056: swisstopo's WMS (not WMTS -- WMTS is pre-tiled in
// EPSG:3857 only) can render any layer directly in EPSG:2056 on request,
// and every Leaflet "tile" is then, by construction, already an exact
// rectangle in the GMSI data's own CRS. So GeoTiffColorLayer goes back to
// a plain 2-corner bbox read per tile: fast, and correct at every zoom
// level (no rectangle-in-one-CRS-isn't-a-rectangle-in-another distortion).
const LV95_RESOLUTIONS = [650, 500, 250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5, 0.25, 0.1];
const LV95_ORIGIN_X = 2420000;
const LV95_ORIGIN_Y = 1350000;

const CRS_LV95 = L.extend({}, L.CRS.Earth, {
  code: "EPSG:2056",
  wrapLng: undefined,
  projection: {
    project: function (latlng) {
      const p = proj4("EPSG:4326", "EPSG:2056", [latlng.lng, latlng.lat]);
      return new L.Point(p[0], p[1]);
    },
    unproject: function (point) {
      const ll = proj4("EPSG:2056", "EPSG:4326", [point.x, point.y]);
      return new L.LatLng(ll[1], ll[0]);
    },
    bounds: L.bounds([2420000, 1030000], [2900000, 1350000]),
  },
  transformation: new L.Transformation(1, -LV95_ORIGIN_X, -1, LV95_ORIGIN_Y),
  scale: function (zoom) {
    const i = Math.floor(zoom);
    const base = LV95_RESOLUTIONS[Math.min(i, LV95_RESOLUTIONS.length - 1)];
    if (zoom === i || i >= LV95_RESOLUTIONS.length - 1) return 1 / base;
    const next = LV95_RESOLUTIONS[i + 1];
    const frac = zoom - i;
    return 1 / (base + frac * (next - base));
  },
  zoom: function (scale) {
    const res = 1 / scale;
    const R = LV95_RESOLUTIONS;
    for (let i = 0; i < R.length - 1; i++) {
      if (res <= R[i] && res >= R[i + 1]) {
        return i + Math.log(R[i] / res) / Math.log(R[i] / R[i + 1]);
      }
    }
    return res > R[0] ? 0 : R.length - 1;
  },
  infinite: true,
});

function swissWms(layerName, extraOpts) {
  return L.tileLayer.wms("https://wms.geo.admin.ch/", Object.assign({
    layers: layerName,
    format: "image/png",
    transparent: false,
    version: "1.3.0",
    maxZoom: LV95_RESOLUTIONS.length - 1,
    zIndex: 0,
  }, extraOpts || {}));
}

const SWISSTOPO_GRAU = swissWms("ch.swisstopo.pixelkarte-grau", { attribution: "© swisstopo" });
const SWISSTOPO_SWISSIMAGE = swissWms("ch.swisstopo.swissimage", { attribution: "© swisstopo" });
// ground (bare terrain) vs surface (incl. vegetation/buildings) hillshades,
// served on demand from swisstopo instead of shipping a local raster --
// cuts the download size a lot for a basemap most people leave in the
// background
const SWISSTOPO_ALTI3D_HILLSHADE = swissWms("ch.swisstopo.swissalti3d-reliefschattierung", {
  attribution: "swissALTI3D &copy; swisstopo",
});
const SWISSTOPO_SURFACE3D_HILLSHADE = swissWms("ch.swisstopo.swisssurface3d-reliefschattierung-multidirektional", {
  attribution: "swissSURFACE3D &copy; swisstopo",
});

function setBasemap(name) {
  const prev = state.basemaps[state.currentBasemap];
  if (prev && state.map.hasLayer(prev)) state.map.removeLayer(prev);
  state.currentBasemap = name;
  const next = state.basemaps[name];
  if (next) next.addTo(state.map);
}

// single entry point for both the sidebar radios and the on-map control,
// so the two stay in sync no matter which one the user touches
function chooseBasemap(name) {
  setBasemap(name);
  scheduleHashUpdate();
  document.querySelectorAll(".basemap-control-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.value === name);
  });
}

// small Leaflet control (bottom-left, like the classic basemap-switcher
// pattern) so the basemap can be changed without opening the sidebar
const BasemapControl = L.Control.extend({
  options: { position: "bottomleft" },
  onAdd: function () {
    const container = L.DomUtil.create("div", "leaflet-bar basemap-control");
    const button = L.DomUtil.create("a", "basemap-control-btn", container);
    button.href = "#";
    button.title = "Hintergrundkarte wechseln";
    button.setAttribute("role", "button");
    button.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24">' +
      '<path d="M12 3L2 9l10 6 10-6-10-6z" fill="#1c1e21"/>' +
      '<path d="M2 13l10 6 10-6" fill="none" stroke="#1c1e21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M2 17.5l10 6 10-6" fill="none" stroke="#1c1e21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>";

    const menu = L.DomUtil.create("div", "basemap-control-menu hidden", container);
    const options = [
      { value: "grau", label: "Landeskarte grau" },
      { value: "swissimage", label: "SWISSIMAGE" },
      { value: "alti3d", label: "Relief swissALTI3D (Gelände)" },
      { value: "surface3d", label: "Relief swissSURFACE3D (Oberfläche)" },
    ];
    options.forEach((opt) => {
      const item = L.DomUtil.create("div", "basemap-control-item", menu);
      item.textContent = opt.label;
      item.dataset.value = opt.value;
      item.classList.toggle("active", opt.value === state.currentBasemap);
      item.addEventListener("click", () => {
        chooseBasemap(opt.value);
        menu.classList.add("hidden");
      });
    });

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    button.addEventListener("click", (e) => {
      e.preventDefault();
      menu.classList.toggle("hidden");
    });
    return container;
  },
});

// on-map "copy link to this view" button, same size/look as the basemap
// button and stacked directly above it
const ShareControl = L.Control.extend({
  options: { position: "bottomleft" },
  onAdd: function () {
    const container = L.DomUtil.create("div", "leaflet-bar basemap-control share-control");
    const button = L.DomUtil.create("a", "basemap-control-btn", container);
    button.href = "#";
    button.title = "Link zu dieser Ansicht kopieren";
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", "Link zu dieser Ansicht kopieren");
    button.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1e21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/>' +
      '<path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>' +
      "</svg>";
    const toast = L.DomUtil.create("div", "share-toast hidden", container);

    L.DomEvent.disableClickPropagation(container);
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      writeHash(); // make sure the address bar is current before copying
      let ok = true;
      try {
        await navigator.clipboard.writeText(location.href);
      } catch (err) {
        ok = false;
        window.prompt("Link zu dieser Ansicht:", location.href); // no clipboard access (e.g. plain http)
      }
      if (ok) {
        toast.textContent = "Link kopiert";
        toast.classList.remove("hidden");
        setTimeout(() => toast.classList.add("hidden"), 2000);
      }
    });
    return container;
  },
});

// ---------------------------------------------------------------- click-to-query

async function readRasterValue(leafletLayer, latlng) {
  const tiff = leafletLayer._tiff;
  const nodata = leafletLayer._nodata;
  const [x, y] = proj4("EPSG:4326", "EPSG:2056", [latlng.lng, latlng.lat]);
  try {
    const rasters = await tiff.readRasters({
      bbox: [x - 5, y - 5, x + 5, y + 5],
      width: 1,
      height: 1,
      resampleMethod: "nearest",
      fillValue: nodata,
    });
    const v = rasters[0][0];
    if (v === nodata || v === undefined || v === null || Number.isNaN(v)) return null;
    return v;
  } catch (err) {
    return null;
  }
}

// ---------------------------------------------------------------- shareable link (URL hash)
//
// The current view is mirrored into the URL hash, e.g.
//   #ll=46.8123,9.5234&z=9&b=grau&l=composite,A015&o=A015:50&p=46.80,9.52
// (centre, zoom, basemap, ticked layers, non-default opacity, clicked spot).
// Copy the address bar (or use the share button) to send exactly this view.

const layerId = (file) => file.replace(/^GMSI_VS_/, "").replace(/\.tif$/, "").replace("shadow_layover_", "S_");
const fileForLayerId = (id) => Object.keys(state.layers).find((f) => layerId(f) === id);

function buildHash() {
  const p = new URLSearchParams();
  const c = state.map.getCenter();
  p.set("ll", `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`);
  p.set("z", String(state.map.getZoom()));
  p.set("b", state.currentBasemap);
  if (state.mode === "expert") p.set("m", "e");
  const on = [], ops = [];
  for (const f in state.layers) {
    const en = state.layers[f];
    if (en.manifest.group === 0) continue;
    if (en.checked) on.push(layerId(f));
    const def = defaultOpacityForKind(en.manifest.kind);
    if (en.opacity != null && Math.abs(en.opacity - def) > 0.001) ops.push(`${layerId(f)}:${Math.round(en.opacity * 100)}`);
  }
  p.set("l", on.join(","));
  if (ops.length) p.set("o", ops.join(","));
  if (state.pin) p.set("p", `${state.pin.lat.toFixed(5)},${state.pin.lng.toFixed(5)}`);
  // keep commas readable in the URL
  return p.toString().replace(/%2C/g, ",").replace(/%3A/g, ":");
}

function writeHash() {
  if (!state.hashReady || !state.map) return;
  try {
    history.replaceState(null, "", location.pathname + location.search + "#" + buildHash());
  } catch (err) { /* e.g. sandboxed frame: sharing simply falls back to the plain URL */ }
}
let hashTimer = null;
function scheduleHashUpdate() {
  if (!state.hashReady) return;
  clearTimeout(hashTimer);
  hashTimer = setTimeout(writeHash, 300);
}

function setLayerOpacity(file, opacity) {
  const en = state.layers[file];
  if (!en) return;
  en.opacity = opacity;
  if (en.leafletLayer) en.leafletLayer.setOpacity(opacity);
  if (en.sliderEl) {
    en.sliderEl.value = String(Math.round((1 - opacity) * 100));
    en.sliderEl.dispatchEvent(new Event("input")); // refreshes the % label
  }
}

function applyHashState() {
  const p = new URLSearchParams(location.hash.replace(/^#/, ""));
  if (![...p.keys()].length) return;
  const num = (s) => (s === null || s === "" ? NaN : Number(s));

  const [lat, lng] = (p.get("ll") || "").split(",").map(num);
  const z = num(p.get("z"));
  if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(z)) {
    state.map.setView([lat, lng], Math.max(0, Math.min(14, Math.round(z))), { animate: false });
  }
  const b = p.get("b");
  if (b && state.basemaps[b]) chooseBasemap(b);

  const ids = (p.get("l") || "").split(",").filter(Boolean);
  const files = ids.map(fileForLayerId).filter(Boolean);
  const needsExpert = p.get("m") === "e" || files.some((f) => state.layers[f].manifest.group !== 1);
  if (needsExpert) setMode("expert");
  if (needsExpert && p.has("l")) {
    for (const f in state.layers) {
      const en = state.layers[f];
      if (en.manifest.group === 0) continue;
      const want = files.includes(f);
      if (en.checked !== want) {
        if (en.checkboxEl) en.checkboxEl.checked = want;
        toggleLayer(f, want);
      }
    }
  }
  for (const pair of (p.get("o") || "").split(",").filter(Boolean)) {
    const [id, pct] = pair.split(":");
    const f = fileForLayerId(id);
    if (f && Number.isFinite(num(pct))) setLayerOpacity(f, Math.max(0, Math.min(1, num(pct) / 100)));
  }
  const [plat, plng] = (p.get("p") || "").split(",").map(num);
  if (Number.isFinite(plat) && Number.isFinite(plng)) showSiteSummary(L.latLng(plat, plng));
}

// ---------------------------------------------------------------- site summary
//
// Clicking the map opens a plain-language summary for that spot: verdict from
// the composite, best track, and (loaded on demand, because each track file is
// a separate download) a comparison of all tracks. The clicked point is also
// stored in the share link, so a shared link reopens the same summary.

function verdictFor(v) {
  if (v === null) {
    return {
      cls: "none", title: "Keine Daten",
      text: "An dieser Stelle liegen keine Werte vor: entweder ausserhalb von Wallis oder in keinem Track auswertbar (Radarschatten, Layover oder zu geringe Kohärenz).",
    };
  }
  if (v >= 0.4) return { cls: "good", title: "Gut geeignet", text: "Hier sind gute Radarmessungen mit Sentinel‑1 wahrscheinlich." };
  if (v >= 0.2) return { cls: "mid", title: "Eingeschränkt geeignet", text: "Messungen sind möglich, die Ergebnisse sollten aber mit Vorsicht interpretiert werden." };
  return {
    cls: "bad", title: "Schwierig",
    text: "Gute Messungen sind hier schwer zu erhalten. Ein tiefer Wert kann an der Geometrie liegen oder an einer sich rasch verändernden Oberfläche (z. B. Vegetation, Schnee oder eine Rutschung).",
  };
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

// best-effort terrain height from swisstopo; never blocks the summary
async function fetchHeight(x, y) {
  try {
    const r = await fetch(`https://api3.geo.admin.ch/rest/services/height?easting=${x}&northing=${y}&sr=2056`);
    if (!r.ok) return null;
    const h = Number((await r.json()).height);
    return Number.isFinite(h) ? Math.round(h) : null;
  } catch (err) {
    return null;
  }
}

async function buildTrackComparison(latlng, token, container) {
  container.textContent = "Lade alle Tracks …";
  if (state.summaryPopup) state.summaryPopup.update();
  // open all per-track files in parallel (only headers, a few requests each)
  await Promise.all(
    TRACKS_VS.flatMap((t) => [`GMSI_VS_${t}.tif`, `GMSI_VS_shadow_layover_${t}.tif`])
      .filter((f) => state.layers[f])
      .map((f) => loadLazyLayer(f))
  );
  const rows = [];
  for (const t of TRACKS_VS) {
    const gEntry = state.layers[`GMSI_VS_${t}.tif`];
    const sEntry = state.layers[`GMSI_VS_shadow_layover_${t}.tif`];
    if (!gEntry) continue;
    if (token !== state.summaryToken) return; // another spot was clicked meanwhile
    const g = gEntry.leafletLayer ? await readRasterValue(gEntry.leafletLayer, latlng) : null;
    const sh = sEntry && sEntry.leafletLayer ? await readRasterValue(sEntry.leafletLayer, latlng) : null;
    rows.push({ t, g, geometryBlocked: sh === 5 || sh === 17 || sh === 21 });
  }
  if (token !== state.summaryToken) return;

  container.textContent = "";
  const table = el("table", "track-table");
  const head = el("tr");
  ["Track", "Richtung", "GMSI"].forEach((h) => head.appendChild(el("th", "", h)));
  table.appendChild(head);
  let good = 0;
  for (const r of rows) {
    const tr = el("tr");
    tr.appendChild(el("td", "", r.t));
    tr.appendChild(el("td", "", TRACK_INFO[r.t].richtung));
    const td = el("td");
    if (r.g !== null) {
      const dot = el("span", "dot");
      dot.style.background = r.g >= 0.4 ? "#1A9641" : r.g >= 0.2 ? "#FDB863" : "#D7191C";
      td.append(dot, document.createTextNode(r.g.toFixed(2)));
      if (r.g >= 0.4) good++;
    } else {
      td.textContent = r.geometryBlocked ? "Schatten/Layover" : "keine Daten";
      td.className = "muted";
    }
    tr.appendChild(td);
    table.appendChild(tr);
  }
  container.appendChild(table);

  let msg;
  if (good === 0) msg = "In keinem Track sind gute Werte (≥ 0.4) vorhanden.";
  else if (good === 1) msg = "Nur in einem Track gut messbar – das ist anfälliger als Orte, die in mehreren Tracks gut messbar sind.";
  else msg = `In ${good} von ${rows.length} Tracks gut messbar – die Messbarkeit ist robust.`;
  container.appendChild(el("p", "track-msg", msg));
  if (state.summaryPopup) state.summaryPopup.update(); // grow + re-pan into view
}

async function showSiteSummary(latlng) {
  const token = (state.summaryToken = (state.summaryToken || 0) + 1);
  const popup = L.popup({ maxWidth: 300, className: "site-popup", autoPanPaddingTopLeft: [20, 70], autoPanPaddingBottomRight: [20, 20] })
    .setLatLng(latlng)
    .setContent("Lade …")
    .openOn(state.map);
  state.summaryPopup = popup;
  state.pin = latlng; // set after openOn: opening closes the previous popup, which clears the pin
  scheduleHashUpdate();

  const [x, y] = proj4("EPSG:4326", "EPSG:2056", [latlng.lng, latlng.lat]);
  const heightPromise = fetchHeight(x.toFixed(0), y.toFixed(0));

  const composite = state.layers["GMSI_VS_composite.tif"];
  const cv = composite && composite.leafletLayer ? await readRasterValue(composite.leafletLayer, latlng) : null;
  const bestOrbit = state.layers["GMSI_VS_best_orbit.tif"];
  const ov = bestOrbit && bestOrbit.leafletLayer ? await readRasterValue(bestOrbit.leafletLayer, latlng) : null;
  if (token !== state.summaryToken) return;

  const verdict = verdictFor(cv);
  const box = el("div", "site-summary");
  L.DomEvent.disableClickPropagation(box); // clicks on the button/table must not trigger a new map click
  const head = el("div", `verdict verdict-${verdict.cls}`);
  head.appendChild(el("strong", "", verdict.title));
  if (cv !== null) head.appendChild(el("span", "verdict-value", `GMSI ${cv.toFixed(2)}`));
  box.appendChild(head);
  box.appendChild(el("p", "verdict-text", verdict.text));

  const track = ov !== null ? ORBIT_INDEX_ORDER[Math.round(ov)] : null;
  if (track && TRACK_INFO[track]) {
    const p = el("p", "best-track");
    p.appendChild(el("strong", "", "Bester Track: "));
    p.appendChild(document.createTextNode(`${track} (${TRACK_INFO[track].richtung})`));
    box.appendChild(p);
  }

  const compare = el("div", "track-compare");
  const allLoaded = TRACKS_VS.every((t) =>
    ["GMSI_VS_", "GMSI_VS_shadow_layover_"].every((pre) => {
      const en = state.layers[`${pre}${t}.tif`];
      return !en || en.leafletLayer;
    })
  );
  {
    // always offered: even where the composite has no value, the per-track table shows why (e.g. radar shadow)
    if (allLoaded) {
      buildTrackComparison(latlng, token, compare);
    } else {
      const btn = el("button", "track-compare-btn", "Alle Tracks vergleichen");
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation(); // the button is removed from the DOM below; it must not reach the map as a click
        buildTrackComparison(latlng, token, compare);
      });
      compare.appendChild(btn);
    }
  }
  box.appendChild(compare);

  const foot = el("p", "site-foot");
  box.appendChild(foot);
  const fmt = (n) => Math.round(n).toLocaleString("de-CH");
  foot.textContent = `LV95 E ${fmt(x)} / N ${fmt(y)}`;
  heightPromise.then((h) => {
    if (h !== null) foot.textContent += ` · ${h} m ü. M.`;
    popup.update();
  });
  box.appendChild(el("p", "site-note", "Basierend auf Sommerdaten 2018–2021. Bei Schneebedeckung sind zuverlässige Messungen in der Regel nicht möglich."));

  popup.setContent(box);
}

function onMapClick(e) {
  // clicks inside an open popup (button, table) are not map clicks
  const t = e.originalEvent && e.originalEvent.target;
  if (t && t.closest && t.closest(".leaflet-popup")) return;
  showSiteSummary(e.latlng);
}

// ---------------------------------------------------------------- file collection

function findMatches(fileList) {
  const byName = new Map();
  for (const f of fileList) byName.set(f.name, f);
  const found = {};
  const missing = [];
  for (const entry of LAYER_MANIFEST) {
    if (byName.has(entry.file)) found[entry.file] = byName.get(entry.file);
    else missing.push(entry.file);
  }
  return { found, missing };
}

async function traverseDataTransferItems(items) {
  const files = [];
  function traverse(entry) {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file) => { files.push(file); resolve(); }, () => resolve());
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readBatch = () => {
          reader.readEntries(async (entries) => {
            if (entries.length === 0) { resolve(); return; }
            await Promise.all(entries.map(traverse));
            readBatch();
          }, () => resolve());
        };
        readBatch();
      } else {
        resolve();
      }
    });
  }
  const entries = [];
  for (const item of items) {
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) entries.push(entry);
      else { const f = item.getAsFile(); if (f) files.push(f); }
    }
  }
  await Promise.all(entries.map(traverse));
  return files;
}

// ---------------------------------------------------------------- layer building
// (buildLeafletLayer / fitBounds logic lives in geotiff-layer.js's makeGeoTiffLayer)

// options.lazyFetch(entry) -> Promise<File>: when given, layers that weren't
// in fileList are registered as not-yet-loaded placeholders and fetched the
// first time the user switches them on (see loadLazyLayer)
async function loadProject(fileList, options = {}) {
  const lazyFetch = options.lazyFetch || null;
  const statusEl = document.getElementById("load-status");
  const { found, missing } = findMatches(fileList);
  const foundCount = Object.keys(found).length;

  if (foundCount === 0) {
    statusEl.className = "error";
    statusEl.textContent =
      "Keine passenden GMSI-Dateien im ausgewählten Ordner gefunden.\n" +
      "Bitte den Ordner „GMSI_VS_product“ (oder „rasters“) auswählen.";
    return;
  }

  statusEl.className = "";
  statusEl.textContent = lazyFetch ? "Lade Übersicht …" : `Lade ${foundCount} von ${LAYER_MANIFEST.length} Ebenen …`;

  state.map = L.map("map", { crs: CRS_LV95, zoomSnap: 1, zoomDelta: 1, zoomControl: true, attributionControl: true });
  new BasemapControl().addTo(state.map);
  new ShareControl().addTo(state.map); // added second, so it stacks above the basemap button

  // small logo-link control factory: an image wrapped in a link that opens
  // in a new tab, used for both the SLF logo (top-right) and the DAM
  // project logo (bottom-right)
  function makeLogoLinkControl(position, src, href, extraClass) {
    const Ctrl = L.Control.extend({
      options: { position },
      onAdd: function () {
        const link = L.DomUtil.create("a", "map-logo-link" + (extraClass ? " " + extraClass : ""));
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        const img = L.DomUtil.create("img", "map-logo", link);
        img.src = src;
        img.alt = "";
        L.DomEvent.disableClickPropagation(link);
        return link;
      },
    });
    return new Ctrl();
  }

  makeLogoLinkControl("topright", "slf-logo.png", "https://www.slf.ch/en/", "slf-logo-link").addTo(state.map);
  makeLogoLinkControl(
    "bottomright",
    "icon.png",
    "https://www.slf.ch/en/projects/displacement-anomaly-maps/",
    "dam-logo-link"
  ).addTo(state.map);

  // open all matched rasters in parallel: fromBlob() only reads the TIFF
  // header/IFDs (a few KB), so this is fast regardless of file size; actual
  // pixel data is read lazily, per visible tile, by GeoTiffColorLayer.
  const entriesToLoad = LAYER_MANIFEST.filter((entry) => found[entry.file]);
  const built = await Promise.all(
    entriesToLoad.map(async (entry) => {
      try {
        const { layer, latLngBounds } = await makeGeoTiffLayer(found[entry.file], entry.kind);
        return { entry, layer, latLngBounds };
      } catch (err) {
        console.error("Fehler beim Laden von", entry.file, err);
        return null;
      }
    })
  );

  state.basemaps.grau = SWISSTOPO_GRAU;
  state.basemaps.swissimage = SWISSTOPO_SWISSIMAGE;
  state.basemaps.alti3d = SWISSTOPO_ALTI3D_HILLSHADE;
  state.basemaps.surface3d = SWISSTOPO_SURFACE3D_HILLSHADE;

  // IMPORTANT: establish a valid view (fitBounds/setView) BEFORE adding any
  // tile layer to the map. The map has no defined center/zoom yet at this
  // point; a GridLayer added to a view-less map computes tile URLs against
  // that undefined state, and those bogus tiles then stay wrongly cached
  // under whatever tile key later coincides with a real one once the view
  // is actually set -- silently showing blank/misplaced tiles forever.
  const builtByFile = {};
  for (const r of built) if (r) builtByFile[r.entry.file] = r;

  let fitBoundsTarget = null;
  for (const entry of LAYER_MANIFEST) {
    const r = builtByFile[entry.file];
    if (r) {
      state.layers[entry.file] = { manifest: entry, leafletLayer: r.layer, checked: !!entry.defaultOn };
      if (entry.defaultOn && !fitBoundsTarget) fitBoundsTarget = r.latLngBounds;
    } else if (lazyFetch) {
      state.layers[entry.file] = { manifest: entry, leafletLayer: null, checked: false, lazyFetch: () => lazyFetch(entry) };
    }
  }

  if (fitBoundsTarget) {
    state.map.fitBounds(fitBoundsTarget, { animate: false });
  } else {
    state.map.setView([46.21, 7.6], 9, { animate: false });
  }

  for (const file in state.layers) {
    const l = state.layers[file];
    if (l.checked && l.leafletLayer) l.leafletLayer.addTo(state.map);
  }
  setBasemap(state.currentBasemap);
  state.map.on("click", onMapClick);

  if (!lazyFetch && missing.length) {
    statusEl.textContent = `Geladen. Nicht gefunden (übersprungen): ${missing.join(", ")}`;
  }

  buildSidebar();
  setMode("easy");
  state.map.on("popupclose", (ev) => {
    if (ev.popup === state.summaryPopup) { state.pin = null; scheduleHashUpdate(); }
  });
  state.map.on("moveend", scheduleHashUpdate);
  applyHashState();
  state.hashReady = true;
  writeHash();

  document.getElementById("loader").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  setTimeout(() => state.map.invalidateSize(), 50);
}

// ---------------------------------------------------------------- sidebar UI

// Downloads + opens a not-yet-loaded layer the first time it's switched on.
// Adds it to the map only if it's still ticked once the download finishes.
async function loadLazyLayer(file) {
  const entry = state.layers[file];
  if (!entry || entry.loading || entry.leafletLayer) return;
  entry.loading = true;
  if (entry.statusEl) entry.statusEl.textContent = "lädt …";
  try {
    const rasterFile = await entry.lazyFetch();
    const { layer } = await makeGeoTiffLayer(rasterFile, entry.manifest.kind);
    entry.leafletLayer = layer;
    if (entry.opacity != null) layer.setOpacity(entry.opacity); // slider moved before the layer finished loading
    if (entry.statusEl) entry.statusEl.textContent = "";
    if (entry.checked) layer.addTo(state.map);
  } catch (err) {
    console.error("Fehler beim Laden von", file, err);
    entry.checked = false;
    if (entry.checkboxEl) entry.checkboxEl.checked = false;
    if (entry.statusEl) entry.statusEl.textContent = "Fehler beim Laden";
  } finally {
    entry.loading = false;
    updateLegend();
  }
}

async function toggleLayer(file, on) {
  const entry = state.layers[file];
  if (!entry) return;
  entry.checked = on;
  scheduleHashUpdate();
  if (on && !entry.leafletLayer) {
    updateLegend();
    await loadLazyLayer(file);
    return;
  }
  if (entry.leafletLayer) {
    if (on) entry.leafletLayer.addTo(state.map);
    else state.map.removeLayer(entry.leafletLayer);
  }
  updateLegend();
}

function buildSidebar() {
  const tree = document.getElementById("layer-tree");
  tree.innerHTML = "";

  const groups = {};
  for (const file in state.layers) {
    const entry = state.layers[file];
    const g = entry.manifest.group;
    if (g === 0) continue; // hillshade: not user-toggleable
    if (!groups[g]) groups[g] = [];
    groups[g].push({ file, ...entry });
  }

  Object.keys(groups).sort().forEach((g) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "layer-group";
    groupDiv.dataset.group = g;

    const title = document.createElement("div");
    title.className = "layer-group-title";
    title.textContent = GROUP_LABELS[g];
    groupDiv.appendChild(title);

    groups[g].forEach(({ file, manifest, checked }) => {
      const row = document.createElement("label");
      row.className = "layer-row";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = checked;
      cb.addEventListener("change", () => toggleLayer(file, cb.checked));
      state.layers[file].checkboxEl = cb; // so setMode() can keep the DOM in sync later

      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = swatchColorFor(manifest);

      const label = document.createElement("span");
      label.textContent = manifest.label;

      row.appendChild(cb);
      row.appendChild(swatch);
      row.appendChild(label);

      const status = document.createElement("span");
      status.className = "layer-status";
      state.layers[file].statusEl = status;
      row.appendChild(status);

      if (manifest.kind !== "orbit" && TRACK_INFO[manifest.label] && TRACK_INFO[manifest.label].hinweis) {
        const note = document.createElement("span");
        note.title = TRACK_INFO[manifest.label].hinweis;
        note.textContent = " ⓘ";
        note.style.color = "#999";
        row.appendChild(note);
      }

      // transparency slider (only shown while the layer is ticked, see CSS)
      const item = document.createElement("div");
      item.className = "layer-item";
      item.appendChild(row);

      const defaultOpacity = defaultOpacityForKind(manifest.kind);
      const opRow = document.createElement("div");
      opRow.className = "opacity-row";
      const opLabel = document.createElement("span");
      opLabel.textContent = "Transparenz";
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0"; slider.max = "100"; slider.step = "5";
      slider.value = String(Math.round((1 - defaultOpacity) * 100));
      slider.setAttribute("aria-label", `Transparenz ${manifest.label}`);
      const opValue = document.createElement("span");
      opValue.className = "opacity-value";
      opValue.textContent = `${slider.value} %`;
      slider.addEventListener("input", () => {
        const opacity = 1 - Number(slider.value) / 100;
        opValue.textContent = `${slider.value} %`;
        const e = state.layers[file];
        e.opacity = opacity;
        if (e.leafletLayer) e.leafletLayer.setOpacity(opacity);
        scheduleHashUpdate();
      });
      state.layers[file].sliderEl = slider;
      opRow.append(opLabel, slider, opValue);
      item.appendChild(opRow);

      groupDiv.appendChild(item);
    });

    tree.appendChild(groupDiv);
  });
}

function swatchColorFor(manifest) {
  if (manifest.kind === "orbit") return "linear-gradient(90deg,#3C7AA9,#5ACDEE,#4FAE62,#F36976,#CEB848)";
  if (manifest.kind === "gmsi") return "#1A9641";
  if (manifest.kind === "shadow") return "#5A5A5A";
  return "#999";
}

function updateLegend() {
  const legend = document.getElementById("legend");
  legend.innerHTML = "";

  const visibleKinds = new Set();
  for (const file in state.layers) {
    const entry = state.layers[file];
    if (entry.checked && entry.manifest.kind !== "hillshade") visibleKinds.add(entry.manifest.kind);
  }

  if (visibleKinds.size === 0) return;

  const heading = document.createElement("h2");
  heading.textContent = "Legende";
  legend.appendChild(heading);

  if (visibleKinds.has("gmsi")) legend.appendChild(legendBlock("GMSI", GMSI_LEGEND));
  if (visibleKinds.has("orbit")) legend.appendChild(legendBlock("Track", bestOrbitLegend()));
  if (visibleKinds.has("shadow")) legend.appendChild(legendBlock("Shadow/Layover", SHADOW_LEGEND));
}

function legendBlock(title, items) {
  const block = document.createElement("div");
  block.className = "legend-block";
  const t = document.createElement("div");
  t.style.fontWeight = "600";
  t.style.marginBottom = "4px";
  t.textContent = title;
  block.appendChild(t);
  items.forEach(({ color, label }) => {
    const row = document.createElement("div");
    row.className = "legend-row";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = color;
    const lbl = document.createElement("span");
    lbl.textContent = label;
    row.appendChild(sw);
    row.appendChild(lbl);
    block.appendChild(row);
  });
  return block;
}

function setMode(mode) {
  state.mode = mode;
  scheduleHashUpdate();
  document.getElementById("mode-easy").classList.toggle("active", mode === "easy");
  document.getElementById("mode-expert").classList.toggle("active", mode === "expert");

  document.querySelectorAll("#layer-tree .layer-group").forEach((el) => {
    const g = el.dataset.group;
    el.classList.toggle("hidden", mode === "easy" && g !== "1" && g !== "2");
  });

  if (mode === "easy") {
    // clean, single-layer view: force everything except the composite (and
    // the best-track-per-pixel layer, which stays available and keeps its
    // own on/off state) off, and keep every checkbox's DOM state in sync --
    // not just group 1's -- otherwise switching back to Erweitert shows
    // stale "checked" boxes for layers that were actually turned off here
    for (const file in state.layers) {
      const entry = state.layers[file];
      if (entry.manifest.group === 0 || entry.manifest.group === 2) continue;
      const shouldBeOn = entry.manifest.group === 1;
      if (entry.checked !== shouldBeOn) {
        entry.checked = shouldBeOn;
        if (entry.leafletLayer) {
          if (shouldBeOn) entry.leafletLayer.addTo(state.map);
          else state.map.removeLayer(entry.leafletLayer);
        }
      }
      if (entry.checkboxEl) entry.checkboxEl.checked = shouldBeOn;
    }
  }
  updateLegend();
}

// ---------------------------------------------------------------- wiring

// ---------------------------------------------------------------- location search (swisstopo)

const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
let searchDebounce = null;

function stripTags(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

async function runSearch(query) {
  if (!query || query.length < 2) {
    searchResults.classList.add("hidden");
    searchResults.innerHTML = "";
    return;
  }
  try {
    const url =
      "https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&limit=8" +
      "&origins=gg25,address,district,kantone,zipcode&searchText=" +
      encodeURIComponent(query);
    const resp = await fetch(url);
    if (!resp.ok) return;
    const data = await resp.json();
    const items = (data.results || []).filter((r) => r.attrs && r.attrs.lat && r.attrs.lon);

    searchResults.innerHTML = "";
    if (items.length === 0) {
      searchResults.classList.add("hidden");
      return;
    }
    items.forEach((r) => {
      const row = document.createElement("div");
      row.className = "search-result";
      row.textContent = stripTags(r.attrs.label);
      row.addEventListener("click", () => {
        if (state.map) state.map.setView([r.attrs.lat, r.attrs.lon], 14);
        searchInput.value = stripTags(r.attrs.label);
        searchResults.classList.add("hidden");
      });
      searchResults.appendChild(row);
    });
    searchResults.classList.remove("hidden");
  } catch (err) {
    console.warn("Ortssuche fehlgeschlagen:", err);
  }
}

searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  const query = searchInput.value.trim();
  searchDebounce = setTimeout(() => runSearch(query), 300);
});
document.addEventListener("click", (e) => {
  if (!document.getElementById("search-box").contains(e.target)) {
    searchResults.classList.add("hidden");
  }
});

document.getElementById("mode-easy").addEventListener("click", () => setMode("easy"));
document.getElementById("mode-expert").addEventListener("click", () => setMode("expert"));

const infoModal = document.getElementById("info-modal");
document.getElementById("info-btn").addEventListener("click", () => infoModal.classList.remove("hidden"));
document.getElementById("info-modal-close").addEventListener("click", () => infoModal.classList.add("hidden"));
infoModal.addEventListener("click", (e) => { if (e.target === infoModal) infoModal.classList.add("hidden"); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") infoModal.classList.add("hidden"); });

const dropzone = document.getElementById("dropzone");
const pickBtn = document.getElementById("pick-folder-btn");
const pickInput = document.getElementById("pick-folder-input");

pickBtn.addEventListener("click", () => pickInput.click());
pickInput.addEventListener("change", (e) => {
  if (e.target.files.length) loadProject(Array.from(e.target.files));
});

dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const statusEl = document.getElementById("load-status");
  statusEl.className = "";
  statusEl.textContent = "Lese Ordner …";
  const files = await traverseDataTransferItems(e.dataTransfer.items);
  loadProject(files);
});

// ---------------------------------------------------------------- optional: auto-load over http(s)
// When this page is served over http/https (e.g. by the bundled
// serve_and_open.py launcher instead of opened directly as a file://
// double-click), sibling files can be fetched normally (no CORS
// restriction applies to a real http origin), so the whole project can
// load with zero clicks. Opened directly via file://, this is skipped and
// the manual picker/drag-drop above is used instead.
// GitHub Pages deployment: the raster data lives on Zenodo (files this
// large can't go through git/GitHub Pages directly -- see PUBLISHING.txt),
// while the app itself is this static site.
const ZENODO_RECORD_ID = "23084804";
const RASTER_BASE_URL = `https://zenodo.org/api/records/${ZENODO_RECORD_ID}/files/`;

// The COGs are streamed with HTTP range requests, so "loading" a layer only
// reads its header (a few requests) and then fetches tile data as the map
// needs it. The composite is shown at start and best-orbit feeds the click
// popup, so those two are opened up front; the other layers are only opened
// when someone switches them on (saves rate-limit budget too).
const remoteSource = (entry) => ({ name: entry.file, url: `${RASTER_BASE_URL}${entry.file}/content` });
const isEagerLayer = (entry) => entry.defaultOn || entry.kind === "orbit";

async function tryAutoLoadOverHttp() {
  if (!location.protocol.startsWith("http")) return false;

  dropzone.classList.add("hidden");
  const msg = document.getElementById("auto-loading-msg");
  msg.classList.remove("hidden");
  const statusEl = document.getElementById("load-status");

  const eager = LAYER_MANIFEST.filter(isEagerLayer);
  try {
    // one tiny ranged request: if the record is unreachable, fall back to the
    // manual picker instead of showing an empty map
    const probe = await fetch(remoteSource(eager[0]).url, { headers: { Range: "bytes=0-15" } });
    if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
  } catch (err) {
    console.warn("Auto-load: Daten nicht erreichbar:", err);
    msg.classList.add("hidden");
    dropzone.classList.remove("hidden");
    statusEl.className = "error";
    statusEl.textContent = "Automatisches Laden fehlgeschlagen. Bitte Ordner manuell auswählen.";
    return false;
  }

  msg.classList.add("hidden");
  await loadProject(eager.map(remoteSource), { lazyFetch: async (entry) => remoteSource(entry) });
  return true;
}

tryAutoLoadOverHttp();

// ---------------- collapsible sidebar ----------------
// Starts collapsed on narrow screens (phones) so the map gets the full screen.
(function () {
  const btn = document.getElementById("sidebar-toggle");
  const narrow = window.matchMedia("(max-width: 700px)");
  const setCollapsed = (collapsed) => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    btn.setAttribute("aria-expanded", String(!collapsed));
    // on wide screens the map area grows/shrinks with the sidebar
    setTimeout(() => state.map && state.map.invalidateSize(), 300);
  };
  const toggle = (e) => {
    e.preventDefault();
    setCollapsed(!document.body.classList.contains("sidebar-collapsed"));
  };
  btn.addEventListener("click", toggle);
  // on phones, tapping the map (or dragging it) while the drawer is open closes it
  // (the Leaflet map is created later, so listen on the DOM element)
  document.getElementById("map").addEventListener("pointerdown", () => {
    if (narrow.matches && !document.body.classList.contains("sidebar-collapsed")) setCollapsed(true);
  });
  setCollapsed(narrow.matches);
  const onChange = (e) => setCollapsed(e.matches);
  narrow.addEventListener ? narrow.addEventListener("change", onChange) : narrow.addListener(onChange);
})();
