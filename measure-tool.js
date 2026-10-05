// Distance measurement on the map: click points, get the cumulative length at
// every vertex and the total at the end. Lengths are horizontal (map)
// distances in LV95, not distances along the terrain. Shares the on-map
// control and the hint bar with the area assessment (area-stats.js).
// Identical in the GR and VS viewers.

const measureState = {
  active: false,
  points: [],
  line: null,
  markers: [],
  preview: null,
  group: null,
};

const MEASURE_COLOR = "#111111"; // black on a white casing, same as the area outline (see casedLine)

function fmtLength(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toLocaleString("de-CH", { maximumFractionDigits: m < 10000 ? 2 : 1 })} km`;
}

function measureLengths(pts) {
  const xy = pts.map(toLV95);
  const cum = [0];
  for (let i = 1; i < xy.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
  }
  return cum;
}

function clearMeasurement() {
  if (measureState.group) { state.map.removeLayer(measureState.group); measureState.group = null; }
  measureState.line = null;
  measureState.markers = [];
  measureState.preview = null;
  measureState.points = [];
}

function startMeasure() {
  cancelAreaDrawing();
  clearMeasurement();
  measureState.active = true;
  state.map.doubleClickZoom.disable();
  state.map.getContainer().classList.add("area-drawing");
  measureState.group = L.layerGroup().addTo(state.map);
  if (state.summaryPopup) state.map.closePopup(state.summaryPopup);
  setAreaHint(t("measure.hintDraw"));
  document.querySelector(".measure-control-btn")?.classList.add("active");
}

function endMeasureMode() {
  measureState.active = false;
  // after the double-click that finished the tool has been fully dispatched, or it would also zoom
  setTimeout(() => state.map.doubleClickZoom.enable(), 100);
  state.map.getContainer().classList.remove("area-drawing");
  if (measureState.preview) { measureState.group.removeLayer(measureState.preview); measureState.preview = null; }
  setAreaHint(null);
  document.querySelector(".measure-control-btn")?.classList.remove("active");
}

function cancelMeasure() {
  if (!measureState.active) return;
  endMeasureMode();
  clearMeasurement();
}

function finishMeasure() {
  if (!measureState.active) return;
  // a double-click delivers two clicks at the same spot: drop the duplicates
  const pts = measureState.points;
  while (pts.length > 1 && state.map.latLngToContainerPoint(pts[pts.length - 1]).distanceTo(state.map.latLngToContainerPoint(pts[pts.length - 2])) <= 3) {
    pts.pop();
    const m = measureState.markers.pop();
    if (m) measureState.group.removeLayer(m);
  }
  if (pts.length < 2) { setAreaHint(t("measure.hintMin")); return; }
  endMeasureMode();
  drawMeasureLabels(true);
}

function drawMeasureLabels(final) {
  const pts = measureState.points;
  const cum = measureLengths(pts);
  measureState.markers.forEach((m, i) => {
    m.unbindTooltip();
    if (i === 0) return;
    const last = final && i === pts.length - 1;
    if (last) {
      const box = document.createElement("span");
      const total = document.createElement("strong");
      total.textContent = fmtLength(cum[i]);
      total.title = t("measure.horizontal");
      const x = document.createElement("a");
      x.href = "#";
      x.className = "measure-x";
      x.textContent = "✕";
      x.title = t("modal.close");
      x.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); clearMeasurement(); });
      box.append(total, x);
      m.bindTooltip(box, { permanent: true, direction: "right", offset: [8, 0], className: "measure-label measure-label-total", interactive: true });
    } else {
      m.bindTooltip(fmtLength(cum[i]), { permanent: true, direction: "right", offset: [6, 0], className: "measure-label" });
    }
  });
  if (final && measureState.markers.length) measureState.markers[measureState.markers.length - 1].openTooltip();
  else measureState.markers.forEach((m) => m.getTooltip() && m.openTooltip());
}

function onMeasureMapClick(e) {
  if (!measureState.active) return false;
  const pts = measureState.points;
  // clicking the last vertex again ends the measurement
  if (pts.length >= 2) {
    const a = state.map.latLngToContainerPoint(pts[pts.length - 1]);
    if (a.distanceTo(state.map.latLngToContainerPoint(e.latlng)) < 8) { finishMeasure(); return true; }
  }
  pts.push(e.latlng);
  const m = L.circleMarker(e.latlng, { radius: 5, color: MEASURE_COLOR, weight: 2.5, fillColor: "#fff", fillOpacity: 1, interactive: false }).addTo(measureState.group);
  measureState.markers.push(m);
  if (!measureState.line) {
    measureState.line = casedLine(pts, 3).addTo(measureState.group);
  } else {
    measureState.line.setLatLngs(pts);
  }
  drawMeasureLabels(false);
  setAreaHint(t("measure.hintFinish"));
  return true;
}

function refreshMeasureTexts() {
  if (measureState.active) setAreaHint(t(measureState.points.length < 2 ? "measure.hintDraw" : "measure.hintFinish"));
  else if (measureState.group && measureState.markers.length > 1) drawMeasureLabels(true);
}

function initMeasureTool() {
  state.map.on("mousemove", (e) => {
    if (!measureState.active || !measureState.points.length) return;
    const pts = measureState.points.concat([e.latlng]);
    if (!measureState.preview) {
      measureState.preview = casedLine(pts, 2.5, "5 5").addTo(measureState.group);
    } else {
      measureState.preview.setLatLngs(pts);
    }
  });
  state.map.on("dblclick", () => { if (measureState.active) finishMeasure(); });
  document.addEventListener("keydown", (e) => {
    if (!measureState.active) return;
    if (e.key === "Escape") cancelMeasure();
    else if (e.key === "Enter") finishMeasure();
    else if (e.key === "Backspace" && measureState.points.length) {
      e.preventDefault();
      measureState.points.pop();
      const m = measureState.markers.pop();
      if (m) measureState.group.removeLayer(m);
      measureState.line && measureState.line.setLatLngs(measureState.points);
      drawMeasureLabels(false);
    }
  });
}
