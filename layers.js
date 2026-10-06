// Layer definitions mirroring the QGIS project exactly:
// same files, same classification thresholds, same colors.
// Color functions return [r,g,b,a] (a=0 means transparent) for direct use
// in canvas ImageData; use rgbaToCss() to render swatches in the UI.

const TRACKS_VS = ["A015", "A088", "D066", "D139"];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbaToCss([r, g, b, a]) {
  return `rgba(${r},${g},${b},${a / 255})`;
}

const TRACK_COLORS = {
  A015: "#3C7AA9",
  A088: "#5ACDEE",
  D066: "#F36976",
  D139: "#AE3A76",
};
const TRACK_RGB = {};
for (const k in TRACK_COLORS) TRACK_RGB[k] = hexToRgb(TRACK_COLORS[k]);

const TRACK_INFO = {
  A015: { richtung: "ascending", nummer: 15, hinweis: "" },
  A088: { richtung: "ascending", nummer: 88, hinweis: "" },
  D066: { richtung: "descending", nummer: 66, hinweis: "" },
  D139: { richtung: "descending", nummer: 139, hinweis: "" },
};

const TRANSPARENT = [0, 0, 0, 0];

// GMSI "Ampel" (traffic-light) classification, matching the SLF slide "Einstufung GMSI"
// colours are fully opaque; the 75 % default opacity is applied per layer
// (see defaultOpacityForKind) so the transparency slider shows the real value
const GMSI_RED = [215, 25, 28, 255];     // #D7191C
const GMSI_ORANGE = [253, 174, 97, 255]; // #FDAE61
const GMSI_GREEN = [91, 155, 203, 255];  // #5B9BCB (blue; name kept for the "good" class)
function gmsiColor(v, nodata) {
  if (v === nodata || v === null || v === undefined || Number.isNaN(v)) return TRANSPARENT;
  // composite flag: inside the canton but no GMSI in any track (layover/shadow) (negative also catches overview averaging)
  if (v < 0) return SHADOW_NO_DATA;
  if (v < 0.2) return GMSI_RED;
  if (v < 0.4) return GMSI_ORANGE;
  return GMSI_GREEN;
}
function gmsiLegend() {
  return [
    { color: "#5B9BCB", label: t("legend.gmsi.green") },
    { color: "#FDAE61", label: t("legend.gmsi.yellow") },
    { color: "#D7191C", label: t("legend.gmsi.red") },
    { color: "#3A3A3A", label: t("legend.gmsi.blocked") },
  ];
}

// GAMMA ls_map codes: 1 = visible/no issue (not colored); 5 = layover,
// 17 = shadow, 21 = layover in shadow are collapsed into a single "no data
// possible" category -- the distinction between the three geometric causes
// isn't actionable for canton staff, it's simpler to just flag "no
// measurement possible here"
const SHADOW_NO_DATA = [58, 58, 58, 255]; // #3A3A3A
function shadowLayoverColor(v, nodata) {
  if (v === nodata || v === null || v === undefined || Number.isNaN(v)) return TRANSPARENT;
  if (v === 5 || v === 17 || v === 21) return SHADOW_NO_DATA;
  return TRANSPARENT; // includes value 1 (visible, no issue)
}
function shadowLegend() {
  return [{ color: "#3A3A3A", label: t("legend.shadow") }];
}

// best-orbit categorical index: 0=A015 .. 3=D139 (order fixed by the source data)
const ORBIT_INDEX_ORDER = ["A015", "A088", "D066", "D139"];
function bestOrbitColor(v, nodata) {
  if (v === nodata || v === null || v === undefined || Number.isNaN(v)) return TRANSPARENT;
  const track = ORBIT_INDEX_ORDER[Math.round(v)];
  if (!track || !TRACK_RGB[track]) return TRANSPARENT;
  const [r, g, b] = TRACK_RGB[track];
  return [r, g, b, 255];
}
function bestOrbitLegend() {
  return TRACKS_VS.map((tr) => ({ color: TRACK_COLORS[tr], label: tr }));
}

// permafrost map (Kenner et al. 2018), rasterised to the 10 m grid: 1..5 = ground temperature classes, 6 = glacier (not drawn)
const PERMAFROST_COLORS = {
  1: [122, 141, 184, 255], // < -3 °C
  2: [123, 174, 255, 255], // -3 to -2
  3: [125, 223, 255, 255], // -2 to -1
  4: [182, 238, 255, 255], // -1 to 0
  5: [255, 255, 128, 255], // 0 to +1 (possible patchy permafrost)
};
function permafrostColor(v, nodata) {
  if (v === nodata || v === null || v === undefined || Number.isNaN(v)) return TRANSPARENT;
  return PERMAFROST_COLORS[Math.round(v)] || TRANSPARENT;
}
function permafrostLegend() {
  return [1, 2, 3, 4, 5].map((k, i) => ({ color: rgbaToCss(PERMAFROST_COLORS[k]).replace(/, 1\)$/, ")"), label: t("legend.permafrost." + (i + 1)) }));
}

