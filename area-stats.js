// Area statistics: draw a polygon (or load a GeoJSON file) and get the share
// of good / caution / poor / not-measurable ground inside it, plus which track
// is the best one for how much of it. Identical in the GR and VS viewers; the
// raster file names are looked up from LAYER_MANIFEST, not hard-coded.
//
// The polygon is rasterised onto an offscreen canvas at the resolution the
// composite is read at, so holes and multi-polygons come for free and no
// per-pixel point-in-polygon test is needed.

const AREA_MAX_PIXELS = 4e6; // above this the rasters are read at a coarser overview (approximate)
const AREA_CLASSES = [
  { id: "good", color: "#5B9BCB", key: "area.class.good" },
  { id: "mid", color: "#FDAE61", key: "area.class.mid" },
  { id: "bad", color: "#D7191C", key: "area.class.bad" },
  { id: "blocked", color: "#3A3A3A", key: "area.class.blocked" },
  { id: "nodata", color: "#D9DDE1", key: "area.class.nodata" },
];

const areaState = {
  drawing: false,
  points: [], // L.LatLng
  vertexMarkers: [],
  previewLine: null,
  polygonLayer: null,
  rings: null, // [[ [x,y] LV95 ... ]] outer rings + holes, per polygon: [{outer, holes}]
  lastResult: null,
  token: 0,
};

// ---------------------------------------------------------------- geometry helpers

const toLV95 = (latlng) => proj4("EPSG:4326", "EPSG:2056", [latlng.lng, latlng.lat]);

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

function polygonsAreaM2(polys) {
  return polys.reduce((s, p) => s + ringArea(p.outer) - p.holes.reduce((h, r) => h + ringArea(r), 0), 0);
}

function polygonsBBox(polys) {
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
  for (const p of polys) {
    for (const [x, y] of p.outer) {
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
    }
  }
  return [xmin, ymin, xmax, ymax];
}

