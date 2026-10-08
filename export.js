// Export of results: the area assessment and the point query as PNG, PDF (one A4 page) or CSV.
// The report is drawn onto a canvas (map section from the swisstopo WMS with the GMSI classes drawn on top from the
// raster data, then the numbers); the PDF is that canvas as a JPEG inside a minimal PDF written here, so no library
// is needed. Identical in the GR and VS viewers; the canton comes from the layer file names.

const EXPORT_W = 1240, EXPORT_H = 1754; // A4 at 150 dpi
const EXPORT_FONT = '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const VERDICT_COLORS = { good: "#2C7BB6", mid: "#d98a1f", bad: "#D7191C", blocked: "#3A3A3A", none: "#777777" };
const CLASS_RGBA = { good: [91, 155, 203, 205], mid: [253, 174, 97, 205], bad: [215, 25, 28, 205], blocked: [58, 58, 58, 205] };

// ---------------------------------------------------------------- small helpers

function exportCanton() {
  const m = typeof LAYER_MANIFEST !== "undefined" && LAYER_MANIFEST[0] && LAYER_MANIFEST[0].file.match(/^GMSI_([A-Z]+)_/);
  return m ? m[1] : "";
}
const exportDate = () => new Date().toLocaleDateString(typeof currentLang === "string" ? { de: "de-CH", it: "it-CH", fr: "fr-CH", en: "en-GB" }[currentLang] : "de-CH", { year: "numeric", month: "long", day: "numeric" });
const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; } else line = test;
    }
    out.push(line);
  }
  return out;
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // the canvas must stay exportable
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // no basemap: the report is still made, on a plain background
    img.src = url;
    setTimeout(() => resolve(null), 15000);
  });
}

function basemapUrl(bbox, w, h) {
  const layer = state.basemaps && (state.basemaps[state.currentBasemap] || state.basemaps.grau);
  const name = layer && layer.options ? layer.options.layers : "ch.swisstopo.pixelkarte-grau";
  return "https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fjpeg&STYLES=&CRS=EPSG%3A2056" +
    `&LAYERS=${encodeURIComponent(name)}&BBOX=${bbox.map((v) => v.toFixed(1)).join(",")}&WIDTH=${w}&HEIGHT=${h}`;
}

