import type enUS from './en-US'

const frFR: typeof enUS = {
  seo: {
    title: 'Générateur de grille de point de croix — transformez une photo en modèle DMC',
    description:
      'Créateur de grille de point de croix gratuit et en ligne : transformez une photo en grille imprimable avec correspondance automatique des fils DMC, édition de la palette et export PDF. Sans inscription, tout se passe dans votre navigateur.',
  },
  common: {
    close: 'Fermer',
    done: 'Terminé',
    edit: 'Modifier',
    searchPlaceholder: 'Rechercher par code ou nom...',
    noMatches: 'Aucun résultat',
    allThreads: 'Tous les fils',
    ownedOnly: 'Possédés uniquement',
    ownedTitle: 'Vous possédez ce fil',
    ownedBadge: '✓ possédé',
    ownedLabel: 'possédé',
    dismiss: 'Ignorer',
    transparent: 'Transparent',
    deltaE: 'ΔE {{value}}',
    colors: 'Couleurs',
    colorsCount_one: '{{count}} couleur',
    colorsCount_other: '{{count}} couleurs',
    loading: 'Chargement…',
  },
  errors: {
    imageLoadGeneric: "Erreur lors du chargement de l'image",
    importGeneric: "Erreur lors de l'importation du fichier de projet",
    imageDecodeFailed: "Impossible de charger l'image",
    canvasUnavailable:
      "Votre navigateur ne prend pas en charge les fonctionnalités nécessaires au traitement des images (canvas 2D indisponible)",
    invalidJson: "Ce fichier n'est pas un fichier de projet valide (JSON invalide).",
    invalidProjectFile: "Ce fichier n'est pas un fichier de projet valide.",
    missingProjectData: 'Ce fichier ne contient pas les données attendues pour un fichier de projet de point de croix.',
  },
  app: {
    sharedSettingsNotice: 'Paramètres importés depuis un lien partagé (fils possédés, unité de taille).',
  },
  confirmDestructive: {
    message_one:
      'Vous avez {{count}} modification de couleur non enregistrée qui sera perdue si vous continuez. Continuer ?',
    message_other:
      'Vous avez {{count}} modifications de couleur non enregistrées qui seront perdues si vous continuez. Continuer ?',
  },
  header: {
    replaceImage: "Remplacer l'image",
    undo: 'Annuler',
    undoTitle: 'Annuler (Ctrl+Z)',
    redo: 'Rétablir',
    redoTitle: 'Rétablir (Ctrl+Y)',
    print: 'Imprimer',
    import: 'Importer',
    export: 'Exporter',
    exportTitle: 'Exporter le projet actuel sous forme de fichier',
    settings: 'Paramètres',
  },
  tabBar: {
    palette: 'Palette',
    grid: 'Grille',
  },
  uploadDropzone: {
    dragDrop: 'Glissez-déposez ici une image déjà pixelisée, ou',
    chooseFile: 'Choisir un fichier',
    analyzing: "Analyse de l'image...",
  },
  gridControls: {
    title: 'Grille',
    helper:
      "Ajustez le décalage et la taille des cellules si besoin : faites glisser une poignée d'angle pour redimensionner (les mailles restent carrées), faites glisser ailleurs sur l'image pour déplacer toute la grille, ou utilisez les champs ci-dessous.",
    offsetX: 'Décalage X (px)',
    offsetY: 'Décalage Y (px)',
    cellSize: 'Taille de cellule (px)',
    columns: 'Colonnes',
    rows: 'Lignes',
    samplePointOffset: "Décalage du point d'échantillonnage",
    samplePointInfo:
      "L'endroit dans la cellule où la couleur de chaque maille est lue, plutôt qu'en plein centre - par exemple pour une photo de motif en perles où la couleur de l'anneau est plus fidèle que le reflet central. Affiché par des points roses sur l'image. Limité à un demi-cellule dans chaque direction.",
    sampleOffsetX: "Décalage d'échantillonnage X (px)",
    sampleOffsetY: "Décalage d'échantillonnage Y (px)",
    confidence: 'Confiance de la détection automatique : {{percent}} %',
    redetect: 'Redétecter automatiquement',
    flipHorizontal: 'Retourner horizontalement',
  },
  gridPanel: {
    imageAlt: 'Motif source',
  },
  palettePanel: {
    title: 'Palette',
    mergeSimilar: 'Fusionner les couleurs similaires',
    ignoreTransparentBackground: 'Ignorer le fond transparent',
    ignoreBackgroundColor: 'Ignorer la couleur de fond',
    colorsToUse: 'Couleurs à utiliser',
    bestMatch: 'Meilleure correspondance possible',
    ownedOnlyMode: 'Uniquement mes fils',
    noInventoryWarning:
      "Aucun fil marqué comme possédé pour l'instant - ajoutez-en dans les Paramètres, sinon ce mode se comporte comme « Meilleure correspondance possible ».",
    fabricCount: 'Nombre de fils (toile)',
    strands: 'Brins',
    strandCount_one: '{{count}} brin',
    strandCount_other: '{{count}} brins',
    stats: 'Statistiques',
    dimensions: 'Dimensions',
    stitchesDimension: '{{cols}} × {{rows}} mailles',
    approxSize: 'Taille approximative',
    threadNeeded: 'Fil nécessaire',
    skeins_one: '{{count}} écheveau',
    skeins_other: '{{count}} écheveaux',
    needToBuy: 'À acheter',
    estimateNote: "L'estimation de fil est approximative - prévoyez un peu plus de chaque couleur.",
  },
  fabricCounts: {
    aida11: 'Aida 11 fils',
    aida14: 'Aida 14 fils',
    aida16: 'Aida 16 fils',
    aida18: 'Aida 18 fils',
    aida22: 'Aida 22 fils',
  },
  dmcColorList: {
    pickColorTitle: "Choisir une couleur depuis la photo d'origine",
    addColor: '+ Ajouter une couleur',
    ownedTitle: 'Dans votre stock de fils',
  },
  addColorDialog: {
    title: 'Ajouter une couleur',
    helper:
      "Ajoute le fil à la palette sans aucune maille assignée - cliquez ensuite sur un pixel du motif pour l'assigner.",
  },
  colorEditDialog: {
    removeColor: 'Supprimer la couleur',
    removeHelper:
      '« Supprimer la couleur » laisse chaque maille « {{symbol}} » vide (sans remplissage ni symbole) - utile pour un fond que vous ne souhaitez pas broder.',
    standardAlternative: 'Alternative standard disponible : ',
    shinyAlternative: 'Alternative brillante disponible : ',
    switch: 'Changer',
    replaceTitle: 'Remplacer par une autre couleur déjà présente dans ce motif',
    replaceHelper: 'Chaque maille « {{symbol}} » devient cette couleur, et « {{symbol}} » disparaît de la palette.',
    changeTitle: 'Changer pour un autre fil DMC',
  },
  eyedropperDialog: {
    title: 'Choisir une couleur depuis la photo',
    helper:
      "Zoomez (boutons, ou Ctrl/Cmd+molette), faites glisser avec le clic molette pour vous déplacer, puis cliquez sur un pixel de la photo d'origine pour trouver le fil DMC le plus proche, ou choisissez un fil visuellement similaire.",
    imageAlt: "Photo d'origine",
    pickedLabel: 'Couleur choisie - sélectionnez la correspondance la plus proche ou un fil similaire ci-dessous :',
  },
  cellEditPopover: {
    cellLabel: 'Cellule (col {{col}}, ligne {{row}}) :',
    cellsSelected_one: '{{count}} cellule sélectionnée :',
    cellsSelected_other: '{{count}} cellules sélectionnées :',
    noStitchTitle: 'Aucune maille (vide)',
  },
  legend: {
    title_one: 'Palette DMC — {{count}} couleur | {{cols}}×{{rows}} mailles',
    title_other: 'Palette DMC — {{count}} couleurs | {{cols}}×{{rows}} mailles',
    metallic: '(Métallique)',
  },
  printablePage: {
    dimensionsFabric: '{{cols}}×{{rows}} mailles — {{size}} sur {{fabric}}',
    skeinsTotal_one: '~{{count}} écheveau au total',
    skeinsTotal_other: '~{{count}} écheveaux au total',
    strandsParen_one: '({{count}} brin)',
    strandsParen_other: '({{count}} brins)',
  },
  settingsPage: {
    back: '← Retour',
    title: 'Paramètres',
    language: 'Langue',
    sizeUnit: 'Unité de taille',
    centimeters: 'Centimètres',
    inches: 'Pouces',
    shareSettings: 'Partager les paramètres',
    shareHelp:
      "Copiez un lien qui transporte vos fils possédés et votre unité de taille. L'ouvrir sur un autre appareil (par ex. votre téléphone) remplace ses paramètres par ceux-ci - aucun fichier d'import/export nécessaire.",
    copyShareLink: 'Copier le lien de partage',
    copied: 'Copié !',
    myThreads: 'Mes fils DMC',
    ownedCount: '{{owned}} / {{total}} possédés',
    threadsHelp:
      "Cochez les fils que vous possédez déjà. Le mode de palette « Uniquement mes fils » les privilégiera lors de la génération d'un motif. Inclut le fil mouliné standard ainsi que les métalliques Light Effects et les fils Satin, qui peuvent être proposés comme alternatives brillantes à une couleur standard proche.",
    metallicSatin: 'Métallique et Satin',
  },
  zoomControls: {
    showGridSymbols: 'Afficher la grille et les symboles',
    hideGridSymbols: 'Masquer la grille et les symboles (aperçu)',
    zoomOut: 'Dézoomer',
    resetZoom: 'Réinitialiser le zoom',
    zoomIn: 'Zoomer',
  },
}

export default frFR
