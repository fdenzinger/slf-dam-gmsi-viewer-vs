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
    "modal.howToRead.green": "<strong>Grün (GMSI ≥ 0.4):</strong> sehr gute Bedingungen – hier sind gute Radarmessungen wahrscheinlich.",
    "modal.howToRead.yellow": "<strong>Gelb (GMSI 0.2–0.4):</strong> Messungen sind möglich, Ergebnisse sollten aber mit Vorsicht interpretiert werden.",
    "modal.howToRead.red": "<strong>Rot (GMSI &lt; 0.2):</strong> schlechte Bedingungen – gute Messungen sind schwieriger zu erhalten, und Bewegungen können leicht übersehen werden oder sind schwer zu interpretieren. Ganz unmöglich sind Messungen aber nicht.",
    "modal.howToRead.none": "<strong>Ohne Farbe:</strong> keine Daten. Das sind Gebiete im Radarschatten oder mit Layover-Verzerrung sowie Gebiete, in denen die Radarbilder schon nach 6&nbsp;Tagen nicht mehr zuverlässig vergleichbar sind.",
    "modal.redWarning.h": "Wichtig: Rot heisst nicht automatisch „keine Bewegung“",
    "modal.redWarning.intro": "Ein tiefer GMSI-Wert kann ganz unterschiedliche Ursachen haben – und die Karte allein zeigt nicht, welche davon zutrifft:",
    "modal.redWarning.li1": "Die Geometrie ist ungünstig, z.&nbsp;B. ein Steilhang, den der Satellit aus seiner Blickrichtung nicht gut einsehen kann.",
    "modal.redWarning.li2": "Die Erdoberfläche verändert sich rasch, sodass die Radarbilder schnell nicht mehr vergleichbar sind – z.&nbsp;B. durch Vegetation oder Schnee, aber auch durch eine Rutschung, die sich schnell bewegt.",
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

    "verdict.none.title": "Keine Daten",
    "verdict.none.text": "An dieser Stelle liegen keine Werte vor: entweder ausserhalb von Wallis oder in keinem Track auswertbar (Radarschatten, Layover oder zu geringe Kohärenz).",
    "verdict.good.title": "Gut geeignet",
    "verdict.good.text": "Hier sind gute Radarmessungen mit Sentinel‑1 wahrscheinlich.",
    "verdict.mid.title": "Eingeschränkt geeignet",
    "verdict.mid.text": "Messungen sind möglich, die Ergebnisse sollten aber mit Vorsicht interpretiert werden.",
    "verdict.bad.title": "Schwierig",
    "verdict.bad.text": "Gute Messungen sind hier schwer zu erhalten. Ein tiefer Wert kann an der Geometrie liegen oder an einer sich rasch verändernden Oberfläche (z. B. Vegetation, Schnee oder eine Rutschung).",

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
    "modal.howToRead.green": "<strong>Vert (GMSI ≥ 0,4) :</strong> très bonnes conditions – de bonnes mesures radar sont probables ici.",
    "modal.howToRead.yellow": "<strong>Jaune (GMSI 0,2–0,4) :</strong> des mesures sont possibles, mais les résultats doivent être interprétés avec prudence.",
    "modal.howToRead.red": "<strong>Rouge (GMSI &lt; 0,2) :</strong> mauvaises conditions – de bonnes mesures sont plus difficiles à obtenir, et les mouvements peuvent être facilement manqués ou difficiles à interpréter. Les mesures ne sont toutefois pas totalement impossibles.",
    "modal.howToRead.none": "<strong>Sans couleur :</strong> aucune donnée. Il s'agit de zones en ombre radar ou avec distorsion de layover, ainsi que de zones où les images radar ne sont déjà plus comparables de manière fiable après 6&nbsp;jours.",
    "modal.redWarning.h": "Important : rouge ne signifie pas automatiquement « pas de mouvement »",
    "modal.redWarning.intro": "Une valeur GMSI basse peut avoir des causes très différentes – et la carte seule ne montre pas laquelle s'applique :",
    "modal.redWarning.li1": "La géométrie est défavorable, p.&nbsp;ex. une pente raide que le satellite ne peut pas bien observer depuis son angle de visée.",
    "modal.redWarning.li2": "La surface du sol change rapidement, de sorte que les images radar ne sont plus comparables longtemps – p.&nbsp;ex. à cause de la végétation ou de la neige, mais aussi d'un glissement qui se déplace rapidement.",
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

    "verdict.none.title": "Aucune donnée",
    "verdict.none.text": "Aucune valeur n'est disponible à cet endroit : soit hors du Valais, soit non exploitable sur aucune trajectoire (ombre radar, layover ou cohérence trop faible).",
    "verdict.good.title": "Bien adapté",
    "verdict.good.text": "De bonnes mesures radar avec Sentinel‑1 sont probables ici.",
    "verdict.mid.title": "Adapté avec réserve",
    "verdict.mid.text": "Des mesures sont possibles, mais les résultats doivent être interprétés avec prudence.",
    "verdict.bad.title": "Difficile",
    "verdict.bad.text": "De bonnes mesures sont difficiles à obtenir ici. Une valeur basse peut être due à la géométrie ou à une surface qui change rapidement (p. ex. végétation, neige ou glissement).",

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
    "modal.howToRead.green": "<strong>Green (GMSI ≥ 0.4):</strong> very good conditions – good radar measurements are likely here.",
    "modal.howToRead.yellow": "<strong>Yellow (GMSI 0.2–0.4):</strong> measurements are possible, but results should be interpreted with caution.",
    "modal.howToRead.red": "<strong>Red (GMSI &lt; 0.2):</strong> poor conditions – good measurements are harder to obtain, and movements can be easily missed or difficult to interpret. Measurements are not entirely impossible, though.",
    "modal.howToRead.none": "<strong>No colour:</strong> no data. These are areas in radar shadow or with layover distortion, as well as areas where the radar images are no longer reliably comparable after just 6&nbsp;days.",
    "modal.redWarning.h": "Important: red doesn't automatically mean “no movement”",
    "modal.redWarning.intro": "A low GMSI value can have very different causes – and the map alone doesn't show which one applies:",
    "modal.redWarning.li1": "The geometry is unfavourable, e.&nbsp;g. a steep slope that the satellite cannot see well from its viewing angle.",
    "modal.redWarning.li2": "The ground surface changes quickly, so the radar images stop being comparable soon – e.&nbsp;g. due to vegetation or snow, but also due to a landslide that is moving fast.",
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

    "verdict.none.title": "No data",
    "verdict.none.text": "No values are available at this location: either outside Valais or not evaluable on any track (radar shadow, layover, or too little coherence).",
    "verdict.good.title": "Well suited",
    "verdict.good.text": "Good radar measurements with Sentinel‑1 are likely here.",
    "verdict.mid.title": "Suited with caveats",
    "verdict.mid.text": "Measurements are possible, but results should be interpreted with caution.",
    "verdict.bad.title": "Difficult",
    "verdict.bad.text": "Good measurements are hard to obtain here. A low value can be due to the geometry or to a rapidly changing surface (e.g. vegetation, snow or a landslide).",

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
