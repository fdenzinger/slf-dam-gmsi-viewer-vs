// Minimal i18n: a flat {de, fr, en} string dictionary, a t(key, vars) lookup
// with {placeholder} substitution, and applyStaticTranslations() which
// fills every [data-i18n]/[data-i18n-html]/[data-i18n-title]/
// [data-i18n-placeholder]/[data-i18n-aria-label] element from it. German is
// the fallback if a key is ever missing in another language.
// Loaded first (before layers.js/app.js) so t() is available wherever
// labels are built.

const LANG_STORAGE_KEY = "gmsi-vs-lang";
const DEFAULT_LANG = "de";

const I18N = {
  de: {
    "app.title": "GMSI Wallis",
    "app.subtitle": "Ground Motion Sensitivity Index – Kanton Wallis",
    "loader.autoLoading": "Lade automatisch …",
    "dropzone.title": "Projektordner hierher ziehen",
    "dropzone.hint": "(der Ordner „GMSI_VS_product“, oder mindestens der Unterordner „rasters“)",
    "dropzone.or": "– oder –",
    "dropzone.pickButton": "Ordner auswählen",
    "search.type.peak": "Gipfel",
    "search.type.pass": "Pass",
    "search.type.lake": "See",
    "search.type.glacier": "Gletscher",
    "search.type.place": "Ort",
    "search.type.ridge": "Grat",
    "search.type.valley": "Tal",
    "search.type.name": "Flurname",
    "search.type.municipality": "Gemeinde",
    "search.type.zip": "PLZ",
    "search.type.district": "Bezirk",
    "search.type.canton": "Kanton",
    "search.type.address": "Adresse",
    "search.placeholder": "Ort suchen (z. B. Sion, Zermatt) …",
    "mode.standard": "Standard",
    "mode.expert": "Erweitert",
    "info.button": "ℹ️ Was zeigt diese Karte – und was nicht?",
    "info.copyright": "© WSL Institute for Snow and Avalanche Research, SLF 2026",
    "sidebar.toggle": "Seitenleiste ein-/ausblenden",
    "lang.toggle": "Sprache wechseln",

    "modal.close": "Schliessen",
    "modal.whatShows.h": "Was zeigt diese Karte?",
    "modal.whatShows.body":
      "Der <strong>GMSI (Ground Motion Sensitivity Index)</strong> zeigt, wie gut sich ein Ort im " +
      "Kanton Wallis mit Satellitenradar (Sentinel&#8209;1) auf Bodenbewegungen überwachen lässt – " +
      "zum Beispiel für Rutschungen, Sackungen oder andere Hangbewegungen. Der Wert reicht von " +
      "0 (ungeeignet) bis 1 (sehr gut geeignet) und liegt für jeden 10×10&nbsp;Meter grossen " +
      "Bildpunkt vor.",
    "modal.howToRead.h": "Wie ist die Karte zu lesen?",
    "modal.howToRead.green": "<strong>Blau (GMSI ≥ 0.4):</strong> sehr gute Bedingungen – hier sind gute Radarmessungen wahrscheinlich.",
    "modal.howToRead.yellow": "<strong>Orange (GMSI 0.2–0.4):</strong> Messungen sind möglich, Ergebnisse sollten aber mit Vorsicht interpretiert werden.",
    "modal.howToRead.red": "<strong>Rot (GMSI &lt; 0.2):</strong> schlechte Bedingungen – gute Messungen sind schwieriger zu erhalten, und Bewegungen können leicht übersehen werden oder sind schwer zu interpretieren. Ganz unmöglich sind Messungen aber nicht.",
    "modal.howToRead.blocked": "<strong>Grau (keine Messung möglich):</strong> Gebiete im Radarschatten oder mit Layover-Verzerrung sowie Gebiete, in denen die Radarbilder schon nach 6&nbsp;Tagen nicht mehr zuverlässig vergleichbar sind. Hier liefert kein Track einen GMSI-Wert.",
    "modal.howToRead.none": "<strong>Ohne Farbe:</strong> keine Daten – Gebiete ausserhalb des Wallis sowie Seen.",
    "modal.redWarning.h": "Wichtig: Rot heisst nicht automatisch „keine Bewegung“",
    "modal.redWarning.intro": "Ein tiefer GMSI-Wert kann ganz unterschiedliche Ursachen haben – und die Karte allein zeigt nicht, welche davon zutrifft:",
    "modal.redWarning.li1": "Die Geometrie ist ungünstig, z.&nbsp;B. ein Steilhang, den der Satellit aus seiner Blickrichtung nicht gut einsehen kann.",
    "modal.redWarning.li2": "Die Erdoberfläche verändert sich rasch, sodass die Radarbilder schnell nicht mehr vergleichbar sind – z.&nbsp;B. durch Vegetation, Schnee oder Gletscher, aber auch durch eine Rutschung, die sich schnell bewegt.",
    "modal.redWarning.li3": "Beides trifft gleichzeitig zu.",
    "modal.redWarning.outro":
      "Das heisst: Ein tiefer Wert an einer bekannten oder vermuteten Rutschung kann selbst ein " +
      "Hinweis auf die Instabilität sein – nicht nur ein Zeichen für schlechte Messbedingungen. " +
      "Ein tiefer Wert bedeutet ausserdem nicht, dass Radarmessungen unmöglich sind – es wird nur " +
      "schwieriger, mehrere gute Radarbild-Paare zu erhalten, und die Bewegungswerte sind weniger " +
      "zuverlässig.",
    "modal.whatNot.h": "Was die Karte nicht zeigt",
    "modal.whatNot.li1": "Die Karte beruht auf <strong>Sommerdaten aus den Jahren 2018–2021</strong> und zeigt damit Bestfall-Bedingungen. Bei Schneebedeckung sind zuverlässige Messungen unabhängig vom GMSI-Wert in der Regel nicht möglich.",
    "modal.whatNot.li2": "Gebiete, die sich genau während 2018–2021 stark verändert haben, können in der Karte tiefere Werte zeigen, auch wenn sich die Bedingungen seither wieder verbessert haben.",
    "modal.howMade.h": "Wie wurde die Karte erstellt? (kurz erklärt)",
    "modal.howMade.intro":
      "Grundlage sind Radaraufnahmen des Satelliten <strong>Sentinel&#8209;1</strong> (Teil des europäischen " +
      "Erdbeobachtungsprogramms Copernicus, betrieben mit der Weltraumorganisation ESA). Er überfliegt die Schweiz regelmässig und liefert " +
      "seine Radarbilder frei und öffentlich zugänglich. Der GMSI kombiniert daraus drei Faktoren " +
      "pro Bildpunkt:",
    "modal.howMade.li1": "<strong>Datenzuverlässigkeit:</strong> Wie ähnlich sieht die Erdoberfläche auf Radarbildern über die Zeit hinweg aus? Verändert sie sich schnell (z.&nbsp;B. durch Vegetation, Schnee oder Bodenbewegung), nimmt diese Ähnlichkeit rasch ab.",
    "modal.howMade.li2": "<strong>Sichtbarkeit:</strong> Kann der Satellit den Ort überhaupt „sehen“, oder liegt er im Radarschatten bzw. wird durch steiles Gelände verzerrt (Layover)?",
    "modal.howMade.li3": "<strong>Messempfindlichkeit:</strong> Radar misst Bewegung nur in Blickrichtung des Satelliten. Ein Hang, der sich seitlich zum Satelliten bewegt, ist schwerer zu erfassen als einer, der sich direkt auf ihn zu oder von ihm weg bewegt.",
    "modal.howMade.outro":
      "Da mehrere Satelliten-Bahnen (Tracks) die Schweiz aus unterschiedlichen Richtungen " +
      "überfliegen, wird zusätzlich für jeden Bildpunkt festgehalten, welche Bahn dort die besten " +
      "Ergebnisse liefert. Ascending- und Descending-Tracks blicken von gegenüberliegenden " +
      "Seiten auf einen Hang und ergänzen sich. Ein Ort, der nur in einem einzigen Track gut " +
      "messbar ist, ist anfälliger als einer, der in mehreren Tracks gut messbar ist.",
    "modal.workflow.h": "Empfohlenes Vorgehen",
    "modal.workflow.li1": "<strong>Übersicht:</strong> Mit der GMSI-Übersicht prüfen, ob ein Gebiet grundsätzlich mit Radar überwacht werden kann.",
    "modal.workflow.li2": "<strong>Track wählen:</strong> Mit „Bester Track pro Pixel“ herausfinden, welche Satelliten-Bahn dort die besten Ergebnisse liefert.",
    "modal.workflow.li3": "<strong>GMSI pro Track:</strong> Die Karte dieser Bahn ansehen und prüfen, ob die Blickrichtung zur erwarteten Bewegungsrichtung des Hangs passt.",
    "modal.workflow.li4": "<strong>Shadow/Layover pro Track:</strong> Bei Unklarheiten prüfen, ob der Ort für diese Bahn im Radarschatten liegt oder durch Layover verzerrt ist.",
    "modal.source":
      "Quelle: Jacquemart &amp; Manconi (2025). Datengrundlage: Kohärenzbilder des Satelliten " +
      "Sentinel&#8209;1 (ESA/Copernicus), Sommer 2018–2021; digitales Höhenmodell (Gelände).",

    "basemap.switch": "Hintergrundkarte wechseln",
    "basemap.grau": "Landeskarte grau",
    "basemap.swissimage": "SWISSIMAGE",
    "basemap.alti3d": "Relief swissALTI3D (Gelände)",
    "basemap.surface3d": "Relief swissSURFACE3D (Oberfläche)",
    "share.copyLink": "Link zu dieser Ansicht kopieren",
    "share.promptTitle": "Link zu dieser Ansicht:",
    "share.copied": "Link kopiert",

    "verdict.blocked.title": "Keine Messung möglich",
    "verdict.blocked.text": "An diesem Ort liefert kein Track einen GMSI-Wert, weil er durch Layover oder Radarschatten nicht einsehbar ist. Hier ist mit Sentinel-1 keine Messung möglich.",
    "verdict.none.title": "Keine Daten",
    "verdict.none.text": "An dieser Stelle liegen keine Werte vor: entweder ausserhalb von Wallis oder in keinem Track auswertbar (Radarschatten, Layover oder zu geringe Kohärenz).",
    "verdict.good.title": "Gut geeignet",
    "verdict.good.text": "Hier sind gute Radarmessungen mit Sentinel‑1 wahrscheinlich.",
    "verdict.mid.title": "Eingeschränkt geeignet",
    "verdict.mid.text": "Messungen sind möglich, die Ergebnisse sollten aber mit Vorsicht interpretiert werden.",
    "verdict.bad.title": "Schwierig",
    "verdict.bad.text": "Gute Messungen sind hier schwer zu erhalten. Ein tiefer Wert kann an der Geometrie liegen oder an einer sich rasch verändernden Oberfläche (z. B. Vegetation, Schnee, Gletscher oder eine Rutschung).",

    "summary.loadingAllTracks": "Lade alle Tracks …",
    "summary.table.track": "Track",
    "summary.table.direction": "Richtung",
    "summary.table.gmsi": "GMSI",
    "summary.shadowLayover": "Schatten/Layover",
    "summary.noData": "keine Daten",
    "summary.msg.none": "In keinem Track sind gute Werte (≥ 0.4) vorhanden.",
    "summary.msg.one": "Nur in einem Track gut messbar – das ist anfälliger als Orte, die in mehreren Tracks gut messbar sind.",
    "summary.msg.many": "In {good} von {total} Tracks gut messbar – die Messbarkeit ist robust.",
    "summary.loading": "Lade …",
    "summary.bestTrack": "Bester Track: ",
    "summary.compareAllBtn": "Alle Tracks vergleichen",
    "summary.elevation": " m ü. M.",
    "summary.note": "Basierend auf Sommerdaten 2018–2021. Bei Schneebedeckung sind zuverlässige Messungen in der Regel nicht möglich.",

    "load.noMatchingFiles": "Keine passenden GMSI-Dateien im ausgewählten Ordner gefunden.\nBitte den Ordner „GMSI_VS_product“ (oder „rasters“) auswählen.",
    "load.loadingOverview": "Lade Übersicht …",
    "load.loadingN": "Lade {found} von {total} Ebenen …",
    "load.loadedMissing": "Geladen. Nicht gefunden (übersprungen): {missing}",
    "load.layerLoading": "lädt …",
    "load.layerError": "Fehler beim Laden",
    "load.readingFolder": "Lese Ordner …",
    "load.autoFailed": "Automatisches Laden fehlgeschlagen. Bitte Ordner manuell auswählen.",

    "sidebar.opacity": "Transparenz",
    "sidebar.opacityAria": "Transparenz {label}",
    "legend.h": "Legende",
    "legend.gmsiTitle": "GMSI",
    "legend.trackTitle": "Track",
    "legend.shadowTitle": "Shadow/Layover",
    "legend.gmsi.green": "GMSI ≥ 0.4 – sehr gute Bedingungen",
    "legend.gmsi.yellow": "GMSI 0.2 – 0.4 – Messungen möglich, aber mit Vorsicht",
    "legend.gmsi.red": "GMSI < 0.2 – schlechte Bedingungen",
    "legend.gmsi.blocked": "Keine Messung möglich (Layover/Shadow)",
    "area.sizeWithData": "Fläche: {area} · davon mit Daten: {data}",
    "area.border": "Grenzgebiet: {pct} % der Fläche liegen ausserhalb des Wallis oder auf einem See. Dort gibt es keine Daten. Die Prozentwerte beziehen sich nur auf die Fläche mit Daten.",
    "area.title": "Flächenauswertung",
    "area.drawBtn": "Fläche zeichnen und auswerten",
    "area.uploadBtn": "Fläche aus Datei laden (GeoJSON, GPKG, KML, KMZ)",
    "area.computing": "Wird berechnet …",
    "area.error": "Die Auswertung ist fehlgeschlagen. Bitte erneut versuchen.",
    "area.size": "Fläche: {area}",
    "area.class.good": "GMSI ≥ 0.4 – sehr gut",
    "area.class.mid": "GMSI 0.2–0.4 – mit Vorsicht",
    "area.class.bad": "GMSI < 0.2 – schlecht",
    "area.class.blocked": "Keine Messung möglich (Layover/Shadow)",
    "area.class.nodata": "Keine Daten (ausserhalb, See)",
    "area.sum.good": "Auf {good} % der Fläche sind die Bedingungen sehr gut. Die Fläche ist insgesamt gut für Radarmessungen geeignet.",
    "area.sum.mixed": "Nur auf {good} % der Fläche sind die Bedingungen sehr gut, auf {usable} % sind Messungen möglich. Die Eignung ist gemischt.",
    "area.sum.poor": "Auf {poor} % der Fläche sind Messungen schlecht oder nicht möglich. Radarmessungen sind hier nur eingeschränkt geeignet.",
    "area.sum.none": "In dieser Fläche liegen keine auswertbaren Werte vor.",
    "area.bestTracks": "Bester Track (Anteil der auswertbaren Fläche)",
    "area.note": "Auswertung auf dem 10-m-Raster mit dem besten Wert aller Tracks. Rot heisst nicht automatisch „keine Bewegung“.",
    "area.noteApprox": "Grosse Fläche: Auswertung mit ca. {cell} m Rasterweite, die Anteile sind Näherungswerte.",
    "area.hintDraw": "Eckpunkte anklicken. Doppelklick oder Enter schliesst die Fläche ab, Esc bricht ab.",
    "area.hintFinish": "Weiter klicken. Doppelklick, Enter oder ein Klick auf den ersten Punkt schliesst ab.",
    "area.hintMin": "Mindestens drei Punkte nötig.",
    "area.importNone": "Keine Polygone in der Datei gefunden.",
    "area.importError": "Datei konnte nicht gelesen werden (GeoJSON, GPKG, KML oder KMZ erwartet).",
    "area.importReading": "Datei wird gelesen …",
    "area.importCrs": "Koordinatensystem (EPSG:{srs}) wird nicht unterstützt. Bitte als WGS84 oder LV95 speichern.",
    "measure.btn": "Strecke messen",
    "measure.hintDraw": "Punkte anklicken. Doppelklick oder Enter beendet die Messung, Esc bricht ab.",
    "measure.hintFinish": "Weiter klicken. Doppelklick, Enter oder ein Klick auf den letzten Punkt beendet die Messung.",
    "measure.hintMin": "Mindestens zwei Punkte nötig.",
    "measure.horizontal": "Horizontale Länge (nicht entlang des Geländes)",
    "tour.button": "🧭 Kurzes Tutorial",
    "tour.next": "Weiter",
    "tour.prev": "Zurück",
    "tour.done": "Fertig",
    "tour.close": "Tutorial beenden",
    "tour.stepOf": "{n} / {total}",
    "tour.replay": "Demo wiederholen",
    "tour.offer.text": "Neu hier? Eine kurze Einführung zeigt dir die wichtigsten Funktionen.",
    "tour.offer.start": "Tutorial starten",
    "tour.offer.later": "Nicht jetzt",
    "tour.sidebar.title": "Seitenleiste",
    "tour.sidebar.text": "Links liegt die <strong>Seitenleiste</strong>. Hier legst du fest, <strong>was</strong> die Karte zeigt: Sprache, Ortssuche, Modus (Standard oder Erweitert), die Ebenen mit ihrer Transparenz und die Legende.",
    "tour.map.title": "Kartenbereich",
    "tour.map.text": "Rechts liegt der <strong>Kartenbereich</strong>. Hier siehst du das Ergebnis und arbeitest direkt auf der Karte: zoomen, Stellen abfragen, Flächen auswerten, Strecken messen, die Basiskarte wechseln und Ansichten teilen.",
    "tour.fold.title": "Seitenleiste ein- und ausklappen",
    "tour.fold.text": "Mit dem <strong>Pfeil</strong> am Rand klappst du die Seitenleiste ein und aus – so bekommt die Karte die ganze Breite.",
    "tour.lang.title": "Sprache",
    "tour.lang.text": "Oben links wechselst du die <strong>Sprache</strong> der Karte und aller Texte: Deutsch, Französisch oder Englisch. Deine Wahl wird im Browser gemerkt.",
    "tour.zoom.title": "Zoomen und Verschieben",
    "tour.zoom.text": "Mit <strong>+</strong> und <strong>−</strong> zoomst du in die Karte hinein und wieder heraus. Das geht auch mit dem <strong>Mausrad</strong> oder mit zwei Fingern auf dem Touchscreen. <strong>Verschieben</strong> kannst du die Karte, indem du sie mit gedrückter Maustaste ziehst (am Touchscreen mit einem Finger).",
    "tour.layers.title": "Ebenen (Layer)",
    "tour.layers.text": "Eine Ebene ist eine Kartenschicht, die über der Basiskarte liegt. Hier schaltest du Ebenen an und aus. Jede Zeile ist eine Ebene mit Kontrollkästchen und Farbfeld. Die Ebenen sind in Gruppen geordnet (1, 2 …).",
    "tour.overview.title": "GMSI Übersicht",
    "tour.overview.text": "Das ist die Hauptkarte. Sie <strong>kombiniert alle Satellitenbahnen (Tracks)</strong>: An jeder Stelle zeigt sie den <strong>besten GMSI-Wert</strong>, den irgendein Track dort erreicht. Die Farben: <strong>Blau</strong> = sehr gute Bedingungen (GMSI ≥ 0.4), <strong>Orange</strong> = Messungen mit Vorsicht (0.2–0.4), <strong>Rot</strong> = schlechte Bedingungen (&lt; 0.2), <strong>Grau</strong> = in keinem Track eine Messung möglich (Layover/Shadow).",
    "tour.toggle.title": "Ebene an- und ausschalten",
    "tour.toggle.text": "Mit dem <strong>Kontrollkästchen</strong> blendest du die Ebene ein oder aus. Darunter stellt der <strong>Transparenz-Schieber</strong> ein, wie stark die Basiskarte durchscheint (0 % = deckend, 100 % = unsichtbar). Der Schieber erscheint nur bei eingeschalteten Ebenen.",
    "tour.modes.title": "Modus wechseln",
    "tour.modes.text": "Mit <strong>Standard / Erweitert</strong> wählst du die Ansicht. <strong>Standard</strong> ist die übersichtliche Ansicht für den Alltag: die kombinierte Übersicht und der beste Track. <strong>Erweitert</strong> ist für die Detailanalyse: Du siehst zusätzlich jeden Track einzeln samt Shadow/Layover-Flächen und kannst Ebenen frei kombinieren. Beim Wechsel zurück auf Standard werden die Track-Ebenen wieder ausgeschaltet.",
    "tour.standard.title": "Standard-Modus",
    "tour.standard.text": "<strong>Standard</strong> zeigt nur das Wichtigste: die <strong>Übersicht</strong> (bester Wert aller Satellitenbahnen) und auf Wunsch den <strong>besten Track pro Pixel</strong>. Beim Wechsel zu Standard werden alle anderen Ebenen ausgeschaltet.",
    "tour.best.title": "Bester Track pro Pixel",
    "tour.best.text": "Diese Ebene zeigt, <strong>welche Satellitenbahn (Track)</strong> an jeder Stelle den besten GMSI-Wert liefert. Jeder Track hat eine eigene Farbe, die du in der Legende findest. Das hilft bei der Wahl des Tracks für einen Hang.",
    "tour.legend.title": "Legende",
    "tour.legend.text": "Die Legende erklärt die Farben der eingeschalteten Ebenen: <strong>Blau</strong> = sehr gut, <strong>Orange</strong> = mit Vorsicht, <strong>Rot</strong> = schlecht, <strong>Grau</strong> = keine Messung möglich (Layover/Shadow). Sie passt sich an, wenn du Ebenen ein- oder ausschaltest.",
    "tour.expert.title": "Erweitert-Modus",
    "tour.expert.text": "<strong>Erweitert</strong> zeigt zusätzlich die Gruppen 3 und 4 mit Ebenen für einzelne Tracks. Jetzt kannst du <strong>mehrere Ebenen gleichzeitig</strong> einschalten, z. B. einen Track zusammen mit seinen Shadow-Flächen.",
    "tour.tracks.title": "GMSI pro Track",
    "tour.tracks.text": "Für jede Satellitenbahn gibt es eine eigene Ebene (z. B. <strong>A015</strong>, <strong>D066</strong>). <strong>A</strong> = aufsteigende Bahn (blickt nach Osten), <strong>D</strong> = absteigende Bahn (blickt nach Westen), die Zahl ist die Bahnnummer. Ein Hang, den ein Track schlecht sieht, erfasst oft ein anderer gut. Die Übersicht nimmt pro Pixel den besten Wert.",
    "tour.shadow.title": "Shadow/Layover pro Track",
    "tour.shadow.text": "Diese Ebenen zeigen in <strong>Grau</strong>, wo ein Track wegen der <strong>Hangausrichtung</strong> zum Satelliten nichts messen kann (Radarschatten oder Layover). Schaltest du die Ebene allein ein, siehst du diese Flächen am besten. Zusammen mit dem GMSI desselben Tracks erkennst du, warum dort Lücken sind.",
    "tour.search.title": "Ort suchen",
    "tour.search.text": "Gib einen Ort ein, z. B. eine Gemeinde, einen Gipfel, einen Pass oder einen See, und wähle einen Vorschlag: Die Karte springt dorthin. Die Vorschläge erscheinen schon beim Tippen.",
    "tour.point.title": "Einen Punkt prüfen",
    "tour.point.text": "Klicke irgendwo auf die Karte. Du erhältst eine Einschätzung für diese Stelle (Ampelfarbe und GMSI-Wert) und den besten Track.",
    "tour.compare.title": "Alle Tracks vergleichen",
    "tour.compare.text": "Im Popup vergleichst du mit <strong>„Alle Tracks vergleichen“</strong> die Satellitenbahnen an dieser Stelle: Pro Track siehst du den GMSI-Wert oder den Grund, warum keiner vorliegt (z. B. Radarschatten).",
    "tour.area.title": "Eine Fläche auswerten",
    "tour.area.text": "Mit dem <strong>Polygon-Symbol</strong> zeichnest du eine Fläche (Doppelklick schliesst ab). Mit dem <strong>Pfeil-Symbol</strong> kannst du stattdessen ein Polygon aus einer Datei hochladen (GeoJSON, GPKG, KML, KMZ). Die Auswertung zeigt, wie viel der Fläche gut, mit Vorsicht, schlecht oder nicht messbar ist, und welcher Track am besten passt.",
    "tour.measure.title": "Strecke messen",
    "tour.measure.text": "Mit dem <strong>Lineal</strong> misst du Strecken: Du klickst Punkte an und siehst an jedem die bisherige Länge, am Ende die Gesamtlänge. Doppelklick, Enter oder ein Klick auf den letzten Punkt beendet die Messung, Esc bricht ab. Gemessen wird die horizontale Länge, nicht die Strecke am Hang. Der <strong>Massstab</strong> unten links hilft bei der Einordnung.",
    "tour.base.title": "Basiskarte wechseln",
    "tour.base.text": "Unten links wechselst du die <strong>Basiskarte</strong> unter den Daten: die graue Landeskarte, das <strong>Luftbild</strong> (swissimage) oder Reliefdarstellungen. Das Luftbild hilft zu erkennen, was am Boden liegt (Wald, Fels, Gebäude), das Relief zeigt die Geländeform.",
    "tour.share.title": "Ansicht teilen",
    "tour.share.text": "Das <strong>Link-Symbol</strong> kopiert einen Link, der genau diese Ansicht wieder öffnet: Kartenausschnitt, eingeschaltete Ebenen, Basiskarte und der markierte Punkt. Praktisch zum Weitergeben.",
    "tour.note.title": "Wichtig zu wissen",
    "tour.note.text": "<strong>Rot heisst nicht automatisch „keine Bewegung“.</strong> Es zeigt nur, dass Radar hier schlecht misst, z. B. wegen Geometrie, Vegetation, Schnee, Gletschern oder schnellen Rutschungen. Mehr dazu in diesem Dialog.",
    "legend.shadow": "Keine Messung möglich (Radarschatten / Layover)",

    "layer.composite": "GMSI Übersicht (bester Wert aller Tracks)",
    "layer.bestOrbit": "Bester Track pro Pixel",
    "group.1": "1 – Übersicht",
    "group.2": "2 – Track wählen",
    "group.3": "3 – GMSI pro Track",
    "group.4": "4 – Shadow/Layover pro Track",
  },

  fr: {
    "app.title": "GMSI Valais",
    "app.subtitle": "Ground Motion Sensitivity Index – canton du Valais",
    "loader.autoLoading": "Chargement automatique …",
    "dropzone.title": "Glisser le dossier du projet ici",
    "dropzone.hint": "(le dossier « GMSI_VS_product », ou au moins le sous-dossier « rasters »)",
    "dropzone.or": "– ou –",
    "dropzone.pickButton": "Choisir un dossier",
    "search.type.peak": "Sommet",
    "search.type.pass": "Col",
    "search.type.lake": "Lac",
    "search.type.glacier": "Glacier",
    "search.type.place": "Lieu",
    "search.type.ridge": "Arête",
    "search.type.valley": "Vallée",
    "search.type.name": "Toponyme",
    "search.type.municipality": "Commune",
    "search.type.zip": "NPA",
    "search.type.district": "District",
    "search.type.canton": "Canton",
    "search.type.address": "Adresse",
    "search.placeholder": "Rechercher un lieu (p. ex. Sion, Zermatt) …",
    "mode.standard": "Standard",
    "mode.expert": "Avancé",
    "info.button": "ℹ️ Que montre cette carte – et que ne montre-t-elle pas ?",
    "info.copyright": "© WSL Institute for Snow and Avalanche Research, SLF 2026",
    "sidebar.toggle": "Afficher/masquer le panneau latéral",
    "lang.toggle": "Changer de langue",

    "modal.close": "Fermer",
    "modal.whatShows.h": "Que montre cette carte ?",
    "modal.whatShows.body":
      "Le <strong>GMSI (Ground Motion Sensitivity Index)</strong> indique dans quelle mesure un " +
      "endroit du canton du Valais peut être surveillé par radar satellite (Sentinel&#8209;1) pour " +
      "détecter des mouvements de terrain – par exemple des glissements, des tassements ou d'autres " +
      "mouvements de versant. La valeur va de 0 (non adapté) à 1 (très bien adapté) et est fournie " +
      "pour chaque pixel de 10×10&nbsp;mètres.",
    "modal.howToRead.h": "Comment lire la carte ?",
    "modal.howToRead.green": "<strong>Bleu (GMSI ≥ 0,4) :</strong> très bonnes conditions – de bonnes mesures radar sont probables ici.",
    "modal.howToRead.yellow": "<strong>Orange (GMSI 0,2–0,4) :</strong> des mesures sont possibles, mais les résultats doivent être interprétés avec prudence.",
    "modal.howToRead.red": "<strong>Rouge (GMSI &lt; 0,2) :</strong> mauvaises conditions – de bonnes mesures sont plus difficiles à obtenir, et les mouvements peuvent être facilement manqués ou difficiles à interpréter. Les mesures ne sont toutefois pas totalement impossibles.",
    "modal.howToRead.blocked": "<strong>Gris (aucune mesure possible) :</strong> zones en ombre radar ou avec distorsion de layover, ainsi que zones où les images radar ne sont déjà plus comparables de manière fiable après 6&nbsp;jours. Ici, aucun track ne fournit de valeur GMSI.",
    "modal.howToRead.none": "<strong>Sans couleur :</strong> aucune donnée – zones hors du Valais et lacs.",
    "modal.redWarning.h": "Important : rouge ne signifie pas automatiquement « pas de mouvement »",
    "modal.redWarning.intro": "Une valeur GMSI basse peut avoir des causes très différentes – et la carte seule ne montre pas laquelle s'applique :",
    "modal.redWarning.li1": "La géométrie est défavorable, p.&nbsp;ex. une pente raide que le satellite ne peut pas bien observer depuis son angle de visée.",
    "modal.redWarning.li2": "La surface du sol change rapidement, de sorte que les images radar ne sont plus comparables longtemps – p.&nbsp;ex. à cause de la végétation, de la neige ou des glaciers, mais aussi d'un glissement qui se déplace rapidement.",
    "modal.redWarning.li3": "Les deux s'appliquent en même temps.",
    "modal.redWarning.outro":
      "Autrement dit : une valeur basse sur un glissement connu ou présumé peut être elle-même un " +
      "indice d'instabilité – pas seulement un signe de mauvaises conditions de mesure. Une valeur " +
      "basse ne signifie pas non plus que les mesures radar sont impossibles – il devient seulement " +
      "plus difficile d'obtenir plusieurs bonnes paires d'images radar, et les valeurs de mouvement " +
      "sont moins fiables.",
    "modal.whatNot.h": "Ce que la carte ne montre pas",
    "modal.whatNot.li1": "La carte se base sur des <strong>données estivales des années 2018–2021</strong> et montre donc des conditions optimales. En cas de couverture neigeuse, des mesures fiables ne sont généralement pas possibles, indépendamment de la valeur GMSI.",
    "modal.whatNot.li2": "Les zones qui ont fortement changé précisément durant 2018–2021 peuvent afficher des valeurs plus basses sur la carte, même si les conditions se sont améliorées depuis.",
    "modal.howMade.h": "Comment la carte a-t-elle été créée ? (brève explication)",
    "modal.howMade.intro":
      "La base est constituée d'images radar du satellite <strong>Sentinel&#8209;1</strong> (qui fait partie du " +
      "programme européen d'observation de la Terre Copernicus, exploité avec l'agence spatiale ESA). Il survole la Suisse " +
      "régulièrement et fournit ses images radar en libre accès. Le GMSI combine trois facteurs par " +
      "pixel :",
    "modal.howMade.li1": "<strong>Fiabilité des données :</strong> à quel point la surface du sol se ressemble-t-elle sur les images radar au fil du temps ? Si elle change rapidement (p.&nbsp;ex. végétation, neige ou mouvement de terrain), cette ressemblance diminue vite.",
    "modal.howMade.li2": "<strong>Visibilité :</strong> le satellite peut-il seulement « voir » l'endroit, ou se trouve-t-il en ombre radar, voire déformé par un terrain escarpé (layover) ?",
    "modal.howMade.li3": "<strong>Sensibilité de mesure :</strong> le radar ne mesure le mouvement que dans sa direction de visée. Une pente qui se déplace latéralement par rapport au satellite est plus difficile à détecter qu'une pente qui se déplace directement vers lui ou en s'en éloignant.",
    "modal.howMade.outro":
      "Comme plusieurs orbites satellite (tracks/trajectoires) survolent la Suisse depuis des " +
      "directions différentes, on détermine en plus pour chaque pixel quelle trajectoire y donne les " +
      "meilleurs résultats. Les trajectoires ascendantes et descendantes observent un versant depuis " +
      "des côtés opposés et se complètent. Un endroit mesurable correctement sur une seule " +
      "trajectoire est plus vulnérable qu'un endroit mesurable sur plusieurs trajectoires.",
    "modal.workflow.h": "Démarche recommandée",
    "modal.workflow.li1": "<strong>Aperçu :</strong> vérifier avec l'aperçu GMSI si une zone peut en principe être surveillée par radar.",
    "modal.workflow.li2": "<strong>Choisir la trajectoire :</strong> utiliser « Meilleure trajectoire par pixel » pour déterminer quelle orbite satellite y donne les meilleurs résultats.",
    "modal.workflow.li3": "<strong>GMSI par trajectoire :</strong> consulter la carte de cette trajectoire et vérifier si la direction de visée correspond à la direction de mouvement attendue du versant.",
    "modal.workflow.li4": "<strong>Ombre/Layover par trajectoire :</strong> en cas d'incertitude, vérifier si l'endroit se trouve en ombre radar ou est déformé par layover pour cette trajectoire.",
    "modal.source":
      "Source : Jacquemart &amp; Manconi (2025). Données de base : images de cohérence du satellite " +
      "Sentinel&#8209;1 (ESA/Copernicus), été 2018–2021 ; modèle numérique de terrain.",

    "basemap.switch": "Changer de fond de carte",
    "basemap.grau": "Carte nationale grise",
    "basemap.swissimage": "SWISSIMAGE",
    "basemap.alti3d": "Relief swissALTI3D (terrain)",
    "basemap.surface3d": "Relief swissSURFACE3D (surface)",
    "share.copyLink": "Copier le lien de cette vue",
    "share.promptTitle": "Lien de cette vue :",
    "share.copied": "Lien copié",

    "verdict.blocked.title": "Aucune mesure possible",
    "verdict.blocked.text": "En ce point, aucune orbite ne fournit de valeur GMSI, car il est masqué par le layover ou l'ombre radar. Aucune mesure n'est possible ici avec Sentinel-1.",
    "verdict.none.title": "Aucune donnée",
    "verdict.none.text": "Aucune valeur n'est disponible à cet endroit : soit hors du Valais, soit non exploitable sur aucune trajectoire (ombre radar, layover ou cohérence trop faible).",
    "verdict.good.title": "Bien adapté",
    "verdict.good.text": "De bonnes mesures radar avec Sentinel‑1 sont probables ici.",
    "verdict.mid.title": "Adapté avec réserve",
    "verdict.mid.text": "Des mesures sont possibles, mais les résultats doivent être interprétés avec prudence.",
    "verdict.bad.title": "Difficile",
    "verdict.bad.text": "De bonnes mesures sont difficiles à obtenir ici. Une valeur basse peut être due à la géométrie ou à une surface qui change rapidement (p. ex. végétation, neige, glaciers ou glissement).",

    "summary.loadingAllTracks": "Chargement de toutes les trajectoires …",
    "summary.table.track": "Trajectoire",
    "summary.table.direction": "Direction",
    "summary.table.gmsi": "GMSI",
    "summary.shadowLayover": "Ombre/Layover",
    "summary.noData": "aucune donnée",
    "summary.msg.none": "Aucune trajectoire n'affiche de bonnes valeurs (≥ 0,4).",
    "summary.msg.one": "Mesurable correctement sur une seule trajectoire – c'est plus vulnérable que les endroits mesurables sur plusieurs trajectoires.",
    "summary.msg.many": "Mesurable correctement sur {good} des {total} trajectoires – la mesurabilité est robuste.",
    "summary.loading": "Chargement …",
    "summary.bestTrack": "Meilleure trajectoire : ",
    "summary.compareAllBtn": "Comparer toutes les trajectoires",
    "summary.elevation": " m d'altitude",
    "summary.note": "Basé sur des données estivales 2018–2021. En cas de couverture neigeuse, des mesures fiables ne sont généralement pas possibles.",

    "load.noMatchingFiles": "Aucun fichier GMSI correspondant trouvé dans le dossier sélectionné.\nVeuillez sélectionner le dossier « GMSI_VS_product » (ou « rasters »).",
    "load.loadingOverview": "Chargement de l'aperçu …",
    "load.loadingN": "Chargement de {found} sur {total} couches …",
    "load.loadedMissing": "Chargé. Introuvables (ignorés) : {missing}",
    "load.layerLoading": "chargement …",
    "load.layerError": "Erreur de chargement",
    "load.readingFolder": "Lecture du dossier …",
    "load.autoFailed": "Le chargement automatique a échoué. Veuillez sélectionner le dossier manuellement.",

    "sidebar.opacity": "Transparence",
    "sidebar.opacityAria": "Transparence {label}",
    "legend.h": "Légende",
    "legend.gmsiTitle": "GMSI",
    "legend.trackTitle": "Trajectoire",
    "legend.shadowTitle": "Ombre/Layover",
    "legend.gmsi.green": "GMSI ≥ 0,4 – très bonnes conditions",
    "legend.gmsi.yellow": "GMSI 0,2 – 0,4 – mesures possibles, mais avec prudence",
    "legend.gmsi.red": "GMSI < 0,2 – mauvaises conditions",
    "legend.gmsi.blocked": "Aucune mesure possible (layover/ombre)",
    "area.sizeWithData": "Surface : {area} · dont avec données : {data}",
    "area.border": "Zone frontalière : {pct} % de la surface se trouvent hors du Valais ou sur un lac. Il n'y a pas de données à cet endroit. Les pourcentages ne concernent que la surface avec données.",
    "area.title": "Évaluation de la zone",
    "area.drawBtn": "Dessiner et évaluer une zone",
    "area.uploadBtn": "Charger une zone depuis un fichier (GeoJSON, GPKG, KML, KMZ)",
    "area.computing": "Calcul en cours …",
    "area.error": "L'évaluation a échoué. Veuillez réessayer.",
    "area.size": "Surface : {area}",
    "area.class.good": "GMSI ≥ 0,4 – très bon",
    "area.class.mid": "GMSI 0,2–0,4 – avec prudence",
    "area.class.bad": "GMSI < 0,2 – mauvais",
    "area.class.blocked": "Aucune mesure possible (layover/ombre)",
    "area.class.nodata": "Aucune donnée (hors zone, lac)",
    "area.sum.good": "Sur {good} % de la surface, les conditions sont très bonnes. Dans l'ensemble, la zone convient bien aux mesures radar.",
    "area.sum.mixed": "Sur {good} % seulement de la surface, les conditions sont très bonnes ; des mesures sont possibles sur {usable} %. L'aptitude est mitigée.",
    "area.sum.poor": "Sur {poor} % de la surface, les mesures sont mauvaises ou impossibles. Les mesures radar ne conviennent ici que de façon limitée.",
    "area.sum.none": "Cette zone ne contient aucune valeur évaluable.",
    "area.bestTracks": "Meilleure trajectoire (part de la surface évaluable)",
    "area.note": "Évaluation sur la grille de 10 m avec la meilleure valeur de toutes les trajectoires. Rouge ne signifie pas automatiquement « aucun mouvement ».",
    "area.noteApprox": "Grande zone : évaluation avec une résolution d'environ {cell} m, les parts sont des valeurs approximatives.",
    "area.hintDraw": "Cliquer sur les sommets. Double-clic ou Entrée ferme la zone, Échap annule.",
    "area.hintFinish": "Continuer à cliquer. Double-clic, Entrée ou un clic sur le premier point ferme la zone.",
    "area.hintMin": "Au moins trois points sont nécessaires.",
    "area.importNone": "Aucun polygone trouvé dans le fichier.",
    "area.importError": "Le fichier n'a pas pu être lu (GeoJSON, GPKG, KML ou KMZ attendu).",
    "area.importReading": "Lecture du fichier …",
    "area.importCrs": "Le système de coordonnées (EPSG:{srs}) n'est pas pris en charge. Enregistrer en WGS84 ou LV95.",
    "measure.btn": "Mesurer une distance",
    "measure.hintDraw": "Cliquer sur les points. Double-clic ou Entrée termine la mesure, Échap annule.",
    "measure.hintFinish": "Continuer à cliquer. Double-clic, Entrée ou un clic sur le dernier point termine la mesure.",
    "measure.hintMin": "Au moins deux points sont nécessaires.",
    "measure.horizontal": "Longueur horizontale (pas le long du terrain)",
    "tour.button": "🧭 Court tutoriel",
    "tour.next": "Suivant",
    "tour.prev": "Précédent",
    "tour.done": "Terminer",
    "tour.close": "Fermer le tutoriel",
    "tour.stepOf": "{n} / {total}",
    "tour.replay": "Rejouer la démo",
    "tour.offer.text": "Nouveau ici ? Une courte introduction présente les principales fonctions.",
    "tour.offer.start": "Lancer le tutoriel",
    "tour.offer.later": "Pas maintenant",
    "tour.sidebar.title": "Barre latérale",
    "tour.sidebar.text": "À gauche se trouve la <strong>barre latérale</strong>. Vous y définissez <strong>ce que</strong> la carte montre : langue, recherche de lieux, mode (Standard ou Avancé), les couches avec leur transparence et la légende.",
    "tour.map.title": "Zone de la carte",
    "tour.map.text": "À droite se trouve la <strong>zone de la carte</strong>. Vous y voyez le résultat et travaillez directement sur la carte : zoomer, interroger des points, évaluer des zones, mesurer des distances, changer le fond de carte et partager des vues.",
    "tour.fold.title": "Replier et déplier la barre latérale",
    "tour.fold.text": "Avec la <strong>flèche</strong> sur le bord, vous repliez et dépliez la barre latérale – la carte occupe alors toute la largeur.",
    "tour.lang.title": "Langue",
    "tour.lang.text": "En haut à gauche, vous changez la <strong>langue</strong> de la carte et de tous les textes : allemand, français ou anglais. Votre choix est mémorisé dans le navigateur.",
    "tour.zoom.title": "Zoom et déplacement",
    "tour.zoom.text": "Avec <strong>+</strong> et <strong>−</strong>, vous zoomez avant et arrière sur la carte. Cela fonctionne aussi avec la <strong>molette de la souris</strong> ou avec deux doigts sur un écran tactile. Pour <strong>déplacer</strong> la carte, faites-la glisser avec le bouton de la souris enfoncé (sur un écran tactile avec un doigt).",
    "tour.layers.title": "Couches (layers)",
    "tour.layers.text": "Une couche est un calque de la carte posé sur le fond de carte. Vous activez et désactivez ici les couches. Chaque ligne est une couche avec une case à cocher et un échantillon de couleur. Les couches sont classées par groupes (1, 2 …).",
    "tour.overview.title": "GMSI vue d'ensemble",
    "tour.overview.text": "C'est la carte principale. Elle <strong>combine toutes les trajectoires du satellite (tracks)</strong> : à chaque endroit, elle montre la <strong>meilleure valeur GMSI</strong> atteinte par un track quelconque. Les couleurs : <strong>bleu</strong> = très bonnes conditions (GMSI ≥ 0,4), <strong>orange</strong> = mesures avec prudence (0,2–0,4), <strong>rouge</strong> = mauvaises conditions (&lt; 0,2), <strong>gris</strong> = aucune mesure possible dans aucun track (layover/ombre).",
    "tour.toggle.title": "Activer et désactiver une couche",
    "tour.toggle.text": "La <strong>case à cocher</strong> affiche ou masque la couche. En dessous, le <strong>curseur de transparence</strong> règle la visibilité du fond de carte (0 % = opaque, 100 % = invisible). Le curseur n'apparaît que pour les couches activées.",
    "tour.modes.title": "Changer de mode",
    "tour.modes.text": "Avec <strong>Standard / Avancé</strong>, vous choisissez la vue. <strong>Standard</strong> est la vue simple pour l'usage courant : la vue d'ensemble combinée et le meilleur track. <strong>Avancé</strong> sert à l'analyse détaillée : vous voyez en plus chaque track séparément avec les zones d'ombre/layover et pouvez combiner librement les couches. En revenant à Standard, les couches des tracks sont désactivées.",
    "tour.standard.title": "Mode Standard",
    "tour.standard.text": "<strong>Standard</strong> ne montre que l'essentiel : la <strong>vue d'ensemble</strong> (meilleure valeur de toutes les trajectoires) et, si vous le souhaitez, le <strong>meilleur track par pixel</strong>. En passant à Standard, toutes les autres couches sont désactivées.",
    "tour.best.title": "Meilleur track par pixel",
    "tour.best.text": "Cette couche montre <strong>quelle trajectoire du satellite (track)</strong> fournit la meilleure valeur GMSI à chaque endroit. Chaque track a sa propre couleur, indiquée dans la légende. Cela aide à choisir le track pour un versant.",
    "tour.legend.title": "Légende",
    "tour.legend.text": "La légende explique les couleurs des couches activées : <strong>bleu</strong> = très bon, <strong>orange</strong> = avec prudence, <strong>rouge</strong> = mauvais, <strong>gris</strong> = aucune mesure possible (layover/ombre). Elle s'adapte quand vous activez ou désactivez des couches.",
    "tour.expert.title": "Mode Avancé",
    "tour.expert.text": "<strong>Avancé</strong> affiche en plus les groupes 3 et 4 avec les couches des différents tracks. Vous pouvez maintenant activer <strong>plusieurs couches en même temps</strong>, par ex. un track avec ses zones d'ombre.",
    "tour.tracks.title": "GMSI par track",
    "tour.tracks.text": "Chaque trajectoire a sa propre couche (par ex. <strong>A015</strong>, <strong>D066</strong>). <strong>A</strong> = trajectoire ascendante (regarde vers l'est), <strong>D</strong> = trajectoire descendante (regarde vers l'ouest), le nombre est le numéro de la trajectoire. Un versant mal vu par un track est souvent bien couvert par un autre. La vue d'ensemble prend la meilleure valeur par pixel.",
    "tour.shadow.title": "Ombre/layover par track",
    "tour.shadow.text": "Ces couches montrent en <strong>gris</strong> où un track ne peut rien mesurer à cause de l'<strong>orientation du versant</strong> par rapport au satellite (ombre radar ou layover). Si vous activez la couche seule, ces zones se voient le mieux. Avec le GMSI du même track, vous comprenez pourquoi il y a des lacunes.",
    "tour.search.title": "Rechercher un lieu",
    "tour.search.text": "Saisissez un lieu, par ex. une commune, un sommet, un col ou un lac, et choisissez une suggestion : la carte s'y rend. Les suggestions apparaissent déjà pendant la saisie.",
    "tour.point.title": "Vérifier un point",
    "tour.point.text": "Cliquez n'importe où sur la carte. Vous obtenez une évaluation de cet endroit (couleur et valeur GMSI) et le meilleur track.",
    "tour.compare.title": "Comparer toutes les trajectoires",
    "tour.compare.text": "Dans la fenêtre, avec <strong>« Comparer toutes les trajectoires »</strong>, vous comparez les trajectoires du satellite à cet endroit : pour chaque track, vous voyez la valeur GMSI ou la raison de son absence (par ex. ombre radar).",
    "tour.area.title": "Évaluer une zone",
    "tour.area.text": "Avec le <strong>symbole de polygone</strong>, vous dessinez une zone (le double-clic la ferme). Avec le <strong>symbole de flèche</strong>, vous pouvez à la place charger un polygone depuis un fichier (GeoJSON, GPKG, KML, KMZ). L'évaluation montre quelle part de la zone est bonne, avec prudence, mauvaise ou non mesurable, et quel track convient le mieux.",
    "tour.measure.title": "Mesurer une distance",
    "tour.measure.text": "Avec la <strong>règle</strong>, vous mesurez des distances : vous cliquez sur des points et voyez la longueur cumulée à chaque point, puis la longueur totale. Double-clic, Entrée ou un clic sur le dernier point termine la mesure, Échap annule. On mesure la longueur horizontale, pas celle le long du versant. L'<strong>échelle</strong> en bas à gauche aide à s'orienter.",
    "tour.base.title": "Changer le fond de carte",
    "tour.base.text": "En bas à gauche, vous changez le <strong>fond de carte</strong> sous les données : la carte nationale grise, l'<strong>orthophoto</strong> (swissimage) ou des représentations du relief. L'orthophoto aide à reconnaître ce qu'il y a au sol (forêt, roche, bâtiments), le relief montre la forme du terrain.",
    "tour.share.title": "Partager la vue",
    "tour.share.text": "Le <strong>symbole de lien</strong> copie un lien qui rouvre exactement cette vue : emprise de la carte, couches activées, fond de carte et point sélectionné. Pratique pour partager.",
    "tour.note.title": "À savoir",
    "tour.note.text": "<strong>Rouge ne signifie pas automatiquement « aucun mouvement ».</strong> Cela indique seulement que le radar mesure mal ici, par ex. à cause de la géométrie, de la végétation, de la neige, des glaciers ou de glissements rapides. Plus de détails dans cette fenêtre.",
    "legend.shadow": "Aucune mesure possible (ombre radar / layover)",

    "layer.composite": "Aperçu GMSI (meilleure valeur de toutes les trajectoires)",
    "layer.bestOrbit": "Meilleure trajectoire par pixel",
    "group.1": "1 – Aperçu",
    "group.2": "2 – Choisir la trajectoire",
    "group.3": "3 – GMSI par trajectoire",
    "group.4": "4 – Ombre/Layover par trajectoire",
  },

  en: {
    "app.title": "GMSI Valais",
    "app.subtitle": "Ground Motion Sensitivity Index – canton of Valais",
    "loader.autoLoading": "Loading automatically …",
    "dropzone.title": "Drag the project folder here",
    "dropzone.hint": "(the „GMSI_VS_product“ folder, or at least the „rasters“ subfolder)",
    "dropzone.or": "– or –",
    "dropzone.pickButton": "Choose folder",
    "search.type.peak": "Peak",
    "search.type.pass": "Pass",
    "search.type.lake": "Lake",
    "search.type.glacier": "Glacier",
    "search.type.place": "Place",
    "search.type.ridge": "Ridge",
    "search.type.valley": "Valley",
    "search.type.name": "Place name",
    "search.type.municipality": "Municipality",
    "search.type.zip": "Postcode",
    "search.type.district": "District",
    "search.type.canton": "Canton",
    "search.type.address": "Address",
    "search.placeholder": "Search for a place (e.g. Sion, Zermatt) …",
    "mode.standard": "Standard",
    "mode.expert": "Advanced",
    "info.button": "ℹ️ What does this map show – and what doesn't it show?",
    "info.copyright": "© WSL Institute for Snow and Avalanche Research, SLF 2026",
    "sidebar.toggle": "Show/hide sidebar",
    "lang.toggle": "Switch language",

    "modal.close": "Close",
    "modal.whatShows.h": "What does this map show?",
    "modal.whatShows.body":
      "The <strong>GMSI (Ground Motion Sensitivity Index)</strong> shows how well a location in " +
      "the canton of Valais can be monitored for ground motion using satellite radar (Sentinel&#8209;1) – " +
      "for example for landslides, subsidence or other slope movements. The value ranges from " +
      "0 (unsuitable) to 1 (very well suited) and is given for every 10×10&nbsp;metre " +
      "pixel.",
    "modal.howToRead.h": "How to read the map",
    "modal.howToRead.green": "<strong>Blue (GMSI ≥ 0.4):</strong> very good conditions – good radar measurements are likely here.",
    "modal.howToRead.yellow": "<strong>Orange (GMSI 0.2–0.4):</strong> measurements are possible, but results should be interpreted with caution.",
    "modal.howToRead.red": "<strong>Red (GMSI &lt; 0.2):</strong> poor conditions – good measurements are harder to obtain, and movements can be easily missed or difficult to interpret. Measurements are not entirely impossible, though.",
    "modal.howToRead.blocked": "<strong>Grey (no measurement possible):</strong> areas in radar shadow or with layover distortion, as well as areas where the radar images are no longer reliably comparable after just 6&nbsp;days. No track provides a GMSI value here.",
    "modal.howToRead.none": "<strong>No colour:</strong> no data – areas outside Valais and lakes.",
    "modal.redWarning.h": "Important: red doesn't automatically mean “no movement”",
    "modal.redWarning.intro": "A low GMSI value can have very different causes – and the map alone doesn't show which one applies:",
    "modal.redWarning.li1": "The geometry is unfavourable, e.&nbsp;g. a steep slope that the satellite cannot see well from its viewing angle.",
    "modal.redWarning.li2": "The ground surface changes quickly, so the radar images stop being comparable soon – e.&nbsp;g. due to vegetation, snow or glaciers, but also due to a landslide that is moving fast.",
    "modal.redWarning.li3": "Both apply at the same time.",
    "modal.redWarning.outro":
      "In other words: a low value at a known or suspected landslide can itself be a sign of " +
      "instability – not just a sign of poor measurement conditions. A low value also doesn't mean " +
      "that radar measurements are impossible – it just becomes harder to obtain several good radar " +
      "image pairs, and the movement values are less reliable.",
    "modal.whatNot.h": "What the map doesn't show",
    "modal.whatNot.li1": "The map is based on <strong>summer data from 2018–2021</strong> and therefore shows best-case conditions. With snow cover, reliable measurements are generally not possible regardless of the GMSI value.",
    "modal.whatNot.li2": "Areas that changed a lot specifically during 2018–2021 may show lower values on the map, even if conditions have since improved again.",
    "modal.howMade.h": "How was the map created? (brief explanation)",
    "modal.howMade.intro":
      "The basis is radar imagery from the <strong>Sentinel&#8209;1</strong> satellite (part of the European " +
      "Copernicus Earth observation programme, operated with the ESA space agency). It flies over Switzerland regularly and makes " +
      "its radar images freely and publicly available. The GMSI combines three factors " +
      "per pixel:",
    "modal.howMade.li1": "<strong>Data reliability:</strong> how similar does the ground surface look on radar images over time? If it changes quickly (e.&nbsp;g. due to vegetation, snow or ground motion), this similarity drops fast.",
    "modal.howMade.li2": "<strong>Visibility:</strong> can the satellite even “see” the location, or is it in radar shadow or distorted by steep terrain (layover)?",
    "modal.howMade.li3": "<strong>Measurement sensitivity:</strong> radar only measures motion in the satellite's line of sight. A slope that moves sideways relative to the satellite is harder to detect than one that moves directly towards or away from it.",
    "modal.howMade.outro":
      "Since several satellite orbits (tracks) fly over Switzerland from different directions, " +
      "the map also records, for every pixel, which track gives the best results there. " +
      "Ascending and descending tracks look at a slope from opposite sides and complement each " +
      "other. A location that is only well measurable on a single track is more vulnerable than " +
      "one that is well measurable on several tracks.",
    "modal.workflow.h": "Recommended workflow",
    "modal.workflow.li1": "<strong>Overview:</strong> use the GMSI overview to check whether an area can in principle be monitored with radar.",
    "modal.workflow.li2": "<strong>Choose a track:</strong> use “Best track per pixel” to find out which satellite track gives the best results there.",
    "modal.workflow.li3": "<strong>GMSI per track:</strong> look at that track's map and check whether its viewing direction matches the slope's expected direction of movement.",
    "modal.workflow.li4": "<strong>Shadow/Layover per track:</strong> if anything is unclear, check whether the location is in radar shadow or distorted by layover for that track.",
    "modal.source":
      "Source: Jacquemart &amp; Manconi (2025). Underlying data: coherence images from the " +
      "Sentinel&#8209;1 satellite (ESA/Copernicus), summer 2018–2021; digital terrain model.",

    "basemap.switch": "Switch basemap",
    "basemap.grau": "National map (grey)",
    "basemap.swissimage": "SWISSIMAGE",
    "basemap.alti3d": "Relief swissALTI3D (terrain)",
    "basemap.surface3d": "Relief swissSURFACE3D (surface)",
    "share.copyLink": "Copy link to this view",
    "share.promptTitle": "Link to this view:",
    "share.copied": "Link copied",

    "verdict.blocked.title": "No measurement possible",
    "verdict.blocked.text": "No track provides a GMSI value at this location because it is hidden by layover or radar shadow. No measurement is possible here with Sentinel-1.",
    "verdict.none.title": "No data",
    "verdict.none.text": "No values are available at this location: either outside Valais or not evaluable on any track (radar shadow, layover, or too little coherence).",
    "verdict.good.title": "Well suited",
    "verdict.good.text": "Good radar measurements with Sentinel‑1 are likely here.",
    "verdict.mid.title": "Suited with caveats",
    "verdict.mid.text": "Measurements are possible, but results should be interpreted with caution.",
    "verdict.bad.title": "Difficult",
    "verdict.bad.text": "Good measurements are hard to obtain here. A low value can be due to the geometry or to a rapidly changing surface (e.g. vegetation, snow, glaciers or a landslide).",

    "summary.loadingAllTracks": "Loading all tracks …",
    "summary.table.track": "Track",
    "summary.table.direction": "Direction",
    "summary.table.gmsi": "GMSI",
    "summary.shadowLayover": "Shadow/Layover",
    "summary.noData": "no data",
    "summary.msg.none": "No track has good values (≥ 0.4).",
    "summary.msg.one": "Only well measurable on a single track – that's more vulnerable than locations measurable on several tracks.",
    "summary.msg.many": "Well measurable on {good} of {total} tracks – measurability is robust.",
    "summary.loading": "Loading …",
    "summary.bestTrack": "Best track: ",
    "summary.compareAllBtn": "Compare all tracks",
    "summary.elevation": " m a.s.l.",
    "summary.note": "Based on summer data 2018–2021. With snow cover, reliable measurements are generally not possible.",

    "load.noMatchingFiles": "No matching GMSI files found in the selected folder.\nPlease select the „GMSI_VS_product“ folder (or „rasters“).",
    "load.loadingOverview": "Loading overview …",
    "load.loadingN": "Loading {found} of {total} layers …",
    "load.loadedMissing": "Loaded. Not found (skipped): {missing}",
    "load.layerLoading": "loading …",
    "load.layerError": "Error loading",
    "load.readingFolder": "Reading folder …",
    "load.autoFailed": "Automatic loading failed. Please select a folder manually.",

    "sidebar.opacity": "Opacity",
    "sidebar.opacityAria": "Opacity {label}",
    "legend.h": "Legend",
    "legend.gmsiTitle": "GMSI",
    "legend.trackTitle": "Track",
    "legend.shadowTitle": "Shadow/Layover",
    "legend.gmsi.green": "GMSI ≥ 0.4 – very good conditions",
    "legend.gmsi.yellow": "GMSI 0.2 – 0.4 – measurements possible, but with caution",
    "legend.gmsi.red": "GMSI < 0.2 – poor conditions",
    "legend.gmsi.blocked": "No measurement possible (layover/shadow)",
    "area.sizeWithData": "Area: {area} · of which with data: {data}",
    "area.border": "Border area: {pct} % of the area lies outside Valais or on a lake. There is no data there. The percentages refer only to the part with data.",
    "area.title": "Area assessment",
    "area.drawBtn": "Draw and assess an area",
    "area.uploadBtn": "Load an area from a file (GeoJSON, GPKG, KML, KMZ)",
    "area.computing": "Calculating …",
    "area.error": "The assessment failed. Please try again.",
    "area.size": "Area: {area}",
    "area.class.good": "GMSI ≥ 0.4 – very good",
    "area.class.mid": "GMSI 0.2–0.4 – with caution",
    "area.class.bad": "GMSI < 0.2 – poor",
    "area.class.blocked": "No measurement possible (layover/shadow)",
    "area.class.nodata": "No data (outside, lake)",
    "area.sum.good": "Conditions are very good on {good} % of the area. Overall the area is well suited to radar measurements.",
    "area.sum.mixed": "Conditions are very good on only {good} % of the area; measurements are possible on {usable} %. Suitability is mixed.",
    "area.sum.poor": "Measurements are poor or not possible on {poor} % of the area. Radar measurements are only of limited suitability here.",
    "area.sum.none": "This area contains no assessable values.",
    "area.bestTracks": "Best track (share of the assessable area)",
    "area.note": "Assessed on the 10 m grid using the best value of all tracks. Red doesn't automatically mean “no movement”.",
    "area.noteApprox": "Large area: assessed at about {cell} m grid spacing, so the shares are approximate.",
    "area.hintDraw": "Click the corner points. Double-click or Enter closes the area, Esc cancels.",
    "area.hintFinish": "Keep clicking. Double-click, Enter or a click on the first point closes the area.",
    "area.hintMin": "At least three points are needed.",
    "area.importNone": "No polygons found in the file.",
    "area.importError": "The file could not be read (GeoJSON, GPKG, KML or KMZ expected).",
    "area.importReading": "Reading file …",
    "area.importCrs": "The coordinate system (EPSG:{srs}) is not supported. Please save as WGS84 or LV95.",
    "measure.btn": "Measure distance",
    "measure.hintDraw": "Click points. Double-click or Enter ends the measurement, Esc cancels.",
    "measure.hintFinish": "Keep clicking. Double-click, Enter or a click on the last point ends the measurement.",
    "measure.hintMin": "At least two points are needed.",
    "measure.horizontal": "Horizontal length (not along the terrain)",
    "tour.button": "🧭 Quick tutorial",
    "tour.next": "Next",
    "tour.prev": "Back",
    "tour.done": "Done",
    "tour.close": "End tutorial",
    "tour.stepOf": "{n} / {total}",
    "tour.replay": "Replay demo",
    "tour.offer.text": "New here? A short introduction shows you the main features.",
    "tour.offer.start": "Start tutorial",
    "tour.offer.later": "Not now",
    "tour.sidebar.title": "Sidebar",
    "tour.sidebar.text": "On the left is the <strong>sidebar</strong>. This is where you decide <strong>what</strong> the map shows: language, place search, mode (Standard or Advanced), the layers with their transparency and the legend.",
    "tour.map.title": "Map area",
    "tour.map.text": "On the right is the <strong>map area</strong>. This is where you see the result and work directly on the map: zoom, query spots, assess areas, measure distances, change the basemap and share views.",
    "tour.fold.title": "Fold the sidebar away",
    "tour.fold.text": "The <strong>arrow</strong> on its edge folds the sidebar away and back – the map then gets the full width.",
    "tour.lang.title": "Language",
    "tour.lang.text": "At the top left you change the <strong>language</strong> of the map and all texts: German, French or English. Your choice is remembered in the browser.",
    "tour.zoom.title": "Zoom and pan",
    "tour.zoom.text": "<strong>+</strong> and <strong>−</strong> zoom the map in and out. The <strong>mouse wheel</strong> or two fingers on a touch screen work too. <strong>Pan</strong> the map by dragging it with the mouse button held down (one finger on a touch screen).",
    "tour.layers.title": "Layers",
    "tour.layers.text": "A layer is a map overlay on top of the basemap. This is where you switch layers on and off. Each row is a layer with a checkbox and a colour swatch. Layers are arranged in groups (1, 2 …).",
    "tour.overview.title": "GMSI overview",
    "tour.overview.text": "This is the main map. It <strong>combines all satellite tracks</strong>: at each location it shows the <strong>best GMSI value</strong> that any track reaches there. The colours: <strong>blue</strong> = very good conditions (GMSI ≥ 0.4), <strong>orange</strong> = measurements with caution (0.2–0.4), <strong>red</strong> = poor conditions (&lt; 0.2), <strong>grey</strong> = no measurement possible in any track (layover/shadow).",
    "tour.toggle.title": "Switch a layer on and off",
    "tour.toggle.text": "The <strong>checkbox</strong> shows or hides the layer. Below it, the <strong>transparency slider</strong> sets how much of the basemap shows through (0 % = opaque, 100 % = invisible). The slider only appears for layers that are switched on.",
    "tour.modes.title": "Switch mode",
    "tour.modes.text": "<strong>Standard / Advanced</strong> selects the view. <strong>Standard</strong> is the clear view for everyday use: the combined overview and the best track. <strong>Advanced</strong> is for detailed analysis: you also see every track on its own with its shadow/layover areas and can combine layers freely. Switching back to Standard turns the track layers off.",
    "tour.standard.title": "Standard mode",
    "tour.standard.text": "<strong>Standard</strong> shows only the essentials: the <strong>overview</strong> (best value of all satellite tracks) and, if you like, the <strong>best track per pixel</strong>. Switching to Standard turns all other layers off.",
    "tour.best.title": "Best track per pixel",
    "tour.best.text": "This layer shows <strong>which satellite track</strong> gives the best GMSI value at each location. Each track has its own colour, listed in the legend. It helps you choose the track for a slope.",
    "tour.legend.title": "Legend",
    "tour.legend.text": "The legend explains the colours of the layers that are switched on: <strong>blue</strong> = very good, <strong>orange</strong> = with caution, <strong>red</strong> = poor, <strong>grey</strong> = no measurement possible (layover/shadow). It adapts when you switch layers on or off.",
    "tour.expert.title": "Advanced mode",
    "tour.expert.text": "<strong>Advanced</strong> also shows groups 3 and 4 with layers for single tracks. You can now switch on <strong>several layers at once</strong>, e.g. a track together with its shadow areas.",
    "tour.tracks.title": "GMSI per track",
    "tour.tracks.text": "Each satellite track has its own layer (e.g. <strong>A015</strong>, <strong>D066</strong>). <strong>A</strong> = ascending pass (looks east), <strong>D</strong> = descending pass (looks west), the number is the track number. A slope one track sees poorly is often covered well by another. The overview takes the best value per pixel.",
    "tour.shadow.title": "Shadow/layover per track",
    "tour.shadow.text": "These layers show in <strong>grey</strong> where a track cannot measure anything because of the <strong>slope orientation</strong> relative to the satellite (radar shadow or layover). Switched on alone, these areas are easiest to see. Together with the GMSI of the same track you can tell why there are gaps.",
    "tour.search.title": "Find a place",
    "tour.search.text": "Enter a place, e.g. a municipality, a peak, a pass or a lake, and pick a suggestion: the map jumps there. Suggestions appear as you type.",
    "tour.point.title": "Check a point",
    "tour.point.text": "Click anywhere on the map. You get an assessment for that spot (traffic-light colour and GMSI value) and the best track.",
    "tour.compare.title": "Compare all tracks",
    "tour.compare.text": "In the popup, <strong>“Compare all tracks”</strong> compares the satellite tracks at this spot: for each track you see the GMSI value or the reason there is none (e.g. radar shadow).",
    "tour.area.title": "Assess an area",
    "tour.area.text": "Use the <strong>polygon symbol</strong> to draw an area (double-click closes it). Use the <strong>arrow symbol</strong> instead to upload a polygon from a file (GeoJSON, GPKG, KML, KMZ). The assessment shows how much of the area is good, with caution, poor or not measurable, and which track fits best.",
    "tour.measure.title": "Measure a distance",
    "tour.measure.text": "The <strong>ruler</strong> measures distances: click points to see the length so far at each one and the total at the end. Double-click, Enter or a click on the last point ends the measurement, Esc cancels. The horizontal length is measured, not the length along the slope. The <strong>scale bar</strong> at the bottom left helps with orientation.",
    "tour.base.title": "Change the basemap",
    "tour.base.text": "At the bottom left you change the <strong>basemap</strong> beneath the data: the grey national map, the <strong>aerial image</strong> (swissimage) or relief views. The aerial image helps to see what is on the ground (forest, rock, buildings), the relief shows the shape of the terrain.",
    "tour.share.title": "Share the view",
    "tour.share.text": "The <strong>link symbol</strong> copies a link that reopens exactly this view: map section, switched-on layers, basemap and the marked point. Handy for passing on.",
    "tour.note.title": "Good to know",
    "tour.note.text": "<strong>Red doesn't automatically mean “no movement”.</strong> It only shows that radar measures poorly here, e.g. because of geometry, vegetation, snow, glaciers or fast landslides. More on this in this dialog.",
    "legend.shadow": "No measurement possible (radar shadow / layover)",

    "layer.composite": "GMSI overview (best value across all tracks)",
    "layer.bestOrbit": "Best track per pixel",
    "group.1": "1 – Overview",
    "group.2": "2 – Choose track",
    "group.3": "3 – GMSI per track",
    "group.4": "4 – Shadow/Layover per track",
  },
};

