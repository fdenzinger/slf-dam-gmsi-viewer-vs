// Guided tour: a spotlight on one part of the app at a time with a short
// explanation, started from the "Tutorial" button in the sidebar and offered
// once to first-time visitors. No library; the texts live in i18n.js (tour.*).
// Identical in the GR and VS viewers.

(function () {
  const SEEN_KEY = (typeof LANG_STORAGE_KEY === "string" ? LANG_STORAGE_KEY.replace(/-lang$/, "") : "gmsi") + "-tour-seen";
  const openedViaSharedLink = location.hash.length > 1; // a shared view should not be interrupted

  // each step: where it points (selectors, joined into one box), which part of the UI it needs
  // and, for the layer steps, which mode (Standard/Erweitert) has to be showing
  const BASE_CTRL = ".basemap-control:not(.area-control):not(.share-control)";
  const SHARE_CTRL = ".share-control";
  const STEPS = [
    // 1. the two halves of the screen
    { id: "sidebar", sel: ["#sidebar"], ui: "sidebar" },
    { id: "map", sel: ["#map"], ui: "map", wide: true },
    { id: "fold", sel: ["#sidebar-toggle"], ui: "sidebar", demo: "sidebar" },
    // 2. the sidebar: language, layers + legend, Standard mode (overview, best track), Advanced mode (single tracks)
    { id: "lang", sel: ["#lang-toggle"], ui: "sidebar" },
    { id: "layers", sel: ["#layer-tree"], ui: "sidebar", mode: "easy" },
    { id: "toggle", sel: ['.layer-group[data-group="1"] .layer-item'], ui: "sidebar", mode: "easy", demo: "toggle" },
    { id: "legend", sel: ["#legend"], ui: "sidebar", mode: "easy" },
    { id: "modes", sel: ["#mode-toggle"], ui: "sidebar", mode: "easy", demo: "modes" },
    { id: "standard", sel: ["#mode-easy"], ui: "sidebar", mode: "easy" },
    { id: "overview", sel: ['.layer-group[data-group="1"] .layer-item'], ui: "sidebar", mode: "easy" },
    { id: "best", sel: ['.layer-group[data-group="2"]'], ui: "sidebar", mode: "easy", demo: "layer" },
    { id: "expert", sel: ["#mode-expert"], ui: "sidebar", mode: "expert" },
    { id: "tracks", sel: ['.layer-group[data-group="3"]'], ui: "sidebar", mode: "expert", demo: "tracks" },
    { id: "shadow", sel: ['.layer-group[data-group="4"]'], ui: "sidebar", mode: "expert", demo: "shadow" },
    // 3. controls and query tools
    { id: "zoom", sel: [".leaflet-control-zoom"], ui: "map", demo: "zoom" },
    { id: "search", sel: ["#search-box"], ui: "sidebar", demo: "search" },
    { id: "point", sel: ["#map"], ui: "map", center: true, demo: "point" },
    { id: "compare", sel: ["#map"], ui: "map", center: true, demo: "compare" },
    { id: "area", sel: [".area-control"], ui: "map", demo: "area" },
    { id: "measure", sel: [".measure-control-btn"], ui: "map", demo: "measure" },
    { id: "base", sel: [BASE_CTRL], ui: "map", demo: "base" },
    { id: "share", sel: [SHARE_CTRL], ui: "map", demo: "share" },
    { id: "note", sel: ["#info-btn"], ui: "sidebar" },
  ];

  const tour = { active: false, index: 0, els: null, wasCollapsed: false, snapshot: null, demoToken: 0, demoActive: false, goToken: 0, mapView: null, layerOrig: {}, demoFiles: [], sliderOrig: null, zoomTouched: false, zoomView: null, sidebarTouched: false, measureTouched: false, measurePts: [] };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- live demos for the "point" and "area" steps: the tour does what the visitor would do

  const DEMOS = {
    GR: { place: "Piz Buin Pitschen", measure: [[2803920, 1191369], [2804774, 1190666], [2805491, 1190153]], point: [2803925, 1191324], polygon: [[2803149, 1190821], [2803462, 1191261], [2804436, 1191604], [2804506, 1191946], [2804912, 1192036], [2805949, 1192011], [2806266, 1190576], [2806049, 1190004], [2805682, 1189738], [2804944, 1190211], [2804012, 1189928], [2803174, 1190141]] }, // Piz Buin Pitschen / Piz Mon, over Cronsel, down to the Chamonna Tuoi
    VS: { place: "Breithorn", pick: "St. Niklaus", point: [2630505, 1110165], polygon: [[2629150, 1110300], [2630050, 1110550], [2630900, 1110250], [2630950, 1109450], [2630450, 1109000], [2629250, 1109000], [2629000, 1109700]] }, // Breithorn / Längenschnee above St. Niklaus
  };
  // switch a layer with its real checkbox; the first change of each layer is remembered so the tour can put it back
  function tickLayer(file, on) {
    const en = state.layers[file];
    if (!en || !en.checkboxEl) return false;
    if (!(file in tour.layerOrig)) tour.layerOrig[file] = !!en.checked;
    if (!!en.checked !== on) en.checkboxEl.click();
    return true;
  }
  function undoLayers() {
    for (const [file, was] of Object.entries(tour.layerOrig)) {
      const en = state.layers[file];
      if (en && en.checkboxEl && !!en.checked !== was) en.checkboxEl.click();
    }
    tour.layerOrig = {};
  }
  const trackFile = (kind, track) => (typeof LAYER_MANIFEST !== "undefined" && (LAYER_MANIFEST.find((e) => e.kind === kind && e.label === track) || {}).file) || null;
  const manifestFileOf = (suffix) => {
    const m = typeof LAYER_MANIFEST !== "undefined" && LAYER_MANIFEST.find((e) => e.file.endsWith(suffix));
    return m ? m.file : null;
  };
  function demoCfg() {
    const m = typeof LAYER_MANIFEST !== "undefined" && LAYER_MANIFEST.find((e) => e.file.endsWith("_composite.tif"));
    return m && m.file.includes("_VS_") ? DEMOS.VS : DEMOS.GR;
  }
  const demoLatLng = (xy) => {
    const p = proj4("EPSG:2056", "EPSG:4326", xy);
    return L.latLng(p[1], p[0]);
  };
  function demoPagePoint(latlng) {
    const cr = state.map.getContainer().getBoundingClientRect();
    const p = state.map.latLngToContainerPoint(latlng);
    return [cr.left + p.x, cr.top + p.y];
  }
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2 ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
  };
  function firstRect(sel, minSize) {
    for (const el of document.querySelectorAll(sel)) {
      const r = rectOf(el);
      if (r && (!minSize || (r.width > minSize && r.height > minSize))) return r;
    }
    return null;
  }
  const popupRect = () => firstRect(".leaflet-popup-content-wrapper", 40); // the visible card, not Leaflet's outer box
  const polygonPagePoints = () => demoCfg().polygon.map((xy) => demoPagePoint(demoLatLng(xy)));
  const spotRect = () => {
    const [x, y] = demoPagePoint(demoLatLng(demoCfg().point));
    return { left: x - 35, top: y - 35, width: 70, height: 70 };
  };

  // What the highlight sits on while a demo runs. Each demo has phases: first the thing the visitor
  // would use (click spot / button / tool), then, once it has been used, the window that opened.
  function unionRects(list) {
    const rs = list.filter(Boolean);
    if (!rs.length) return null;
    const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top));
    const r = Math.max(...rs.map((r) => r.left + r.width)), b = Math.max(...rs.map((r) => r.top + r.height));
    return { left: l, top: t, width: r - l, height: b - t };
  }
  function demoRect(kind) {
    const phase = tour.demoPhase;
    if (kind === "sidebar") return firstRect("#sidebar-toggle");
    if (kind === "zoom") return tour.demoPhase === "pan" ? firstRect("#map") : firstRect(".leaflet-control-zoom");
    if (kind === "modes") return firstRect("#mode-toggle");
    if (kind === "measure") {
      if (tour.demoPhase === "tool") return firstRect(".measure-control-btn");
      // the line as drawn so far, read from the line's own SVG path (always where it is on screen)
      let line = null;
      const path = typeof measureState !== "undefined" && measureState.line && measureState.line.getLayers
        ? measureState.line.getLayers().map((l) => l._path && l._path.getBoundingClientRect()).filter((r) => r && r.width + r.height > 0)[0] : null;
      if (path) line = { left: path.left - 10, top: path.top - 10, width: path.width + 20, height: path.height + 20 };
      const label = tour.demoPhase === "result" ? firstRect(".measure-label-total") : null;
      return unionRects([line, label]) || firstRect(".measure-control-btn");
    }
    if (kind === "layer" || kind === "tracks" || kind === "shadow" || kind === "toggle") {
      // the layer rows the demo works with (their rows grow when the transparency slider appears: reposition() keeps up)
      const rects = (tour.demoFiles || []).map((f) => {
        const en = state.layers[f], row = en && en.checkboxEl && en.checkboxEl.closest(".layer-item");
        return row ? rectOf(row) : null;
      });
      return unionRects(rects) || firstRect("#layer-tree");
    }
    if (kind === "search") {
      const input = firstRect("#search-input");
      if (phase === "results") return unionRects([input, firstRect("#search-results:not(.hidden)")]) || input;
      return input;
    }
    if (kind === "base") {
      const btn = firstRect(BASE_CTRL + " .basemap-control-btn");
      if (phase === "menu") return unionRects([btn, firstRect(BASE_CTRL + " .basemap-control-menu:not(.hidden)")]) || btn;
      return btn;
    }
    if (kind === "share") {
      const btn = firstRect(SHARE_CTRL + " .basemap-control-btn");
      if (phase === "result") return unionRects([btn, firstRect(SHARE_CTRL + " .share-toast:not(.hidden)")]) || btn;
      return btn;
    }
    if (kind === "point") {
      if (phase === "result") return popupRect() || spotRect();
      return spotRect();
    }
    if (kind === "compare") {
      if (phase === "result") return popupRect() || spotRect();
      return firstRect(".track-compare-btn") || popupRect() || spotRect();
    }
    if (phase === "tool" || !phase) { const r = firstRect(".area-control-btn"); if (r) return r; } // the step starts on the tool, not on the polygon's bounding box
    if (phase === "result") { const r = firstRect("#area-panel:not(.hidden)", 40); if (r) return r; }
    const pts = polygonPagePoints();
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const left = Math.min(...xs), top = Math.min(...ys);
    return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
  }

  // the corners clicked so far, plus the cursor while it is on its way to the next corner
  function liveDrawPoints() {
    const pts = (tour.drawPts || []).slice();
    const c = document.getElementById("tour-cursor");
    if (tour.cursorLive && c && c.classList.contains("show")) {
      const r = c.getBoundingClientRect();
      pts.push([r.left + 6, r.top + 4]); // the tip of the arrow
    }
    return pts;
  }

  // while the polygon is being drawn only its inside stays bright: an SVG with the polygon cut out
  function setShape(points) {
    let svg = document.getElementById("tour-shape");
    if (!points) {
      if (svg) svg.style.display = "none";
      if (tour.els) tour.els.spot.style.visibility = "";
      return;
    }
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "tour-shape";
      svg.innerHTML = '<path class="dim" fill-rule="evenodd"></path><path class="edge" fill="none"></path>';
      document.body.appendChild(svg);
    }
    const path = points.length ? "M" + points.map((q) => `${q[0]},${q[1]}`).join(" L") : "";
    const rect = `M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z`;
    // 3+ points: the inside is cut out of the dimming; fewer: everything is dimmed and the line so far shows
    svg.querySelector(".dim").setAttribute("d", points.length >= 3 ? `${rect} ${path}Z` : rect);
    svg.querySelector(".edge").setAttribute("d", points.length >= 3 ? `${path}Z` : path);
    svg.style.display = "block";
    tour.els.spot.style.visibility = "hidden";
  }

  // measure demo: only the line (and its total label) stays bright, everything else is dimmed
  function setLineShape(points, labelRect) {
    let svg = document.getElementById("tour-line");
    if (!points || points.length < 2) {
      if (svg) svg.style.display = "none";
      return false;
    }
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "tour-line";
      svg.innerHTML = '<defs><mask id="tour-line-mask" maskUnits="userSpaceOnUse"><rect class="all" fill="#fff"/><g class="holes" stroke="#000" fill="#000"><polyline class="ln" fill="none" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><rect class="lbl"/></g></mask></defs><rect class="dim" mask="url(#tour-line-mask)"/>';
      document.body.appendChild(svg);
    }
    const w = window.innerWidth, h = window.innerHeight;
    for (const r of svg.querySelectorAll(".all, .dim")) { r.setAttribute("x", 0); r.setAttribute("y", 0); r.setAttribute("width", w); r.setAttribute("height", h); }
    svg.querySelector(".ln").setAttribute("points", points.map((q) => `${q[0]},${q[1]}`).join(" "));
    const lbl = svg.querySelector(".lbl");
    if (labelRect) {
      lbl.setAttribute("x", labelRect.left - 6); lbl.setAttribute("y", labelRect.top - 6);
      lbl.setAttribute("width", labelRect.width + 12); lbl.setAttribute("height", labelRect.height + 12); lbl.setAttribute("rx", 6);
    } else { lbl.setAttribute("width", 0); lbl.setAttribute("height", 0); }
    svg.style.display = "block";
    return true;
  }

  function waitMoveEnd(map, timeout) {
    return new Promise((resolve) => {
      let done = false;
      const fin = () => { if (!done) { done = true; map.off("moveend", fin); resolve(); } };
      map.on("moveend", fin);
      setTimeout(fin, timeout);
    });
  }

  // where the map sits for the point demo; the search demo jumps to the same place so the next step starts right there
  function pointDemoCenter() {
    return demoLatLng(demoCfg().point); // the spot sits in the middle of the map, as after a search
  }

  async function prepareDemoView(kind) {
    if (kind === "base" || kind === "share" || kind === "search" || kind === "layer" || kind === "tracks" || kind === "shadow" || kind === "toggle" || kind === "sidebar" || kind === "zoom" || kind === "modes") return; // these demos use the controls, the map stays where it is
    const map = state.map, cfg = demoCfg(), animate = !reduced();
    if (!tour.mapView) tour.mapView = { center: map.getCenter(), zoom: map.getZoom() };
    map.invalidateSize();
    if (kind === "point" || kind === "compare") {
      map.setView(pointDemoCenter(), 8, { animate });
    } else {
      map.fitBounds(L.latLngBounds(cfg.polygon.map(demoLatLng)), { padding: [kind === "measure" ? 150 : 70, kind === "measure" ? 150 : 70], maxZoom: 9, animate });
    }
    await waitMoveEnd(map, animate ? 1300 : 50);
  }

  function ensureCursor() {
    let c = document.getElementById("tour-cursor");
    if (!c) {
      c = document.createElement("div");
      c.id = "tour-cursor";
      c.innerHTML =
        '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.5L9 19z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
        '<span class="tour-ripple"></span>';
      document.body.appendChild(c);
    }
    return c;
  }
  function hideCursor() {
    const c = document.getElementById("tour-cursor");
    if (c) c.classList.remove("show");
  }

  // keepPopup: the "compare tracks" step carries on with the popup the "point" step opened
  function clearDemo(keepPopup, keepLayers) {
    tour.demoToken++;
    hideCursor();
    setShape(null);
    setLineShape(null);
    if (keepPopup) return;
    tour.demoPhase = null;
    tour.drawPts = [];
    tour.cursorLive = false;
    if (tour.prevBasemap) { // the basemap demo switched to the aerial image: put the visitor's choice back
      if (state.currentBasemap !== tour.prevBasemap) chooseBasemap(tour.prevBasemap);
      tour.prevBasemap = null;
    }
    if (!keepLayers) { tour.demoFiles = []; undoLayers(); } // the layer demos switched layers: put them back
    if (tour.measureTouched) { // the measure demo drew a line
      tour.measureTouched = false;
      tour.measurePts = [];
      if (typeof cancelMeasure === "function") cancelMeasure();
      if (typeof clearMeasurement === "function") clearMeasurement();
    }
    if (tour.zoomTouched) { // the zoom demo changed the zoom level: back to the view the step started with
      tour.zoomTouched = false;
      if (tour.zoomView) state.map.setView(tour.zoomView.center, tour.zoomView.zoom, { animate: false });
      tour.zoomView = null;
    }
    if (tour.sidebarTouched) { // the sidebar demo collapsed it: open again
      tour.sidebarTouched = false;
      if (sidebarCollapsed() && !narrow()) setSidebar(false);
    }
    if (tour.sliderOrig) { // the toggle demo moved a transparency slider
      const sl = tour.sliderOrig.el;
      if (sl && sl.value !== tour.sliderOrig.value) { sl.value = tour.sliderOrig.value; sl.dispatchEvent(new Event("input")); }
      tour.sliderOrig = null;
    }
    if (tour.searchTouched) { // the search demo typed into the field and moved the map: undo both
      tour.searchTouched = false;
      const input = document.getElementById("search-input"), res = document.getElementById("search-results");
      if (input) input.value = "";
      if (res) { res.classList.add("hidden"); res.innerHTML = ""; }
      if (tour.searchMoved && tour.mapView) state.map.setView(tour.mapView.center, tour.mapView.zoom, { animate: false });
      tour.searchMoved = false;
    }
    document.querySelectorAll(".basemap-control-menu").forEach((m) => m.classList.add("hidden"));
    document.querySelectorAll(".share-toast").forEach((m) => m.classList.add("hidden"));
    if (!tour.demoActive) return;
    tour.demoActive = false;
    state.tourDemo = false;
    state.tourDrawing = false;
    if (typeof cancelAreaDrawing === "function") cancelAreaDrawing();
    if (typeof clearAreaSelection === "function") clearAreaSelection();
    if (state.summaryPopup) state.map.closePopup(state.summaryPopup);
  }

  async function runDemo(kind) {
    const token = ++tour.demoToken;
    const alive = () => tour.active && token === tour.demoToken;
    const cfg = demoCfg(), cursor = ensureCursor(), quick = reduced();
    tour.demoActive = true;
    state.tourDemo = true; // app.js: always offer the "compare all tracks" button, even if the tracks are already loaded
    const setPhase = (ph) => {
      tour.demoPhase = ph;
      if (kind === "area") {
        // drawing: the tour's own spotlight; result: the same dimmed-outside look as in normal use
        state.tourDrawing = ph === "tool" || ph === "draw";
        if (ph === "result" && typeof refreshAreaDim === "function") refreshAreaDim();
      }
      reposition();
    };
    const centre = (r) => [r.left + r.width / 2, r.top + r.height / 2];
    const place = (xy, ms) => {
      cursor.style.transitionDuration = ms + "ms";
      cursor.style.transform = `translate(${xy[0]}px, ${xy[1]}px)`;
      return sleep(ms + 40);
    };
    const startAt = async (xy) => { // the cursor shows up a little away from where it is going
      cursor.style.transitionDuration = "0ms";
      cursor.style.transform = `translate(${xy[0] + 150}px, ${xy[1] + 110}px)`;
      cursor.classList.add("show");
      await sleep(quick ? 0 : 450);
    };
    const click = async (ms = 400) => {
      cursor.classList.remove("click");
      void cursor.offsetWidth; // restart the ripple animation
      cursor.classList.add("click");
      await sleep(quick ? 0 : ms);
    };
    const waitFor = async (fn, ms) => {
      const t0 = Date.now();
      while (alive() && Date.now() - t0 < (ms || 9000)) {
        const v = fn();
        if (v) return v;
        await sleep(120);
      }
      return null;
    };
    const latlng = demoLatLng(cfg.point);

    if (kind === "point") {
      if (state.summaryPopup) state.map.closePopup(state.summaryPopup); // the window appears only after the click
      setPhase("approach");
      const pt = demoPagePoint(latlng);
      await startAt(pt);
      if (!alive()) return;
      await place(pt, quick ? 0 : 900);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      showSiteSummary(latlng);
      await waitFor(popupRect);
      if (!alive()) return;
      setPhase("result");
    } else if (kind === "sidebar") {
      const btn = document.getElementById("sidebar-toggle");
      if (!btn) return;
      tour.sidebarTouched = true;
      setPhase("button");
      const follow = async (ms) => { // the button moves with the sidebar: keep the highlight on it
        const t0 = Date.now();
        while (alive() && Date.now() - t0 < ms) { reposition(); await sleep(40); }
      };
      let c = centre(rectOf(btn));
      await startAt(c);
      if (!alive()) return;
      await place(c, quick ? 0 : 800);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      btn.click(); // the real button: the sidebar slides away and the map gets the whole width
      await follow(quick ? 0 : 700);
      if (!alive()) return;
      await sleep(quick ? 0 : 800);
      c = centre(rectOf(btn));
      await place(c, quick ? 0 : 700);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      btn.click(); // and open again
      await follow(quick ? 0 : 700);
    } else if (kind === "zoom") {
      const zin = document.querySelector(".leaflet-control-zoom-in"), zout = document.querySelector(".leaflet-control-zoom-out");
      if (!zin || !zout) return;
      tour.zoomTouched = true;
      tour.zoomView = { center: state.map.getCenter(), zoom: state.map.getZoom() };
      if (!tour.mapView) tour.mapView = { center: state.map.getCenter(), zoom: state.map.getZoom() };
      setPhase("buttons");
      const press = async (btn, times) => {
        const c = centre(rectOf(btn));
        await place(c, quick ? 0 : 650);
        for (let i = 0; i < times && alive(); i++) {
          await click();
          btn.click(); // the real zoom button
          await sleep(quick ? 0 : 900);
        }
      };
      await startAt(centre(rectOf(zin)));
      if (!alive()) return;
      await press(zin, 2);
      if (!alive()) return;
      // panning: grab the map in the middle and drag it, like with the mouse
      setPhase("pan");
      const mr = rectOf(document.getElementById("map")), mid = [mr.left + mr.width * 0.5, mr.top + mr.height * 0.55];
      await place(mid, quick ? 0 : 700);
      if (!alive()) return;
      cursor.classList.add("grab");
      await click();
      const drag = async (dx, dy) => { // the cursor and the map move together
        const steps = quick ? 1 : 18;
        for (let i = 1; i <= steps && alive(); i++) {
          state.map.panBy([-dx / steps, -dy / steps], { animate: false });
          const cur = cursor.style.transform.match(/-?\d+(\.\d+)?/g).map(Number);
          cursor.style.transitionDuration = "0ms";
          cursor.style.transform = `translate(${cur[0] + dx / steps}px, ${cur[1] + dy / steps}px)`;
          await sleep(quick ? 0 : 30);
        }
      };
      await drag(-220, -90);
      await sleep(quick ? 0 : 300);
      await drag(220, 90);
      cursor.classList.remove("grab");
      if (!alive()) return;
      setPhase("buttons");
      await sleep(quick ? 0 : 300);
      await press(zout, 2);
    } else if (kind === "modes") {
      const bx = document.getElementById("mode-expert"), bs = document.getElementById("mode-easy");
      if (!bx || !bs) return;
      setPhase("switch");
      let c = centre(rectOf(bx));
      await startAt(c);
      if (!alive()) return;
      await place(c, quick ? 0 : 800);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      bx.click(); // the real switch: the Advanced layer groups appear
      await sleep(quick ? 0 : 1600);
      if (!alive()) return;
      c = centre(rectOf(bs));
      await place(c, quick ? 0 : 750);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      bs.click(); // and back to Standard
      await sleep(quick ? 0 : 500);
    } else if (kind === "measure") {
      setPhase("tool");
      const btn = document.querySelector(".measure-control-btn");
      if (!btn) return;
      tour.measureTouched = true;
      const c0 = centre(rectOf(btn));
      await startAt(c0);
      if (!alive()) return;
      await place(c0, quick ? 0 : 800);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      startMeasure(); // the real tool, including its hint bar
      setPhase("draw");
      const poly = cfg.polygon.map(demoLatLng);
      const n = poly.length;
      // GR: from the Kleiner Piz Buin over Cronsel down to the Chamonna Tuoi; otherwise spread over the demo area
      const path = cfg.measure ? cfg.measure.map(demoLatLng) : [0, Math.floor(n * 0.25), Math.floor(n * 0.5), Math.floor(n * 0.75)].map((k) => poly[k]);
      tour.measurePts = [];
      for (let i = 0; i < path.length; i++) {
        const pt = demoPagePoint(path[i]);
        await place(pt, quick ? 0 : 650);
        if (!alive()) return;
        await click();
        if (!alive()) return;
        tour.measurePts.push(pt);
        onMeasureMapClick({ latlng: path[i] });
        reposition();
      }
      // a click on the last point ends the measurement, as for a visitor
      const lastPt = demoPagePoint(path[path.length - 1]);
      await click();
      if (!alive()) return;
      finishMeasure();
      hideCursor();
      setPhase("result");
      const followMove = () => { if (alive()) reposition(); };
      state.map.on("move moveend", followMove); // keep the highlight on the line if the map is still settling
      for (let k = 0; k < 12 && alive(); k++) { await sleep(250); reposition(); }
      state.map.off("move moveend", followMove);
      return;
    } else if (kind === "toggle") {
      const comp = manifestFileOf("_composite.tif"), en = comp && state.layers[comp];
      if (!en || !en.checkboxEl) return;
      tour.demoFiles = [comp];
      setPhase("layers");
      // 1. switch the layer off and on again with its checkbox
      const c0 = centre(rectOf(en.checkboxEl));
      await startAt(c0);
      if (!alive()) return;
      await place(c0, quick ? 0 : 800);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      tickLayer(comp, false);
      await sleep(quick ? 0 : 1100);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      tickLayer(comp, true);
      await sleep(quick ? 0 : 900);
      if (!alive()) return;
      // 2. drag the transparency slider to the right and back
      const sl = en.sliderEl;
      if (!sl || !rectOf(sl)) return;
      tour.sliderOrig = { el: sl, value: sl.value };
      const sr = rectOf(sl), at = (v) => [sr.left + 8 + ((sr.width - 16) * v) / 100, sr.top + sr.height / 2];
      const from = Number(sl.value), to = 20; // opacity in %: down to 20 % shows the basemap through the layer
      await place(at(from), quick ? 0 : 700);
      if (!alive()) return;
      await click();
      const setSlider = (v) => { sl.value = String(v); sl.dispatchEvent(new Event("input")); };
      const sweep = async (a, b) => {
        const n = quick ? 1 : 24;
        for (let i = 1; i <= n && alive(); i++) {
          const v = Math.round(a + ((b - a) * i) / n);
          setSlider(v);
          await place(at(v), quick ? 0 : 30);
        }
      };
      await sweep(from, to);
      await sleep(quick ? 0 : 700);
      await sweep(to, from);
      await sleep(quick ? 0 : 300);
    } else if (kind === "layer" || kind === "tracks" || kind === "shadow") {
      // the demos below click the real checkboxes, in this order; layers that already are in the wanted state are left alone
      const comp = manifestFileOf("_composite.tif"), gmsiA = trackFile("gmsi", "A015"), shadowA = trackFile("shadow", "A015");
      const plan = kind === "layer" ? [[comp, false], [manifestFileOf("_best_orbit.tif"), true]]
        : kind === "tracks" ? [[comp, false], [gmsiA, true]]
        : [[comp, false], [gmsiA, false], [shadowA, true]]; // the track's GMSI goes off, so the grey of the shadow layer stands out
      tour.demoFiles = kind === "layer" ? [manifestFileOf("_best_orbit.tif")] : kind === "tracks" ? [gmsiA] : [shadowA]; // only the layer the step is about is highlighted
      setPhase("layers");
      let started = false;
      for (const [file, on] of plan) {
        const en = file && state.layers[file];
        if (!en || !en.checkboxEl) continue;
        if (!!en.checked === on) { tickLayer(file, on); continue; } // already as wanted (e.g. kept from the previous step)
        const c = centre(rectOf(en.checkboxEl));
        if (!started) { await startAt(c); started = true; }
        if (!alive()) return;
        await place(c, quick ? 0 : 750);
        if (!alive()) return;
        await click();
        if (!alive()) return;
        tickLayer(file, on); // the real checkbox: switches the layer and loads it if needed
        if (on) await waitFor(() => en.leafletLayer && state.map.hasLayer(en.leafletLayer), 20000); // the data is read from Zenodo
        if (!alive()) return;
        await sleep(quick ? 0 : 450);
      }
    } else if (kind === "search") {
      const input = document.getElementById("search-input"), res = document.getElementById("search-results");
      if (!tour.mapView) tour.mapView = { center: state.map.getCenter(), zoom: state.map.getZoom() };
      tour.searchTouched = true;
      input.value = "";
      res.classList.add("hidden");
      setPhase("field");
      const c0 = centre(rectOf(input));
      await startAt(c0);
      if (!alive()) return;
      await place(c0, quick ? 0 : 700);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      for (const ch of cfg.place) { // typed like a visitor; the real search runs on these input events
        input.value += ch;
        input.dispatchEvent(new Event("input"));
        await sleep(quick ? 0 : 130);
        if (!alive()) return;
      }
      const rowOf = () => {
        if (!res.children.length || res.classList.contains("hidden")) return null;
        // several places share a name (Breithorn): take the one the demo is about
        return (cfg.pick && [...res.children].find((r) => r.textContent.includes(cfg.pick))) || res.firstElementChild;
      };
      const row = await waitFor(rowOf, 10000);
      if (!alive() || !row) return;
      setPhase("results");
      await sleep(quick ? 0 : 700);
      const c1 = centre(rectOf(row));
      await place(c1, quick ? 0 : 700);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      row.click(); // the real result: fills the field (and starts the app's own zoom to the place)
      input.value = cfg.place; // the field shows the short name that was typed, not the long official label of the hit
      state.map.setView(pointDemoCenter(), 8, { animate: !quick }); // ...which is replaced by a jump to the spot the next step uses
      tour.searchMoved = true;
      setPhase("field");
    } else if (kind === "base") {
      setPhase("button");
      const btn = document.querySelector(BASE_CTRL + " .basemap-control-btn");
      const c0 = centre(rectOf(btn));
      await startAt(c0);
      if (!alive()) return;
      await place(c0, quick ? 0 : 800);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      tour.prevBasemap = state.currentBasemap;
      document.querySelector(BASE_CTRL + " .basemap-control-menu").classList.remove("hidden"); // what the button does
      if (typeof refreshBasemapPreviews === "function") refreshBasemapPreviews();
      setPhase("menu");
      const item = document.querySelector(BASE_CTRL + ' .basemap-control-item[data-value="swissimage"]');
      const c1 = centre(rectOf(item));
      await sleep(quick ? 0 : 400);
      await place(c1, quick ? 0 : 700);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      item.click(); // the real menu entry: switches the basemap and closes the menu
      setPhase("result");
    } else if (kind === "share") {
      setPhase("button");
      const btn = document.querySelector(SHARE_CTRL + " .basemap-control-btn");
      const c0 = centre(rectOf(btn));
      await startAt(c0);
      if (!alive()) return;
      await place(c0, quick ? 0 : 800);
      if (!alive()) return;
      await click();
      if (!alive()) return;
      // only the confirmation is shown: the demo must not overwrite the visitor's clipboard
      const toast = document.querySelector(SHARE_CTRL + " .share-toast");
      toast.textContent = t("share.copied");
      toast.classList.remove("hidden");
      setPhase("result");
    } else if (kind === "compare") {
      if (!document.querySelector(".leaflet-popup-content-wrapper")) showSiteSummary(latlng);
      const btn = await waitFor(() => document.querySelector(".track-compare-btn"));
      if (!alive()) return;
      setPhase(btn ? "button" : "result");
      if (btn) {
        const c = centre(rectOf(btn) || spotRect());
        await startAt(c);
        if (!alive()) return;
        await place(c, quick ? 0 : 800);
        if (!alive()) return;
        await click();
        if (!alive()) return;
        btn.click(); // the real button: loads all tracks and fills the table
        await waitFor(() => document.querySelector(".leaflet-popup .track-table"), 15000);
        if (!alive()) return;
        setPhase("result");
      }
    } else {
      // 1. the drawing tool is highlighted and used
      setPhase("tool");
      const toolRect = firstRect(".area-control-btn");
      if (toolRect) {
        const c = centre(toolRect);
        await startAt(c);
        if (!alive()) return;
        await place(c, quick ? 0 : 800);
        if (!alive()) return;
        await click();
        if (!alive()) return;
      }
      startAreaDrawing(); // the real drawing mode, including its hint bar
      // 2. only the inside of the polygon stays bright while it is drawn
      tour.drawPts = [];
      tour.cursorLive = true;
      setPhase("draw");
      // the bright area follows the cursor continuously, so it grows while the polygon is drawn
      (async () => { // a short timer instead of requestAnimationFrame: smooth enough, and it keeps running in background tabs
        while (alive() && tour.demoPhase === "draw") {
          setShape(liveDrawPoints());
          await sleep(30);
        }
      })();
      const pts = cfg.polygon.map(demoLatLng);
      for (let i = 0; i < pts.length; i++) {
        await place(demoPagePoint(pts[i]), quick ? 0 : 260);
        if (!alive()) return;
        await click(120);
        if (!alive()) return;
        tour.drawPts.push(demoPagePoint(pts[i]));
        onAreaMapClick({ latlng: pts[i] });
      }
      // a click on the first corner closes the area, as for a visitor
      await place(demoPagePoint(pts[0]), quick ? 0 : 320);
      if (!alive()) return;
      await click(120);
      if (!alive()) return;
      tour.cursorLive = false; // closed: the full polygon stays bright until the result window takes over
      onAreaMapClick({ latlng: pts[0] });
      setShape(liveDrawPoints());
      // 3. the result window
      await waitFor(() => document.querySelector("#area-panel .area-bar"), 15000);
      if (!alive()) return;
      tour.drawPts = [];
      setPhase("result");
    }
    // the popup / result panel fills in while the data loads: keep the highlight fitted around it
    hideCursor();
    // the popup can pan the map a little after it opens: follow that movement as well as the content
    const follow = () => { if (alive()) reposition(); };
    state.map.on("move moveend", follow);
    for (let k = 0; k < 40 && alive(); k++) {
      await sleep(250);
      reposition();
    }
    state.map.off("move moveend", follow);
  }

  const narrow = () => window.matchMedia("(max-width: 700px)").matches;
  const sidebarCollapsed = () => document.body.classList.contains("sidebar-collapsed");

  function setSidebar(collapsed) {
    if (sidebarCollapsed() === collapsed) return false;
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    const btn = document.getElementById("sidebar-toggle");
    if (btn) btn.setAttribute("aria-expanded", String(!collapsed));
    setTimeout(() => window.state && state.map && state.map.invalidateSize(), 300);
    return true;
  }

  function targetRect(step) {
    if (step.demo) return demoRect(step.demo);
    const rects = [];
    for (const sel of step.sel) {
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) rects.push(r);
      });
    }
    if (!rects.length) return null;
    if (step.center) {
      const r = rects[0];
      const s = 70;
      return { left: r.left + r.width / 2 - s / 2, top: r.top + r.height / 2 - s / 2, width: s, height: s };
    }
    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    return { left, top, width: right - left, height: bottom - top };
  }

  function ensureDom() {
    if (tour.els) return;
    const block = document.createElement("div");
    block.id = "tour-block";
    const spot = document.createElement("div");
    spot.id = "tour-spot";
    const pop = document.createElement("div");
    pop.id = "tour-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-live", "polite");
    document.body.append(block, spot, pop);
    tour.els = { block, spot, pop };
  }

  function placePopover(rect, step) {
    const { pop, spot } = tour.els;
    spot.classList.toggle("light", !!(step && step.demo)); // demos need the map visible, so dim less
    // area result: the polygon is already dimmed around by the app; the box around the result window is only a ring
    spot.classList.toggle("ring", !!(step && step.demo === "area" && tour.demoPhase === "result"));
    setShape(step && step.demo === "area" && tour.demoPhase === "draw" ? liveDrawPoints() : null);
    // measure demo: highlight the line itself instead of a box around it
    const lineMode = !!(step && step.demo === "measure" && (tour.demoPhase === "draw" || tour.demoPhase === "result"));
    setLineShape(lineMode ? (typeof measureState !== "undefined" ? measureState.points : []).map(demoPagePoint) : null,
      lineMode && tour.demoPhase === "result" ? firstRect(".measure-label-total") : null);
    if (lineMode) spot.style.visibility = "hidden";
    // point demo: no box around the spot to click on (the click ripple shows where); the box appears around the result window
    if (step && step.demo === "point" && tour.demoPhase !== "result") spot.style.visibility = "hidden";
    const pad = 6;
    if (tour.firstPlace) { // first step after start: appear in place instead of flying in from the corner
      spot.style.transition = "none";
      requestAnimationFrame(() => requestAnimationFrame(() => { spot.style.transition = ""; }));
      tour.firstPlace = false;
    }
    spot.style.left = `${rect.left - pad}px`;
    spot.style.top = `${rect.top - pad}px`;
    spot.style.width = `${rect.width + pad * 2}px`;
    spot.style.height = `${rect.height + pad * 2}px`;

    const vw = window.innerWidth, vh = window.innerHeight, gap = 14, m = 10;
    pop.style.left = "0px";
    pop.style.top = "0px";
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x, y;
    if (step && (step.wide || (step.demo && !["search", "layer", "tracks", "shadow", "toggle", "sidebar", "zoom", "modes"].includes(step.demo))) && !narrow()) {
      // demos: the card goes to the right edge so it never covers the popup or the result panel
      x = vw - pw - 16;
      y = Math.max(m, 120);
    } else if (narrow()) {
      // phones: dock the card to the edge away from the highlighted part
      x = Math.max(m, (vw - pw) / 2);
      y = rect.top + rect.height / 2 < vh / 2 ? vh - ph - m : m;
    } else {
      const fits = {
        right: rect.left + rect.width + pad + gap + pw <= vw - m,
        below: rect.top + rect.height + pad + gap + ph <= vh - m,
        above: rect.top - pad - gap - ph >= m,
        left: rect.left - pad - gap - pw >= m,
      };
      const cy = rect.top + rect.height / 2 - ph / 2;
      const cx = rect.left + rect.width / 2 - pw / 2;
      if (fits.right) { x = rect.left + rect.width + pad + gap; y = cy; }
      else if (fits.below) { x = cx; y = rect.top + rect.height + pad + gap; }
      else if (fits.above) { x = cx; y = rect.top - pad - gap - ph; }
      else { x = rect.left - pad - gap - pw; y = cy; }
      x = Math.min(Math.max(m, x), vw - pw - m);
      y = Math.min(Math.max(m, y), vh - ph - m);
    }
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
  }

  function renderPopover() {
    const { pop } = tour.els;
    const step = STEPS[tour.index];
    pop.innerHTML = "";
    const head = document.createElement("div");
    head.className = "tour-head";
    const count = document.createElement("span");
    count.className = "tour-count";
    count.textContent = t("tour.stepOf", { n: tour.index + 1, total: STEPS.length });
    const close = document.createElement("button");
    close.className = "tour-close";
    close.textContent = "✕";
    close.title = t("tour.close");
    close.setAttribute("aria-label", t("tour.close"));
    close.addEventListener("click", () => endTour(true));
    head.append(count, close);
    const title = document.createElement("h3");
    title.textContent = t(`tour.${step.id}.title`);
    const body = document.createElement("p");
    body.innerHTML = t(`tour.${step.id}.text`, { place: demoCfg().place });
    const nav = document.createElement("div");
    nav.className = "tour-nav";
    const prev = document.createElement("button");
    prev.className = "tour-btn";
    prev.textContent = t("tour.prev");
    prev.disabled = tour.index === 0;
    prev.addEventListener("click", () => go(tour.index - 1));
    const next = document.createElement("button");
    next.className = "tour-btn tour-primary";
    const last = tour.index === STEPS.length - 1;
    next.textContent = t(last ? "tour.done" : "tour.next");
    next.addEventListener("click", () => (last ? endTour(true) : go(tour.index + 1)));
    if (step.demo) {
      const replay = document.createElement("button");
      replay.className = "tour-btn";
      replay.textContent = "↻";
      replay.title = t("tour.replay");
      replay.setAttribute("aria-label", t("tour.replay"));
      replay.addEventListener("click", () => go(tour.index));
      nav.append(prev, replay, next);
    } else {
      nav.append(prev, next);
    }
    pop.append(head, title, body, nav);
    next.focus({ preventScroll: true });
  }

  async function go(i) {
    // skip steps whose element is not on the page (e.g. a control that failed to load)
    let dir = i >= tour.index ? 1 : -1;
    while (i >= 0 && i < STEPS.length && !STEPS[i].sel.some((s) => document.querySelector(s))) i += dir;
    if (i < 0 || i >= STEPS.length) return endTour(true);
    const myGo = ++tour.goToken;
    const stale = () => !tour.active || myGo !== tour.goToken;
    const prevStep = STEPS[tour.index];
    // whatever the previous step demonstrated goes away first (the compare step reuses the point step's popup)
    const forward = i === tour.index + 1;
    clearDemo(
      !!(STEPS[i].demo === "compare" && prevStep && prevStep.demo === "point" && forward),
      !!(STEPS[i].demo === "shadow" && prevStep && prevStep.demo === "tracks" && forward) // the track layer stays on to show the shadow layer with it
    );
    tour.index = i;
    const step = STEPS[i];
    // a step with a demo first moves the map; the previous step's box must not hang around (or jump) until it is placed
    if (step.demo && tour.els) tour.els.spot.style.visibility = "hidden";
    // layer steps need a specific mode; the others show the app as the visitor had it
    const wantMode = step.mode || (tour.snapshot && tour.snapshot.mode);
    if (wantMode && typeof setMode === "function" && state.mode !== wantMode) {
      setMode(wantMode);
      await sleep(50);
      if (stale()) return;
    }
    // on phones the sidebar covers the map: show whichever part this step is about
    let changed = false;
    if (step.ui === "sidebar") changed = setSidebar(false);
    else if (narrow()) changed = setSidebar(true);
    if (step.ui === "sidebar") {
      const el = document.querySelector(step.sel[0]);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: "center" });
    }
    if (changed) await sleep(320);
    if (stale()) return;
    renderPopover();
    if (step.demo) {
      await prepareDemoView(step.demo);
      if (stale()) return;
    }
    const rect = targetRect(step);
    if (rect) placePopover(rect, step);
    if (step.demo) runDemo(step.demo);
  }

  function reposition() {
    if (!tour.active) return;
    const rect = targetRect(STEPS[tour.index]);
    if (rect) placePopover(rect, STEPS[tour.index]);
  }

  function onKey(e) {
    if (!tour.active) return;
    if (e.key === "Escape") { e.preventDefault(); endTour(true); }
    else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); if (tour.index < STEPS.length - 1) go(tour.index + 1); else endTour(true); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(tour.index - 1); }
  }

  function startTour() {
    if (tour.active) return;
    hideOffer(true);
    // finish or cancel anything in progress, so the tour does not point at half-drawn tools
    if (typeof cancelAreaDrawing === "function") cancelAreaDrawing();
    if (typeof cancelMeasure === "function") cancelMeasure();
    ensureDom();
    tour.active = true;
    tour.wasCollapsed = sidebarCollapsed();
    // remember what the visitor had on screen: the layer steps switch mode and layers
    tour.snapshot = { mode: state.mode, checked: {} };
    for (const f in state.layers) tour.snapshot.checked[f] = !!state.layers[f].checked;
    tour.firstPlace = true;
    document.body.classList.add("tour-active");
    go(0);
  }

  function endTour(markSeen) {
    if (!tour.active) return;
    clearDemo();
    tour.active = false;
    setShape(null);
    setLineShape(null);
    document.body.classList.remove("tour-active");
    if (tour.mapView) { // the demos moved the map: put it back where the visitor had it
      state.map.setView(tour.mapView.center, tour.mapView.zoom, { animate: false });
      tour.mapView = null;
    }
    tour.els.pop.innerHTML = "";
    tour.els.spot.style.cssText = ""; // the next start must not animate from the old position
    setSidebar(tour.wasCollapsed);
    restoreLayers();
    if (markSeen) rememberSeen();
  }

  function restoreLayers() {
    const snap = tour.snapshot;
    tour.snapshot = null;
    if (!snap || typeof setMode !== "function") return;
    setMode(snap.mode);
    for (const f in snap.checked) {
      const en = state.layers[f];
      if (!en || en.checked === snap.checked[f]) continue;
      if (en.checkboxEl) en.checkboxEl.checked = snap.checked[f];
      toggleLayer(f, snap.checked[f]);
    }
  }

  function rememberSeen() {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch (err) { /* private mode: the offer just shows again next time */ }
  }
  function alreadySeen() {
    try { return localStorage.getItem(SEEN_KEY) === "1"; } catch (err) { return false; }
  }

  // ---- one-time offer for first-time visitors (never starts by itself)

  function showOffer() {
    if (document.getElementById("tour-offer")) return;
    const box = document.createElement("div");
    box.id = "tour-offer";
    const text = document.createElement("span");
    text.textContent = t("tour.offer.text");
    const yes = document.createElement("button");
    yes.className = "tour-btn tour-primary";
    yes.textContent = t("tour.offer.start");
    yes.addEventListener("click", startTour);
    const no = document.createElement("button");
    no.className = "tour-btn";
    no.textContent = t("tour.offer.later");
    no.addEventListener("click", () => hideOffer(true));
    box.append(text, yes, no);
    document.getElementById("app").appendChild(box);
  }
  function hideOffer(markSeen) {
    const box = document.getElementById("tour-offer");
    if (box) box.remove();
    if (markSeen) rememberSeen();
  }

  window.refreshTourTexts = function () {
    if (tour.active) { renderPopover(); reposition(); }
    const box = document.getElementById("tour-offer");
    if (box) { box.remove(); showOffer(); }
  };

  // ---- wiring

  document.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", reposition);
  const btn = document.getElementById("tour-btn");
  if (btn) btn.addEventListener("click", startTour);

  (function waitForApp(tries) {
    const app = document.getElementById("app");
    const ready = app && !app.classList.contains("hidden") && typeof state !== "undefined" && state.hashReady;
    if (ready) {
      if (!alreadySeen() && !openedViaSharedLink) setTimeout(() => { if (!tour.active && !alreadySeen()) showOffer(); }, 1500);
      return;
    }
    if (tries < 200) setTimeout(() => waitForApp(tries + 1), 400);
  })(0);
})();
