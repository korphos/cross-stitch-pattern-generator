import type enUS from './en-US'

const esES: typeof enUS = {
  seo: {
    title: 'Generador de patrones de punto de cruz — convierte cualquier foto en un patrón DMC',
    description:
      'Creador de patrones de punto de cruz gratuito y en línea: convierte cualquier foto en una tabla imprimible con correspondencia automática de hilos DMC, edición de la paleta y exportación a PDF. Sin registro, todo ocurre en tu navegador.',
  },
  common: {
    close: 'Cerrar',
    done: 'Listo',
    edit: 'Editar',
    searchPlaceholder: 'Buscar por código o nombre...',
    noMatches: 'Sin resultados',
    allThreads: 'Todos los hilos',
    ownedOnly: 'Solo los que tengo',
    ownedTitle: 'Ya tienes este hilo',
    ownedBadge: '✓ tengo',
    ownedLabel: 'tengo',
    dismiss: 'Descartar',
    transparent: 'Transparente',
    deltaE: 'ΔE {{value}}',
    colors: 'Colores',
    colorsCount_one: '{{count}} color',
    colorsCount_other: '{{count}} colores',
    loading: 'Cargando…',
  },
  errors: {
    imageLoadGeneric: 'Error al cargar la imagen',
    importGeneric: 'Error al importar el archivo de proyecto',
    imageDecodeFailed: 'No se pudo cargar la imagen',
    canvasUnavailable: 'Tu navegador no admite las funciones necesarias para procesar imágenes (canvas 2D no disponible)',
    invalidJson: 'Este archivo no es un archivo de proyecto válido (JSON inválido).',
    invalidProjectFile: 'Este archivo no es un archivo de proyecto válido.',
    missingProjectData: 'A este archivo le faltan datos esperados en un archivo de proyecto de punto de cruz.',
  },
  app: {
    sharedSettingsNotice: 'Ajustes importados desde un enlace compartido (hilos que tienes, unidad de tamaño).',
    cropAppliedBanner: 'Imagen recortada.',
  },
  confirmDestructive: {
    message_one:
      'Tienes {{count}} cambio de color manual sin guardar que se perderá si continúas. ¿Continuar?',
    message_other:
      'Tienes {{count}} cambios de color manuales sin guardar que se perderán si continúas. ¿Continuar?',
  },
  header: {
    replaceImage: 'Reemplazar imagen',
    undo: 'Deshacer',
    undoTitle: 'Deshacer (Ctrl+Z)',
    redo: 'Rehacer',
    redoTitle: 'Rehacer (Ctrl+Y)',
    print: 'Imprimir',
    import: 'Importar',
    export: 'Exportar',
    exportTitle: 'Exportar el proyecto actual como archivo',
    settings: 'Ajustes',
  },
  tabBar: {
    palette: 'Paleta',
    grid: 'Cuadrícula',
    crop: 'Recortar',
  },
  uploadDropzone: {
    dragDrop: 'Arrastra y suelta aquí una imagen ya pixelada, o',
    chooseFile: 'Elegir un archivo',
    analyzing: 'Analizando la imagen...',
  },
  gridControls: {
    title: 'Cuadrícula',
    helper:
      'Ajusta el desplazamiento y el tamaño de celda si hace falta: arrastra una esquina para redimensionar (las puntadas siguen siendo cuadradas), arrastra en cualquier otro punto de la imagen para mover toda la cuadrícula, o usa los campos de abajo.',
    offsetX: 'Desplazamiento X (px)',
    offsetY: 'Desplazamiento Y (px)',
    cellSize: 'Tamaño de celda (px)',
    columns: 'Columnas',
    rows: 'Filas',
    samplePointOffset: 'Desplazamiento del punto de muestreo',
    samplePointInfo:
      'El punto dentro de cada celda desde el que se lee el color de la puntada, en vez del centro exacto - por ejemplo para una foto de un patrón de mostacillas donde el color del borde se lee mejor que el reflejo central. Se muestra como puntos rosas en la imagen. Limitado a media celda en cada dirección.',
    sampleOffsetX: 'Desplazamiento de muestreo X (px)',
    sampleOffsetY: 'Desplazamiento de muestreo Y (px)',
    confidence: 'Confianza de la detección automática: {{percent}}%',
    redetect: 'Detectar de nuevo automáticamente',
    flipHorizontal: 'Voltear horizontalmente',
    pixelGridTitle: 'Cuadrícula píxel a píxel',
    pixelGridHelp:
      'Para una imagen ya pixelada donde cada punto es un bloque conocido de píxeles de origen (por ejemplo 1 píxel, o un bloque de 4x4 o 9 píxeles) - evita por completo la detección automática, que no tiene nada con qué trabajar en una imagen tan pequeña.',
    pixelsPerStitch: 'Píxeles por punto',
    applyPixelGrid: 'Aplicar',
  },
  gridPanel: {
    imageAlt: 'Imagen de origen',
  },
  cropControls: {
    title: 'Recortar',
    helper:
      'Arrastra la selección para moverla, o su asa de esquina para redimensionarla. Al aplicar se vuelve a detectar la cuadrícula y se vuelve a muestrear el color solo dentro de la selección - una forma circular recorta todo lo que quede fuera del círculo.',
    shape: 'Forma',
    shapeSquare: 'Cuadrado',
    shapeCircle: 'Círculo',
    apply: 'Aplicar recorte',
    appliedNote: 'La imagen ya se ha recortado una vez - aplicar de nuevo recorta aún más la imagen actual.',
    undo: 'Deshacer recorte',
  },
  cropPanel: {
    imageAlt: 'Imagen para recortar',
  },
  palettePanel: {
    title: 'Paleta',
    mergeSimilar: 'Fusionar colores similares',
    ignoreTransparentBackground: 'Ignorar el fondo transparente',
    ignoreBackgroundColor: 'Ignorar el color de fondo',
    colorsToUse: 'Colores a usar',
    bestMatch: 'Mejor coincidencia posible',
    ownedOnlyMode: 'Solo mis hilos',
    noInventoryWarning:
      'Todavía no marcaste ningún hilo como propio - añade algunos en Ajustes, si no este modo se comporta como "Mejor coincidencia posible".',
    fabricCount: 'Cuenta de la tela',
    strands: 'Hebras',
    strandCount_one: '{{count}} hebra',
    strandCount_other: '{{count}} hebras',
    stats: 'Estadísticas',
    dimensions: 'Dimensiones',
    stitchesDimension: '{{cols}} × {{rows}} puntadas',
    approxSize: 'Tamaño aproximado',
    threadNeeded: 'Hilo necesario',
    skeins_one: '{{count}} madeja',
    skeins_other: '{{count}} madejas',
    needToBuy: 'Falta comprar',
    estimateNote: 'La estimación de hilo es aproximada - compra un poco más de cada color.',
  },
  fabricCounts: {
    aida11: 'Aida cuenta 11',
    aida14: 'Aida cuenta 14',
    aida16: 'Aida cuenta 16',
    aida18: 'Aida cuenta 18',
    aida22: 'Aida cuenta 22',
  },
  dmcColorList: {
    pickColorTitle: 'Elegir un color de la foto original',
    addColor: '+ Añadir color',
    ownedTitle: 'En tu inventario de hilos',
  },
  addColorDialog: {
    title: 'Añadir un color',
    helper:
      'Añade el hilo a la paleta sin ninguna puntada asignada todavía - haz clic después en un píxel del lienzo para asignarlo.',
  },
  colorEditDialog: {
    removeColor: 'Quitar color',
    removeHelper:
      '"Quitar color" deja cada puntada "{{symbol}}" en blanco (sin relleno ni símbolo) - útil para un fondo que no quieres bordar.',
    standardAlternative: 'Alternativa estándar disponible: ',
    shinyAlternative: 'Alternativa brillante disponible: ',
    switch: 'Cambiar',
    replaceTitle: 'Reemplazar con otro color ya presente en este patrón',
    replaceHelper: 'Cada puntada "{{symbol}}" pasa a este color, y "{{symbol}}" desaparece de la paleta.',
    changeTitle: 'Cambiar a otro hilo DMC',
  },
  eyedropperDialog: {
    title: 'Elegir un color de la foto',
    helper:
      'Haz zoom (con los botones, o Ctrl/Cmd+rueda), arrastra con el clic central para desplazarte, y luego haz clic en un píxel de la foto original para encontrar su hilo DMC más cercano, o elige cualquier hilo visualmente similar.',
    imageAlt: 'Foto original',
    pickedLabel: 'Color elegido - selecciona la coincidencia más cercana o un hilo similar abajo:',
  },
  cellEditPopover: {
    cellLabel: 'Celda (col {{col}}, fila {{row}}):',
    cellsSelected_one: '{{count}} celda seleccionada:',
    cellsSelected_other: '{{count}} celdas seleccionadas:',
    noStitchTitle: 'Sin puntada (vacío)',
  },
  legend: {
    title_one: 'Paleta DMC — {{count}} color | {{cols}}×{{rows}} puntadas',
    title_other: 'Paleta DMC — {{count}} colores | {{cols}}×{{rows}} puntadas',
    metallic: '(Metálico)',
  },
  printablePage: {
    dimensionsFabric: '{{cols}}×{{rows}} puntadas — {{size}} en {{fabric}}',
    skeinsTotal_one: '~{{count}} madeja en total',
    skeinsTotal_other: '~{{count}} madejas en total',
    strandsParen_one: '({{count}} hebra)',
    strandsParen_other: '({{count}} hebras)',
  },
  settingsPage: {
    back: '← Volver',
    title: 'Ajustes',
    language: 'Idioma',
    sizeUnit: 'Unidad de tamaño',
    centimeters: 'Centímetros',
    inches: 'Pulgadas',
    shareSettings: 'Compartir ajustes',
    shareHelp:
      'Copia un enlace que lleva tus hilos y tu unidad de tamaño. Al abrirlo en otro dispositivo (por ejemplo tu teléfono) reemplaza sus ajustes por estos - no hace falta ningún archivo de importación/exportación.',
    copyShareLink: 'Copiar enlace para compartir',
    copied: '¡Copiado!',
    myThreads: 'Mis hilos DMC',
    ownedCount: '{{owned}} / {{total}} en tu poder',
    threadsHelp:
      'Marca los hilos que ya tienes. El modo de paleta "Solo mis hilos" los preferirá al generar un patrón. Incluye el hilo mouliné estándar además de los metálicos Light Effects y los hilos Satin, que pueden sugerirse como alternativas brillantes a un color estándar cercano.',
    metallicSatin: 'Metálico y Satin',
  },
  zoomControls: {
    showGridSymbols: 'Mostrar cuadrícula y símbolos',
    hideGridSymbols: 'Ocultar cuadrícula y símbolos (vista previa)',
    zoomOut: 'Alejar',
    resetZoom: 'Restablecer zoom',
    zoomIn: 'Acercar',
  },
}

export default esES