// 1 = inside the polygon (holes excluded), 0 = outside, as a w*h mask
function rasteriseMask(polys, bbox, w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const [xmin, ymin, xmax, ymax] = bbox;
  const sx = w / (xmax - xmin);
  const sy = h / (ymax - ymin);
  const trace = (ring) => {
    ring.forEach(([x, y], i) => {
      const px = (x - xmin) * sx;
      const py = (ymax - y) * sy;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  };
  ctx.fillStyle = "#000";
  for (const p of polys) {
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    trace(p.outer);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    for (const hole of p.holes) {
      ctx.beginPath();
      trace(hole);
      ctx.fill();
    }
  }
  const data = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  // anti-aliased edge pixels: count a pixel when more than half covered
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
  return mask;
}

// ---------------------------------------------------------------- statistics

function manifestFile(suffix) {
  const e = LAYER_MANIFEST.find((m) => m.file.endsWith(suffix));
  return e ? e.file : null;
}

async function tiffFor(file) {
  let entry = state.layers[file];
  if (!entry) return null;
  if (!entry.leafletLayer) await loadLazyLayer(file);
  entry = state.layers[file];
  return entry && entry.leafletLayer ? entry.leafletLayer : null;
}

async function computeAreaStats(polys) {
  const compFile = manifestFile("_composite.tif");
  const orbitFile = manifestFile("_best_orbit.tif");
  const comp = compFile ? await tiffFor(compFile) : null;
  const orbit = orbitFile ? await tiffFor(orbitFile) : null;
  if (!comp) throw new Error("composite not available");

  const bbox = polygonsBBox(polys);
  const [xmin, ymin, xmax, ymax] = bbox;
  const nativeRes = 10; // m, composite resolution
  let w = Math.max(1, Math.ceil((xmax - xmin) / nativeRes));
  let h = Math.max(1, Math.ceil((ymax - ymin) / nativeRes));
  let approximate = false;
  if (w * h > AREA_MAX_PIXELS) {
    const f = Math.sqrt(AREA_MAX_PIXELS / (w * h));
    w = Math.max(1, Math.floor(w * f));
    h = Math.max(1, Math.floor(h * f));
    approximate = true;
  }
  const cellM2 = ((xmax - xmin) / w) * ((ymax - ymin) / h);
  const mask = rasteriseMask(polys, bbox, w, h);

  const read = async (layer) => {
    const r = await layer._tiff.readRasters({
      bbox, width: w, height: h, resampleMethod: "nearest", fillValue: layer._nodata,
    });
    return r[0];
  };
  const compData = await read(comp);
  const orbitData = orbit ? await read(orbit) : null;
  const compNodata = comp._nodata;
  const orbitNodata = orbit ? orbit._nodata : null;

  const counts = { good: 0, mid: 0, bad: 0, blocked: 0, nodata: 0 };
  const tracks = {};
  let inside = 0, valid = 0, sum = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    inside++;
    const v = compData[i];
    if (v === compNodata || v === undefined || v === null || Number.isNaN(v)) { counts.nodata++; continue; }
    if (v < 0) { counts.blocked++; continue; }
    valid++;
    sum += v;
    counts[v >= 0.4 ? "good" : v >= 0.2 ? "mid" : "bad"]++;
    if (orbitData) {
      const o = orbitData[i];
      if (o !== orbitNodata && o !== undefined && o !== null && !Number.isNaN(o)) {
        const tr = ORBIT_INDEX_ORDER[Math.round(o)];
        if (tr) tracks[tr] = (tracks[tr] || 0) + 1;
      }
    }
  }
  return {
    areaM2: polygonsAreaM2(polys),
    insidePx: inside,
    cellM2,
    counts,
    tracks,
    validPx: valid,
    meanGmsi: valid ? sum / valid : null,
    approximate,
    cell: Math.sqrt(cellM2),
  };
}

// ---------------------------------------------------------------- result panel

// always km²: the digits adapt to the size so small areas stay readable
function fmtArea(m2) {
  const km2 = m2 / 1e6;
  if (km2 > 0 && km2 < 0.001) return "<0.001 km²";
  const digits = km2 >= 100 ? 0 : km2 >= 10 ? 1 : km2 >= 1 ? 2 : 3;
  return `${km2.toLocaleString("de-CH", { minimumFractionDigits: digits, maximumFractionDigits: digits })} km²`;
}
const pct = (n, total) => (total ? (100 * n) / total : 0);
const fmtPct = (p) => (p > 0 && p < 1 ? "<1" : String(Math.round(p))) + " %";

function renderAreaPanel(res) {
  const panel = document.getElementById("area-panel");
  panel.innerHTML = "";
  panel.classList.remove("hidden");

  const head = document.createElement("div");
  head.className = "area-head";
  const title = document.createElement("strong");
  title.textContent = t("area.title");
  const close = document.createElement("button");
  close.className = "area-close";
  close.textContent = "✕";
  close.title = t("modal.close");
  close.addEventListener("click", clearAreaSelection);
  head.append(title, close);
  panel.appendChild(head);

  if (res.pending) {
    const p = document.createElement("p");
    p.className = "area-hint";
    p.textContent = t("area.computing");
    panel.appendChild(p);
    return;
  }
  if (res.error) {
    const p = document.createElement("p");
    p.className = "area-hint";
    p.textContent = t("area.error");
    panel.appendChild(p);
    return;
  }

  const total = res.insidePx;
  const c = res.counts;
  const assessable = res.validPx;

  // Pixels without data (outside the canton, on lakes) are not part of the assessment: the shares below refer to
  // the ground that has data, and the "no data" part is reported separately.
  const dataPx = total - c.nodata;
  const dataM2 = dataPx * res.cellM2;
  const nodataShare = pct(c.nodata, total);
  const classes = AREA_CLASSES.filter((cl) => cl.id !== "nodata");

  const sub = document.createElement("p");
  sub.className = "area-sub";
  sub.textContent = c.nodata > 0
    ? t("area.sizeWithData", { area: fmtArea(res.areaM2), data: fmtArea(dataM2) })
    : t("area.size", { area: fmtArea(res.areaM2) });
  panel.appendChild(sub);

  // area that lies (partly) outside the data, typically at the border: say so explicitly
  if (nodataShare >= 10 && dataPx > 0) {
    const hint = document.createElement("p");
    hint.className = "area-border-hint";
    hint.textContent = t("area.border", { pct: Math.round(nodataShare) });
    panel.appendChild(hint);
  }

  // stacked bar (only the part with data)
  const bar = document.createElement("div");
  bar.className = "area-bar";
  for (const cl of classes) {
    const w = pct(c[cl.id], dataPx);
    if (w <= 0) continue;
    const seg = document.createElement("span");
    seg.style.width = `${w}%`;
    seg.style.background = cl.color;
    seg.title = `${t(cl.key)}: ${fmtPct(w)}`;
    bar.appendChild(seg);
  }
  panel.appendChild(bar);

  const table = document.createElement("table");
  table.className = "area-table";
  const addRow = (cl, share, areaM2, muted) => {
    const tr = document.createElement("tr");
    if (muted) tr.className = "area-nodata-row";
    const dotTd = document.createElement("td");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = cl.color;
    dotTd.appendChild(dot);
    const lbl = document.createElement("td");
    lbl.textContent = t(cl.key);
    const val = document.createElement("td");
    val.className = "num";
    val.textContent = fmtPct(share);
    const ar = document.createElement("td");
    ar.className = "num muted";
    ar.textContent = fmtArea(areaM2);
    tr.append(dotTd, lbl, val, ar);
    table.appendChild(tr);
  };
  for (const cl of classes) addRow(cl, pct(c[cl.id], dataPx), c[cl.id] * res.cellM2, false);
  if (c.nodata > 0) addRow(AREA_CLASSES.find((cl) => cl.id === "nodata"), nodataShare, c.nodata * res.cellM2, true); // share of the whole polygon
  panel.appendChild(table);

  // plain-language summary
  const good = pct(c.good, dataPx), mid = pct(c.mid, dataPx);
  const bad = pct(c.bad, dataPx), blocked = pct(c.blocked, dataPx);
  const sum = document.createElement("p");
  sum.className = "area-summary";
  let key;
  if (assessable === 0) key = "area.sum.none";
  else if (good >= 60) key = "area.sum.good";
  else if (good + mid >= 60) key = "area.sum.mixed";
  else key = "area.sum.poor";
  sum.textContent = t(key, { good: Math.round(good), usable: Math.round(good + mid), poor: Math.round(bad + blocked) });
  panel.appendChild(sum);

  // best track share
  const trackList = Object.entries(res.tracks).sort((a, b) => b[1] - a[1]);
  if (trackList.length) {
    const h = document.createElement("p");
    h.className = "area-sub";
    h.textContent = t("area.bestTracks");
    panel.appendChild(h);
    const tb = document.createElement("div");
    tb.className = "area-tracks";
    for (const [tr, n] of trackList) {
      const row = document.createElement("div");
      row.className = "area-track-row";
      const name = document.createElement("span");
      name.className = "area-track-name";
      name.textContent = `${tr} (${TRACK_INFO[tr].richtung})`;
      const barOuter = document.createElement("span");
      barOuter.className = "area-track-bar";
      const fill = document.createElement("span");
      fill.style.width = `${pct(n, assessable)}%`;
      fill.style.background = TRACK_COLORS[tr] || "#888";
      barOuter.appendChild(fill);
      const v = document.createElement("span");
      v.className = "area-track-val";
      v.textContent = fmtPct(pct(n, assessable));
      row.append(name, barOuter, v);
      tb.appendChild(row);
    }
    panel.appendChild(tb);
  }

  if (typeof makeExportRow === "function" && !res.pending) panel.appendChild(makeExportRow("area"));

  const note = document.createElement("p");
  note.className = "area-note";
  note.textContent = res.approximate
    ? t("area.noteApprox", { cell: Math.round(res.cell) })
    : t("area.note");
  panel.appendChild(note);
}

// re-render in the new language (called from onLangChange in app.js)
function refreshAreaTexts() {
  refreshMeasureTexts();
  if (areaState.lastResult) renderAreaPanel(areaState.lastResult);
  if (areaState.drawing) setAreaHint(t(areaState.points.length < 3 ? "area.hintDraw" : "area.hintFinish"));
}

// ---------------------------------------------------------------- dimming outside the area
//
// While a polygon is drawn, and as long as its result is shown, everything outside it is dimmed (like in the
// tutorial) so the assessed ground stands out. The veil is a Leaflet polygon (a huge rectangle with the area cut
// out) in its own pane between the tiles and the vector layers, so the outline stays crisp on top.

let areaDimLayer = null;
const AREA_WORLD = [[40, 0], [40, 20], [52, 20], [52, 0]]; // lat/lng box far larger than anything on the map

function setAreaDim(rings) {
  // rings: null = no veil; [] = veil over everything; [ring, ...] = area(s) cut out (outer rings and holes)
  if (!rings || (typeof state !== "undefined" && state.tourDrawing)) { // while the tutorial draws, it paints its own spotlight
    if (areaDimLayer) { state.map.removeLayer(areaDimLayer); areaDimLayer = null; }
    return;
  }
  const latlngs = [AREA_WORLD, ...rings.filter((r) => r.length >= 3)];
  if (areaDimLayer) { areaDimLayer.setLatLngs(latlngs); return; }
  if (!state.map.getPane("areaDim")) {
    const pane = state.map.createPane("areaDim");
    pane.style.zIndex = 390; // above the tiles (200), below the vector layers (400)
    pane.style.pointerEvents = "none";
  }
  areaDimLayer = L.polygon(latlngs, { pane: "areaDim", stroke: false, fillColor: "#0f1720", fillOpacity: 0.4, interactive: false }).addTo(state.map);
}

// re-applies the veil for the finished area (the tutorial calls this when its own spotlight hands over)
function refreshAreaDim() {
  if (!areaState.rings) return;
  setAreaDim(areaState.rings.flatMap((p) => [p.outer, ...p.holes]).map((ring) => ring.map((xy) => {
    const ll = proj4("EPSG:2056", "EPSG:4326", xy);
    return L.latLng(ll[1], ll[0]);
  })));
}

// during drawing: the corners placed so far, plus the cursor
function updateAreaDim(cursor) {
  if (!areaState.drawing || !areaState.points.length) return;
  const ring = areaState.points.concat(cursor ? [cursor] : []);
  setAreaDim(ring.length >= 3 ? [ring] : []);
}

// ---------------------------------------------------------------- selection lifecycle

function clearAreaSelection() {
  areaState.token++;
  cancelAreaDrawing();
  setAreaDim(null);
  if (areaState.polygonLayer) { state.map.removeLayer(areaState.polygonLayer); areaState.polygonLayer = null; }
  areaState.lastResult = null;
  areaState.rings = null;
  document.getElementById("area-panel").classList.add("hidden");
  setAreaHint(null);
}

async function evaluatePolygons(polys, layer) {
  areaState.token++;
  const token = areaState.token;
  if (areaState.polygonLayer) state.map.removeLayer(areaState.polygonLayer);
  areaState.polygonLayer = layer.addTo(state.map);
  areaState.rings = polys;
  setAreaDim(polys.flatMap((p) => [p.outer, ...p.holes]).map((ring) => ring.map((xy) => {
    const ll = proj4("EPSG:2056", "EPSG:4326", xy);
    return L.latLng(ll[1], ll[0]);
  })));
  areaState.lastResult = { pending: true };
  renderAreaPanel(areaState.lastResult);
  try {
    const res = await computeAreaStats(polys);
    if (token !== areaState.token) return;
    areaState.lastResult = res;
  } catch (err) {
    console.error("Flächenauswertung fehlgeschlagen", err);
    if (token !== areaState.token) return;
    areaState.lastResult = { error: true };
  }
  renderAreaPanel(areaState.lastResult);
}

// ---------------------------------------------------------------- drawing

// Outlines are black with a white casing underneath: that reads on every map
// colour (blue, orange, red, grey, the basemap's own lines), unlike a single hue
const OUTLINE_COLOR = "#111111";

function casedLine(latlngs, weight, dashArray) {
  const g = L.featureGroup([
    L.polyline(latlngs, { color: "#fff", weight: weight + 4, opacity: 0.95, interactive: false }),
    L.polyline(latlngs, { color: OUTLINE_COLOR, weight, dashArray, interactive: false }),
  ]);
  g.setLatLngs = (ll) => g.eachLayer((l) => l.setLatLngs(ll));
  return g;
}

function casedPolygon(rings) {
  return L.featureGroup([
    L.polygon(rings, { color: "#fff", weight: 6.5, opacity: 0.95, fillColor: "#fff", fillOpacity: 0.12, interactive: false }),
    L.polygon(rings, { color: OUTLINE_COLOR, weight: 2.5, fill: false, interactive: false }),
  ]);
}

function setAreaHint(text) {
  const el = document.getElementById("area-hint");
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("hidden", !text);
}

function startAreaDrawing() {
  cancelMeasure();
  clearAreaSelection();
  areaState.drawing = true;
  state.drawing = true;
  state.map.doubleClickZoom.disable();
  state.map.getContainer().classList.add("area-drawing");
  if (state.summaryPopup) state.map.closePopup(state.summaryPopup);
  setAreaHint(t("area.hintDraw"));
  document.querySelector(".area-control-btn")?.classList.add("active");
}

function cancelAreaDrawing() {
  if (!areaState.drawing) return;
  areaState.drawing = false;
  state.drawing = false;
  // after the double-click that finished the tool has been fully dispatched, or it would also zoom
  setTimeout(() => state.map.doubleClickZoom.enable(), 100);
  state.map.getContainer().classList.remove("area-drawing");
  areaState.vertexMarkers.forEach((m) => state.map.removeLayer(m));
  areaState.vertexMarkers = [];
  if (areaState.previewLine) { state.map.removeLayer(areaState.previewLine); areaState.previewLine = null; }
  areaState.points = [];
  setAreaDim(null);
  setAreaHint(null);
  document.querySelector(".area-control-btn")?.classList.remove("active");
}

function finishAreaDrawing() {
  if (areaState.points.length < 3) {
    setAreaHint(t("area.hintMin"));
    return;
  }
  // a double-click delivers two clicks at the same spot: drop the duplicates
  const pts = areaState.points.filter((p, i, a) => i === 0 || state.map.latLngToContainerPoint(p).distanceTo(state.map.latLngToContainerPoint(a[i - 1])) > 3);
  if (pts.length < 3) { setAreaHint(t("area.hintMin")); return; }
  cancelAreaDrawing();
  const polys = [{ outer: pts.map(toLV95), holes: [] }];
  const layer = casedPolygon(pts);
  // the click that closed the polygon must not also open a site summary
  setTimeout(() => evaluatePolygons(polys, layer), 0);
}

function onAreaMapClick(e) {
  if (!areaState.drawing) return false;
  const first = areaState.points[0];
  // clicking on the first vertex closes the polygon
  if (first && areaState.points.length >= 3) {
    const a = state.map.latLngToContainerPoint(first);
    const b = state.map.latLngToContainerPoint(e.latlng);
    if (a.distanceTo(b) < 10) { finishAreaDrawing(); return true; }
  }
  areaState.points.push(e.latlng);
  const m = L.circleMarker(e.latlng, { radius: 5, color: OUTLINE_COLOR, weight: 2.5, fillColor: "#fff", fillOpacity: 1, interactive: false }).addTo(state.map);
  areaState.vertexMarkers.push(m);
  updateAreaPreview(e.latlng);
  updateAreaDim(e.latlng);
  setAreaHint(areaState.points.length < 3 ? t("area.hintDraw") : t("area.hintFinish"));
  return true;
}

function updateAreaPreview(cursor) {
  const pts = areaState.points.slice();
  if (cursor) pts.push(cursor);
  if (!areaState.previewLine) {
    areaState.previewLine = casedLine(pts, 2.5, "6 5").addTo(state.map);
  } else {
    areaState.previewLine.setLatLngs(pts);
  }
}

// ---------------------------------------------------------------- file import (GeoJSON, GPKG, KML, KMZ)

function polysToLayer(polys) {
  const toLL = (xy) => {
    const ll = proj4("EPSG:2056", "EPSG:4326", xy);
    return [ll[1], ll[0]];
  };
  return casedPolygon(polys.map((p) => [p.outer.map(toLL), ...p.holes.map((h) => h.map(toLL))]));
}

async function importPolygonFile(file) {
  const flash = (msg) => { setAreaHint(msg); setTimeout(() => setAreaHint(null), 5000); };
  try {
    setAreaHint(t("area.importReading"));
    const polys = await readPolygonFile(file);
    setAreaHint(null);
    clearAreaSelection();
    cancelMeasure();
    const layer = polysToLayer(polys);
    state.map.fitBounds(layer.getBounds(), { padding: [40, 40], animate: false });
    evaluatePolygons(polys, layer);
  } catch (err) {
    console.error("Datei konnte nicht gelesen werden", err);
    if (err && err.code === "crs") flash(t("area.importCrs", { srs: err.detail }));
    else if (err && err.code === "empty") flash(t("area.importNone"));
    else flash(t("area.importError"));
  }
}

// ---------------------------------------------------------------- map control

const AreaControl = L.Control.extend({
  options: { position: "bottomleft" },
  onAdd: function () {
    const container = L.DomUtil.create("div", "leaflet-bar basemap-control area-control");
    const mk = (cls, titleKey, svg) => {
      const a = L.DomUtil.create("a", "basemap-control-btn " + cls, container);
      a.href = "#";
      a.title = t(titleKey);
      a.dataset.i18nTitle = titleKey;
      a.dataset.i18nAriaLabel = titleKey;
      a.setAttribute("role", "button");
      a.setAttribute("aria-label", t(titleKey));
      a.innerHTML = svg;
      return a;
    };
    const draw = mk("area-control-btn", "area.drawBtn",
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1e21" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M4 8l8-5 8 6-3 11H7z"/><circle cx="4" cy="8" r="1.6" fill="#fff"/><circle cx="12" cy="3" r="1.6" fill="#fff"/><circle cx="20" cy="9" r="1.6" fill="#fff"/><circle cx="17" cy="20" r="1.6" fill="#fff"/><circle cx="7" cy="20" r="1.6" fill="#fff"/></svg>');
    const upload = mk("area-upload-btn", "area.uploadBtn",
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1e21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/></svg>');
    const measure = mk("measure-control-btn", "measure.btn",
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1e21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/></svg>');
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".geojson,.json,.gpkg,.kml,.kmz";
    input.style.display = "none";
    container.appendChild(input);

    L.DomEvent.disableClickPropagation(container);
    draw.addEventListener("click", (e) => {
      e.preventDefault();
      if (areaState.drawing) cancelAreaDrawing();
      else startAreaDrawing();
    });
    upload.addEventListener("click", (e) => { e.preventDefault(); input.click(); });
    measure.addEventListener("click", (e) => {
      e.preventDefault();
      if (measureState.active) cancelMeasure();
      else startMeasure();
    });
    input.addEventListener("change", () => {
      if (input.files[0]) importPolygonFile(input.files[0]);
      input.value = "";
    });
    return container;
  },
});

function initAreaStats() {
  new AreaControl().addTo(state.map);
  // result panel and drawing hint live inside the map container so they sit over the map
  for (const [id, cls] of [["area-panel", "hidden"], ["area-hint", "hidden"]]) {
    const div = document.createElement("div");
    div.id = id;
    div.className = cls;
    state.map.getContainer().appendChild(div);
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
  }
  initMeasureTool();
  state.map.on("mousemove", (e) => { if (areaState.drawing && areaState.points.length) { updateAreaPreview(e.latlng); updateAreaDim(e.latlng); } });
  state.map.on("dblclick", () => { if (areaState.drawing) finishAreaDrawing(); });
  document.addEventListener("keydown", (e) => {
    if (!areaState.drawing) return;
    if (e.key === "Escape") cancelAreaDrawing();
    else if (e.key === "Enter") finishAreaDrawing();
    else if (e.key === "Backspace" && areaState.points.length) {
      e.preventDefault();
      areaState.points.pop();
      const m = areaState.vertexMarkers.pop();
      if (m) state.map.removeLayer(m);
      updateAreaPreview(null);
      if (areaState.points.length) updateAreaDim(null); else setAreaDim([]);
    }
  });
}