// swisstopo map overlays (WMS), shown with Multiply like the GMSI layers; the swatches repeat the colours of swisstopo's own legends
// only the 2016 inventory is shown: extent and debris cover (the WMS has no per-year sublayers, so the layer is filtered by these colours)
const GLACIER_SWATCHES = ["#BEFFE8", "#CD8966"];
const GLACIER_2016_RGB = [[190, 255, 232], [205, 137, 102]];
const SLOPE_SWATCHES = ["#F2E50A", "#F46F24", "#DE055B", "#C889BB", "#4B4B4B"];
function glacierLegend() { return GLACIER_SWATCHES.map((color, i) => ({ color, label: t("legend.glacier." + (i + 1)) })); }
function slopeLegend() { return SLOPE_SWATCHES.map((color, i) => ({ color, label: t("legend.slope." + (i + 1)) })); }

function hillshadeColor(v, nodata) {
  if (v === nodata || v === null || v === undefined || Number.isNaN(v)) return TRANSPARENT;
  const g = Math.max(0, Math.min(255, Math.round(v)));
  return [g, g, g, 255];
}

// manifest of expected files -> { group, label/labelKey, kind }
// "kind" selects which color function + legend to use. Group 1/2 entries
// carry a labelKey (resolved through t() at render time, so the sidebar
// relabels live on a language switch) instead of a baked-in string; group
// 3/4 entries use the track code itself as the label, which is already
// language-independent.
const LAYER_MANIFEST = [
  { file: "GMSI_VS_composite.tif", group: 1, labelKey: "layer.composite", kind: "gmsi", defaultOn: true },
  { file: "GMSI_VS_best_orbit.tif", group: 2, labelKey: "layer.bestOrbit", kind: "orbit" },
  ...TRACKS_VS.map((tr) => ({ file: `GMSI_VS_${tr}.tif`, group: 3, label: tr, kind: "gmsi" })),
  ...TRACKS_VS.map((tr) => ({ file: `GMSI_VS_shadow_layover_${tr}.tif`, group: 4, label: tr, kind: "shadow" })),
  // additional information (Advanced mode); small file served with the viewer itself, not from Zenodo
  { file: "PERMAFROST_VS.tif", group: 5, labelKey: "layer.permafrost", kind: "permafrost", local: "extra/PERMAFROST_VS.tif" },
  { file: "WMS_glacier", group: 5, labelKey: "layer.glacier", kind: "glacier", wms: "ch.swisstopo.geologie-gletscherausdehnung", keepColors: GLACIER_2016_RGB, attribution: "Gletscherausdehnung &copy; swisstopo, GLAMOS" },
  { file: "WMS_slope", group: 5, labelKey: "layer.slope", kind: "slope", wms: "ch.swisstopo.hangneigung-ueber_30", attribution: "Hangneigung &copy; swisstopo" },
];

function groupLabel(g) {
  return g === "0" || g === 0 ? null : t(`group.${g}`);
}

// text-label counterparts of the color functions, for the click-to-query popup
function gmsiLabel(v) {
  if (v < 0) return "keine Messung möglich (Radarschatten / Layover)";
  if (v < 0.2) return "schlechte Bedingungen";
  if (v < 0.4) return "Messungen möglich, aber mit Vorsicht";
  return "gute Bedingungen";
}
function shadowLayoverLabel(v) {
  if (v === 5 || v === 17 || v === 21) return "keine Messung möglich (Radarschatten / Layover)";
  return "keine Einschränkung (sichtbar)";
}

function colorFnForKind(kind) {
  switch (kind) {
    case "gmsi": return gmsiColor;
    case "orbit": return bestOrbitColor;
    case "shadow": return shadowLayoverColor;
    case "permafrost": return permafrostColor;
    case "hillshade": return hillshadeColor;
    default: return () => TRANSPARENT;
  }
}

// default layer opacity: GMSI classes, the best-track overlay and the shadow/layover layers start at 75 %
function defaultOpacityForKind(kind) {
  if (kind === "permafrost") return 0.9; // Multiply fades light colours, so this layer starts a bit more opaque
  if (kind === "glacier" || kind === "slope") return 0.85;
  return kind === "gmsi" || kind === "orbit" || kind === "shadow" ? 0.75 : 1;
}
