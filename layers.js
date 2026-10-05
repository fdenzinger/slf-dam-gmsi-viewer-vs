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
const GMSI_ORANGE = [253, 184, 99, 255]; // #FDB863
const GMSI_GREEN = [26, 150, 65, 255];   // #1A9641
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
    { color: "#1A9641", label: t("legend.gmsi.green") },
    { color: "#FDB863", label: t("legend.gmsi.yellow") },
    { color: "#D7191C", label: t("legend.gmsi.red") },
    { color: "#5A5A5A", label: t("legend.gmsi.blocked") },
  ];
}

// GAMMA ls_map codes: 1 = visible/no issue (not colored); 5 = layover,
// 17 = shadow, 21 = layover in shadow are collapsed into a single "no data
// possible" category -- the distinction between the three geometric causes
// isn't actionable for canton staff, it's simpler to just flag "no
// measurement possible here"
const SHADOW_NO_DATA = [90, 90, 90, 255]; // #5A5A5A
function shadowLayoverColor(v, nodata) {
  if (v === nodata || v === null || v === undefined || Number.isNaN(v)) return TRANSPARENT;
  if (v === 5 || v === 17 || v === 21) return SHADOW_NO_DATA;
  return TRANSPARENT; // includes value 1 (visible, no issue)
}
function shadowLegend() {
  return [{ color: "#5A5A5A", label: t("legend.shadow") }];
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
];

function groupLabel(g) {
  return g === "0" || g === 0 ? null : t(`group.${g}`);
}

// text-label counterparts of the color functions, for the click-to-query popup
function gmsiLabel(v) {
  if (v < 0) return "keine Messung möglich (Radarschatten / Layover)";
  if (v < 0.2) return "schlechte Bedingungen";
  if (v < 0.4) return "Messungen möglich, aber mit Vorsicht";
  return "sehr gute Bedingungen";
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
    case "hillshade": return hillshadeColor;
    default: return () => TRANSPARENT;
  }
}

// default layer opacity: GMSI classes and the best-track overlay start at 75 %
function defaultOpacityForKind(kind) {
  return kind === "gmsi" || kind === "orbit" ? 0.75 : 1;
}
