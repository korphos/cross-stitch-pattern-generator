import type enUS from './en-US'

const deDE: typeof enUS = {
  seo: {
    title: 'Kreuzstich-Musterprogramm — verwandle jedes Foto in ein DMC-Muster',
    description:
      'Kostenloses Online-Werkzeug für Kreuzstichmuster: verwandelt jedes Foto in eine druckbare Stickvorlage mit automatischer DMC-Garnzuordnung, Palettenbearbeitung und PDF-Export. Keine Anmeldung nötig, läuft komplett im Browser.',
  },
  common: {
    close: 'Schließen',
    done: 'Fertig',
    edit: 'Bearbeiten',
    searchPlaceholder: 'Nach Code oder Name suchen...',
    noMatches: 'Keine Treffer',
    allThreads: 'Alle Garne',
    ownedOnly: 'Nur eigene',
    ownedTitle: 'Dieses Garn besitzt du bereits',
    ownedBadge: '✓ vorhanden',
    ownedLabel: 'vorhanden',
    dismiss: 'Verwerfen',
    transparent: 'Transparent',
    deltaE: 'ΔE {{value}}',
    colors: 'Farben',
    colorsCount_one: '{{count}} Farbe',
    colorsCount_other: '{{count}} Farben',
    loading: 'Lädt…',
  },
  errors: {
    imageLoadGeneric: 'Fehler beim Laden des Bildes',
    importGeneric: 'Fehler beim Importieren der Projektdatei',
    imageDecodeFailed: 'Das Bild konnte nicht geladen werden',
    canvasUnavailable: 'Dein Browser unterstützt die für die Bildverarbeitung nötigen Funktionen nicht (2D-Canvas nicht verfügbar)',
    invalidJson: 'Diese Datei ist keine gültige Projektdatei (ungültiges JSON).',
    invalidProjectFile: 'Diese Datei ist keine gültige Projektdatei.',
    missingProjectData: 'Dieser Datei fehlen Daten, die in einer Kreuzstich-Projektdatei erwartet werden.',
  },
  app: {
    sharedSettingsNotice: 'Einstellungen aus einem geteilten Link importiert (eigene Garne, Größeneinheit).',
  },
  confirmDestructive: {
    message_one:
      'Du hast {{count}} ungespeicherte manuelle Farbänderung, die beim Fortfahren verworfen wird. Fortfahren?',
    message_other:
      'Du hast {{count}} ungespeicherte manuelle Farbänderungen, die beim Fortfahren verworfen werden. Fortfahren?',
  },
  header: {
    replaceImage: 'Bild ersetzen',
    undo: 'Rückgängig',
    undoTitle: 'Rückgängig (Strg+Z)',
    redo: 'Wiederholen',
    redoTitle: 'Wiederholen (Strg+Y)',
    print: 'Drucken',
    import: 'Importieren',
    export: 'Exportieren',
    exportTitle: 'Aktuelles Projekt als Datei exportieren',
    settings: 'Einstellungen',
  },
  tabBar: {
    palette: 'Palette',
    grid: 'Gitter',
  },
  uploadDropzone: {
    dragDrop: 'Ein bereits pixeliges Bild hierher ziehen, oder',
    chooseFile: 'Datei auswählen',
    analyzing: 'Bild wird analysiert...',
  },
  gridControls: {
    title: 'Gitter',
    helper:
      'Passe bei Bedarf Versatz und Zellgröße an: Ziehe an einem Eckgriff, um die Größe zu ändern (Stiche bleiben quadratisch), ziehe an einer anderen Stelle im Bild, um das ganze Gitter zu verschieben, oder nutze die Felder unten.',
    offsetX: 'Versatz X (px)',
    offsetY: 'Versatz Y (px)',
    cellSize: 'Zellgröße (px)',
    columns: 'Spalten',
    rows: 'Zeilen',
    samplePointOffset: 'Versatz des Abtastpunkts',
    samplePointInfo:
      'Von wo innerhalb der Zelle die Farbe jedes Stichs gelesen wird, statt von der genauen Mitte - etwa bei einem Perlenmuster-Foto, wo die Ringfarbe aussagekräftiger ist als der Lichtreflex in der Mitte. Wird als rosa Punkte im Bild angezeigt. Auf eine halbe Zelle in jede Richtung begrenzt.',
    sampleOffsetX: 'Abtastversatz X (px)',
    sampleOffsetY: 'Abtastversatz Y (px)',
    confidence: 'Sicherheit der automatischen Erkennung: {{percent}}%',
    redetect: 'Automatisch neu erkennen',
    flipHorizontal: 'Horizontal spiegeln',
  },
  gridPanel: {
    imageAlt: 'Quellbild',
  },
  palettePanel: {
    title: 'Palette',
    mergeSimilar: 'Ähnliche Farben zusammenführen',
    ignoreTransparentBackground: 'Transparenten Hintergrund ignorieren',
    ignoreBackgroundColor: 'Hintergrundfarbe ignorieren',
    colorsToUse: 'Zu verwendende Farben',
    bestMatch: 'Bestmögliche Übereinstimmung',
    ownedOnlyMode: 'Nur meine Garne',
    noInventoryWarning:
      'Noch keine Garne als eigen markiert - füge welche in den Einstellungen hinzu, sonst verhält sich dieser Modus wie "Bestmögliche Übereinstimmung".',
    fabricCount: 'Stoffzählung',
    strands: 'Fäden',
    strandCount_one: '{{count}} Faden',
    strandCount_other: '{{count}} Fäden',
    stats: 'Statistik',
    dimensions: 'Abmessungen',
    stitchesDimension: '{{cols}} × {{rows}} Stiche',
    approxSize: 'Ungefähre Größe',
    threadNeeded: 'Benötigtes Garn',
    skeins_one: '{{count}} Strang',
    skeins_other: '{{count}} Stränge',
    needToBuy: 'Noch zu kaufen',
    estimateNote: 'Die Garnschätzung ist ungefähr - kaufe von jeder Farbe etwas mehr.',
  },
  fabricCounts: {
    aida11: 'Aida 11 fädig',
    aida14: 'Aida 14 fädig',
    aida16: 'Aida 16 fädig',
    aida18: 'Aida 18 fädig',
    aida22: 'Aida 22 fädig',
  },
  dmcColorList: {
    pickColorTitle: 'Eine Farbe aus dem Originalfoto auswählen',
    addColor: '+ Farbe hinzufügen',
    ownedTitle: 'In deinem Garnbestand',
  },
  addColorDialog: {
    title: 'Farbe hinzufügen',
    helper:
      'Fügt das Garn zur Palette hinzu, ohne dass noch ein Stich zugewiesen ist - klicke danach auf einen Pixel im Bild, um es zuzuweisen.',
  },
  colorEditDialog: {
    removeColor: 'Farbe entfernen',
    removeHelper:
      '"Farbe entfernen" lässt jeden "{{symbol}}"-Stich leer (keine Füllung, kein Symbol) - nützlich für einen Hintergrund, den du nicht besticken willst.',
    standardAlternative: 'Standard-Alternative verfügbar: ',
    shinyAlternative: 'Glänzende Alternative verfügbar: ',
    switch: 'Wechseln',
    replaceTitle: 'Durch eine andere, bereits in diesem Muster vorhandene Farbe ersetzen',
    replaceHelper: 'Jeder "{{symbol}}"-Stich wird zu dieser Farbe, und "{{symbol}}" verschwindet aus der Palette.',
    changeTitle: 'Zu einem anderen DMC-Garn wechseln',
  },
  eyedropperDialog: {
    title: 'Eine Farbe aus dem Foto auswählen',
    helper:
      'Zoome (mit den Schaltflächen oder Strg/Cmd+Scrollen), ziehe mit der mittleren Maustaste, um dich zu bewegen, und klicke dann auf einen Pixel im Originalfoto, um das nächstliegende DMC-Garn zu finden, oder wähle stattdessen ein visuell ähnliches Garn.',
    imageAlt: 'Originalfoto',
    pickedLabel: 'Gewählte Farbe - wähle unten die nächstliegende Übereinstimmung oder ein ähnliches Garn:',
  },
  cellEditPopover: {
    cellLabel: 'Zelle (Spalte {{col}}, Zeile {{row}}):',
    cellsSelected_one: '{{count}} Zelle ausgewählt:',
    cellsSelected_other: '{{count}} Zellen ausgewählt:',
    noStitchTitle: 'Kein Stich (leer)',
  },
  legend: {
    title_one: 'DMC-Palette — {{count}} Farbe | {{cols}}×{{rows}} Stiche',
    title_other: 'DMC-Palette — {{count}} Farben | {{cols}}×{{rows}} Stiche',
    metallic: '(Metallic)',
  },
  printablePage: {
    dimensionsFabric: '{{cols}}×{{rows}} Stiche — {{size}} auf {{fabric}}',
    skeinsTotal_one: '~{{count}} Strang insgesamt',
    skeinsTotal_other: '~{{count}} Stränge insgesamt',
    strandsParen_one: '({{count}} Faden)',
    strandsParen_other: '({{count}} Fäden)',
  },
  settingsPage: {
    back: '← Zurück',
    title: 'Einstellungen',
    language: 'Sprache',
    sizeUnit: 'Größeneinheit',
    centimeters: 'Zentimeter',
    inches: 'Zoll',
    shareSettings: 'Einstellungen teilen',
    shareHelp:
      'Kopiere einen Link, der deine eigenen Garne und deine Größeneinheit enthält. Öffnest du ihn auf einem anderen Gerät (z. B. deinem Handy), ersetzt er dessen Einstellungen durch diese - keine Import-/Exportdatei nötig.',
    copyShareLink: 'Freigabelink kopieren',
    copied: 'Kopiert!',
    myThreads: 'Meine DMC-Garne',
    ownedCount: '{{owned}} / {{total}} vorhanden',
    threadsHelp:
      'Markiere die Garne, die du bereits besitzt. Der Palettenmodus "Nur meine Garne" bevorzugt diese beim Erstellen eines Musters. Enthält Standard-Sticktwist sowie Light Effects-Metallics und Satin-Garne, die als glänzende Alternativen zu einer ähnlichen Standardfarbe vorgeschlagen werden können.',
    metallicSatin: 'Metallic & Satin',
  },
  zoomControls: {
    showGridSymbols: 'Gitter und Symbole anzeigen',
    hideGridSymbols: 'Gitter und Symbole ausblenden (Vorschau)',
    zoomOut: 'Verkleinern',
    resetZoom: 'Zoom zurücksetzen',
    zoomIn: 'Vergrößern',
  },
}

export default deDE
