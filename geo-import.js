// Reads polygon files for the area assessment: GeoJSON, KML, KMZ and
// GeoPackage. Every reader returns polygons in LV95 as
// [{ outer: [[E, N], ...], holes: [[[E, N], ...], ...] }]
// Identical in the GR and VS viewers.

if (typeof proj4 !== "undefined" && !proj4.defs("EPSG:21781")) {
  proj4.defs(
    "EPSG:21781",
    "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 " +
    "+ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs"
  );
}

class GeoImportError extends Error {
  constructor(code, detail) {
    super(code);
    this.code = code; // "format" | "crs" | "empty"
    this.detail = detail;
  }
}

// [x, y] in the file's CRS -> LV95. srs: EPSG code (4326, 2056, 3857, 21781)
function makeLV95Projector(srs) {
  if (srs === 2056) return (c) => [c[0], c[1]];
  if (srs === 4326 || srs === 0 || srs == null) {
    return (c) => (Math.abs(c[0]) > 1e5 ? [c[0], c[1]] : proj4("EPSG:4326", "EPSG:2056", [c[0], c[1]]));
  }
  if (srs === 3857 || srs === 21781) {
    return (c) => proj4(`EPSG:${srs}`, "EPSG:2056", [c[0], c[1]]);
  }
  throw new GeoImportError("crs", srs);
}

// ---------------------------------------------------------------- GeoJSON

function polygonsFromGeoJson(gj) {
  const feats = gj.type === "FeatureCollection" ? gj.features : gj.type === "Feature" ? [gj] : [{ geometry: gj }];
  const project = makeLV95Projector(4326);
  const polys = [];
  const add = (rings) => {
    if (!rings || !rings.length) return;
    polys.push({ outer: rings[0].map(project), holes: rings.slice(1).map((r) => r.map(project)) });
  };
  const walk = (g) => {
    if (!g) return;
    if (g.type === "Polygon") add(g.coordinates);
    else if (g.type === "MultiPolygon") g.coordinates.forEach(add);
    else if (g.type === "GeometryCollection") (g.geometries || []).forEach(walk);
  };
  for (const f of feats) walk(f && f.geometry);
  return polys;
}

// ---------------------------------------------------------------- KML / KMZ

function polygonsFromKml(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new GeoImportError("format");
  const project = makeLV95Projector(4326);
  const parseCoords = (node) => {
    const el = node && node.getElementsByTagNameNS("*", "coordinates")[0];
    if (!el) return null;
    return el.textContent.trim().split(/\s+/).map((s) => s.split(",").map(Number)).filter((c) => c.length >= 2 && c.every(Number.isFinite)).map(project);
  };
  const polys = [];
  for (const pg of doc.getElementsByTagNameNS("*", "Polygon")) {
    const outerEl = pg.getElementsByTagNameNS("*", "outerBoundaryIs")[0];
    const outer = parseCoords(outerEl);
    if (!outer || outer.length < 3) continue;
    const holes = [...pg.getElementsByTagNameNS("*", "innerBoundaryIs")].map(parseCoords).filter((r) => r && r.length >= 3);
    polys.push({ outer, holes });
  }
  return polys;
}

// minimal ZIP reader (stored + deflate), enough to pull doc.kml out of a KMZ
async function unzipFirst(buf, matcher) {
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new GeoImportError("format");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true);
    const xlen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nlen));
    entries.push({ name, method, csize, lho });
    p += 46 + nlen + xlen + clen;
  }
  const hit = entries.find((e) => matcher(e.name));
  if (!hit) throw new GeoImportError("format");
  const lnlen = dv.getUint16(hit.lho + 26, true);
  const lxlen = dv.getUint16(hit.lho + 28, true);
  const start = hit.lho + 30 + lnlen + lxlen;
  const data = new Uint8Array(buf, start, hit.csize);
  if (hit.method === 0) return data;
  if (hit.method !== 8 || typeof DecompressionStream === "undefined") throw new GeoImportError("format");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function polygonsFromKmz(buf) {
  const kml = await unzipFirst(buf, (n) => /(^|\/)doc\.kml$/i.test(n) || /\.kml$/i.test(n));
  return polygonsFromKml(new TextDecoder().decode(kml));
}

// ---------------------------------------------------------------- GeoPackage

