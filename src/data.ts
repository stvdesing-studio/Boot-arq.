import { StructurePreset, ImageModel, AspectRatio } from "./types";

export const STYLE_OPTIONS = [
  { id: "recip_frame", name: "Estructura Recíproca Paramétrica", desc: "Varillas metálicas autoportantes donde cada elemento se apoya sobre el siguiente creando un patrón geométrico helicoidal." },
  { id: "tensegrity", name: "Tensegridad Escultórica Suspensa", desc: "Elementos rígidos flotando en aparente ingravidez, traccionados exclusivamente mediante finos cables de acero de alta tensión." },
  { id: "space_frame", name: "Cercha Espacial Deconstructivista", desc: "Entramado tridimensional rígido de barras y nodos de acero que forman voladizos y pliegues poliédricos audaces." },
  { id: "grid_dome", name: "Cúpula Reticular Sinecléctica", desc: "Cascarón autoportante de geometría geodésica hexagonal con perfiles de acero huecos extruidos e interconectados." },
  { id: "voronoi_skeleton", name: "Esqueleto Isógrido Voronoi", desc: "Malla metalúrgica orgánica calculada paramétricamente imitando patrones de crecimiento celular y optimas líneas de fuerza." },
  { id: "corten_folds", name: "Plegaduras de Acero Corten Deconstructivas", desc: "Enormes planos facetados de metal oxidado que se intersectan formando ángulos agudos y desequilibrios estéticos dinámicos." },
  { id: "cantilever_minimal", name: "Voladizo Minimalista Extruido", desc: "Páramo de vigas y perfiles I-beam proyectados al vacío de manera extrema, desafiando la gravedad con contrapesos masivos ocultos." }
];

export const FINISH_OPTIONS = [
  { id: "stainless_mirror", name: "Acero Inoxidable Pulido Espejo", desc: "Máxima especularidad que duplica y deforma el entorno en sus caras cromadas." },
  { id: "corten_matte", name: "Acero Corten Pre-oxidado Texturizado", desc: "Textura áspera, aterciopelada y orgánica con ricas variaciones de óxido naranja y bermellón." },
  { id: "titanium_iridescent", name: "Titanio Anodizado Iridiscente", desc: "Superficie de aleación aeroespacial que cambia de magenta a azul cobalto según el ángulo de incidencia de la luz." },
  { id: "raw_iron", name: "Hierro Forjado Industrial Negro Mate", desc: "Acabado de fragua crudo, con imperfecciones de laminado y juntas de soldadura rústica expuesta." },
  { id: "liquid_chrome", name: "Cromo Líquido de Alta Reflexión", desc: "Superficie distorsionada de metal fluido futurista con reflejos hiper-saturados y sin imperfecciones." },
  { id: "copper_patina", name: "Cobre Envejecido con Pátina Azul/Cardenillo", desc: "Tonalidad verdosa profunda y texturas calcáreas contrastadas con destellos rojizos de cobre original." }
];

export const ENVIRONMENT_OPTIONS = [
  { id: "salt_flats", name: "Salar Blanco Infinito", desc: "Un desierto de sal perfectamente llano y agrietado con un horizonte nítido de 360 grados bajo una atmósfera despejada." },
  { id: "brutalist_plaza", name: "Plaza Brutalista de Hormigón", desc: "Una explanada monumental de concreto martillado gris con muros imponentes que acentúan la ligereza de la estructura metálica." },
  { id: "foggy_cliffs", name: "Acantilado Nebuloso sobre el Océano", desc: "Una costa escarpada rodeada de bruma gélida donde las olas rompen en rocas oscuras y húmedas." },
  { id: "black_volcanic", name: "Plataforma de Observación de Lava Negra", desc: "Arena volcánica basáltica oscura combinada con vapor geotérmico ascendente que crea un fuerte contraste cromático." },
  { id: "zen_gravel", name: "Jardín Zen de Grava Gris y Rocas", desc: "Un patio minimalista con surcos concéntricos de arena fina donde se erige la escultura geométrica." },
  { id: "deep_space", name: "Vacío Interestelar Negro Absoluto", desc: "El espacio cósmico profundo, sin gravedad, iluminado por nebulosas lejanas y polvo estelar suspendido." }
];