// a map extent (xmin, ymin, xmax, ymax) with the aspect ratio of the map box, centred on the given box
function fitExtent(box, w, h, margin) {
  let [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let hw = ((x1 - x0) / 2) * (1 + margin), hh = ((y1 - y0) / 2) * (1 + margin);
  const aspect = w / h;
  if (hw / hh < aspect) hw = hh * aspect; else hh = hw / aspect;
  return [cx - hw, cy - hh, cx + hw, cy + hh];
}

// composite values for an extent, read at roughly the raster's own resolution
async function readComposite(extent, maxPx) {
  const file = typeof manifestFile === "function" ? manifestFile("_composite.tif") : null;
  const layer = file && typeof tiffFor === "function" ? await tiffFor(file) : null;
  if (!layer) return null;
  const res = 10;
  let w = Math.max(1, Math.round((extent[2] - extent[0]) / res)), h = Math.max(1, Math.round((extent[3] - extent[1]) / res));
  if (w * h > maxPx) { const f = Math.sqrt(maxPx / (w * h)); w = Math.max(1, Math.floor(w * f)); h = Math.max(1, Math.floor(h * f)); }
  try {
    const r = await layer._tiff.readRasters({ bbox: extent, width: w, height: h, resampleMethod: "nearest", fillValue: layer._nodata });
    return { data: r[0], w, h, nodata: layer._nodata };
  } catch (err) {
    return null;
  }
}

function classOf(v, nodata) {
  if (v === nodata || v === undefined || v === null || Number.isNaN(v)) return null;
  if (v < 0) return "blocked";
  return v >= 0.4 ? "good" : v >= 0.2 ? "mid" : "bad";
}

// ---------------------------------------------------------------- map section of the report

async function drawMap(ctx, x, y, w, h, extent, opts) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = "#e8ecf0"; ctx.fillRect(x, y, w, h);
  const base = await loadImage(basemapUrl(extent, w, h));
  if (base) ctx.drawImage(base, x, y, w, h);

  // GMSI classes from the raster data, over the whole extent
  const grid = opts.grid || (await readComposite(extent, 4e6));
  const toPx = (E, N) => [x + ((E - extent[0]) / (extent[2] - extent[0])) * w, y + ((extent[3] - N) / (extent[3] - extent[1])) * h];
  if (grid) {
    const cv = document.createElement("canvas"); cv.width = grid.w; cv.height = grid.h;
    const cx = cv.getContext("2d"), img = cx.createImageData(grid.w, grid.h);
    for (let i = 0; i < grid.data.length; i++) {
      const c = classOf(grid.data[i], grid.nodata);
      if (!c) continue;
      const rgba = CLASS_RGBA[c];
      img.data[i * 4] = rgba[0]; img.data[i * 4 + 1] = rgba[1]; img.data[i * 4 + 2] = rgba[2]; img.data[i * 4 + 3] = rgba[3];
    }
    cx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const gx = grid.bbox || extent;
    const [ax, ay] = toPx(gx[0], gx[3]), [bx, by] = toPx(gx[2], gx[1]);
    ctx.globalCompositeOperation = "multiply"; // like in the viewer: the terrain shows through
    ctx.drawImage(cv, ax, ay, bx - ax, by - ay);
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = true;
  }

  const path = (polys) => {
    ctx.beginPath();
    for (const p of polys) for (const ring of [p.outer, ...p.holes]) {
      ring.forEach(([E, N], i) => { const [px, py] = toPx(E, N); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
      ctx.closePath();
    }
  };
  if (opts.polys) { // dim everything outside the area, then the outline
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h);
    for (const p of opts.polys) for (const ring of [p.outer, ...p.holes]) {
      ring.forEach(([E, N], i) => { const [px, py] = toPx(E, N); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
      ctx.closePath();
    }
    ctx.fillStyle = "rgba(15,23,32,0.42)"; ctx.fill("evenodd");
    ctx.restore();
    path(opts.polys);
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = "#111"; ctx.lineWidth = 3.5; ctx.stroke();
  }
  if (opts.marker) {
    const [mx, my] = toPx(opts.marker[0], opts.marker[1]);
    if (opts.radius) { // the buffer the point query averages over
      const rpx = opts.radius / ((extent[2] - extent[0]) / w);
      ctx.beginPath(); ctx.arc(mx, my, rpx, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15,23,42,0.10)"; ctx.fill();
      ctx.lineWidth = 8; ctx.strokeStyle = "#fff"; ctx.stroke();
      ctx.lineWidth = 3.5; ctx.strokeStyle = "#111"; ctx.setLineDash([14, 9]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.beginPath(); ctx.arc(mx, my, 13, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.arc(mx, my, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#111"; ctx.fill();
  }
  // scale bar
  const mPerPx = (extent[2] - extent[0]) / w;
  const nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000].filter((m) => m / mPerPx <= w * 0.28).pop() || 100;
  const sw = nice / mPerPx, sx = x + 18, sy = y + h - 22;
  ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(sx - 8, sy - 22, sw + 16, 36);
  ctx.fillStyle = "#111"; ctx.fillRect(sx, sy, sw, 4);
  ctx.font = `600 15px ${EXPORT_FONT}`; ctx.textBaseline = "alphabetic";
  ctx.fillText(nice >= 1000 ? `${nice / 1000} km` : `${nice} m`, sx, sy - 6);
  ctx.restore();
  ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
}

// ---------------------------------------------------------------- report layout

function newReportCanvas() {
  const cv = document.createElement("canvas");
  cv.width = EXPORT_W; cv.height = EXPORT_H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);
  return { cv, ctx };
}

async function drawHeader(ctx, title) {
  ctx.fillStyle = "#0072b2"; ctx.fillRect(0, 0, EXPORT_W, 120);
  ctx.fillStyle = "#fff"; ctx.textBaseline = "alphabetic";
  ctx.font = `700 40px ${EXPORT_FONT}`; ctx.fillText(t("app.title"), 60, 62);
  ctx.font = `400 24px ${EXPORT_FONT}`; ctx.fillText(title, 60, 98);
  ctx.textAlign = "right"; ctx.fillText(exportDate(), EXPORT_W - 60, 98); ctx.textAlign = "left";
}

const LOGO_LINKS = [
  { file: "icon.png", url: "https://www.slf.ch/en/projects/displacement-anomaly-maps/" }, // DAM project
  { file: "slf-logo.png", url: "https://www.slf.ch/en/" },
];

// footer: notes and sources on the left, the DAM and SLF logos bottom right (clickable in the PDF).
// Returns the clickable areas in canvas pixels.
async function drawFooter(ctx, noteText) {
  const imgs = await Promise.all(LOGO_LINKS.map((l) => loadImage(l.file)));
  const logoH = 96, links = [];
  const logoW = (img) => Math.round((img.width / img.height) * logoH);
  let right = EXPORT_W - 60;
  for (let i = imgs.length - 1; i >= 0; i--) if (imgs[i]) right -= logoW(imgs[i]) + 26;
  const textW = Math.max(520, right - 60 - 20);
  ctx.font = `400 17px ${EXPORT_FONT}`;
  const noteLines = wrapLines(ctx, noteText, textW);
  const creditLines = wrapLines(ctx, "GMSI © Jacquemart & Manconi (2025) · Copernicus Sentinel-1 (ESA) · " + t("export.maps"), textW);
  // grow the footer when a long note needs more lines than the default 170 px
  const need = 34 + 23 * (noteLines.length + creditLines.length) + 4 + 8 + 16;
  const y0 = EXPORT_H - Math.max(170, need);
  ctx.fillStyle = "#e2e8f0"; ctx.fillRect(60, y0, EXPORT_W - 120, 2);
  const logoY = y0 + 28;
  right = EXPORT_W - 60;
  for (let i = imgs.length - 1; i >= 0; i--) { // right to left: SLF, then DAM
    const img = imgs[i];
    if (!img) continue;
    const w = logoW(img);
    ctx.drawImage(img, right - w, logoY, w, logoH);
    links.push({ x: right - w, y: logoY, w, h: logoH, url: LOGO_LINKS[i].url });
    right -= w + 26;
  }
  ctx.fillStyle = "#64748b"; ctx.font = `400 17px ${EXPORT_FONT}`;
  let y = y0 + 34;
  for (const l of noteLines) { ctx.fillText(l, 60, y); y += 23; }
  for (const l of creditLines) { ctx.fillText(l, 60, y + 4); y += 23; }
  y += 8;
  ctx.fillStyle = "#94a3b8"; ctx.font = `400 15px ${EXPORT_FONT}`;
  const link = location.href.length > 70 ? location.href.slice(0, 67) + "…" : location.href;
  ctx.fillText(link, 60, y);
  links.push({ x: 60, y: y - 16, w: Math.min(ctx.measureText(link).width, textW), h: 22, url: location.href }); // the view
  return links;
}

function drawBar(ctx, x, y, w, h, parts) {
  ctx.save();
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 6) : ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = "#eef1f4"; ctx.fillRect(x, y, w, h);
  let cx = x;
  for (const p of parts) { const pw = (w * p.share) / 100; if (pw > 0) { ctx.fillStyle = p.color; ctx.fillRect(cx, y, pw, h); cx += pw; } }
  ctx.restore();
}

async function renderAreaReport(m) {
  const { cv, ctx } = newReportCanvas();
  await drawHeader(ctx, t("area.title"));
  const mapX = 60, mapY = 160, mapW = EXPORT_W - 120, mapH = 640;
  await drawMap(ctx, mapX, mapY, mapW, mapH, m.extent, { polys: m.polys, grid: m.grid });
  let y = mapY + mapH + 56;
  ctx.fillStyle = "#0f172a"; ctx.font = `700 30px ${EXPORT_FONT}`;
  ctx.fillText(m.sizeText, 60, y); y += 16;
  if (m.border) {
    ctx.font = `400 20px ${EXPORT_FONT}`;
    const lines = wrapLines(ctx, m.border, EXPORT_W - 168);
    ctx.fillStyle = "#fff4e5"; ctx.fillRect(60, y + 6, EXPORT_W - 120, lines.length * 28 + 20);
    ctx.fillStyle = "#e08a00"; ctx.fillRect(60, y + 6, 6, lines.length * 28 + 20);
    ctx.fillStyle = "#5b3a00";
    lines.forEach((l, i) => ctx.fillText(l, 84, y + 38 + i * 28));
    y += lines.length * 28 + 30;
  }
  y += 24;
  drawBar(ctx, 60, y, EXPORT_W - 120, 30, m.classes.filter((c) => !c.muted).map((c) => ({ share: c.dataShare, color: c.color })));
  y += 30 + 30;
  ctx.font = `400 22px ${EXPORT_FONT}`;
  for (const c of m.classes) {
    ctx.fillStyle = c.color; ctx.fillRect(60, y - 17, 20, 20);
    ctx.fillStyle = c.muted ? "#64748b" : "#0f172a";
    ctx.textAlign = "left"; ctx.fillText(c.label, 96, y);
    ctx.textAlign = "right"; ctx.fillText(c.pctText, EXPORT_W - 230, y);
    ctx.fillStyle = "#64748b"; ctx.fillText(c.areaText, EXPORT_W - 60, y);
    ctx.textAlign = "left"; y += 38;
  }
  y += 14;
  ctx.fillStyle = "#0f172a"; ctx.font = `500 24px ${EXPORT_FONT}`;
  for (const l of wrapLines(ctx, m.summary, EXPORT_W - 120)) { ctx.fillText(l, 60, y); y += 33; }
  y += 18;
  if (m.tracks.length) {
    ctx.fillStyle = "#64748b"; ctx.font = `600 19px ${EXPORT_FONT}`; ctx.fillText(m.tracksTitle.toUpperCase(), 60, y); y += 14;
    ctx.font = `400 21px ${EXPORT_FONT}`;
    for (const tr of m.tracks) {
      y += 32;
      ctx.fillStyle = "#0f172a"; ctx.fillText(tr.label, 60, y);
      drawBar(ctx, 330, y - 18, 640, 16, [{ share: tr.share, color: tr.color }]);
      ctx.textAlign = "right"; ctx.fillText(tr.shareText, EXPORT_W - 60, y); ctx.textAlign = "left";
    }
  }
  cv.links = await drawFooter(ctx, m.note);
  return cv;
}

async function renderPointReport(m) {
  const { cv, ctx } = newReportCanvas();
  await drawHeader(ctx, t("export.title.point"));
  const mapX = 60, mapY = 160, mapW = EXPORT_W - 120, mapH = 560;
  await drawMap(ctx, mapX, mapY, mapW, mapH, m.extent, { marker: m.marker, radius: m.radius });
  let y = mapY + mapH + 40;
  // verdict band
  ctx.fillStyle = VERDICT_COLORS[m.verdict.cls] || "#777"; ctx.fillRect(60, y, EXPORT_W - 120, 64);
  ctx.fillStyle = "#fff"; ctx.font = `700 30px ${EXPORT_FONT}`; ctx.fillText(m.verdict.title, 84, y + 43);
  if (m.valueText) { ctx.textAlign = "right"; ctx.font = `600 28px ${EXPORT_FONT}`; ctx.fillText(m.valueText, EXPORT_W - 84, y + 43); ctx.textAlign = "left"; }
  y += 64 + 36;
  ctx.fillStyle = "#0f172a"; ctx.font = `400 24px ${EXPORT_FONT}`;
  for (const l of wrapLines(ctx, m.verdict.text, EXPORT_W - 120)) { ctx.fillText(l, 60, y); y += 34; }
  y += 8;
  if (m.bestTrack) { ctx.font = `700 24px ${EXPORT_FONT}`; ctx.fillText(t("summary.bestTrack"), 60, y); const w0 = ctx.measureText(t("summary.bestTrack")).width; ctx.font = `400 24px ${EXPORT_FONT}`; ctx.fillText(m.bestTrack, 60 + w0, y); y += 44; }
  if (m.rows && m.rows.length) {
    ctx.fillStyle = "#64748b"; ctx.font = `600 19px ${EXPORT_FONT}`;
    ctx.fillText(t("summary.table.track").toUpperCase(), 60, y); ctx.fillText(t("summary.table.direction").toUpperCase(), 330, y); ctx.fillText(t("summary.table.gmsi").toUpperCase(), 640, y);
    y += 8; ctx.fillStyle = "#e2e8f0"; ctx.fillRect(60, y, EXPORT_W - 120, 2);
    ctx.font = `400 23px ${EXPORT_FONT}`;
    for (const r of m.rows) {
      y += 40;
      ctx.fillStyle = "#0f172a"; ctx.fillText(r.track, 60, y); ctx.fillText(r.direction, 330, y);
      if (r.color) { ctx.fillStyle = r.color; ctx.fillRect(640, y - 17, 18, 18); ctx.fillStyle = "#0f172a"; ctx.fillText(r.text, 668, y); }
      else { ctx.fillStyle = "#64748b"; ctx.fillText(r.text, 640, y); }
    }
    y += 40; ctx.fillStyle = "#0f172a"; ctx.font = `500 22px ${EXPORT_FONT}`;
    for (const l of wrapLines(ctx, m.rowsMsg, EXPORT_W - 120)) { ctx.fillText(l, 60, y); y += 31; }
  }
  y += 22; ctx.fillStyle = "#475569"; ctx.font = `400 21px ${EXPORT_FONT}`; ctx.fillText(m.coordText, 60, y);
  if (m.bufferText) { y += 32; ctx.fillText(m.bufferText, 60, y); }
  if (m.terrainText) { y += 32; ctx.font = `400 21px ${EXPORT_FONT}`; ctx.fillText(m.terrainText, 60, y); }
  if (m.terrainHint) { ctx.font = `400 19px ${EXPORT_FONT}`; ctx.fillStyle = "#64748b"; for (const l of wrapLines(ctx, m.terrainHint, EXPORT_W - 120)) { y += 27; ctx.fillText(l, 60, y); } }
  cv.links = await drawFooter(ctx, m.note);
  return cv;
}

// ---------------------------------------------------------------- models from the current results

async function buildAreaModel() {
  const res = areaState.lastResult, polys = areaState.rings;
  if (!res || res.pending || res.error || !polys) return null;
  const c = res.counts, total = res.insidePx, dataPx = total - c.nodata;
  const pct = (n, tot) => (tot ? (100 * n) / tot : 0);
  const fp = (p) => (p > 0 && p < 1 ? "<1" : String(Math.round(p))) + " %";
  const classes = AREA_CLASSES.filter((cl) => cl.id !== "nodata" || c.nodata > 0).map((cl) => {
    const muted = cl.id === "nodata";
    const share = muted ? pct(c.nodata, total) : pct(c[cl.id], dataPx);
    return { id: cl.id, label: t(cl.key), color: cl.color, muted, share, dataShare: share, pctText: fp(share), areaText: fmtArea(c[cl.id] * res.cellM2), km2: c[cl.id] * res.cellM2 };
  });
  const good = pct(c.good, dataPx), mid = pct(c.mid, dataPx), bad = pct(c.bad, dataPx), blocked = pct(c.blocked, dataPx);
  const key = res.validPx === 0 ? "area.sum.none" : good >= 60 ? "area.sum.good" : good + mid >= 60 ? "area.sum.mixed" : "area.sum.poor";
  const trackEntries = Object.entries(res.tracks).sort((a, b) => b[1] - a[1]);
  const nodataShare = pct(c.nodata, total);
  const box = polygonsBBox(polys);
  const mapW = EXPORT_W - 120, mapH = 640;
  const extent = fitExtent(box, mapW, mapH, 0.16);
  // the grid read for the assessment covers exactly the polygon's bounding box
  const grid = await readComposite(box, 4e6);
  if (grid) grid.bbox = box;
  return {
    kind: "area", polys, extent, grid,
    sizeText: c.nodata > 0 ? t("area.sizeWithData", { area: fmtArea(res.areaM2), data: fmtArea(dataPx * res.cellM2) }) : t("area.size", { area: fmtArea(res.areaM2) }),
    border: nodataShare >= 10 && dataPx > 0 ? t("area.border", { pct: Math.round(nodataShare) }) : "",
    classes, summary: t(key, { good: Math.round(good), usable: Math.round(good + mid), poor: Math.round(bad + blocked) }),
    tracksTitle: t("area.bestTracks"),
    tracks: trackEntries.map(([tr, n]) => ({ track: tr, label: `${tr} (${TRACK_INFO[tr].richtung})`, color: TRACK_COLORS[tr] || "#888", share: pct(n, res.validPx), shareText: fp(pct(n, res.validPx)) })),
    note: res.approximate ? t("area.noteApprox", { cell: Math.round(res.cell) }) : t("area.note"),
    res, dataPx, meanGmsi: res.meanGmsi,
  };
}

async function buildPointModel() {
  const s = state.lastSite;
  if (!s || !s.verdict) return null;
  if (!s.rows && typeof collectTrackRows === "function") s.rows = await collectTrackRows(s.latlng);
  const rows = (s.rows || []).map((r) => ({
    track: r.track, direction: TRACK_INFO[r.track].richtung,
    color: r.g !== null ? (r.g >= 0.4 ? "#5B9BCB" : r.g >= 0.2 ? "#FDAE61" : "#D7191C") : null,
    text: r.g !== null ? r.g.toFixed(2) : r.geometryBlocked ? t("summary.shadowLayover") : t("summary.noData"), value: r.g,
  }));
  const good = (s.rows || []).filter((r) => r.g !== null && r.g >= 0.4).length;
  const fmt = (n) => Math.round(n).toLocaleString("de-CH");
  const radius = s.radius || state.bufferRadius;
  const half = Math.max(600, radius * 3); // the circle has to fit into the map's height
  return {
    kind: "point", marker: [s.x, s.y], radius, extent: fitExtent([s.x - half, s.y - half * 0.5, s.x + half, s.y + half * 0.5], EXPORT_W - 120, 560, 0),
    verdict: s.verdict, valueText: s.cv !== null && s.cv >= 0 ? `GMSI ${s.cv.toFixed(2)}` : "", value: s.cv,
    bestTrack: s.bestTrack, rows,
    rowsMsg: rows.length ? (good === 0 ? t("summary.msg.none") : good === 1 ? t("summary.msg.one") : t("summary.msg.many", { good, total: rows.length })) : "",
    bufferText: t("summary.bufferInfo", { r: radius }),
    coordText: `LV95 E ${fmt(s.x)} / N ${fmt(s.y)}` + (s.height != null ? ` · ${s.height}${t("summary.elevation")}` : ""),
    terrainText: s.terrain ? (s.terrain.aspect === null ? t("summary.terrain.flat") : t("summary.terrain", { slope: Math.round(s.terrain.slope), dir: aspectLabel(s.terrain.aspect) })) : "",
    terrainHint: s.terrain && s.terrain.hint && s.terrain.hint !== "flat" ? t("summary.terrain." + s.terrain.hint) : "",
    note: t("summary.note"), site: s,
  };
}

// ---------------------------------------------------------------- CSV

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const toCsv = (rows) => "﻿" + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n") + "\r\n"; // BOM: Excel reads UTF-8

function areaCsv(m) {
  const c = m.res.counts, ll = proj4("EPSG:2056", "EPSG:4326", [(m.polys[0].outer[0][0]), (m.polys[0].outer[0][1])]);
  const rows = [
    [t("app.title"), t("area.title")], ["date", new Date().toISOString().slice(0, 10)], ["area_km2", (m.res.areaM2 / 1e6).toFixed(4)],
    ["area_with_data_km2", (m.dataPx * m.res.cellM2 / 1e6).toFixed(4)], ["mean_gmsi", m.meanGmsi === null ? "" : m.meanGmsi.toFixed(3)],
    ["grid_cell_m", Math.round(m.res.cell)], ["approximate", m.res.approximate ? "yes" : "no"], [],
    ["class", "share_of_area_with_data_percent", "area_km2"],
  ];
  const dataPx = m.dataPx;
  for (const cl of AREA_CLASSES) {
    if (cl.id === "nodata") rows.push(["no_data", "", (c.nodata * m.res.cellM2 / 1e6).toFixed(4)]);
    else rows.push([cl.id, dataPx ? (100 * c[cl.id] / dataPx).toFixed(2) : "", (c[cl.id] * m.res.cellM2 / 1e6).toFixed(4)]);
  }
  rows.push([], ["best_track", "share_of_assessable_area_percent"]);
  for (const tr of m.tracks) rows.push([tr.track, tr.share.toFixed(2)]);
  rows.push([], ["polygon_vertices_LV95_E_N"]);
  for (const p of m.polys) { p.outer.forEach(([E, N]) => rows.push([E.toFixed(1), N.toFixed(1)])); }
  rows.push([], ["link", location.href]);
  return toCsv(rows);
}

function pointCsv(m) {
  const s = m.site;
  const rows = [
    [t("app.title"), t("export.title.point")], ["date", new Date().toISOString().slice(0, 10)],
    ["E_LV95", Math.round(s.x)], ["N_LV95", Math.round(s.y)], ["buffer_radius_m", m.radius], ["height_m", s.height ?? ""],
    ["slope_deg", s.terrain ? s.terrain.slope.toFixed(1) : ""], ["aspect_deg", s.terrain && s.terrain.aspect !== null ? s.terrain.aspect.toFixed(0) : ""],
    ["verdict", s.verdict.title], ["gmsi_composite", s.cv !== null && s.cv >= 0 ? s.cv.toFixed(3) : ""], ["best_track", s.bestTrack || ""], [],
    ["track", "direction", "gmsi", "note"],
  ];
  for (const r of m.rows) rows.push([r.track, r.direction, r.value !== null ? r.value.toFixed(3) : "", r.value === null ? r.text : ""]);
  rows.push([], ["link", location.href]);
  return toCsv(rows);
}

// ---------------------------------------------------------------- PDF (one A4 page holding the report as JPEG)

function pdfFromJpeg(jpegBytes, pxW, pxH, links) {
  const enc = new TextEncoder(), chunks = [], offsets = [];
  let len = 0;
  const push = (data) => { const b = typeof data === "string" ? enc.encode(data) : data; chunks.push(b); len += b.length; };
  const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); push(body); push("\nendobj\n"); };
  const PW = 595.28, PH = 841.89, k = PW / pxW;
  const pdfStr = (u) => "(" + u.replace(/[\\()]/g, (c) => "\\" + c).replace(/[^\x20-\x7e]/g, "") + ")";
  const annots = (links || []).map((l, i) => ({ n: 6 + i, l }));
  push("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R` +
    (annots.length ? ` /Annots [${annots.map((a) => a.n + " 0 R").join(" ")}]` : "") + " >>");
  offsets[4] = len;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  push(jpegBytes); push("\nendstream\nendobj\n");
  const content = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  for (const { n, l } of annots) { // clickable areas: /Rect in points, origin bottom left
    const x0 = (l.x * k).toFixed(2), x1 = ((l.x + l.w) * k).toFixed(2), y0 = (PH - (l.y + l.h) * k).toFixed(2), y1 = (PH - l.y * k).toFixed(2);
    obj(n, `<< /Type /Annot /Subtype /Link /Rect [${x0} ${y0} ${x1} ${y1}] /Border [0 0 0] /A << /S /URI /URI ${pdfStr(l.url)} >> >>`);
  }
  const total = 6 + annots.length;
  const xref = len;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) push(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(len);
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

function dataUrlBytes(url) {
  const bin = atob(url.split(",")[1]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

// ---------------------------------------------------------------- public entry point and buttons

async function exportResult(kind, format) {
  const m = kind === "area" ? await buildAreaModel() : await buildPointModel();
  if (!m) throw new Error("nothing to export");
  const base = `gmsi_${exportCanton().toLowerCase()}_${kind === "area" ? "flaeche" : "punkt"}_${stamp()}`;
  if (format === "csv") return download(new Blob([kind === "area" ? areaCsv(m) : pointCsv(m)], { type: "text/csv;charset=utf-8" }), base + ".csv");
  const cv = kind === "area" ? await renderAreaReport(m) : await renderPointReport(m);
  if (format === "png") return download(await new Promise((r) => cv.toBlob(r, "image/png")), base + ".png");
  const jpeg = dataUrlBytes(cv.toDataURL("image/jpeg", 0.92));
  return download(new Blob([pdfFromJpeg(jpeg, cv.width, cv.height, cv.links)], { type: "application/pdf" }), base + ".pdf");
}

// a small row "Export: PNG · PDF · CSV" for the area panel and the point popup
function makeExportRow(kind) {
  const row = document.createElement("div");
  row.className = "export-row";
  const label = document.createElement("span");
  label.textContent = t("export.label");
  row.appendChild(label);
  for (const fmt of ["png", "pdf", "csv"]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "export-btn";
    b.textContent = fmt.toUpperCase();
    b.title = t(`export.${fmt}`);
    b.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      if (b.disabled) return;
      const old = b.textContent;
      b.disabled = true; b.textContent = "…";
      try { await exportResult(kind, fmt); }
      catch (err) { console.error("Export fehlgeschlagen", err); b.title = t("export.failed"); b.classList.add("failed"); setTimeout(() => b.classList.remove("failed"), 3000); }
      b.disabled = false; b.textContent = old;
    });
    row.appendChild(b);
  }
  return row;
}
