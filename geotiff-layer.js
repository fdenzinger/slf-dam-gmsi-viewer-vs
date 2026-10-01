// Custom Leaflet tile layer that reads a local GeoTIFF (via geotiff.js,
// opened directly from a File/Blob with fromBlob — genuinely lazy, reads
// only the header + the pixel windows a tile actually needs, respecting
// the COG's internal overviews) and paints it through a classification
// color function. Avoids the `georaster` package, whose readOnDemand mode
// only works for URL sources and silently does an eager full-file decode
// for local File/Blob input.

const GeoTiffColorLayer = L.GridLayer.extend({
  initialize: function (tiff, bboxNative, colorFn, nodata, opts) {
    L.GridLayer.prototype.initialize.call(this, opts || {});
    this._tiff = tiff;
    this._bboxNative = bboxNative; // [xmin,ymin,xmax,ymax] in the raster's own CRS
    this._colorFn = colorFn;
    this._nodata = nodata;
    this._resample = (opts && opts.resampleMethod) || "nearest";
    this._multiplyBlend = !!(opts && opts.multiplyBlend);
  },

  // The map runs natively in EPSG:2056 (see CRS_LV95 in app.js), so every
  // Leaflet tile is already an exact rectangle in this raster's own CRS --
  // no per-pixel reprojection needed, just a plain bbox read.
  createTile: function (coords, done) {
    const size = this.getTileSize();
    const canvas = L.DomUtil.create("canvas", "leaflet-tile" + (this._multiplyBlend ? " gmsi-multiply-tile" : ""));
    canvas.width = size.x;
    canvas.height = size.y;

    const bounds = this._tileCoordsToBounds(coords);
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const p1 = proj4("EPSG:4326", "EPSG:2056", [sw.lng, sw.lat]);
    const p2 = proj4("EPSG:4326", "EPSG:2056", [ne.lng, ne.lat]);
    const minX = Math.min(p1[0], p2[0]);
    const maxX = Math.max(p1[0], p2[0]);
    const minY = Math.min(p1[1], p2[1]);
    const maxY = Math.max(p1[1], p2[1]);

    const [rxmin, rymin, rxmax, rymax] = this._bboxNative;
    const overlaps = minX < rxmax && maxX > rxmin && minY < rymax && maxY > rymin;
    if (!overlaps) {
      setTimeout(() => done(null, canvas), 0);
      return canvas;
    }

    this._tiff
      .readRasters({
        bbox: [minX, minY, maxX, maxY],
        width: size.x,
        height: size.y,
        resampleMethod: this._resample,
        fillValue: this._nodata,
      })
      .then((rasters) => {
        const data = rasters[0];
        const ctx = canvas.getContext("2d");
        const imgData = ctx.createImageData(size.x, size.y);
        const colorFn = this._colorFn;
        const nodata = this._nodata;
        const out = imgData.data;
        for (let i = 0; i < data.length; i++) {
          const c = colorFn(data[i], nodata);
          const o = i * 4;
          out[o] = c[0];
          out[o + 1] = c[1];
          out[o + 2] = c[2];
          out[o + 3] = c[3];
        }
        ctx.putImageData(imgData, 0, 0);
        done(null, canvas);
      })
      .catch(() => {
        done(null, canvas); // out-of-range or decode error: leave tile blank
      });

    return canvas;
  },
});

// helper: build a layer + fitBounds-ready LatLngBounds for one manifest entry
async function makeGeoTiffLayer(source, kind) {
  // source is either { url } (streamed over HTTP range requests -- only the
  // bytes a visible tile needs are fetched) or a local File/Blob.
  // 4 MB blocks: the host (Zenodo) rate-limits by request *count*, not bytes.
  // Measured on a zoom-then-pan of 24 tiles: 64 KB blocks = 34 requests,
  // 4 MB blocks = 12, at the price of ~1.6x the bytes.
  const tiff =
    source && source.url
      ? await GeoTIFF.fromUrl(source.url, { blockSize: 4 * 1024 * 1024, cacheSize: 32 })
      : await GeoTIFF.fromBlob(source);
  const image = await tiff.getImage(0);
  const nodata = image.getGDALNoData();
  const bboxNative = image.getBoundingBox(); // [xmin,ymin,xmax,ymax] in EPSG:2056

  const [lonSW, latSW] = proj4("EPSG:2056", "EPSG:4326", [bboxNative[0], bboxNative[1]]);
  const [lonNE, latNE] = proj4("EPSG:2056", "EPSG:4326", [bboxNative[2], bboxNative[3]]);
  const latLngBounds = L.latLngBounds([latSW, lonSW], [latNE, lonNE]);

  const attribution =
    kind === "hillshade"
      ? "swissALTI3D &copy; swisstopo"
      : "GMSI &copy; Jacquemart &amp; Manconi (2025) &middot; Copernicus Sentinel-1 data (ESA)";

  const layer = new GeoTiffColorLayer(tiff, bboxNative, colorFnForKind(kind), nodata, {
    resampleMethod: kind === "hillshade" ? "bilinear" : "nearest",
    opacity: defaultOpacityForKind(kind),
    zIndex: kind === "hillshade" ? 0 : 10,
    attribution,
    // best-orbit is a categorical track-color overlay -- Multiply lets the
    // basemap's terrain texture show through the tint, unlike the GMSI
    // traffic-light layers where solid, undistorted colors matter more
    multiplyBlend: kind === "orbit",
    // each tile requires an async readRasters() decode (real I/O, not
    // instant); updating continuously *during* the zoom animation just
    // means re-decoding tiles that are about to be discarded anyway, which
    // reads as choppy/blinking. Wait until the zoom settles, and keep a
    // wider ring of already-decoded neighbours cached so panning/zooming
    // back doesn't re-trigger a visible reload.
    updateWhenZooming: false,
    keepBuffer: 4,
  });

  return { layer, latLngBounds };
}