let sqlJsPromise = null;
function loadSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "lib/sql-wasm.js";
      s.onload = () => initSqlJs({ locateFile: (f) => "lib/" + f }).then(resolve, reject);
      s.onerror = () => reject(new GeoImportError("format"));
      document.head.appendChild(s);
    });
  }
  return sqlJsPromise;
}

// WKB reader for polygons, multipolygons and collections (ISO and EWKB flavours)
function readWkbPolygons(dv, offset, project, out) {
  const little = dv.getUint8(offset) === 1;
  let typeRaw = dv.getUint32(offset + 1, little);
  let p = offset + 5;
  const ewkbZ = !!(typeRaw & 0x80000000), ewkbM = !!(typeRaw & 0x40000000), ewkbSrid = !!(typeRaw & 0x20000000);
  typeRaw &= 0x1fffffff;
  const iso = Math.floor(typeRaw / 1000);
  const type = typeRaw % 1000;
  const hasZ = ewkbZ || iso === 1 || iso === 3;
  const hasM = ewkbM || iso === 2 || iso === 3;
  const dims = 2 + (hasZ ? 1 : 0) + (hasM ? 1 : 0);
  if (ewkbSrid) p += 4;
  const readRing = () => {
    const n = dv.getUint32(p, little);
    p += 4;
    const ring = [];
    for (let i = 0; i < n; i++) {
      ring.push(project([dv.getFloat64(p, little), dv.getFloat64(p + 8, little)]));
      p += 8 * dims;
    }
    return ring;
  };
  if (type === 3) {
    const nr = dv.getUint32(p, little);
    p += 4;
    const rings = [];
    for (let i = 0; i < nr; i++) rings.push(readRing());
    if (rings.length) out.push({ outer: rings[0], holes: rings.slice(1) });
    return p;
  }
  if (type === 6 || type === 7) {
    const n = dv.getUint32(p, little);
    p += 4;
    for (let i = 0; i < n; i++) p = readWkbPolygons(dv, p, project, out);
    return p;
  }
  // points / lines: skip by failing softly (their size is not needed, they only appear in mixed collections)
  throw new GeoImportError("empty");
}

async function polygonsFromGpkg(buf) {
  const SQL = await loadSqlJs();
  const db = new SQL.Database(new Uint8Array(buf));
  try {
    let cols;
    try {
      cols = db.exec("SELECT table_name, column_name FROM gpkg_geometry_columns");
    } catch (e) {
      throw new GeoImportError("format");
    }
    if (!cols.length) throw new GeoImportError("empty");
    const polys = [];
    for (const [table, col] of cols[0].values) {
      const res = db.exec(`SELECT "${col.replaceAll('"', '""')}" FROM "${table.replaceAll('"', '""')}"`);
      if (!res.length) continue;
      for (const [blob] of res[0].values) {
        if (!blob || blob.length < 8 || blob[0] !== 0x47 || blob[1] !== 0x50) continue; // "GP"
        const flags = blob[3];
        if (flags & 0x10) continue; // empty geometry
        const little = (flags & 1) === 1;
        const envType = (flags >> 1) & 7;
        const envBytes = [0, 32, 48, 48, 64][envType] ?? 0;
        const dv = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
        const srs = dv.getInt32(4, little);
        const project = makeLV95Projector(srs);
        try {
          readWkbPolygons(dv, 8 + envBytes, project, polys);
        } catch (e) {
          if (e instanceof GeoImportError && e.code === "crs") throw e;
          // geometry that is not a polygon (lines, points): ignore
        }
      }
    }
    return polys;
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------- entry point

async function readPolygonFile(file) {
  const name = file.name.toLowerCase();
  let polys;
  if (name.endsWith(".gpkg")) polys = await polygonsFromGpkg(await file.arrayBuffer());
  else if (name.endsWith(".kmz")) polys = await polygonsFromKmz(await file.arrayBuffer());
  else if (name.endsWith(".kml")) polys = polygonsFromKml(await file.text());
  else if (name.endsWith(".geojson") || name.endsWith(".json")) {
    try { polys = polygonsFromGeoJson(JSON.parse(await file.text())); } catch (e) { if (e instanceof GeoImportError) throw e; throw new GeoImportError("format"); }
  } else throw new GeoImportError("format");
  if (!polys.length) throw new GeoImportError("empty");
  return polys;
}