function getLang() {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && I18N[stored]) return stored;
  } catch (err) { /* private browsing / blocked storage: fall through to default */ }
  return DEFAULT_LANG;
}

let currentLang = getLang();

function t(key, vars) {
  let s = (I18N[currentLang] && I18N[currentLang][key]) ?? I18N[DEFAULT_LANG][key] ?? key;
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
}

// Fills every static data-i18n* element from the current language. Dynamic
// UI built in app.js (sidebar, legend, popups) re-reads t() directly on its
// own render path instead, since it's rebuilt from scratch each time anyway.
function applyStaticTranslations() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
}

function setLang(lang) {
  if (!I18N[lang] || lang === currentLang) return;
  currentLang = lang;
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (err) { /* ignore */ }
  applyStaticTranslations();
  document.querySelectorAll(".lang-btn").forEach((el) => {
    el.classList.toggle("active", el.dataset.lang === lang);
  });
  if (typeof onLangChange === "function") onLangChange();
}

// initial paint: apply whatever language was stored (or the default) to the
// static markup and the toggle buttons before app.js builds anything dynamic
document.querySelectorAll(".lang-btn").forEach((el) => {
  el.classList.toggle("active", el.dataset.lang === currentLang);
  el.addEventListener("click", () => setLang(el.dataset.lang));
});
applyStaticTranslations();
