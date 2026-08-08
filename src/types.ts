export type AspectRatio = "1:1" | "4:3" | "3:4" | "16:9" | "9:16";

export type ImageModel = "gemini-3.1-flash-lite-image" | "gemini-3.1-flash-image" | "imagen-4.0-generate-001";

export interface StructurePreset {
  id: string;
  name: string;
  description: string;
  style: string;
  finish: string;
  environment: string;
  lighting: string;
  density: "baja" | "media" | "alta";
  complexity: number; // 1 to 10
}

export interface GeneratorConfig {
  style: string;
  finish: string;
  environment: string;
  lighting: string;
  density: "baja" | "media" | "alta";
  complexity: number;
  aspectRatio: AspectRatio;
  model: ImageModel;
  customPrompt?: string;
}

export interface ConceptResponse {
  prompt: string;
  title: string;
  overview: string;
  techDetails: {
    estabilidad: string;
    complejidad: string;
    uniones: string;
    material: string;
    escala: string;
    viento: string;
  };
}

export interface GeneratedStructure {
  id: string;
  timestamp: string;
  title: string;
  overview: string;
  prompt: string;
  imageUrl: string;
  config: GeneratorConfig;
  techDetails: {
    estabilidad: string;
    complejidad: string;
    uniones: string;
    material: string;
    escala: string;
    viento: string;
  };
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface STVMaterialItem {
  name: string;
  category: string;
  description: string;
  quantity: number;
  basePrice: number;
}

export interface STVBlueprintData {
  fileName: string;
  projectName: string;
  elementsDescription: string;
  materials: STVMaterialItem[];
  totalBaseBudget: number;
  notes: string;
}

export interface StudySection {
  id: string;
  title: string;
  content: string;
  note?: string;
}

export interface ResearchTheme {
  id: string;
  title: string;
  status: "BAJO_ESTUDIO" | "VERIFICADO" | "REQUERIDO" | "CRÍTICO";
  notes: string;
  concepts: string;
  depth: number;
  sections?: StudySection[];
}

export interface ProductItem {
  id: string;
  name: string;             // Nombres y derivados
  family: string;           // Por familias (ej. Acero Estructural, Tubería, Lámina)
  description: string;      // Descripción detallada
  saleFormat: string;       // Formatos de venta (ej. Tramo 6m, Rollo, Pieza, Kg)
  length: string;           // Longitudes
  color: string;            // Colores
  thickness: string;        // Grosores
  caliber: string;          // Calibres
  type: string;             // Tipos de (ej. A36, Inoxidable, Galvanizado)
  specificSize: string;     // Tamaño específico
  weightKg: number;         // Peso (kg) basado en tablas actuales
  priceMXN: number;         // Precio exclusivamente en Pesos Mexicanos
}

export interface EstimationItem {
  productId: string;
  quantity: number;
}



