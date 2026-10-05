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
    { id: "layers", sel: ["#layer-tree"], ui: "sidebar", mode: "easy" },
    { id: "toggle", sel: ['.layer-group[data-group="1"] .layer-item'], ui: "sidebar", mode: "easy" },
    { id: "standard", sel: ["#mode-easy"], ui: "sidebar", mode: "easy" },
    { id: "best", sel: ['.layer-group[data-group="2"]'], ui: "sidebar", mode: "easy" },
    { id: "legend", sel: ["#legend"], ui: "sidebar", mode: "easy" },
    { id: "expert", sel: ["#mode-expert"], ui: "sidebar", mode: "expert" },
    { id: "tracks", sel: ['.layer-group[data-group="3"]'], ui: "sidebar", mode: "expert" },
    { id: "shadow", sel: ['.layer-group[data-group="4"]'], ui: "sidebar", mode: "expert" },
    { id: "search", sel: ["#search-box"], ui: "sidebar" },
    { id: "point", sel: ["#map"], ui: "map", center: true, demo: "point" },
    { id: "compare", sel: ["#map"], ui: "map", center: true, demo: "compare" },
    { id: "area", sel: [".area-control"], ui: "map", demo: "area" },
    { id: "measure", sel: [".measure-control-btn"], ui: "map" },
    { id: "base", sel: [BASE_CTRL], ui: "map", demo: "base" },
    { id: "share", sel: [SHARE_CTRL], ui: "map", demo: "share" },
    { id: "note", sel: ["#info-btn"], ui: "sidebar" },
  ];

  const tour = { active: false, index: 0, els: null, wasCollapsed: false, snapshot: null, demoToken: 0, demoActive: false, goToken: 0, mapView: null };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- live demos for the "point" and "area" steps: the tour does what the visitor would do

  const DEMOS = {
    GR: { place: "St. Moritz", point: [2785004, 1150337], polygon: [[2784150, 1150950], [2785800, 1151050], [2785900, 1149800], [2784500, 1149650], [2784100, 1150300]] },
    VS: { place: "Zermatt", point: [2623185, 1095735], polygon: [[2621200, 1094950], [2622900, 1095000], [2623000, 1093750], [2621600, 1093650], [2621150, 1094200]] },
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
    if (phase === "tool") { const r = firstRect(".area-control-btn"); if (r) return r; }
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

  function waitMoveEnd(map, timeout) {
    return new Promise((resolve) => {
      let done = false;
      const fin = () => { if (!done) { done = true; map.off("moveend", fin); resolve(); } };
      map.on("moveend", fin);
      setTimeout(fin, timeout);
    });
  }

  async function prepareDemoView(kind) {
    if (kind === "base" || kind === "share") return; // these demos use the controls, the map stays where it is
    const map = state.map, cfg = demoCfg(), animate = !reduced();
    if (!tour.mapView) tour.mapView = { center: map.getCenter(), zoom: map.getZoom() };
    map.invalidateSize();
    if (kind === "point" || kind === "compare") {
      const c = demoLatLng(cfg.point);
      let center = c;
      if (!narrow()) { // keep the point left of centre: the popup opens at the point, the tour card sits on the right
        const z = 8;
        center = map.unproject(map.project(c, z).add([map.getSize().x * 0.18, 0]), z);
      }
      map.setView(center, 8, { animate });
    } else {
      map.fitBounds(L.latLngBounds(cfg.polygon.map(demoLatLng)), { padding: [70, 70], maxZoom: 9, animate });
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
  function clearDemo(keepPopup) {
    tour.demoToken++;
    hideCursor();
    setShape(null);
    if (keepPopup) return;
    tour.demoPhase = null;
    tour.drawPts = [];
    tour.cursorLive = false;
    if (tour.prevBasemap) { // the basemap demo switched to the aerial image: put the visitor's choice back
      if (state.currentBasemap !== tour.prevBasemap) chooseBasemap(tour.prevBasemap);
      tour.prevBasemap = null;
    }
    document.querySelectorAll(".basemap-control-menu").forEach((m) => m.classList.add("hidden"));
    document.querySelectorAll(".share-toast").forEach((m) => m.classList.add("hidden"));
    if (!tour.demoActive) return;
    tour.demoActive = false;
    state.tourDemo = false;
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
    const setPhase = (ph) => { tour.demoPhase = ph; reposition(); };
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
    const click = async () => {
      cursor.classList.remove("click");
      void cursor.offsetWidth; // restart the ripple animation
      cursor.classList.add("click");
      await sleep(quick ? 0 : 400);
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
        await place(demoPagePoint(pts[i]), quick ? 0 : 650);
        if (!alive()) return;
        await click();
        if (!alive()) return;
        tour.drawPts.push(demoPagePoint(pts[i]));
        onAreaMapClick({ latlng: pts[i] });
      }
      // a click on the first corner closes the area, as for a visitor
      await place(demoPagePoint(pts[0]), quick ? 0 : 650);
      if (!alive()) return;
      await click();
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
    setShape(step && step.demo === "area" && tour.demoPhase === "draw" ? liveDrawPoints() : null);
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
    if (step && step.demo && !narrow()) {
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
    body.innerHTML = t(`tour.${step.id}.text`);
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
    clearDemo(!!(STEPS[i].demo === "compare" && prevStep && prevStep.demo === "point" && i === tour.index + 1));
    tour.index = i;
    const step = STEPS[i];
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