export const LIGHTING_OPTIONS = [
  { id: "sunset_glare", name: "Luz Dorada de Atardecer Rasante", desc: "Rayos de sol de ángulo bajo que encienden las caras metálicas de color naranja fuego, proyectando sombras infinitas." },
  { id: "cold_blue_mist", name: "Niebla Azul Volumétrica y Fría", desc: "Filtro lumínico invernal, de baja saturación con rayos crepusculares difusos que rebotan espectralmente en el metal." },
  { id: "dramatic_storm", name: "Claroscuro de Tormenta Eléctrica", desc: "Cielo plomizo de tempestad con un destello potente que recorta la silueta metálica en un contraluz de alto impacto." },
  { id: "studio_high_contrast", name: "Iluminación de Estudio Ciclorama Blanco", desc: "Fotografía de catálogo impecable con paneles de luz difusa cenital y suaves sombras de contacto en el suelo." },
  { id: "cyberpunk_neon", name: "Luces de Neón Cyberpunk Reflejadas", desc: "Estética nocturna de lluvia goteante con luces fluorescentes rosa, cian y carmín tiñendo cromáticamente las caras del acero." }
];

export const MODEL_OPTIONS = [
  { id: "gemini-3.1-flash-lite-image", name: "Gemini 3.1 Flash Lite Image", desc: "Modelo de última generación rápido, versátil e ideal para composición abstracta de metales." },
  { id: "gemini-3.1-flash-image", name: "Gemini 3.1 Flash Image (PAGO)", desc: "Generación de alta calidad técnica con mayor finura en detalles y textura metálica realista. (Requiere clave de pago)." },
  { id: "imagen-4.0-generate-001", name: "Imagen 4.0 Pro (PAGO)", desc: "La cúspide en realismo fotográfico y renderizado arquitectónico espacial. Excelente lectura de prompts complejos. (Requiere clave de pago)." }
];

export const DEFAULT_PRESETS: StructurePreset[] = [
  {
    id: "preset-1",
    name: "Templo Reticular Recíproco",
    description: "Una imponente bóveda helicoidal cuyos perfiles de acero inoxidable pulido se apoyan mutuamente sobre una plaza brutalista al atardecer.",
    style: "Estructura Recíproca Paramétrica",
    finish: "Acero Inoxidable Pulido Espejo",
    environment: "Plaza Brutalista de Hormigón",
    lighting: "Luz Dorada de Atardecer Rasante",
    density: "alta",
    complexity: 8
  },
  {
    id: "preset-2",
    name: "Nube de Tensegridad de Titanio",
    description: "Una escultura monumental ingrávida de barras de titanio de colores iridiscentes sostenida en el aire por micro-cables invisibles sobre un desierto blanco.",
    style: "Tensegridad Escultórica Suspensa",
    finish: "Titanio Anodizado Iridiscente",
    environment: "Salar Blanco Infinito",
    lighting: "Iluminación de Estudio Ciclorama Blanco",
    density: "media",
    complexity: 9
  },
  {
    id: "preset-3",
    name: "Malla Voronoi en el Acantilado",
    description: "Un mirador celular imitando patrones Voronoi hecho de acero corten oxidado, parcialmente cubierto por niebla gélida sobre un acantilado marino.",
    style: "Esqueleto Isógrido Voronoi",
    finish: "Acero Corten Pre-oxidado Texturizado",
    environment: "Acantilado Nebuloso sobre el Océano",
    lighting: "Niebla Azul Volumétrica y Fría",
    density: "baja",
    complexity: 7
  },
  {
    id: "preset-4",
    name: "Agujas Cósmicas de Hierro Negro",
    description: "Agujas deconstructivistas y uniones esféricas de hierro forjado negro mate que flotan en ángulos desequilibrados en el espacio profundo.",
    style: "Cantilever Minimalista Extruido",
    finish: "Hierro Forjado Industrial Negro Mate",
    environment: "Vacío Interestelar Negro Absoluto",
    lighting: "Luces de Neón Cyberpunk Reflejadas",
    density: "alta",
    complexity: 10
  }
];

export const INITIAL_CHAT = [
  {
    role: "model" as const,
    text: "¡Un saludo, colega del acero y la forma! Bienvenido a tu estudio de diseño de estructuras metálicas abstractas. Soy el Arq. Arístides. Juntos podemos desafiar la ingeniería material, esculpir voladizos audaces, tejer filamentos tensados de titanio o moldear corazas de acero corten deconstructivistas.\n\n¿Tienes alguna tipología en mente? Podemos partir con una estructura de tensegridad suspendida o una cercha espacial recíproca. Cuéntame qué concepto abstracto te inspira hoy o selecciona uno de los presets de la izquierda para comenzar.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
];
