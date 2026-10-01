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
  if (v < 0.2) return GMSI_RED;
  if (v < 0.4) return GMSI_ORANGE;
  return GMSI_GREEN;
}
const GMSI_LEGEND = [
  { color: "#1A9641", label: "GMSI ≥ 0.4 – sehr gute Bedingungen" },
  { color: "#FDB863", label: "GMSI 0.2 – 0.4 – Messungen möglich, aber mit Vorsicht" },
  { color: "#D7191C", label: "GMSI < 0.2 – schlechte Bedingungen" },
];

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
const SHADOW_LEGEND = [
  { color: "#5A5A5A", label: "Keine Messung möglich (Radarschatten / Layover)" },
];

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
  return TRACKS_VS.map((t) => ({ color: TRACK_COLORS[t], label: t }));
}

function hillshadeColor(v, nodata) {
  if (v === nodata || v === null || v === undefined || Number.isNaN(v)) return TRANSPARENT;
  const g = Math.max(0, Math.min(255, Math.round(v)));
  return [g, g, g, 255];
}

// manifest of expected files -> { group, label, kind }
// "kind" selects which color function + legend to use
const LAYER_MANIFEST = [
  { file: "GMSI_VS_composite.tif", group: 1, label: "GMSI Übersicht (bester Wert aller Tracks)", kind: "gmsi", defaultOn: true },
  { file: "GMSI_VS_best_orbit.tif", group: 2, label: "Bester Track pro Pixel", kind: "orbit" },
  ...TRACKS_VS.map((t) => ({ file: `GMSI_VS_${t}.tif`, group: 3, label: t, kind: "gmsi" })),
  ...TRACKS_VS.map((t) => ({ file: `GMSI_VS_shadow_layover_${t}.tif`, group: 4, label: t, kind: "shadow" })),
];

const GROUP_LABELS = {
  0: null, // hillshade: not shown as a toggleable group
  1: "1 – Übersicht",
  2: "2 – Track wählen",
  3: "3 – GMSI pro Track",
  4: "4 – Shadow/Layover pro Track",
};

// text-label counterparts of the color functions, for the click-to-query popup
function gmsiLabel(v) {
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
