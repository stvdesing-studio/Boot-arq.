import React, { useState, useEffect } from "react";
import { comprehensiveMaterialsDB } from "./data/materialsDB";
import {
  STYLE_OPTIONS,
  FINISH_OPTIONS,
  ENVIRONMENT_OPTIONS,
  LIGHTING_OPTIONS,
  MODEL_OPTIONS,
  DEFAULT_PRESETS,
  INITIAL_CHAT,
} from "./data";
import {
  GeneratorConfig,
  GeneratedStructure,
  ChatMessage,
  AspectRatio,
  ImageModel,
  ConceptResponse,
  ResearchTheme,
  StudySection,
  ProductItem,
  EstimationItem,
} from "./types";
import ArchitectChat from "./components/ArchitectChat";
import StressDistributionChart from "./components/StressDistributionChart";
import LoadResearchHub from "./components/LoadResearchHub";
import Blueprint3DViewer from "./components/Blueprint3DViewer";
import { Point3D, Edge, generateInitialGeometry } from "./lib/geometry";
import { STVBlueprintData } from "./types";
import {
  initAuth,
  googleSignIn,
  logout,
  exportHubToSheets,
  exportHubToDocs,
  exportCatalogToSheets,
} from "./lib/workspace";
import { User } from "firebase/auth";
import { motion } from "motion/react";
import {
  FileText,
  FileSpreadsheet,
  UserCheck,
  LogOut,
  MessageCircle,
  X as CloseIcon,
  Calculator,
  Scale,
  FileDown
} from "lucide-react";
import {
  Hammer,
  Sparkles,
  Layers,
  Settings,
  Compass,
  Download,
  Maximize2,
  Trash2,
  Cpu,
  Coins,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Sliders,
  Flame,
  Layout,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Database,
  Plus,
  FolderPlus,
  Loader
} from "lucide-react";

export default function App() {
  // --- States ---
  const [config, setConfig] = useState<GeneratorConfig>({
    style: STYLE_OPTIONS[0].name,
    finish: FINISH_OPTIONS[0].name,
    environment: ENVIRONMENT_OPTIONS[0].name,
    lighting: LIGHTING_OPTIONS[0].name,
    density: "media",
    complexity: 7,
    aspectRatio: "1:1",
    model: "gemini-3.1-flash-lite-image",
    customPrompt: "",
  });

  // Active geometry and simulation states
  const [points, setPoints] = useState<Point3D[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [simulationParams, setSimulationParams] = useState({
    windForce: 20, // wind speed in km/h
    appliedLoad: 5.0, // vertical load in tons
    materialName: "Titanio Grado 5", // Active material
    elasticModulus: 115, // GPa
    yieldStrength: 880, // MPa
    materialDensity: 4.43, // g/cm³
    complexity: 7,
  });

  // Sync initial geometry whenever style, density or complexity changes
  useEffect(() => {
    const geom = generateInitialGeometry(config.style, config.density as any, config.complexity);
    setPoints(geom.points);
    setEdges(geom.edges);
  }, [config.style, config.density, config.complexity]);

  const [activeTab, setActiveTab] = useState<"hub_map" | "themes" | "hub" | "visor" | "params" | "history" | "catalog">("hub_map");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [useGravity, setUseGravity] = useState(false);

  // --- Google Workspace Auth & Sync State ---
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [needsGoogleAuth, setNeedsGoogleAuth] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null); // themeId, or 'catalog'
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  // --- Product Catalog State ---
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [estimates, setEstimates] = useState<EstimationItem[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Viga/Perfil");
  const [volatilityFactor, setVolatilityFactor] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("stv_volatility_factor");
      return saved ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  });

  // --- Floating Chat State ---
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [aiModel, setAiModel] = useState<string>("gemini-3.1-flash-lite");

  // Dynamic alloys list editable by Arístides and user
  const [materialsList, setMaterialsList] = useState([
    { name: "Acero Corten A588", modulus: 200, yieldS: 345, density: 7.85 },
    { name: "Acero Inoxidable 316", modulus: 193, yieldS: 290, density: 8.00 },
    { name: "Titanio Grado 5", modulus: 115, yieldS: 880, density: 4.43 },
    { name: "Aluminio Aeroespacial 7075-T6", modulus: 71.7, yieldS: 503, density: 2.81 },
    { name: "Fibra de Carbono IM7", modulus: 276, yieldS: 2500, density: 1.78 },
    { name: "Grafeno Sintético (STV-VCS)", modulus: 1000, yieldS: 130000, density: 2.26 },
  ]);

  // CAD Custom Node and Connection Form States
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodeX, setNewNodeX] = useState("0");
  const [newNodeY, setNewNodeY] = useState("0");
  const [newNodeZ, setNewNodeZ] = useState("0");
  const [newEdgeSource, setNewEdgeSource] = useState("");
  const [newEdgeTarget, setNewEdgeTarget] = useState("");

  // Structural generation states
  const [isConceptLoading, setIsConceptLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [loadStage, setLoadStage] = useState("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Active loaded concept result
  const [currentStructure, setCurrentStructure] = useState<GeneratedStructure | null>(null);
  const [history, setHistory] = useState<GeneratedStructure[]>([]);

  // Editing state for prompt
  const [editablePrompt, setEditablePrompt] = useState("");

  // Lightbox / Zoom full screen state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  // Toggle for automated one-click run (Generación en 1-paso)
  const [oneClickGenerate, setOneClickGenerate] = useState(true);

  // --- Search and filter states for research themes ---
  const [themeSearchTerm, setThemeSearchTerm] = useState("");
  
  // --- Derived Metrics ---
  const totalCostVal = estimates.reduce((total, est) => {
    const prod = products.find((p) => p.id === est.productId);
    return total + (prod ? (prod.priceMXN * volatilityFactor) * est.quantity : 0);
  }, 0);
  const [themeStatusFilter, setThemeStatusFilter] = useState<string>("TODOS");
  const [brainstormingIds, setBrainstormingIds] = useState<string[]>([]);

  // --- Research Themes (Interactive Topic Hubs) ---
  const [researchThemes, setResearchThemes] = useState<ResearchTheme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  // --- Effects ---
  useEffect(() => {
    // Load research themes from local storage or set initial values
    const savedThemes = localStorage.getItem("geosteel_research_themes");
    if (savedThemes) {
      try {
        setResearchThemes(JSON.parse(savedThemes));
      } catch (e) {
        console.error("Error parsing research themes", e);
      }
    } else {
      const initialThemes: ResearchTheme[] = [
        {
          id: "theme-1",
          title: "Tensegridad Paramétrica en Titanio",
          status: "CRÍTICO",
          notes: "Investigar la autoportancia de cables de tracción aeroespacial bajo ráfagas de 140 km/h.",
          concepts: "Cables espirales, titanio grado 5, juntas esféricas",
          depth: 85
        },
        {
          id: "theme-2",
          title: "Resistencia de Vientos en Salares Altas",
          status: "BAJO_ESTUDIO",
          notes: "Analizar el comportamiento torsional del acero corten expuesto a salinidad extrema y ráfagas constantes.",
          concepts: "Deflexión dinámica, recubrimientos epóxicos, torsión",
          depth: 60
        },
        {
          id: "theme-3",
          title: "Estructuras Recíprocas Autoportantes",
          status: "VERIFICADO",
          notes: "Optimización de uniones mecánicas empernadas para entramados tridimensionales de gran luz.",
          concepts: "Fricción de contacto, pernos de alta resistencia, nudos rígidos",
          depth: 75
        }
      ];
      setResearchThemes(initialThemes);
      localStorage.setItem("geosteel_research_themes", JSON.stringify(initialThemes));
    }

    // Load history from local storage
    const saved = localStorage.getItem("geosteel_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing history", e);
      }
    }

    // Load products
    const savedProducts = localStorage.getItem("stv_catalog_products");
    if (savedProducts) {
      try {
        const parsed = JSON.parse(savedProducts);
        // Force refresh if old schema detected
        if (parsed.length > 0 && parsed[0].family === undefined) {
          setProducts(comprehensiveMaterialsDB);
          localStorage.setItem("stv_catalog_products", JSON.stringify(comprehensiveMaterialsDB));
        } else {
          setProducts(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      const initialProducts: ProductItem[] = comprehensiveMaterialsDB;
      setProducts(initialProducts);
      localStorage.setItem("stv_catalog_products", JSON.stringify(initialProducts));
    }

    // Load estimates
    const savedEstimates = localStorage.getItem("stv_estimates");
    if (savedEstimates) {
      try {
        setEstimates(JSON.parse(savedEstimates));
      } catch (e) {
        console.error(e);
      }
    } else {
      const initialEstimates: EstimationItem[] = [
        { productId: "p-1", quantity: 50 },
        { productId: "p-2", quantity: 120 },
        { productId: "p-5", quantity: 12 },
      ];
      setEstimates(initialEstimates);
      localStorage.setItem("stv_estimates", JSON.stringify(initialEstimates));
    }

    // Initialize Auth Listener
    initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        setNeedsGoogleAuth(false);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
        setNeedsGoogleAuth(true);
      }
    );

    // Set initial chat
    setChatMessages(INITIAL_CHAT);
  }, []);

  // Sync history to local storage
  const saveHistoryToStorage = (newHistory: GeneratedStructure[]) => {
    setHistory(newHistory);
    localStorage.setItem("geosteel_history", JSON.stringify(newHistory));
  };

  // Sync products and estimates to local storage
  const saveProducts = (newProds: ProductItem[]) => {
    setProducts(newProds);
    localStorage.setItem("stv_catalog_products", JSON.stringify(newProds));
  };

  const saveEstimates = (newEsts: EstimationItem[]) => {
    setEstimates(newEsts);
    localStorage.setItem("stv_estimates", JSON.stringify(newEsts));
  };

  const saveVolatilityFactor = (factor: number) => {
    setVolatilityFactor(factor);
    localStorage.setItem("stv_volatility_factor", factor.toString());
  };

  // Safe status feedback sequences for the image loader
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isImageLoading) {
      const stages = [
        "Sincronizando coordenadas espaciales...",
        "Calculando autoportancia del nudo rígido...",
        "Calculando tensiones de cables de acero...",
        "Generando curvatura paramétrica de cortezas...",
        "Modelando refracción lumínica en metales...",
        "Proyectando sombras arrojadas y atmósfera del fondo...",
        "Refinando destellos especulares finales...",
        "Materializando estructura con el co-piloto..."
      ];
      let idx = 0;
      setLoadStage(stages[0]);
      interval = setInterval(() => {
        idx = (idx + 1) % stages.length;
        setLoadStage(stages[idx]);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isImageLoading]);

  // --- Handlers ---

  // Applies a preset config
  const handleSelectPreset = (p: typeof DEFAULT_PRESETS[0]) => {
    setConfig({
      style: p.style,
      finish: p.finish,
      environment: p.environment,
      lighting: p.lighting,
      density: p.density,
      complexity: p.complexity,
      aspectRatio: config.aspectRatio,
      model: config.model,
      customPrompt: "",
    });
    setErrorBanner(null);

    // Send visual feedback to user
    const alertSystem = `Se cargó el preset: "${p.name}". Puedes ver los parámetros actualizados en la barra lateral.`;
    addSystemChatMessage(alertSystem);
  };

  const addSystemChatMessage = (text: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        role: "model",
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Step 1: Query Gemini 3.5-flash to get an engineering overview and robust image prompt
  const calculateConcept = async (customConfig = config): Promise<ConceptResponse | null> => {
    setIsConceptLoading(true);
    setErrorBanner(null);
    try {
      const response = await fetch("/api/generate-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customConfig),
      });

      let errorMessage = "Fallo en la comunicación con el servidor.";
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
        } else {
          errorMessage = `Error de servicio (${response.status}). Intente de nuevo en unos instantes.`;
        }
        throw new Error(errorMessage);
      }

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("El servidor no devolvió una respuesta JSON válida.");
      }

      const data: ConceptResponse = await response.json();
      setEditablePrompt(data.prompt);
      setIsConceptLoading(false);
      return data;
    } catch (e: any) {
      console.error(e);
      setErrorBanner(e.message || "Error al calcular el concepto arquitectónico.");
      setIsConceptLoading(false);
      return null;
    }
  };

  // Step 2: Trigger the image generation
  const renderStructureImage = async (promptToUse: string, conceptData: ConceptResponse, activeConfig = config) => {
    setIsImageLoading(true);
    setErrorBanner(null);
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToUse,
          model: activeConfig.model,
          aspectRatio: activeConfig.aspectRatio,
        }),
      });

      let errorMessage = "Fallo en la síntesis de imagen artificial.";
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
        } else {
          errorMessage = `Error en el generador de imágenes (${response.status}). El modelo de imagen seleccionado puede estar temporalmente ocupado o con alta demanda.`;
        }
        throw new Error(errorMessage);
      }

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Respuesta no válida del generador de imágenes.");
      }

      const imgData = await response.json();

      const newStructure: GeneratedStructure = {
        id: `struct-${Date.now()}`,
        timestamp: new Date().toLocaleString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        }),
        title: conceptData.title,
        overview: conceptData.overview,
        prompt: promptToUse,
        imageUrl: imgData.imageUrl,
        config: { ...activeConfig, customPrompt: promptToUse },
        techDetails: conceptData.techDetails,
      };

      setCurrentStructure(newStructure);
      // Append to local history
      const updatedHistory = [newStructure, ...history].slice(0, 30); // Keep max 30 items
      saveHistoryToStorage(updatedHistory);

    } catch (e: any) {
      console.error(e);
      setErrorBanner(e.message || "Ocurrió un error al materializar la geometría metálica.");
    } finally {
      setIsImageLoading(false);
    }
  };

  // Combined Master Run Button
  const handleSynthesize = async () => {
    // 1. Calculate Concept and Prompt
    const concept = await calculateConcept();
    if (!concept) return;

    // 2. If one-clicking is checked, trigger image generation immediately
    if (oneClickGenerate) {
      await renderStructureImage(concept.prompt, concept);
    }
  };

  // In case the user edits the English prompt manually in step 2 and clicks "Renderizar de nuevo"
  const handleRenderOnlyEdited = async () => {
    if (!editablePrompt) {
      setErrorBanner("Por favor genera un concepto o escribe un prompt primero.");
      return;
    }

    // Create a temporary conceptual placeholder data for the image render card
    const fallbackConcept: ConceptResponse = {
      prompt: editablePrompt,
      title: currentStructure?.title || "Estructura Sintética Manual",
      overview: currentStructure?.overview || "Geometría refinada a medida por el arquitecto de software.",
      techDetails: currentStructure?.techDetails || {
        estabilidad: "Estabilidad manual personalizada",
        complejidad: "Geometría recalculada a mano",
        uniones: "Juntas soldadas de alta resistencia",
        material: config.finish,
        escala: "Escala conceptual ajustada",
        viento: "Deflexión moderada",
      },
    };

    await renderStructureImage(editablePrompt, fallbackConcept);
  };

  // Co-pilot messaging flow
  const handleSendChatMessage = async (text: string, selectedHubIds?: string[]) => {
    const userMsg: ChatMessage = {
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const chatHistoryAndInput = [...chatMessages, userMsg].slice(-10); // Keep last 10 turns

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: chatHistoryAndInput,
          useGravity: useGravity,
          researchThemes: researchThemes,
          selectedHubIds: selectedHubIds,
          aiModel: aiModel,
          simulationParams: simulationParams,
        }),
      });

      let errorMessage = "No se pudo conectar con el Co-piloto.";
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
        } else {
          errorMessage = `El Co-piloto Arístides no está disponible temporalmente (${response.status}). Intente de nuevo más tarde.`;
        }
        throw new Error(errorMessage);
      }

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("La respuesta del Co-piloto no tiene un formato válido.");
      }

      const data = await response.json();
      let replyText = data.reply;
      
      // Parse potential <action> tags from Arístides
      const actionRegexGlobal = /<action>([\s\S]*?)<\/action>/gi;
      let actionMatch;
      const actionsToRun: any[] = [];
      
      while ((actionMatch = actionRegexGlobal.exec(replyText)) !== null) {
        if (actionMatch[1]) {
          try {
            const parsedAction = JSON.parse(actionMatch[1].trim());
            actionsToRun.push(parsedAction);
          } catch (jsonErr) {
            console.error("Failed to parse action JSON:", jsonErr, actionMatch[1]);
          }
        }
      }
      
      // Clean replyText of all <action> tags
      replyText = replyText.replace(actionRegexGlobal, "").trim();

      // Now run each action sequentially on local copies of state to support chained actions!
      let updatedPoints = [...points];
      let updatedEdges = [...edges];
      let updatedThemes = [...researchThemes];
      let updatedParams = { ...simulationParams };

      let pointsChanged = false;
      let edgesChanged = false;
      let themesChanged = false;
      let paramsChanged = false;

      for (const action of actionsToRun) {
        try {
          if (action.type === "ADD_THEME") {
            const newTheme: ResearchTheme = {
              id: `theme-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              title: (action.title || "Nuevo Bloque").toUpperCase(),
              status: action.status || "BAJO_ESTUDIO",
              notes: action.notes || "",
              concepts: action.concepts || "IA_Análisis",
              depth: 50,
              sections: []
            };
            updatedThemes.push(newTheme);
            themesChanged = true;
          } else if (action.type === "DELETE_THEME") {
            updatedThemes = updatedThemes.filter((t) => t.id !== action.themeId);
            themesChanged = true;
          } else if (action.type === "ADD_SECTION") {
            updatedThemes = updatedThemes.map((t) => {
              if (t.id === action.themeId || t.title.toLowerCase().includes((action.themeId || "").toLowerCase())) {
                const secs = t.sections || [];
                return {
                  ...t,
                  sections: [...secs, {
                    id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    title: action.title || "Sección Sincronizada",
                    content: action.content,
                  }]
                };
              }
              return t;
            });
            themesChanged = true;
          } else if (action.type === "DELETE_SECTION") {
            updatedThemes = updatedThemes.map((t) => {
              if (t.id === action.themeId) {
                const secs = t.sections || [];
                return {
                  ...t,
                  sections: secs.filter((s) => s.id !== action.sectionId),
                };
              }
              return t;
            });
            themesChanged = true;
          } else if (action.type === "MOVE_SECTION") {
            let movingSection: any = null;
            updatedThemes = updatedThemes.map((t) => {
              if (t.id === action.fromThemeId) {
                const secs = t.sections || [];
                movingSection = secs.find((s) => s.id === action.sectionId);
                return {
                  ...t,
                  sections: secs.filter((s) => s.id !== action.sectionId),
                };
              }
              return t;
            });

            if (movingSection) {
              updatedThemes = updatedThemes.map((t) => {
                if (t.id === action.toThemeId) {
                  const secs = t.sections || [];
                  return {
                    ...t,
                    sections: [...secs, movingSection],
                  };
                }
                return t;
              });
            }
            themesChanged = true;
          } else if (action.type === "UPDATE_THEME_STATUS") {
            updatedThemes = updatedThemes.map((t) => {
              if (t.id === action.themeId) {
                return { ...t, status: action.status };
              }
              return t;
            });
            themesChanged = true;
          } else if (action.type === "UPDATE_COORDINATES") {
            // Handle both array of nodes and single node
            if (action.nodes && Array.isArray(action.nodes)) {
              updatedPoints = updatedPoints.map((pt) => {
                const matchNode = action.nodes.find((n: any) => n.id === pt.id || n.id === pt.label);
                if (matchNode) {
                  pointsChanged = true;
                  return { ...pt, x: Number(matchNode.x), y: Number(matchNode.y), z: Number(matchNode.z) };
                }
                return pt;
              });
              const nodesStr = action.nodes.map((n: any) => n.id).join(", ");
              addSystemChatMessage(`[CO-PILOTO] Coordenadas de nudos [${nodesStr}] actualizadas.`);
            } else {
              const nodeId = action.nodeId || action.id;
              updatedPoints = updatedPoints.map((pt) => {
                if (pt.id === nodeId || pt.label === nodeId) {
                  pointsChanged = true;
                  return { ...pt, x: Number(action.x), y: Number(action.y), z: Number(action.z) };
                }
                return pt;
              });
              addSystemChatMessage(`[CO-PILOTO] Coordenadas de nudo "${nodeId}" actualizadas a [X: ${action.x}, Y: ${action.y}, Z: ${action.z}].`);
            }
          } else if (action.type === "ADD_NODE") {
            const nodeId = action.nodeId || action.id || `N-${Date.now()}`;
            const newNode: Point3D = {
              id: nodeId,
              x: Number(action.x || 0),
              y: Number(action.y || 0),
              z: Number(action.z || 0),
              label: action.label || nodeId,
            };
            const existingIdx = updatedPoints.findIndex(p => p.id === nodeId);
            if (existingIdx > -1) {
              updatedPoints[existingIdx] = newNode;
            } else {
              updatedPoints.push(newNode);
            }
            pointsChanged = true;
            addSystemChatMessage(`[CO-PILOTO] Nuevo nudo "${newNode.id}" agregado en [X: ${newNode.x}, Y: ${newNode.y}, Z: ${newNode.z}].`);
          } else if (action.type === "DELETE_NODE" || action.type === "REMOVE_NODE") {
            const nodeId = action.nodeId || action.id;
            updatedPoints = updatedPoints.filter(p => p.id !== nodeId && p.label !== nodeId);
            pointsChanged = true;
            addSystemChatMessage(`[CO-PILOTO] Nudo "${nodeId}" eliminado de la estructura.`);
          } else if (action.type === "ADD_EDGE" || action.type === "ADD_CONNECTION" || action.type === "CONNECT_NODES") {
            const sourceId = action.u || action.source;
            const targetId = action.v || action.target;
            const edgeType = action.edgeType || action.type || "strut";
            
            const sourceIndex = updatedPoints.findIndex(p => p.id === sourceId || p.label === sourceId);
            const targetIndex = updatedPoints.findIndex(p => p.id === targetId || p.label === targetId);
            
            if (sourceIndex > -1 && targetIndex > -1) {
              const exists = updatedEdges.some(e => 
                (e.u === sourceIndex && e.v === targetIndex) || 
                (e.u === targetIndex && e.v === sourceIndex)
              );
              if (!exists) {
                updatedEdges.push({ u: sourceIndex, v: targetIndex, type: edgeType });
                edgesChanged = true;
                addSystemChatMessage(`[CO-PILOTO] Conectados nudos "${sourceId}" y "${targetId}" con miembro tipo "${edgeType}".`);
              }
            } else {
              console.warn("Could not find nodes to connect:", sourceId, targetId);
            }
          } else if (action.type === "DELETE_EDGE" || action.type === "REMOVE_CONNECTION") {
            const sourceId = action.u || action.source;
            const targetId = action.v || action.target;
            
            const sourceIndex = updatedPoints.findIndex(p => p.id === sourceId || p.label === sourceId);
            const targetIndex = updatedPoints.findIndex(p => p.id === targetId || p.label === targetId);
            
            if (sourceIndex > -1 && targetIndex > -1) {
              updatedEdges = updatedEdges.filter(e => 
                !((e.u === sourceIndex && e.v === targetIndex) || (e.u === targetIndex && e.v === sourceIndex))
              );
              edgesChanged = true;
              addSystemChatMessage(`[CO-PILOTO] Conexión entre "${sourceId}" y "${targetId}" eliminada.`);
            }
          } else if (action.type === "CLEAR_GEOMETRY" || action.type === "RESET_GEOMETRY") {
            updatedPoints = [];
            updatedEdges = [];
            pointsChanged = true;
            edgesChanged = true;
            addSystemChatMessage(`[CO-PILOTO] Geometría del simulador reiniciada (vacía).`);
          } else if (action.type === "SET_GEOMETRY") {
            if (action.points && Array.isArray(action.points)) {
              updatedPoints = action.points;
              pointsChanged = true;
            }
            if (action.edges && Array.isArray(action.edges)) {
              updatedEdges = action.edges;
              edgesChanged = true;
            }
            addSystemChatMessage(`[CO-PILOTO] Nueva estructura paramétrica cargada (${action.points?.length || 0} nudos, ${action.edges?.length || 0} uniones).`);
          } else if (action.type === "SET_PARAM") {
            const rawParam = action.param || action.key;
            let keyMap = rawParam;
            if (rawParam === "material") keyMap = "materialName";
            if (rawParam === "density") keyMap = "materialDensity";
            
            const isString = keyMap === "materialName";
            updatedParams = {
              ...updatedParams,
              [keyMap]: isString ? action.value : Number(action.value),
            };
            paramsChanged = true;
            addSystemChatMessage(`[CO-PILOTO] Parámetro de simulación "${rawParam}" establecido en ${action.value}.`);
          } else if (action.type === "SET_MATERIAL" || action.type === "ADD_MATERIAL") {
            const materialName = action.materialName || action.value || "Aleación Especial Arístides";
            const elasticModulus = Number(action.elasticModulus ?? 200);
            const yieldStrength = Number(action.yieldStrength ?? 350);
            const materialDensity = Number(action.materialDensity ?? 7.85);

            setMaterialsList((prev) => {
              const exists = prev.some((m) => m.name.toLowerCase() === materialName.toLowerCase());
              if (exists) {
                return prev.map((m) => m.name.toLowerCase() === materialName.toLowerCase()
                  ? { name: materialName, modulus: elasticModulus, yieldS: yieldStrength, density: materialDensity }
                  : m
                );
              }
              return [...prev, { name: materialName, modulus: elasticModulus, yieldS: yieldStrength, density: materialDensity }];
            });

            updatedParams = {
              ...updatedParams,
              materialName,
              elasticModulus,
              yieldStrength,
              materialDensity,
            };
            paramsChanged = true;

            addSystemChatMessage(`[CO-PILOTO] Material "${materialName}" cargado en consola (E: ${elasticModulus} GPa, Fy: ${yieldStrength} MPa, d: ${materialDensity} g/cm³).`);
          }
        } catch (actionErr) {
          console.error("Error executing action:", actionErr, action);
        }
      }

      // Sync state back after all actions run
      if (pointsChanged) {
        setPoints(updatedPoints);
      }
      if (edgesChanged) {
        setEdges(updatedEdges);
      }
      if (themesChanged) {
        setResearchThemes(updatedThemes);
        localStorage.setItem("geosteel_research_themes", JSON.stringify(updatedThemes));
      }
      if (paramsChanged) {
        setSimulationParams(updatedParams);
      }

      // Auto-switch to visual simulator tab when physical structure properties change
      if (pointsChanged || edgesChanged || paramsChanged) {
        setActiveTab("visor");
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (e: any) {
      console.error(e);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `Error de enlace: ${e.message || "No pude formular la respuesta."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Applied suggested prompt from Arq. Arístides inside the chat
  const handleLoadSuggestedPrompt = (prompt: string, title: string) => {
    setEditablePrompt(prompt);
    // Overwrite config prompt
    setConfig((prev) => ({ ...prev, customPrompt: prompt }));

    // Prepare a mock concept structure so the user can easily render it
    const prebakedConcept: ConceptResponse = {
      prompt: prompt,
      title: title,
      overview: "Estructura abstracta formulada en un debate creativo con el Arq. Arístides.",
      techDetails: {
        estabilidad: "Estabilidad calibrada por simulación teórica",
        complejidad: "Complejidad abstracta algorítmica avanzada",
        uniones: "Nodos integrados mediante extrusiones fluidas",
        material: "Aleación sugerida de acero al cromo",
        escala: "Escala monumental",
        viento: "Capacidad de derivación eólica baja",
      },
    };

    renderStructureImage(prompt, prebakedConcept);
    addSystemChatMessage(`Cargado el prompt del chat: "${title}". Iniciando la síntesis estructural automáticamente.`);
  };

  const handleLoadBlueprint = (blueprint: STVBlueprintData) => {
    // 1. Synchronize extracted materials with catalog and estimate list
    let updatedProducts = [...products];
    let updatedEstimates = [...estimates];

    blueprint.materials.forEach((mat) => {
      // Find if product already exists (by name, case insensitive)
      let existingProd = updatedProducts.find(
        (p) => p.name.toLowerCase() === mat.name.toLowerCase()
      );

      let productId = "";
      if (existingProd) {
        productId = existingProd.id;
      } else {
        // Create new catalog product
        productId = `prod-stv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newProduct: ProductItem = {
          id: productId,
          name: mat.name,
          description: mat.description,
          family: mat.category,
          saleFormat: "Unidad",
          length: "-",
          color: "-",
          thickness: "-",
          caliber: "-",
          type: "-",
          specificSize: "-",
          weightKg: 0,
          priceMXN: mat.basePrice,
        };
        updatedProducts.push(newProduct);
      }

      // Add or increment quantity in estimates
      let existingEstIndex = updatedEstimates.findIndex((e) => e.productId === productId);
      if (existingEstIndex > -1) {
        updatedEstimates[existingEstIndex].quantity += mat.quantity;
      } else {
        updatedEstimates.push({
          productId: productId,
          quantity: mat.quantity,
        });
      }
    });

    // Save both states
    saveProducts(updatedProducts);
    saveEstimates(updatedEstimates);

    // 2. Generate detailed system chat message
    const materialSummary = blueprint.materials
      .map((m) => `• ${m.quantity}x ${m.name} ($${m.basePrice.toFixed(2)} c/u)`)
      .join("\n");

    const alertSystem = `[SISTEMA STV] Sincronización exitosa del plano "${blueprint.projectName}" extraído por Gemini.\n\n` +
      `Se han inyectado ${blueprint.materials.length} piezas/conceptos al Catálogo General y al Estimador de Costos:\n\n` +
      `${materialSummary}\n\n` +
      `• Presupuesto Base Estimado: $${blueprint.totalBaseBudget.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN\n` +
      `• Arquitectura: ${blueprint.elementsDescription}\n\n` +
      `El motor ha calibrado el listado de obra con los factores de fluctuación actuales. ¡Tu cotización ya está disponible!`;
    
    addSystemChatMessage(alertSystem);

    // 3. Update generator prompts with architectural style
    const updatedPrompt = `Industrial structural frame for project ${blueprint.projectName}. Structural layout: ${blueprint.elementsDescription}. Steel components: ${blueprint.materials.map(m => m.name).join(', ')}. High detail technical rendering.`;
    setConfig((prev) => ({
      ...prev,
      customPrompt: updatedPrompt,
    }));
    setEditablePrompt(updatedPrompt);

    // 4. Switch to Catalog/Budget Tab so the user can immediately see the results
    setActiveTab("catalog");
  };

  // --- Research Themes Actions ---
  const saveResearchThemes = (updatedThemes: ResearchTheme[]) => {
    setResearchThemes(updatedThemes);
    localStorage.setItem("geosteel_research_themes", JSON.stringify(updatedThemes));
  };

  const onAddAsNewTheme = (text: string) => {
    const clean = text.replace(/[*#_\-\n`]/g, " ").trim();
    const titleWords = clean.split(/\s+/).slice(0, 5).join(" ");
    const title = titleWords ? `${titleWords}...` : "Nuevo Tema de Arístides";
    
    const newTheme: ResearchTheme = {
      id: `theme-${Date.now()}`,
      title: title.toUpperCase(),
      status: "BAJO_ESTUDIO",
      notes: "",
      concepts: "Investigación",
      depth: 50,
      sections: [
        {
          id: `sec-${Date.now()}`,
          title: "Concepto de Enlace",
          content: text,
        }
      ]
    };
    saveResearchThemes([...researchThemes, newTheme]);
  };

  const onAddToExistingTheme = (themeId: string, text: string) => {
    const clean = text.replace(/[*#_\-\n`]/g, " ").trim();
    const titleWords = clean.split(/\s+/).slice(0, 4).join(" ");
    const sectionTitle = titleWords ? `${titleWords}...` : "Nota Sincronizada";

    const updated = researchThemes.map((theme) => {
      if (theme.id === themeId) {
        const currentSections = theme.sections || [];
        const newSection: StudySection = {
          id: `sec-${Date.now()}`,
          title: sectionTitle,
          content: text,
        };
        return {
          ...theme,
          sections: [...currentSections, newSection],
        };
      }
      return theme;
    });
    saveResearchThemes(updated);
  };

  const handleAddTheme = () => {
    const newTheme: ResearchTheme = {
      id: `theme-${Date.now()}`,
      title: "Nueva Investigación Metálica",
      status: "BAJO_ESTUDIO",
      notes: "Escribe aquí las observaciones del ensayo de resistencia o cargas críticas.",
      concepts: "Concepto_A, Concepto_B",
      depth: 50,
    };
    const updated = [...researchThemes, newTheme];
    saveResearchThemes(updated);
  };

  const handleUpdateTheme = (id: string, updatedFields: Partial<ResearchTheme>) => {
    const updated = researchThemes.map((theme) => {
      if (theme.id === id) {
        return { ...theme, ...updatedFields };
      }
      return theme;
    });
    saveResearchThemes(updated);
  };

  const handleDeleteTheme = (id: string) => {
    const updated = researchThemes.filter((theme) => theme.id !== id);
    saveResearchThemes(updated);
  };

  const handleQueryTheme = (theme: ResearchTheme) => {
    const queryText = `Arístides, investiguemos a fondo el tema de "${theme.title}" (Estado actual: ${theme.status}) con una profundidad analítica del ${theme.depth}%. Centrémonos especialmente en los conceptos de: ${theme.concepts}. Notas de campo adicionales: "${theme.notes}"`;
    handleSendChatMessage(queryText);
    
    // Smooth scroll to the chat panel
    const chatEl = document.getElementById("architect-chat-panel");
    if (chatEl) {
      chatEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleBrainstormTheme = async (id: string) => {
    const theme = researchThemes.find((t) => t.id === id);
    if (!theme) return;

    // Add to brainstorming IDs list to display custom spinner
    setBrainstormingIds((prev) => [...prev, id]);

    try {
      const response = await fetch("/api/brainstorm-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: theme.title,
          concepts: theme.concepts,
          notes: theme.notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Fallo en la respuesta del servidor.");
      }

      const data = await response.json();
      if (data.brainstormedNotes) {
        handleUpdateTheme(id, { notes: data.brainstormedNotes });
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor para la lluvia de ideas. Verifique la conexión.");
    } finally {
      setBrainstormingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  // History Actions
  const handleLoadHistoryItem = (item: GeneratedStructure) => {
    setCurrentStructure(item);
    setConfig(item.config);
    setEditablePrompt(item.prompt);
    setErrorBanner(null);
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((x) => x.id !== id);
    saveHistoryToStorage(updated);
    if (currentStructure?.id === id) {
      setCurrentStructure(null);
    }
  };

  const handleClearHistory = () => {
    if (confirm("¿Seguro que deseas vaciar tu historial de estructuras?")) {
      saveHistoryToStorage([]);
      setCurrentStructure(null);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        setNeedsGoogleAuth(false);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error de autenticación Google: ${err.message || err}`);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setGoogleUser(null);
    setGoogleToken(null);
    setNeedsGoogleAuth(true);
    setExportUrl(null);
  };

  const handleExportThemeToSheets = async (theme: ResearchTheme) => {
    setIsExporting(theme.id);
    setExportUrl(null);
    try {
      const url = await exportHubToSheets(theme);
      setExportUrl(url);
    } catch (err: any) {
      console.error(err);
      alert(`Error al exportar a Google Sheets: ${err.message || err}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportThemeToDocs = async (theme: ResearchTheme) => {
    setIsExporting(theme.id + "-docs");
    setExportUrl(null);
    try {
      const url = await exportHubToDocs(theme);
      setExportUrl(url);
    } catch (err: any) {
      console.error(err);
      alert(`Error al exportar a Google Docs: ${err.message || err}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportCatalogToSheets = async () => {
    setIsExporting("catalog");
    setExportUrl(null);
    try {
      const url = await exportCatalogToSheets(products, estimates, volatilityFactor);
      setExportUrl(url);
    } catch (err: any) {
      console.error(err);
      alert(`Error al exportar catálogo: ${err.message || err}`);
    } finally {
      setIsExporting(null);
    }
  };

  // UI Utilities
  const copyToClipboard = (text: string, type: "prompt" | "specs") => {
    navigator.clipboard.writeText(text);
    if (type === "prompt") {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } else {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Format Aspect Ratio dimensions for local placeholders
  const getAspectRatioClasses = (ratio: AspectRatio) => {
    switch (ratio) {
      case "16:9":
        return "aspect-video";
      case "9:16":
        return "aspect-[9/16] max-h-[500px]";
      case "4:3":
        return "aspect-[4/3]";
      case "3:4":
        return "aspect-[3/4] max-h-[500px]";
      default:
        return "aspect-square";
    }
  };

  // Filter research themes based on search term and status
  const filteredThemes = researchThemes.filter((theme) => {
    const sectionsSearch = (theme.sections || []).some(
      (s) => s.title.toLowerCase().includes(themeSearchTerm.toLowerCase()) || 
             s.content.toLowerCase().includes(themeSearchTerm.toLowerCase())
    );
    const matchesSearch =
      theme.title.toLowerCase().includes(themeSearchTerm.toLowerCase()) ||
      theme.concepts.toLowerCase().includes(themeSearchTerm.toLowerCase()) ||
      theme.notes.toLowerCase().includes(themeSearchTerm.toLowerCase()) ||
      sectionsSearch;
    const matchesStatus = themeStatusFilter === "TODOS" || theme.status === themeStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#0D0C0C] text-white flex flex-col h-screen overflow-hidden font-sans selection:bg-[#00FFFF] selection:text-black antialiased relative">
      
      {activeTab === "hub_map" ? (
        /* --- 360-DEGREE RADIAL HUB PORTAL --- */
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-[#0D0C0C]">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[#0d0c0c] bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none"></div>
          
          {/* Ambient industrial metadata header */}
          <div className="absolute top-8 text-center space-y-1 select-none z-10">
            <div className="text-[10px] font-mono tracking-[0.35em] text-[#00FFFF] uppercase font-bold animate-pulse">
              VCS-01 // OPERATIVE MULTI-HUB PORTAL
            </div>
            <div className="text-3xl font-black tracking-widest text-[#E3F804] uppercase font-display">
              STV DESIGN STUDIO
            </div>
          </div>
          
          {/* The 360-degree radial container */}
          <div className="relative w-[700px] h-[700px] flex items-center justify-center scale-75 sm:scale-90 md:scale-100 transition-transform select-none">
            {/* SVG background connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* Outer orbit circle */}
              <circle
                cx="350"
                cy="350"
                r="220"
                fill="none"
                stroke="rgba(0, 255, 255, 0.12)"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              {/* Concentric helper grids */}
              <circle
                cx="350"
                cy="350"
                r="140"
                fill="none"
                stroke="rgba(227, 248, 4, 0.08)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Radiating lines to hubs */}
              {[
                { angle: -90 },
                { angle: -30 },
                { angle: 30 },
                { angle: 90 },
                { angle: 150 },
                { angle: 210 },
              ].map((h, i) => {
                const rad = (h.angle * Math.PI) / 180;
                const hx = 350 + 220 * Math.cos(rad);
                const hy = 350 + 220 * Math.sin(rad);
                return (
                  <line
                    key={i}
                    x1="350"
                    y1="350"
                    x2={hx}
                    y2={hy}
                    stroke="rgba(0, 255, 255, 0.15)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                );
              })}
            </svg>

            {/* Center node: STV design | studio */}
            <div className="absolute w-[220px] h-[220px] rounded-full border-4 border-[#00FFFF] bg-[#0D0C0C] flex flex-col items-center justify-center text-center p-4 shadow-[0_0_25px_rgba(0,255,255,0.25)] z-10">
              <div className="absolute inset-0 rounded-full border border-[#E3F804]/30 animate-ping" style={{ animationDuration: "3s" }}></div>
              <div style={{ fontFamily: "Orbitron" }} className="text-[13px] font-bold tracking-wider text-white text-center leading-relaxed">
                STV design | studio
              </div>
              <div className="h-[2px] w-12 bg-[#E3F804] my-2"></div>
              <div style={{ fontFamily: "Orbitron" }} className="text-[8px] font-mono tracking-[0.25em] text-[#00FFFF] uppercase font-bold animate-pulse">
                // CENTRAL CORE
              </div>
            </div>

            {/* Surrounding hub circles */}
            {[
              { id: "themes", num: "01", name: "RESEARCH", sub: "INTERFACE", angle: -90 },
              { id: "hub", num: "02", name: "PLANS & COSTS", sub: "ESTIMATES", angle: -30 },
              { id: "visor", num: "03", name: "SIMULATION", sub: "CONSOLE", angle: 30 },
              { id: "params", num: "04", name: "PARAMETERS", sub: "CALIBRATION", angle: 90 },
              { id: "history", num: "05", name: "PERSISTENCE", sub: "HISTORY", angle: 150 },
              { id: "catalog", num: "06", name: "UNIT COSTS", sub: "CATALOGUE", angle: 210 },
            ].map((h) => {
              const rad = (h.angle * Math.PI) / 180;
              const hx = 350 + 220 * Math.cos(rad);
              const hy = 350 + 220 * Math.sin(rad);
              return (
                <button
                  key={h.id}
                  onClick={() => setActiveTab(h.id as any)}
                  style={{
                    left: `${hx - 60}px`,
                    top: `${hy - 60}px`,
                  }}
                  className="absolute w-[120px] h-[120px] rounded-full border-2 border-[#E3F804]/50 hover:border-[#00FFFF] bg-[#0D0C0C]/90 hover:bg-[#0D0C0C] flex flex-col items-center justify-center p-2 text-center transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] cursor-pointer group z-20"
                >
                  <span className="text-[18px] font-black text-[#E3F804] group-hover:text-[#00FFFF] transition-colors leading-none tracking-widest font-display">
                    {h.num}
                  </span>
                  <span className="text-[9px] font-black text-white/95 group-hover:text-white uppercase mt-1 tracking-wider leading-none font-display">
                    {h.name}
                  </span>
                  <span className="text-[7.5px] font-mono text-white/40 group-hover:text-[#00FFFF]/80 uppercase mt-1 tracking-widest leading-none font-bold">
                    {h.sub}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Ambient industrial metadata footer */}
          <div className="absolute bottom-6 font-mono text-[9px] text-white/30 uppercase tracking-[0.2em] select-none flex items-center gap-4">
            <span>// SYSTEM ENGINE: ACTIVE</span>
            <span>•</span>
            <span>MODEL: {aiModel.toUpperCase()}</span>
            <span>•</span>
            <span>CO-PILOT: ONLINE</span>
          </div>
        </div>
      ) : (
        /* --- SINGLE BLOCK MONOLITHIC HUB WORKSPACE --- */
        <div className="flex-1 flex flex-row h-full overflow-hidden bg-[#f8f7f4] text-[#1a1a1a] font-sans">

          {/* Navigation Sidebar */}
          <nav className="w-20 border-r-1.5 border-[#1a1a1a] flex flex-col items-center py-8 gap-5 bg-white shrink-0">
            <button
              onClick={() => setActiveTab("hub_map")}
              className="w-11 h-11 flex items-center justify-center border-1.5 border-[#1a1a1a] bg-[#1a1a1a] text-[#f8f7f4] font-display font-extrabold text-[13px] tracking-wider cursor-pointer transition-all hover:scale-105"
              title="Volver al Portal Radial 360"
            >
              STV
            </button>
            <div className="h-[1.5px] w-[30px] bg-[#1a1a1a]/10"></div>
            {[
              { id: "themes", label: "R", title: "Research" },
              { id: "hub", label: "P", title: "Plans" },
              { id: "visor", label: "S", title: "Simulation" },
              { id: "params", label: "C", title: "Control" },
              { id: "history", label: "H", title: "History" },
              { id: "catalog", label: "U", title: "Unit Prices" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                title={item.title}
                className={`w-11 h-11 flex items-center justify-center border-1.5 font-display font-extrabold text-[14px] cursor-pointer transition-all ${
                  activeTab === item.id 
                    ? "bg-[#1a1a1a] text-[#f8f7f4] border-[#1a1a1a]" 
                    : "bg-white border-[#1a1a1a]/10 text-[#1a1a1a] hover:border-[#1a1a1a] hover:-translate-y-0.5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Central Workspace Main Stream Panel */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8f7f4]">
          
          {/* Monolithic Sticky Header bar */}
          <header 
            className="border-b-1.5 border-[#1a1a1a] bg-white px-8 py-5 sticky top-0 z-40 flex flex-col md:flex-row items-center justify-between gap-4 select-none"
            style={{ fontSize: "27px", lineHeight: "41px", color: "#1e1a1a", fontFamily: "Orbitron", fontWeight: "bold", textAlign: "justify" }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("hub_map")}
                className="flex items-center gap-2 font-display tracking-wider text-[#1a1a1a] hover:bg-[#1a1a1a]/5 transition-colors uppercase bg-transparent cursor-pointer"
                style={{ lineHeight: "59px", fontSize: "16.5px", fontFamily: "Orbitron", borderWidth: "2px", borderColor: "#96f12d", paddingLeft: "10px", paddingTop: "9px" }}
              >
                &larr; PORTAL
              </button>
              <div className="text-left">
                <p 
                  className="font-mono tracking-widest text-[#1a1a1a]/60 uppercase"
                  style={{ fontFamily: "Orbitron", fontStyle: "italic", lineHeight: "48px", fontSize: "11px" }}
                >
                  MÓDULO SELECCIONADO
                </p>
                <h1 
                  className="font-display tracking-tight text-[#1a1a1a] uppercase mt-0.5"
                  style={{ lineHeight: "28px", fontSize: "25px", fontFamily: "Orbitron", fontWeight: "bold", fontStyle: "italic" }}
                >
                  {activeTab === "themes" ? "RESEARCH INTERFACE // ESTUDIO" :
                   activeTab === "hub" ? "PLANS & COSTS // ESTIMACIONES" :
                   activeTab === "visor" ? "SIMULATION CONSOLE // VECTORES" :
                   activeTab === "params" ? "PARAMETERS CALIBRATION // CONTROL" :
                   activeTab === "history" ? "PERSISTENCE HISTORY // ARCHIVO" : "UNIT PRICES CATALOGUE // COSTES"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Breadcrumb-like mini tabs inside workspace to allow fast switching */}
              <div className="hidden xl:flex items-center gap-1 border border-[#1a1a1a]/10 p-0.5 bg-[#f8f7f4]">
                {[
                  { id: "themes", label: "RESEARCH" },
                  { id: "hub", label: "PLANS" },
                  { id: "visor", label: "SIMULATION" },
                  { id: "params", label: "PARAMS" },
                  { id: "history", label: "PERSIST" },
                  { id: "catalog", label: "CATALOG" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`px-3 py-1.5 font-display text-[9.5px] font-extrabold tracking-wider transition-all uppercase cursor-pointer ${
                      activeTab === item.id 
                        ? "bg-[#1a1a1a] text-white" 
                        : "text-[#1a1a1a]/55 hover:text-[#1a1a1a]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Toggle Co-pilot Button */}
              <button
                type="button"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`font-display font-extrabold text-[9.5px] px-4 py-2 transition-all cursor-pointer uppercase tracking-wider border-1.5 ${
                  isChatOpen 
                    ? "bg-[#00ffff] text-[#1a1a1a] border-[#1a1a1a] shadow-[3px_3px_0px_rgba(26,26,26,1)]" 
                    : "bg-white text-[#1a1a1a] border-[#1a1a1a]/30 hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
                }`}
              >
                {isChatOpen ? "OCULTAR CHAT" : "CO-PILOTO DE IA"}
              </button>

              {googleUser ? (
                <div className="flex items-center gap-2 bg-white border border-[#1a1a1a]/30 px-4 py-2 font-mono text-[9px] text-[#1a1a1a]">
                  <UserCheck className="w-3.5 h-3.5 text-[#1a1a1a] shrink-0" />
                  <span className="truncate max-w-[120px] font-bold">{googleUser.email}</span>
                  <button
                    onClick={handleGoogleLogout}
                    className="hover:text-rose-600 transition-colors cursor-pointer ml-1 font-bold text-[#1a1a1a]"
                  >
                    [LOGOUT]
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGoogleLogin}
                  className="bg-[#00ffff] text-[#1a1a1a] font-display font-extrabold text-[9.5px] px-4 py-2 hover:bg-white hover:text-black transition-all cursor-pointer uppercase tracking-wider border-1.5 border-[#1a1a1a] shadow-[3px_3px_0px_rgba(26,26,26,1)]"
                >
                  CONECTAR WORKSPACE
                </button>
              )}
            </div>
          </header>

          {/* Monolithic Workspace Content Stream */}
          <main className="flex-1 overflow-y-auto p-10 space-y-8 bg-[#f8f7f4] relative">
            {/* Subtle matrix-like grid decoration */}
            <div className="absolute inset-0 bg-[#f8f7f4] bg-[radial-gradient(rgba(26,26,26,0.1)_1.5px,transparent_1.5px)] [background-size:40px_40px] opacity-100 pointer-events-none"></div>
            
            <div className="max-w-5xl mx-auto space-y-8 relative z-10">
              
              {/* --- ERROR BANNER --- */}
              {errorBanner && (
                <div className="bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-800 animate-fadeIn text-left">
                  <Flame className="w-5 h-5 text-rose-500 shrink-0 animate-pulse" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold font-mono text-rose-400 uppercase">// ADVERTENCIA EN SISTEMA METALÚRGICO:</p>
                    <p>{errorBanner}</p>
                    <p className="opacity-80 font-mono text-[10px]">
                      Tip: Cambia el motor a "Gemini 3.1 Flash Lite Image" en la pestaña de parámetros si tienes problemas de claves.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorBanner(null)}
                    className="ml-auto text-rose-400 hover:text-rose-200 font-mono text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Active Tab Content Render block */}
              <div className="space-y-6">
              {activeTab === "themes" && (
                <div className="bg-white border-1.5 border-[#1a1a1a] p-8 relative space-y-6 animate-fadeIn text-left shadow-[4px_4px_0px_rgba(26,26,26,1)]">
                  {/* Header section with theme triggers */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1a1a1a]/15 pb-5">
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-[#00ffff] border border-[#1a1a1a] rounded-full animate-ping"></span>
                        <h2 className="text-md font-extrabold font-display uppercase tracking-wider text-[#1a1a1a]">
                          CENTRAL RESEARCH STREAM // HUBS DE ESTUDIO SINC
                        </h2>
                      </div>
                      <p className="text-[10px] text-[#1a1a1a]/60 font-mono mt-1 tracking-wider uppercase">
                        Unificación absoluta. El Hub seleccionado se expande cubriendo el 100% del área de trabajo. Use el Co-piloto para segmentar información.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTheme}
                      className="font-display text-[9.5px] font-extrabold px-5 py-2.5 bg-[#1a1a1a] text-[#f8f7f4] border border-[#1a1a1a] hover:bg-[#00ffff] hover:text-[#1a1a1a] transition-all cursor-pointer uppercase tracking-wider shadow-[2px_2px_0px_rgba(26,26,26,1)] hover:translate-y-[-1px]"
                    >
                      + CREAR NUEVO HUB DE ESTUDIO
                    </button>
                  </div>

                  {/* Filter and Search controls */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#f8f7f4] border border-[#1a1a1a]/15 p-5">
                    <div className="md:col-span-5 space-y-1">
                      <label className="text-[8.5px] font-mono text-[#1a1a1a]/70 uppercase tracking-widest block font-bold">
                        // BÚSQUEDA DE CONTENIDO
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Buscar concepto, nota, sección..."
                          value={themeSearchTerm}
                          onChange={(e) => setThemeSearchTerm(e.target.value)}
                          className="w-full bg-white text-[#1a1a1a] text-[10px] font-mono border border-[#1a1a1a]/20 focus:border-[#1a1a1a] focus:outline-none p-2 placeholder:text-[#1a1a1a]/40 text-left"
                        />
                        {themeSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setThemeSearchTerm("")}
                            className="absolute right-2 top-2 text-[#1a1a1a] hover:text-[#00ffff] font-mono text-[8px] font-bold cursor-pointer"
                          >
                            CLEAR
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-7 space-y-1">
                      <label className="text-[8.5px] font-mono text-[#1a1a1a]/70 uppercase tracking-widest block font-bold">
                        // FILTRAR HUB POR DIAGNÓSTICO
                      </label>
                      <div className="flex flex-wrap gap-1 bg-white p-1 border border-[#1a1a1a]/20">
                        {["TODOS", "BAJO_ESTUDIO", "REQUERIDO", "CRÍTICO", "VERIFICADO"].map((status) => {
                          const isActive = themeStatusFilter === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setThemeStatusFilter(status)}
                              className={`px-3 py-1.5 text-[8.5px] font-mono transition-all cursor-pointer font-bold uppercase border ${
                                isActive
                                  ? "bg-[#1a1a1a] text-[#f8f7f4] border-[#1a1a1a]"
                                  : "text-[#1a1a1a]/60 hover:bg-[#1a1a1a]/5 hover:text-[#1a1a1a] border-transparent"
                              }`}
                            >
                              {status.replace("_", " ")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Interactive Hub Selector tabs */}
                  <div className="space-y-2">
                    <label className="text-[8.5px] font-mono text-[#1a1a1a]/70 uppercase tracking-widest block font-bold">
                      // SELECCIONAR HUB ACTIVO PARA EXPANSIÓN TOTAL
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                      {filteredThemes.map((theme) => {
                        const isSelected = (selectedThemeId || (filteredThemes[0]?.id)) === theme.id;
                        const statusColor = theme.status === "CRÍTICO" ? "text-rose-700 font-bold" :
                                            theme.status === "VERIFICADO" ? "text-emerald-700 font-bold" :
                                            "text-[#1a1a1a]/60 font-semibold";
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setSelectedThemeId(theme.id)}
                            className={`p-4 border text-left font-display transition-all relative uppercase flex flex-col justify-between h-24 cursor-pointer ${
                              isSelected
                                ? "bg-[#00ffff] border-[#1a1a1a] text-[#1a1a1a] shadow-[3px_3px_0px_rgba(26,26,26,1)] font-extrabold"
                                : "bg-white border-[#1a1a1a]/15 text-[#1a1a1a]/70 hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
                            }`}
                          >
                            <span className="text-[10px] font-extrabold truncate tracking-wide w-full leading-tight">{theme.title}</span>
                            <div className="flex items-center justify-between w-full mt-2 text-[7.5px] text-[#1a1a1a]/55">
                              <span className={`font-mono ${statusColor}`}>[{theme.status}]</span>
                              <span className="font-mono">SECCIONES: {(theme.sections || []).length}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Render Expanded Hub Monolith block */}
                  {(() => {
                    const activeThemeId = selectedThemeId || (filteredThemes[0]?.id);
                    const activeTheme = researchThemes.find((t) => t.id === activeThemeId) || filteredThemes[0];

                    if (!activeTheme) {
                      return (
                        <div className="bg-[#f8f7f4] border border-[#1a1a1a]/15 p-12 text-center">
                          <Database className="w-10 h-10 text-[#1a1a1a]/40 mx-auto mb-3 animate-pulse" />
                          <p className="text-[11px] font-mono font-black uppercase tracking-widest text-[#1a1a1a]">
                            // NINGÚN_HUB_DE_ESTUDIO_DISPONIBLE
                          </p>
                          <p className="text-[9.5px] text-[#1a1a1a]/55 font-mono mt-1 uppercase">
                            No hay temas creados o que coincidan con los filtros activos. Utilice el botón superior para iniciar un Hub.
                          </p>
                        </div>
                      );
                    }

                    const isBrainstorming = brainstormingIds.includes(activeTheme.id);
                    const isExportingThis = isExporting === activeTheme.id;
                    const isExportingThisDocs = isExporting === activeTheme.id + "-docs";

                    return (
                      <div className="border-t border-[#1a1a1a]/15 pt-6 space-y-6">
                        
                        {/* Hub Title and Config Area */}
                        <div className="bg-[#f8f7f4] border border-[#1a1a1a]/15 p-5 space-y-4 shadow-[2px_2px_0px_rgba(26,26,26,0.05)]">
                          <div className="flex items-center justify-between border-b border-[#1a1a1a]/10 pb-2">
                            <span className="text-[8.5px] font-mono text-[#1a1a1a]/70 uppercase tracking-widest font-bold">
                              // DATOS MAESTROS DEL HUB ACTIVO
                            </span>
                            <span className="text-[8px] font-mono text-[#1a1a1a]/60 tracking-wider uppercase font-black">
                              ID DE SEGUIMIENTO: {activeTheme.id.toUpperCase()}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {/* Title */}
                            <div className="md:col-span-6 space-y-1">
                              <label className="text-[8.5px] font-mono text-[#1a1a1a]/60 uppercase tracking-widest font-black block">
                                // NOMBRE O TÍTULO DEL HUB
                              </label>
                              <input
                                type="text"
                                value={activeTheme.title}
                                onChange={(e) => handleUpdateTheme(activeTheme.id, { title: e.target.value })}
                                className="w-full bg-white text-[#1a1a1a] font-display font-black text-[12px] border border-[#1a1a1a]/20 focus:border-[#1a1a1a] focus:outline-none p-2 text-left uppercase"
                              />
                            </div>

                            {/* Concepts */}
                            <div className="md:col-span-6 space-y-1">
                              <label className="text-[8.5px] font-mono text-[#1a1a1a]/60 uppercase tracking-widest font-black block">
                                // COMPONENTES / NÚCLEOS CLAVE
                              </label>
                              <input
                                type="text"
                                value={activeTheme.concepts}
                                onChange={(e) => handleUpdateTheme(activeTheme.id, { concepts: e.target.value })}
                                placeholder="Cables, Juntas, Resistencia torsional..."
                                className="w-full bg-white text-[#1a1a1a] font-mono text-[11px] border border-[#1a1a1a]/20 focus:border-[#1a1a1a] focus:outline-none p-2 text-left"
                              />
                            </div>

                            {/* Status Cycler & Depth */}
                            <div className="md:col-span-4 space-y-1">
                              <label className="text-[8.5px] font-mono text-[#1a1a1a]/60 uppercase tracking-widest font-black block">
                                // DIAGNÓSTICO DE SIMULACIÓN
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const statusCycles: ResearchTheme["status"][] = ["BAJO_ESTUDIO", "REQUERIDO", "CRÍTICO", "VERIFICADO"];
                                  const currentIdx = statusCycles.indexOf(activeTheme.status);
                                  const nextStatus = statusCycles[(currentIdx + 1) % statusCycles.length];
                                  handleUpdateTheme(activeTheme.id, { status: nextStatus });
                                }}
                                className={`w-full py-2.5 px-3 font-mono text-[10px] font-bold tracking-widest uppercase transition-all border cursor-pointer flex items-center justify-between ${
                                  activeTheme.status === "CRÍTICO" ? "text-rose-700 border-rose-300 bg-rose-50" :
                                  activeTheme.status === "VERIFICADO" ? "text-emerald-700 border-emerald-300 bg-emerald-50" :
                                  "text-[#1a1a1a] border-[#1a1a1a]/20 bg-white hover:bg-[#1a1a1a]/5"
                                }`}
                              >
                                <span>{activeTheme.status.replace("_", " ")}</span>
                                <span className="text-[8px] opacity-65">(CLICK PARA CAMBIAR)</span>
                              </button>
                            </div>

                            {/* Depth slider */}
                            <div className="md:col-span-8 space-y-1">
                              <div className="flex items-center justify-between text-[8.5px] font-mono text-[#1a1a1a]/60 uppercase font-black">
                                <span>// COMPRENSIÓN / PROFUNDIDAD DE SIMULACIÓN</span>
                                <span className="text-[#1a1a1a] font-black">{activeTheme.depth}%</span>
                              </div>
                              <div className="flex items-center gap-3 py-1.5">
                                <input
                                  type="range"
                                  min="10"
                                  max="100"
                                  value={activeTheme.depth}
                                  onChange={(e) => handleUpdateTheme(activeTheme.id, { depth: parseInt(e.target.value) })}
                                  className="flex-1 accent-[#1a1a1a] bg-white border border-[#1a1a1a]/15 h-2.5 cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* MASSIVE WRITING / INGESTION ZONE */}
                        <div className="space-y-2 relative">
                          <div className="flex items-center justify-between">
                            <label className="text-[9px] font-mono text-[#1a1a1a]/70 uppercase tracking-widest font-bold block">
                              // CANAL DE INGESTIÓN MASIVO DE ANOTACIONES Y DISEÑO SANTI VILANOVA
                            </label>
                            <span className="text-[7.5px] font-mono text-[#1a1a1a]/40 uppercase">
                              MÁXIMA CAPACIDAD DE ANÁLISIS TEXTUAL CO-OPERATIVO
                            </span>
                          </div>
                          
                          <textarea
                            value={activeTheme.notes}
                            onChange={(e) => handleUpdateTheme(activeTheme.id, { notes: e.target.value })}
                            placeholder="Ingrese notas masivas, parámetros requeridos, cables de tensegridad, pernos de fricción, o de lo contrario, arrastre un blueprint de diseño en el chat. Arístides indexará este canal con prioridad..."
                            className="w-full h-[450px] p-6 bg-white text-[#1a1a1a] text-[11px] leading-relaxed border-1.5 border-[#1a1a1a] focus:outline-none focus:ring-0 font-sans tracking-wide resize-none scrollbar-thin rounded-none selection:bg-[#00ffff] selection:text-[#1a1a1a]"
                          />

                          {isBrainstorming && (
                            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center border-1.5 border-[#1a1a1a] animate-pulse z-10">
                              <Loader className="w-8 h-8 text-[#1a1a1a] animate-spin" />
                              <span className="text-[10px] font-mono text-[#1a1a1a] font-black uppercase mt-3 tracking-widest">
                                DESARROLLANDO ESTRUCTURA DE INGENIERÍA CON GEMINI...
                              </span>
                              <span className="text-[8px] font-mono text-[#1a1a1a]/55 uppercase mt-1">
                                Procesando tablas de materiales y cálculos de momento torsional
                              </span>
                            </div>
                          )}
                        </div>

                        {/* MONOLITHIC CONTROL ACTIONS DOCK */}
                        <div className="bg-[#f8f7f4] border border-[#1a1a1a] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 select-none shadow-[2px_2px_0px_rgba(26,26,26,0.1)]">
                          {/* AI Brainstorm trigger */}
                          <button
                            type="button"
                            onClick={() => handleBrainstormTheme(activeTheme.id)}
                            disabled={isBrainstorming}
                            className="py-3 bg-[#00ffff] text-[#1a1a1a] hover:bg-white border border-[#1a1a1a] transition-all text-[9.5px] font-display font-extrabold tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-[1.5px_1.5px_0px_rgba(26,26,26,1)]"
                            title="Usar Gemini para desarrollar un esquema de ingeniería analítica para este tema"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            DESARROLLAR CON IA
                          </button>

                          {/* Ask Co-pilot */}
                          <button
                            type="button"
                            onClick={() => handleQueryTheme(activeTheme)}
                            className="py-3 bg-white text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white border border-[#1a1a1a] transition-all text-[9.5px] font-display font-extrabold tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[1.5px_1.5px_0px_rgba(26,26,26,0.2)]"
                          >
                            <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                            PREGUNTAR A ARÍSTIDES
                          </button>

                          {/* Export to Sheets */}
                          <button
                            type="button"
                            onClick={() => handleExportThemeToSheets(activeTheme)}
                            disabled={isExporting !== null}
                            className="py-3 bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-600 transition-all text-[9.5px] font-display font-extrabold tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isExportingThis ? (
                              <Loader className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            ENVIAR A SHEETS
                          </button>

                          {/* Export to Docs */}
                          <button
                            type="button"
                            onClick={() => handleExportThemeToDocs(activeTheme)}
                            disabled={isExporting !== null}
                            className="py-3 bg-white text-blue-800 hover:bg-blue-50 border border-blue-600 transition-all text-[9.5px] font-display font-extrabold tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isExportingThisDocs ? (
                              <Loader className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            ENVIAR A DOCS
                          </button>

                          {/* Delete theme */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Confirmas la disolución total del hub "${activeTheme.title}"?`)) {
                                handleDeleteTheme(activeTheme.id);
                              }
                            }}
                            className="py-3 bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-all text-[9.5px] font-display font-extrabold tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            DISOLVER HUB
                          </button>
                        </div>

                        {/* Rectángulos de Estudio (Segmented Study Notes list) */}
                        <div className="space-y-4 pt-5 border-t border-[#1a1a1a]/15">
                          <div className="flex items-center justify-between">
                            <label className="text-[9.5px] font-mono text-[#1a1a1a]/70 uppercase tracking-widest font-black block">
                              // RECTÁNGULOS DE ESTUDIO SINC (SECCIONES SEGMENTADAS: {(activeTheme.sections || []).length})
                            </label>
                            <span className="text-[7.5px] font-mono text-[#1a1a1a]/40 uppercase">
                              SECUENCIAS DE INFORMACIÓN MANIPULABLES CON EL CO-PILOTO
                            </span>
                          </div>

                          <div className="space-y-4">
                            {(activeTheme.sections || []).length === 0 ? (
                              <div className="bg-white border border-[#1a1a1a]/15 p-6 text-center text-[#1a1a1a]/50 text-[10.5px] font-mono">
                                Sin rectángulos de estudio. Escriba algo en el co-piloto para segmentar apuntes de investigación automáticamente aquí, o agréguelo con el botón inferior.
                              </div>
                            ) : (
                              (activeTheme.sections || []).map((sec, secIdx) => (
                                <div key={sec.id} className="p-5 bg-white border border-[#1a1a1a] space-y-4 relative text-left shadow-[2px_2px_0px_rgba(26,26,26,0.1)]">
                                  
                                  {/* Section Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1a1a1a]/10 pb-2">
                                    <input
                                      type="text"
                                      value={sec.title}
                                      onChange={(e) => {
                                        const updatedSecs = (activeTheme.sections || []).map((s) => 
                                          s.id === sec.id ? { ...s, title: e.target.value } : s
                                        );
                                        handleUpdateTheme(activeTheme.id, { sections: updatedSecs });
                                      }}
                                      className="bg-transparent text-[#1a1a1a] font-display text-[10.5px] font-extrabold border-b border-transparent focus:border-[#1a1a1a] focus:outline-none w-2/3 text-left uppercase"
                                      placeholder="TÍTULO DE RECTÁNGULO..."
                                    />
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                      {/* Merge section buttons */}
                                      {secIdx < (activeTheme.sections || []).length - 1 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextSec = (activeTheme.sections || [])[secIdx + 1];
                                            const mergedSecs = (activeTheme.sections || []).filter((s, sI) => sI !== secIdx + 1).map((s) => {
                                              if (s.id === sec.id) {
                                                return {
                                                  ...s,
                                                  title: `${s.title} + ${nextSec.title}`,
                                                  content: `${s.content}\n\n[FUSIÓN]:\n${nextSec.content}`,
                                                  note: s.note || nextSec.note ? `${s.note || ""}\n${nextSec.note || ""}`.trim() : undefined
                                                };
                                              }
                                              return s;
                                            });
                                            handleUpdateTheme(activeTheme.id, { sections: mergedSecs });
                                          }}
                                          className="text-[7.5px] font-mono text-[#1a1a1a]/60 hover:text-[#1a1a1a] border border-[#1a1a1a]/20 hover:border-[#1a1a1a] px-2 py-0.5 cursor-pointer font-bold uppercase shrink-0"
                                          title="Fisionar / Combinar con la de abajo"
                                        >
                                          COMBINAR
                                        </button>
                                      )}

                                      {/* Delete button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedSecs = (activeTheme.sections || []).filter((s) => s.id !== sec.id);
                                          handleUpdateTheme(activeTheme.id, { sections: updatedSecs });
                                        }}
                                        className="text-[#1a1a1a]/50 hover:text-rose-600 cursor-pointer transition-colors"
                                        title="Eliminar rectángulo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Section Body */}
                                  <textarea
                                    value={sec.content}
                                    onChange={(e) => {
                                      const updatedSecs = (activeTheme.sections || []).map((s) => 
                                        s.id === sec.id ? { ...s, content: e.target.value } : s
                                      );
                                      handleUpdateTheme(activeTheme.id, { sections: updatedSecs });
                                    }}
                                    className="w-full bg-[#f8f7f4] text-[#1a1a1a] text-[11px] font-mono border border-[#1a1a1a]/15 focus:border-[#1a1a1a] focus:outline-none p-3 h-24 resize-none leading-relaxed text-left"
                                    placeholder="Contenido descriptivo de la sección..."
                                  />

                                  {/* Inline Field Note for Section */}
                                  {sec.note !== undefined ? (
                                    <div className="p-3 bg-cyan-50 border border-cyan-200 space-y-1">
                                      <div className="flex items-center justify-between border-b border-cyan-200 pb-1">
                                        <span className="text-[7.5px] font-mono text-cyan-800 font-black uppercase tracking-wider">// COMPROMISO / NOTA DE CAMPO:</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updatedSecs = (activeTheme.sections || []).map((s) => 
                                              s.id === sec.id ? { ...s, note: undefined } : s
                                            );
                                            handleUpdateTheme(activeTheme.id, { sections: updatedSecs });
                                          }}
                                          className="text-[6.5px] font-mono text-cyan-700 hover:text-rose-600 cursor-pointer font-bold"
                                        >
                                          ELIMINAR NOTA
                                        </button>
                                      </div>
                                      <input
                                        type="text"
                                        value={sec.note}
                                        onChange={(e) => {
                                          const updatedSecs = (activeTheme.sections || []).map((s) => 
                                            s.id === sec.id ? { ...s, note: e.target.value } : s
                                          );
                                          handleUpdateTheme(activeTheme.id, { sections: updatedSecs });
                                        }}
                                        className="w-full bg-transparent text-[9.5px] font-mono text-cyan-900 focus:outline-none text-left font-bold"
                                        placeholder="Escriba comentario de campo adicional..."
                                      />
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedSecs = (activeTheme.sections || []).map((s) => 
                                          s.id === sec.id ? { ...s, note: "" } : s
                                        );
                                        handleUpdateTheme(activeTheme.id, { sections: updatedSecs });
                                      }}
                                      className="text-[8px] font-mono text-[#1a1a1a]/60 hover:text-[#1a1a1a] flex items-center gap-1 font-bold cursor-pointer"
                                    >
                                      + Agregar Nota de Campo
                                    </button>
                                  )}

                                  {/* Transfer/Move section dropdown selector */}
                                  {researchThemes.length > 1 && (
                                    <div className="flex items-center gap-2 bg-[#f8f7f4] border border-[#1a1a1a]/15 px-2.5 py-1 justify-between max-w-sm mt-1">
                                      <span className="text-[7.5px] font-mono text-[#1a1a1a]/50 uppercase font-extrabold tracking-wider">// REUBICAR A OTRO HUB:</span>
                                      <select
                                        onChange={(e) => {
                                          const destId = e.target.value;
                                          if (!destId) return;

                                          // Remove from source theme
                                          const cleanSecs = (activeTheme.sections || []).filter((s) => s.id !== sec.id);
                                          // Add to destination theme
                                          const updatedThemes = researchThemes.map((t) => {
                                            if (t.id === activeTheme.id) {
                                              return { ...t, sections: cleanSecs };
                                            }
                                            if (t.id === destId) {
                                              const destSecs = t.sections || [];
                                              return { ...t, sections: [...destSecs, sec] };
                                            }
                                            return t;
                                          });
                                          setResearchThemes(updatedThemes);
                                          localStorage.setItem("geosteel_research_themes", JSON.stringify(updatedThemes));
                                          addSystemChatMessage(`[HUB] Sección "${sec.title}" reubicada correctamente al hub de destino.`);
                                        }}
                                        className="bg-white text-[8px] text-[#1a1a1a] border border-[#1a1a1a]/15 focus:outline-none font-mono cursor-pointer font-bold max-w-[150px] truncate"
                                        value=""
                                      >
                                        <option value="" disabled className="bg-white text-[#1a1a1a]/60 font-bold">-- REUBICAR --</option>
                                        {researchThemes
                                          .filter((t) => t.id !== activeTheme.id)
                                          .map((t) => (
                                            <option key={t.id} value={t.id} className="bg-white text-[#1a1a1a]">{t.title}</option>
                                          ))}
                                      </select>
                                    </div>
                                  )}

                                </div>
                              ))
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const updatedSecs = activeTheme.sections || [];
                              const newSec: StudySection = {
                                id: `sec-${Date.now()}`,
                                title: "NUEVO RECTÁNGULO DE ESTUDIO",
                                content: "Escriba aquí los detalles analíticos o de modelado..."
                              };
                              handleUpdateTheme(activeTheme.id, { sections: [...updatedSecs, newSec] });
                            }}
                            className="w-full mt-2.5 py-3 bg-[#1a1a1a] hover:bg-[#1a1a1a]/90 text-white text-[9.5px] font-display font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[2px_2px_0px_rgba(26,26,26,1)]"
                          >
                            <Plus className="w-3.5 h-3.5" /> AGREGAR RECTÁNGULO DE ESTUDIO MANUAL
                          </button>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 2: CONTROL DE PLANOS Y COSTOS STV */}
              {activeTab === "hub" && (
                <div className="h-[520px] overflow-hidden animate-fadeIn">
                  <LoadResearchHub onLoadBlueprint={handleLoadBlueprint} />
                </div>
              )}

              {/* TAB 3: SIMULACIÓN DIGITAL (VISOR DE VECTORES EN TIEMPO REAL) */}
              {activeTab === "visor" && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-white border-2 border-black overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col relative">
                    {/* Toolbar */}
                    <div className="px-4 py-2.5 bg-white border-b-2 border-black flex items-center justify-between text-[10.5px] font-display text-black font-extrabold">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[#1a1a1a] font-black text-xs">
                        <Compass className="w-3.5 h-3.5 text-[#1a1a1a] animate-spin-slow" /> VISOR_VECTORES_3D // SANTI VILANOVA METRICS
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[9px] text-[#1a1a1a]/70 font-extrabold uppercase">
                        <span>ESTADO DE CARGA: ACTIVO</span>
                      </div>
                    </div>

                    {/* Integrated 3D Blueprint Line Visualizer */}
                    <Blueprint3DViewer
                      points={points}
                      edges={edges}
                      simulationParams={simulationParams}
                      style={config.style}
                      title={currentStructure?.title || "ESQUEMA PARAMÉTRICO DE OBRA"}
                      totalCost={totalCostVal}
                    />
                  </div>

                  {/* Informative structural details / Metrics under visor */}
                  <div className="bg-white border-2 border-black p-5 space-y-3 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                    <div className="space-y-1 pl-2 text-left border-l-2 border-[#1a1a1a]">
                      <h3 className="text-xs font-black tracking-widest text-[#1a1a1a] font-display uppercase">
                        REPORTE DE ESTABILIDAD INDUSTRIAL
                      </h3>
                      <p className="text-[10px] text-[#1a1a1a]/85 leading-relaxed font-display font-medium">
                        El visor 3D procesa la geometría de la tipología <strong>{config.style.toUpperCase()}</strong> con la aleación activa <strong>{simulationParams.materialName.toUpperCase()}</strong>. Las ráfagas eólicas inducen un desplazamiento senoidal sobre la masa suspendida, visualizando el límite elástico del material.
                      </p>
                    </div>

                    {/* Technical detail cards */}
                    <div className="border-t border-black/15 pt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[9.5px] font-mono text-left">
                        <div className="bg-[#f8f7f4] p-2 border border-black/15 shadow-[2px_2px_0px_rgba(26,26,26,1)]">
                          <p className="text-[8.5px] text-[#1a1a1a]/75 font-mono font-black uppercase tracking-wide">// DEFORMACIÓN CRÍTICA</p>
                          <p className="text-[#1a1a1a] font-display font-black text-sm mt-0.5">
                            {simulationParams.elasticModulus} GPa
                          </p>
                          <span className="text-[7.5px] text-[#1a1a1a]/50 font-bold">MÓDULO DE YOUNG (E)</span>
                        </div>
                        <div className="bg-[#f8f7f4] p-2 border border-black/15 shadow-[2px_2px_0px_rgba(26,26,26,1)]">
                          <p className="text-[8.5px] text-[#1a1a1a]/75 font-mono font-black uppercase tracking-wide">// ESFUERZO MÁXIMO</p>
                          <p className="text-[#1a1a1a] font-display font-black text-sm mt-0.5">
                            {simulationParams.yieldStrength} MPa
                          </p>
                          <span className="text-[7.5px] text-[#1a1a1a]/50 font-bold">LÍMITE DE CEDENCIA</span>
                        </div>
                        <div className="bg-[#f8f7f4] p-2 border border-black/15 col-span-2 sm:col-span-1 shadow-[2px_2px_0px_rgba(26,26,26,1)]">
                          <p className="text-[8.5px] text-[#1a1a1a]/75 font-mono font-black uppercase tracking-wide">// VOLUMEN DE MASA</p>
                          <p className="text-[#1a1a1a] font-display font-black text-sm mt-0.5">
                            {simulationParams.materialDensity.toFixed(2)} g/cm³
                          </p>
                          <span className="text-[7.5px] text-[#1a1a1a]/50 font-bold">DENSIDAD DE ALEACIÓN</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CONTROL PARAMÉTRICO CAD Y FEA DE ARÍSTIDES */}
              {activeTab === "params" && (
                <div className="bg-white border-2 border-black p-6 space-y-6 shadow-[4px_4px_0px_#000000] animate-fadeIn text-left">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-black pb-3 gap-2">
                    <div>
                      <h2 className="text-xs font-black font-display text-black tracking-widest flex items-center gap-1.5 uppercase pl-2 border-l-2 border-[#1a1a1a]">
                        <Sliders className="w-3.5 h-3.5 text-[#1a1a1a] animate-pulse" /> ESTACIÓN DE CONTROL PARAMÉTRICO // CAD & FEA CONSOLE
                      </h2>
                      <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest mt-1 pl-2">
                        MANIPULACIÓN TOTAL SIN RESTRICCIONES PREESTABLECIDAS
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-[9.5px] text-[#1a1a1a]/80 hover:text-black font-mono flex items-center gap-1 cursor-pointer transition-colors font-black border border-[#1a1a1a]/25 px-2 py-1 bg-white hover:bg-[#f8f7f4]"
                      onClick={() => {
                        setSimulationParams({
                          windForce: 20,
                          appliedLoad: 5.0,
                          materialName: "Titanio Grado 5",
                          elasticModulus: 115,
                          yieldStrength: 880,
                          materialDensity: 4.43,
                          complexity: 7,
                        });
                        addSystemChatMessage("[CAD] Parámetros de simulación física reiniciados al estado base.");
                      }}
                    >
                      <RotateCcw className="w-3 h-3 text-[#1a1a1a]" /> RECOMPILAR
                    </button>
                  </div>

                  {/* Three-Column Professional CAD Workstation Layout */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    
                    {/* SECTION 1: ENVIRONMENTAL LOADS & ALLOY METRICS */}
                    <div className="bg-[#f8f7f4] p-4 border-2 border-black space-y-4 shadow-[2px_2px_0px_rgba(26,26,26,1)]">
                      <div className="border-b border-black pb-1.5 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-[#1a1a1a] animate-pulse" />
                        <span className="text-[10px] font-mono font-black text-black uppercase tracking-wider">// 01. CARGAS DE SIMULACIÓN Y ALEACIONES</span>
                      </div>

                      {/* Wind slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-mono font-black text-neutral-500 uppercase">
                          <span>Velocidad del Viento</span>
                          <span className="text-black">{simulationParams.windForce} km/h</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="180"
                          value={simulationParams.windForce}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSimulationParams((prev) => ({ ...prev, windForce: val }));
                          }}
                          className="w-full accent-[#00ffff] h-5 cursor-pointer bg-white border border-black px-1.5"
                        />
                      </div>

                      {/* Load slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-mono font-black text-neutral-500 uppercase">
                          <span>Carga Vertical de Trabajo</span>
                          <span className="text-black">{simulationParams.appliedLoad} Toneladas</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          step="0.5"
                          value={simulationParams.appliedLoad}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSimulationParams((prev) => ({ ...prev, appliedLoad: val }));
                          }}
                          className="w-full accent-[#00ffff] h-5 cursor-pointer bg-white border border-black px-1.5"
                        />
                      </div>

                      {/* Alloys dropdown presets */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono font-black text-neutral-500 uppercase block">
                          Selección de Aleación (Preset)
                        </label>
                        <select
                          value={simulationParams.materialName}
                          onChange={(e) => {
                            const name = e.target.value;
                            const matched = materialsList.find((m) => m.name === name);
                            if (matched) {
                              setSimulationParams((prev) => ({
                                ...prev,
                                materialName: matched.name,
                                elasticModulus: matched.modulus,
                                yieldStrength: matched.yieldS,
                                materialDensity: matched.density,
                              }));
                              addSystemChatMessage(`[CAD] Aleación cambiada a preset: "${name}".`);
                            } else {
                              setSimulationParams((prev) => ({
                                ...prev,
                                materialName: name,
                              }));
                            }
                          }}
                          className="w-full bg-white text-[10px] border border-black p-1.5 font-display font-bold outline-none"
                        >
                          {materialsList.map((m) => (
                            <option key={m.name} value={m.name}>
                              {m.name} (E: {m.modulus} GPa, Fy: {m.yieldS} MPa)
                            </option>
                          ))}
                          <option value="Material Personalizado">Material Personalizado (Tweak Libre)</option>
                        </select>
                      </div>

                      {/* Manual metrics override (Unprescribed inputs!) */}
                      <div className="border-t border-dashed border-black/25 pt-2.5 space-y-2 text-[9.5px]">
                        <div className="font-mono text-[8px] text-neutral-400 font-black">// MODIFICACIÓN DE PARÁMETROS LIBRES</div>
                        
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-neutral-600">Nombre de Aleación:</span>
                          <input
                            type="text"
                            value={simulationParams.materialName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSimulationParams((prev) => ({ ...prev, materialName: val }));
                            }}
                            className="w-full bg-white border border-black px-2 py-1 font-display font-black text-[10px]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-neutral-600">E (GPa):</span>
                            <input
                              type="number"
                              value={simulationParams.elasticModulus}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setSimulationParams((prev) => ({ ...prev, elasticModulus: val }));
                              }}
                              className="w-full bg-white border border-black px-2 py-1 font-mono font-bold text-[10px]"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-neutral-600">Fluencia (MPa):</span>
                            <input
                              type="number"
                              value={simulationParams.yieldStrength}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setSimulationParams((prev) => ({ ...prev, yieldStrength: val }));
                              }}
                              className="w-full bg-white border border-black px-2 py-1 font-mono font-bold text-[10px]"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="font-mono font-bold text-neutral-600">Densidad (g/cm³):</span>
                          <input
                            type="number"
                            step="0.01"
                            value={simulationParams.materialDensity}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSimulationParams((prev) => ({ ...prev, materialDensity: val }));
                            }}
                            className="w-full bg-white border border-black px-2 py-1 font-mono font-bold text-[10px]"
                          />
                        </div>

                        <div className="flex gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const baseName = simulationParams.materialName;
                              const cloneName = `${baseName} (Clon ${materialsList.filter(m => m.name.startsWith(baseName)).length + 1})`;
                              const clonedMat = {
                                name: cloneName,
                                modulus: simulationParams.elasticModulus,
                                yieldS: simulationParams.yieldStrength,
                                density: simulationParams.materialDensity,
                              };
                              setMaterialsList((prev) => [...prev, clonedMat]);
                              setSimulationParams((prev) => ({
                                ...prev,
                                materialName: cloneName,
                              }));
                              addSystemChatMessage(`[CAD] Clon creado con éxito: "${cloneName}" registrado en base de datos de aleaciones.`);
                            }}
                            className="flex-1 bg-[#f8f7f4] hover:bg-[#00ffff] hover:text-[#1a1a1a] border border-black text-[8.5px] font-display font-black py-1.5 uppercase transition-colors cursor-pointer"
                          >
                            Clonar Activo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newMat = {
                                name: simulationParams.materialName,
                                modulus: simulationParams.elasticModulus,
                                yieldS: simulationParams.yieldStrength,
                                density: simulationParams.materialDensity,
                              };
                              setMaterialsList((prev) => {
                                const exists = prev.some((m) => m.name.toLowerCase() === newMat.name.toLowerCase());
                                if (exists) {
                                  return prev.map((m) => m.name.toLowerCase() === newMat.name.toLowerCase() ? newMat : m);
                                }
                                return [...prev, newMat];
                              });
                              addSystemChatMessage(`[CAD] Material "${newMat.name}" guardado/actualizado en la base de datos.`);
                            }}
                            className="flex-1 bg-[#1a1a1a] text-white hover:bg-[#00ffff] hover:text-black border border-black text-[8.5px] font-display font-black py-1.5 uppercase transition-colors cursor-pointer"
                          >
                            Registrar Preset
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: NODE MATRIX EDITOR */}
                    <div className="bg-[#f8f7f4] p-4 border-2 border-black space-y-4 flex flex-col h-[500px] shadow-[2px_2px_0px_rgba(26,26,26,1)]">
                      <div className="border-b border-black pb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Database className="w-3.5 h-3.5 text-[#1a1a1a]" />
                          <span className="text-[10px] font-mono font-black text-black uppercase tracking-wider">// 02. MATRIZ DE NUDOS 3D ({points.length})</span>
                        </div>
                      </div>

                      {/* Scrollable node spreadsheet */}
                      <div className="flex-1 overflow-y-auto border border-black bg-white">
                        <table className="w-full text-left font-mono text-[9.5px]">
                          <thead className="bg-[#f8f7f4] border-b border-black text-[#1a1a1a]/60 text-[8px]">
                            <tr>
                              <th className="p-1 border-r border-black/10">ID / LABEL</th>
                              <th className="p-1 border-r border-black/10">X</th>
                              <th className="p-1 border-r border-black/10">Y</th>
                              <th className="p-1 border-r border-black/10">Z</th>
                              <th className="p-1 text-center">DEL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {points.map((pt, idx) => (
                              <tr key={pt.id} className="border-b border-black/5 hover:bg-[#00ffff]/5 transition-colors">
                                <td className="p-1 border-r border-black/10 font-black max-w-[70px] truncate" title={pt.label || pt.id}>
                                  {pt.label || pt.id}
                                </td>
                                <td className="p-0.5 border-r border-black/10">
                                  <input
                                    type="number"
                                    value={pt.x}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setPoints((prev) =>
                                        prev.map((p, i) => (i === idx ? { ...p, x: val } : p))
                                      );
                                    }}
                                    className="w-11 bg-transparent px-0.5 py-0.5 outline-none font-bold text-neutral-700 font-mono"
                                  />
                                </td>
                                <td className="p-0.5 border-r border-black/10">
                                  <input
                                    type="number"
                                    value={pt.y}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setPoints((prev) =>
                                        prev.map((p, i) => (i === idx ? { ...p, y: val } : p))
                                      );
                                    }}
                                    className="w-11 bg-transparent px-0.5 py-0.5 outline-none font-bold text-neutral-700 font-mono"
                                  />
                                </td>
                                <td className="p-0.5 border-r border-black/10">
                                  <input
                                    type="number"
                                    value={pt.z}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setPoints((prev) =>
                                        prev.map((p, i) => (i === idx ? { ...p, z: val } : p))
                                      );
                                    }}
                                    className="w-11 bg-transparent px-0.5 py-0.5 outline-none font-bold text-neutral-700 font-mono"
                                  />
                                </td>
                                <td className="p-0.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPoints((prev) => prev.filter((_, i) => i !== idx));
                                      addSystemChatMessage(`[CAD] Nudo eliminado en el índice ${idx} (${pt.label || pt.id}).`);
                                    }}
                                    className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1 font-black"
                                    title="Eliminar nudo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Quick Node Creator Form */}
                      <div className="bg-white border border-black p-2.5 space-y-2 shrink-0">
                        <span className="text-[8.5px] font-mono font-black text-black block uppercase tracking-wide">// AGREGAR NUDO MANUAL</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            placeholder="Etiqueta (N-4)"
                            value={newNodeLabel}
                            onChange={(e) => setNewNodeLabel(e.target.value)}
                            className="w-full bg-[#f8f7f4] border border-black/30 px-1.5 py-1 text-[10px] outline-none focus:border-black font-display font-bold col-span-2 text-[#1a1a1a]"
                          />
                          <div className="relative">
                            <span className="absolute left-1 top-0.5 text-[7px] text-neutral-400 font-mono">X</span>
                            <input
                              type="number"
                              value={newNodeX}
                              onChange={(e) => setNewNodeX(e.target.value)}
                              className="w-full bg-[#f8f7f4] border border-black/30 pl-3 pr-1 py-1 text-[10px] outline-none font-mono text-[#1a1a1a]"
                            />
                          </div>
                          <div className="relative">
                            <span className="absolute left-1 top-0.5 text-[7px] text-neutral-400 font-mono">Y</span>
                            <input
                              type="number"
                              value={newNodeY}
                              onChange={(e) => setNewNodeY(e.target.value)}
                              className="w-full bg-[#f8f7f4] border border-black/30 pl-3 pr-1 py-1 text-[10px] outline-none font-mono text-[#1a1a1a]"
                            />
                          </div>
                          <div className="relative">
                            <span className="absolute left-1 top-0.5 text-[7px] text-neutral-400 font-mono">Z</span>
                            <input
                              type="number"
                              value={newNodeZ}
                              onChange={(e) => setNewNodeZ(e.target.value)}
                              className="w-full bg-[#f8f7f4] border border-black/30 pl-3 pr-1 py-1 text-[10px] outline-none font-mono text-[#1a1a1a]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const label = newNodeLabel.trim() || `N-MANUAL-${points.length + 1}`;
                              const xVal = parseFloat(newNodeX) || 0;
                              const yVal = parseFloat(newNodeY) || 0;
                              const zVal = parseFloat(newNodeZ) || 0;
                              const newPt: Point3D = {
                                id: `n-man-${Date.now()}`,
                                x: xVal,
                                y: yVal,
                                z: zVal,
                                  label,
                              };
                              setPoints((prev) => [...prev, newPt]);
                              addSystemChatMessage(`[CAD] Nudo agregado manualmente: "${label}" en [X: ${xVal}, Y: ${yVal}, Z: ${zVal}].`);
                              setNewNodeLabel("");
                              setNewNodeX("0");
                              setNewNodeY("0");
                              setNewNodeZ("0");
                            }}
                            className="bg-[#1a1a1a] text-[#f8f7f4] hover:bg-[#00ffff] hover:text-[#1a1a1a] font-display font-black text-[9px] uppercase px-3 transition-colors cursor-pointer border border-[#1a1a1a] flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> AGREGAR
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: EDGE CONNECTIONS & TRUSS SEGMENTS */}
                    <div className="bg-[#f8f7f4] p-4 border-2 border-black space-y-4 flex flex-col h-[500px] shadow-[2px_2px_0px_rgba(26,26,26,1)]">
                      <div className="border-b border-black pb-1.5 flex items-center gap-1">
                        <Hammer className="w-3.5 h-3.5 text-[#1a1a1a]" />
                        <span className="text-[10px] font-mono font-black text-black uppercase tracking-wider">// 03. MATRIZ DE CONEXIONES ({edges.length})</span>
                      </div>

                      {/* Scrollable edge catalog */}
                      <div className="flex-1 overflow-y-auto border border-black bg-white">
                        <table className="w-full text-left font-mono text-[9.5px]">
                          <thead className="bg-[#f8f7f4] border-b border-black text-[#1a1a1a]/60 text-[8px]">
                            <tr>
                              <th className="p-1 border-r border-black/10">ENLACE</th>
                              <th className="p-1 border-r border-black/10">ORIGEN (NUDO A)</th>
                              <th className="p-1 border-r border-black/10">DESTINO (NUDO B)</th>
                              <th className="p-1 text-center">ELIMINAR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {edges.map((edge, idx) => {
                              const fromNode = points[edge.source]?.label || `Nudo ${edge.source}`;
                              const toNode = points[edge.target]?.label || `Nudo ${edge.target}`;
                              return (
                                <tr key={idx} className="border-b border-black/5 hover:bg-[#00ffff]/5 transition-colors">
                                  <td className="p-1 border-r border-black/10 font-bold text-neutral-400">
                                    #{idx + 1}
                                  </td>
                                  <td className="p-1 border-r border-black/10 text-neutral-700 font-medium">
                                    {fromNode} <span className="text-[8px] text-neutral-400">(Idx: {edge.source})</span>
                                  </td>
                                  <td className="p-1 border-r border-black/10 text-neutral-700 font-medium">
                                    {toNode} <span className="text-[8px] text-neutral-400">(Idx: {edge.target})</span>
                                  </td>
                                  <td className="p-0.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEdges((prev) => prev.filter((_, i) => i !== idx));
                                        addSystemChatMessage(`[CAD] Conexión eliminada entre índice ${edge.source} y ${edge.target}.`);
                                      }}
                                      className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1 font-black"
                                      title="Desconectar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Connection Creator Form */}
                      <div className="bg-white border border-black p-2.5 space-y-2 shrink-0">
                        <span className="text-[8.5px] font-mono font-black text-black block uppercase tracking-wide">// ESTABLECER ENLACE DE VIGA</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="space-y-0.5">
                            <span className="text-[7.5px] font-mono text-neutral-400 uppercase font-bold">Nudo de Origen (A):</span>
                            <select
                              value={newEdgeSource}
                              onChange={(e) => setNewEdgeSource(e.target.value)}
                              className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/30 p-1 text-[10px] outline-none font-bold"
                            >
                              <option value="">Seleccione...</option>
                              {points.map((pt, idx) => (
                                <option key={pt.id} value={idx}>
                                  {pt.label || `Nudo ${idx}`} (Idx: {idx})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[7.5px] font-mono text-neutral-400 uppercase font-bold">Nudo de Destino (B):</span>
                            <select
                              value={newEdgeTarget}
                              onChange={(e) => setNewEdgeTarget(e.target.value)}
                              className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/30 p-1 text-[10px] outline-none font-bold"
                            >
                              <option value="">Seleccione...</option>
                              {points.map((pt, idx) => (
                                <option key={pt.id} value={idx}>
                                  {pt.label || `Nudo ${idx}`} (Idx: {idx})
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const srcIdx = parseInt(newEdgeSource);
                              const tgtIdx = parseInt(newEdgeTarget);
                              if (isNaN(srcIdx) || isNaN(tgtIdx) || srcIdx < 0 || tgtIdx < 0) {
                                alert("Por favor seleccione nudos válidos de Origen y Destino.");
                                return;
                              }
                              if (srcIdx === tgtIdx) {
                                alert("No se puede conectar un nudo consigo mismo.");
                                return;
                              }
                              // Check if edge already exists
                              const exists = edges.some(
                                (e) => (e.source === srcIdx && e.target === tgtIdx) || (e.source === tgtIdx && e.target === srcIdx)
                              );
                              if (exists) {
                                alert("Esta conexión de viga ya existe.");
                                return;
                              }
                              setEdges((prev) => [...prev, { source: srcIdx, target: tgtIdx }]);
                              addSystemChatMessage(`[CAD] Enlace creado entre nudo ${points[srcIdx]?.label || srcIdx} y nudo ${points[tgtIdx]?.label || tgtIdx}.`);
                              setNewEdgeSource("");
                              setNewEdgeTarget("");
                            }}
                            className="col-span-2 w-full py-2 bg-[#1a1a1a] text-[#f8f7f4] hover:bg-[#00ffff] hover:text-[#1a1a1a] font-display font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer border border-[#1a1a1a] flex items-center justify-center gap-1.5"
                          >
                            <FolderPlus className="w-3.5 h-3.5" /> ESTABLECER CONEXIÓN PARAMÉTRICA
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 5: ARCHIVO DE HISTORIAL */}
              {activeTab === "history" && (
                <div className="bg-white border-2 border-black h-[520px] flex flex-col overflow-hidden relative shadow-[4px_4px_0px_#000000] animate-fadeIn text-left">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f8f7f4] border-b-2 border-black">
                    <span className="text-[10px] text-black font-black font-display uppercase tracking-widest flex items-center gap-1.5">
                      <Layout className="w-3.5 h-3.5 text-black animate-pulse" /> ARCHIVO DE RENDERIZADOS ({history.length})
                    </span>
                    {history.length > 0 && (
                      <button
                        onClick={handleClearHistory}
                        className="text-[8.5px] font-mono text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-bold border-2 border-rose-500/35 px-2 py-0.5 bg-white shadow-[2px_2px_0px_#000000]"
                      >
                        <Trash2 className="w-3 h-3" /> VACIAR ARCHIVO
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#f8f7f4]">
                    {history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center p-6 text-[#1a1a1a]/60 h-full select-none">
                        <RotateCcw className="w-10 h-10 text-black/30 mb-2 animate-spin-slow" />
                        <p className="text-[10px] font-mono text-[#1a1a1a] font-black uppercase tracking-widest">// ARCHIVO_VACÍO</p>
                        <p className="text-[9px] text-[#1a1a1a]/60 mt-1 font-display font-medium">
                          Cada estructura generada se guardará aquí de forma durable.
                        </p>
                      </div>
                    ) : (
                      history.map((hItem) => {
                        const isSelected = currentStructure?.id === hItem.id;
                        return (
                          <div
                            key={hItem.id}
                            onClick={() => handleLoadHistoryItem(hItem)}
                            className={`p-2 rounded-none border-2 text-left cursor-pointer transition-all relative group flex gap-2.5 shadow-[2px_2px_0px_#000000] ${
                              isSelected
                                ? "bg-[#00ffff]/10 border-black"
                                : "bg-white hover:bg-[#f8f7f4] border-black/20 hover:border-black"
                            }`}
                          >
                            <img
                              src={hItem.imageUrl}
                              alt={hItem.title}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 object-cover rounded-none bg-black border border-black/20 shrink-0"
                            />
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <p className="text-[10.5px] font-black text-black font-display truncate group-hover:text-black transition-colors">
                                  {hItem.title.toUpperCase()}
                                </p>
                                <p className="text-[8.5px] text-black/70 font-mono italic truncate font-black tracking-wide">
                                  {hItem.config.style}
                                </p>
                              </div>
                              <span className="text-[8px] font-mono text-black/50 font-bold">
                                TIME_STAMP: {hItem.timestamp}
                              </span>
                            </div>
                            <button
                              onClick={(e) => handleDeleteHistoryItem(hItem.id, e)}
                              className="p-1 text-black/40 hover:text-rose-600 self-start hover:bg-white border border-transparent hover:border-rose-300 transition-all cursor-pointer"
                              title="Eliminar Registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: CATÁLOGO Y ESTIMADOR DE COSTES (PIEZAS METÁLICAS) */}
              {activeTab === "catalog" && (
                <div className="bg-white border-2 border-black p-6 flex flex-col gap-6 overflow-y-auto h-[550px] relative shadow-[4px_4px_0px_#000000] animate-fadeIn text-left">
                  
                  {/* Coeficiente de Volatilidad de Costes */}
                  <div className="bg-[#f8f7f4] border-2 border-black p-4 shadow-[3px_3px_0px_rgba(26,26,26,1)]">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <h3 className="text-xs font-black font-display text-black uppercase tracking-wider flex items-center gap-1.5">
                          <Scale className="w-4 h-4 text-[#1a1a1a]" />
                          COEFICIENTE DE FLUCTUACIÓN DEL MERCADO DE METALES (VOLATILIDAD)
                        </h3>
                        <p className="text-[10px] text-black/75 font-mono font-bold uppercase">
                          MANDATO INDUSTRIAL: El costo metalúrgico jamás es absoluto. Varía continuamente según aranceles, tarifas energéticas y escasez de aleación.
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xl font-mono font-black text-black bg-[#00ffff] border-2 border-black px-3 py-1">
                          {volatilityFactor.toFixed(2)}x
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold text-[#1a1a1a]/70">MIN (0.50x)</span>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.05"
                          value={volatilityFactor}
                          onChange={(e) => saveVolatilityFactor(parseFloat(e.target.value))}
                          className="flex-1 accent-[#00ffff] cursor-pointer h-2 bg-neutral-200"
                        />
                        <span className="text-[9px] font-mono font-bold text-[#1a1a1a]/70">MAX (2.50x)</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 justify-end">
                        <button
                          onClick={() => saveVolatilityFactor(0.80)}
                          className={`px-2 py-1 text-[8.5px] font-mono font-bold border-2 border-black transition-all ${
                            Math.abs(volatilityFactor - 0.8) < 0.01 ? "bg-black text-[#00ffff]" : "bg-white text-black hover:bg-[#f8f7f4]"
                          }`}
                        >
                          0.80x (Baja Demanda)
                        </button>
                        <button
                          onClick={() => saveVolatilityFactor(1.00)}
                          className={`px-2 py-1 text-[8.5px] font-mono font-bold border-2 border-black transition-all ${
                            Math.abs(volatilityFactor - 1.0) < 0.01 ? "bg-black text-[#00ffff]" : "bg-white text-black hover:bg-[#f8f7f4]"
                          }`}
                        >
                          1.00x (Costo Base)
                        </button>
                        <button
                          onClick={() => saveVolatilityFactor(1.50)}
                          className={`px-2 py-1 text-[8.5px] font-mono font-bold border-2 border-black transition-all ${
                            Math.abs(volatilityFactor - 1.5) < 0.01 ? "bg-black text-[#00ffff]" : "bg-white text-black hover:bg-[#f8f7f4]"
                          }`}
                        >
                          1.50x (Alza Acero)
                        </button>
                        <button
                          onClick={() => saveVolatilityFactor(2.20)}
                          className={`px-2 py-1 text-[8.5px] font-mono font-bold border-2 border-black transition-all ${
                            Math.abs(volatilityFactor - 2.2) < 0.01 ? "bg-black text-[#00ffff]" : "bg-white text-black hover:bg-[#f8f7f4]"
                          }`}
                        >
                          2.20x (Suministro Crítico)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Google Sheets Synchronization Header Bar */}
                  <div className="bg-white border-2 border-black p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-[3px_3px_0px_rgba(26,26,26,1)]">
                    <div>
                      <h3 className="text-xs font-black font-display text-black uppercase tracking-wider flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-black animate-pulse" />
                        SINCRONIZACIÓN CON GOOGLE SHEETS
                      </h3>
                      <p className="text-[10px] text-black/75 font-mono font-bold uppercase mt-1">
                        Exporta el catálogo de productos y tu cotizador activo a una hoja de cálculo real en tu Google Drive.
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={handleExportCatalogToSheets}
                        disabled={isExporting !== null}
                        className="px-3 py-1.5 bg-[#1a1a1a] text-[#f8f7f4] hover:bg-[#00ffff] hover:text-black font-display text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border-2 border-black shadow-[2px_2px_0px_rgba(26,26,26,1)] disabled:opacity-50"
                      >
                        {isExporting === "catalog" ? (
                          <>
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                            <span>SINC_HOJA...</span>
                          </>
                        ) : (
                          <>
                            <FileDown className="w-3.5 h-3.5" />
                            <span>SINC_CATÁLOGO</span>
                          </>
                        )}
                      </button>

                      {exportUrl && (
                        <a
                          href={exportUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-black text-[#00ffff] border-2 border-black text-[9.5px] font-display font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:bg-[#00ffff] hover:text-black transition-all"
                        >
                          <span>ABRIR_SHEET →</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* TWO-COLUMN WORKSHEET GRID */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Column 1: Material Estimates & Totalizer */}
                    <div className="space-y-4">
                      <div className="border-b-2 border-black pb-2">
                        <h4 className="text-xs font-black font-display text-black uppercase tracking-wider flex items-center gap-1.5">
                          <Scale className="w-4 h-4 text-black animate-spin-slow" />
                          01. ESTIMACIÓN DE MATERIALES ACTIVA
                        </h4>
                      </div>

                      {estimates.length === 0 ? (
                        <div className="border-2 border-dashed border-black/20 p-6 text-center text-black/60 font-mono text-[10px] bg-gray-50 uppercase font-bold tracking-widest">
                          // Cotizador vacío. Agregue piezas del catálogo general.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {estimates.map((est) => {
                            const prod = products.find((p) => p.id === est.productId);
                            if (!prod) return null;
                            const volatilePrice = prod.priceMXN * volatilityFactor;
                            const subtotal = volatilePrice * est.quantity;
                            return (
                              <div key={est.productId} className="bg-white border-2 border-black p-3 flex justify-between items-center shadow-[2px_2px_0px_#000000] relative group">
                                <div className="space-y-1">
                                  <span className="bg-black text-[#00ffff] text-[7.5px] font-mono px-1.5 py-0.5 font-bold uppercase tracking-wider">
                                    {prod.family}
                                  </span>
                                  <h5 className="text-[11px] font-black text-black font-display uppercase tracking-wide">
                                    {prod.name}
                                  </h5>
                                  <p className="text-[9.5px] text-black/60 font-mono font-bold uppercase flex flex-col">
                                    <span>Base: ${prod.priceMXN.toFixed(2)} MXN / Unidad</span>
                                    <span className="text-black font-black">Ajustado: ${volatilePrice.toFixed(2)} MXN</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="flex items-center border-2 border-black">
                                    <button
                                      onClick={() => {
                                        const nextQty = Math.max(1, est.quantity - 1);
                                        const updated = estimates.map((e) =>
                                          e.productId === est.productId ? { ...e, quantity: nextQty } : e
                                        );
                                        saveEstimates(updated);
                                      }}
                                      className="px-2 py-0.5 bg-[#f8f7f4] hover:bg-[#00ffff] hover:text-black border-r-2 border-black font-mono text-xs font-black cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={est.quantity}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        const updated = estimates.map((ev) =>
                                          ev.productId === est.productId ? { ...ev, quantity: val } : ev
                                        );
                                        saveEstimates(updated);
                                      }}
                                      className="w-10 text-center font-mono text-xs font-black bg-white focus:outline-none"
                                    />
                                    <button
                                      onClick={() => {
                                        const updated = estimates.map((e) =>
                                          e.productId === est.productId ? { ...e, quantity: e.quantity + 1 } : e
                                        );
                                        saveEstimates(updated);
                                      }}
                                      className="px-2 py-0.5 bg-[#f8f7f4] hover:bg-[#00ffff] hover:text-black border-l-2 border-black font-mono text-xs font-black cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <div className="text-right min-w-[75px]">
                                    <p className="text-[11px] font-black text-black font-mono">
                                      ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <button
                                      onClick={() => {
                                        const updated = estimates.filter((e) => e.productId !== est.productId);
                                        saveEstimates(updated);
                                      }}
                                      className="text-[7.5px] font-mono text-rose-600 hover:text-rose-800 font-bold uppercase underline cursor-pointer"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* GRAND TOTAL TOTALIZER CARD */}
                      <div className="bg-black text-white p-4 shadow-[4px_4px_0px_rgba(26,26,26,0.15)] flex justify-between items-center border-2 border-black">
                        <div>
                          <span className="text-[8.5px] font-mono text-[#00ffff] uppercase tracking-wider font-extrabold block">
                            // TOTAL MATERIALES INDUSTRIALES ESTIMADO (VOLÁTIL)
                          </span>
                          <span className="text-[9px] text-white/75 font-mono uppercase font-bold mt-1 block">
                            Calculado con un factor de fluctuación del {volatilityFactor.toFixed(2)}x
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[20px] font-mono font-black text-[#00ffff]">
                            $
                            {estimates
                              .reduce((total, est) => {
                                const prod = products.find((p) => p.id === est.productId);
                                return total + (prod ? (prod.priceMXN * volatilityFactor) * est.quantity : 0);
                              }, 0)
                              .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                            MXN
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Add New Piece Form */}
                    <div className="space-y-4">
                      <div className="border-b-2 border-black pb-2">
                        <h4 className="text-xs font-black font-display text-black uppercase tracking-wider flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-black animate-pulse" />
                          02. AGREGAR NUEVA PIEZA METÁLICA AL CATÁLOGO
                        </h4>
                      </div>

                      <div className="border-2 border-black p-4 space-y-3 bg-white shadow-[2px_2px_0px_#000000]">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[8.5px] font-mono text-black font-black uppercase mb-1">
                              Nombre de la Pieza
                            </label>
                            <input
                              type="text"
                              value={newProductName}
                              onChange={(e) => setNewProductName(e.target.value)}
                              placeholder="Ej. Soporte Angular Corten"
                              className="w-full bg-white text-[10.5px] border-2 border-black p-2 focus:outline-none font-bold shadow-[1.5px_1.5px_0px_#000000]"
                            />
                          </div>
                          <div>
                            <label className="block text-[8.5px] font-mono text-black font-black uppercase mb-1">
                              Categoría Industrial
                            </label>
                            <select
                              value={newProductCategory}
                              onChange={(e) => setNewProductCategory(e.target.value)}
                              className="w-full bg-white text-[10.5px] border-2 border-black p-2 focus:outline-none font-bold shadow-[1.5px_1.5px_0px_#000000]"
                            >
                              <option value="Tensegridad">Tensegridad</option>
                              <option value="Uniones">Uniones</option>
                              <option value="Estructuras">Estructuras</option>
                              <option value="Acero Corten">Acero Corten</option>
                              <option value="Anclaje Base">Anclaje Base</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="block text-[8.5px] font-mono text-black font-black uppercase mb-1">
                              Descripción / Especificaciones
                            </label>
                            <input
                              type="text"
                              value={newProductDesc}
                              onChange={(e) => setNewProductDesc(e.target.value)}
                              placeholder="Fricción extrema contra intemperie."
                              className="w-full bg-white text-[10.5px] border-2 border-black p-2 focus:outline-none font-bold shadow-[1.5px_1.5px_0px_#000000]"
                            />
                          </div>
                          <div>
                            <label className="block text-[8.5px] font-mono text-black font-black uppercase mb-1">
                              Valor (MXN)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={newProductPrice}
                              onChange={(e) => setNewProductPrice(e.target.value)}
                              placeholder="45.00"
                              className="w-full bg-white text-[10.5px] border-2 border-black p-2 focus:outline-none font-bold shadow-[1.5px_1.5px_0px_#000000]"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!newProductName.trim() || !newProductPrice.trim()) {
                              alert("Escriba el nombre de la pieza y su valor unitario.");
                              return;
                            }
                            const priceVal = parseFloat(newProductPrice) || 0;
                            const newP: ProductItem = {
                              id: `p-${Date.now()}`,
                              name: newProductName.trim(),
                              family: newProductCategory,
                              description: newProductDesc.trim() || "Sin descripción.",
                              saleFormat: "Unidad",
                              length: "-",
                              color: "-",
                              thickness: "-",
                              caliber: "-",
                              type: "-",
                              specificSize: "-",
                              weightKg: 0,
                              priceMXN: priceVal,
                            };
                            const updated = [...products, newP];
                            saveProducts(updated);
                            setNewProductName("");
                            setNewProductDesc("");
                            setNewProductPrice("");
                          }}
                          className="w-full py-2 bg-[#1a1a1a] text-white hover:bg-[#00ffff] hover:text-black font-display text-[10px] font-black uppercase tracking-wider transition-all border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#000000] cursor-pointer"
                        >
                          Crear y Registrar Pieza en Catálogo
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* SECTION 03: GLOBAL CATALOG LIST OF PARTS */}
                  <div className="space-y-4 pt-4 border-t-2 border-black/10">
                    <div className="border-b-2 border-black pb-2 flex justify-between items-center">
                      <h4 className="text-xs font-black font-display text-black uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-black" />
                        03. CATÁLOGO GENERAL DE PIEZAS METÁLICAS ({products.length})
                      </h4>
                      <p className="text-[9px] font-mono text-black/60 uppercase font-black">
                        Haga clic en agregar para anexar material a la cotización
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {products.map((prod) => {
                        const volatilePrice = prod.priceMXN * volatilityFactor;
                        const minEst = prod.priceMXN * 0.7;
                        const maxEst = prod.priceMXN * 1.8;
                        return (
                          <div key={prod.id} className="bg-[#f8f7f4] hover:bg-white border-2 border-black p-3.5 flex flex-col justify-between transition-colors shadow-[2px_2px_0px_#000000] relative group">
                            
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="bg-black text-[#00ffff] text-[7.5px] font-mono px-1.5 py-0.5 font-black uppercase tracking-wider">
                                  {prod.family.toUpperCase()}
                                </span>
                                <div className="text-right">
                                  <span className="text-[12px] font-mono font-black text-black block">
                                    ${volatilePrice.toFixed(2)} MXN
                                  </span>
                                  <span className="text-[8px] font-mono font-bold text-gray-400 block">
                                    Base: ${prod.priceMXN.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              <h5 className="text-[11px] font-black text-black font-display uppercase tracking-wide">
                                {prod.name}
                              </h5>
                              <p className="text-[9.5px] text-black/85 leading-relaxed">
                                {prod.description}
                              </p>

                              
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1 py-1 text-[8px] font-mono text-black uppercase border-b-2 border-black/10 pb-2">
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Formato:</span> <span className="font-black">{prod.saleFormat}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Longitud:</span> <span className="font-black">{prod.length}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Grosor:</span> <span className="font-black">{prod.thickness}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Calibre:</span> <span className="font-black">{prod.caliber}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Tipo:</span> <span className="font-black">{prod.type}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Tamaño:</span> <span className="font-black">{prod.specificSize}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Color:</span> <span className="font-black">{prod.color}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Peso:</span> <span className="font-black">{prod.weightKg ? prod.weightKg.toFixed(2) : "0.00"} kg</span></div>
                              </div>
                              {/* Price range indicator to emphasize variability/fluctuation */}
                              <div className="pt-2">
                                <div className="flex justify-between text-[7.5px] font-mono text-gray-400 font-bold uppercase">
                                  <span>Fluct_Min: ${minEst.toFixed(1)}</span>
                                  <span>Fluct_Max: ${maxEst.toFixed(1)}</span>
                                </div>
                                <div className="w-full h-1 bg-gray-200 mt-1 relative overflow-hidden">
                                  <div 
                                    className="h-full bg-[#00ffff] transition-all duration-300"
                                    style={{ 
                                      width: `${Math.min(100, Math.max(10, ((volatilePrice - minEst) / (maxEst - minEst)) * 100))}%` 
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-4 pt-3 border-t border-black/10">
                              <button
                                onClick={() => {
                                  const exist = estimates.find((e) => e.productId === prod.id);
                                  if (exist) {
                                    const updated = estimates.map((e) =>
                                      e.productId === prod.id ? { ...e, quantity: e.quantity + 1 } : e
                                    );
                                    saveEstimates(updated);
                                  } else {
                                    const updated = [...estimates, { productId: prod.id, quantity: 1 }];
                                    saveEstimates(updated);
                                  }
                                }}
                                className="flex-1 py-1.5 bg-[#00ffff] text-black hover:bg-black hover:text-white border-2 border-black font-display text-[8.5px] font-black uppercase tracking-wider cursor-pointer transition-all"
                              >
                                + Cotizar Pieza
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Seguro que desea eliminar "${prod.name}" del catálogo?`)) {
                                    const updated = products.filter((p) => p.id !== prod.id);
                                    saveProducts(updated);
                                    const updatedEst = estimates.filter((e) => e.productId !== prod.id);
                                    saveEstimates(updatedEst);
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border-2 border-black font-display text-[8.5px] font-black uppercase tracking-wider cursor-pointer transition-all"
                                title="Eliminar de Catálogo"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* --- MASSIVE INLINE WORKSTATION ARCHITECTCHAT PANEL --- */}
              <div className="lg:hidden bg-[#f8f7f4] border-t-2 border-black mt-12 pt-6">
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-black/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-[#1a1a1a] animate-pulse" />
                      <h3 className="text-xs font-black tracking-widest text-[#1a1a1a] uppercase font-display">
                        // CONSOLA INTERACTIVA MASIVA DE ARÍSTIDES (CO-PILOTO)
                      </h3>
                    </div>
                    <div className="text-[8px] font-mono text-black/50 tracking-wider">
                      // MODEL: {aiModel.toUpperCase()} // ACTIVE SESSION
                    </div>
                  </div>
                  
                  <div className="h-[550px] bg-white border border-black/20 shadow-[2px_2px_0px_rgba(26,26,26,1)]">
                    <ArchitectChat
                      messages={chatMessages}
                      isLoading={isChatLoading}
                      onSendMessage={handleSendChatMessage}
                      onLoadPrompt={handleLoadSuggestedPrompt}
                      useGravity={useGravity}
                      onToggleGravity={setUseGravity}
                      researchThemes={researchThemes}
                      onAddAsNewTheme={onAddAsNewTheme}
                      onAddToExistingTheme={onAddToExistingTheme}
                      aiModel={aiModel}
                      onChangeAiModel={setAiModel}
                    />
                  </div>
                </div>
              </div>

            </div> {/* Closes Tab content renderer inside central stream */}
          </div> {/* Closes Center Stream Content wrap div */}
        </main>
      </div> {/* Closes Central Workspace Main Stream Panel */}

      {/* Right Pilot Sidebar (380px wide) - Santi Vilanova VCS-01 aesthetics */}
      <aside className="hidden lg:flex flex-col w-[380px] shrink-0 border-l-2 border-black bg-white h-full overflow-hidden z-40 relative">
        <div className="absolute inset-0 bg-[#f8f7f4] bg-[radial-gradient(#1a1a1a_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-[0.07] pointer-events-none"></div>
        <div className="flex-1 overflow-hidden relative z-10 flex flex-col h-full">
          <ArchitectChat
            messages={chatMessages}
            isLoading={isChatLoading}
            onSendMessage={handleSendChatMessage}
            onLoadPrompt={handleLoadSuggestedPrompt}
            useGravity={useGravity}
            onToggleGravity={setUseGravity}
            researchThemes={researchThemes}
            onAddAsNewTheme={onAddAsNewTheme}
            onAddToExistingTheme={onAddToExistingTheme}
            aiModel={aiModel}
            onChangeAiModel={setAiModel}
          />
        </div>
      </aside>
    </div>
    )}

      {/* --- LIGHTBOX FULLSCREEN ZOOM --- */}
      {isLightboxOpen && currentStructure?.imageUrl && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-[#f8f7f4] border-4 border-black p-6 rounded-none flex flex-col overflow-hidden shadow-[8px_8px_0px_rgba(26,26,26,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-none bg-[#1a1a1a] border border-black text-white hover:bg-[#00ffff] hover:text-black flex items-center justify-center font-black font-mono cursor-pointer"
            >
              ✕
            </button>

            {/* Title HUD info bar inside lightbox */}
            <div className="absolute bottom-6 left-6 right-6 z-10 bg-white border-2 border-black p-4 rounded-none shadow-[4px_4px_0px_rgba(26,26,26,1)] max-w-xl text-left select-text">
              <h4 className="text-xs font-black font-display text-[#1a1a1a] mb-1 uppercase tracking-widest">
                {currentStructure.title}
              </h4>
              <p className="text-[10px] text-[#1a1a1a]/80 italic mb-2">
                "{currentStructure.overview}"
              </p>
              <div className="flex gap-4 text-[9px] font-mono text-[#1a1a1a]/50 border-t border-black/10 pt-2 flex-wrap font-bold uppercase">
                <span>Tipología: <strong className="text-[#1a1a1a] font-black">{currentStructure.config.style}</strong></span>
                <span>Material: <strong className="text-[#1a1a1a] bg-[#00ffff] px-1.5 py-0.5 font-black">{currentStructure.techDetails.material}</strong></span>
                <span>Escala: <strong className="text-[#1a1a1a] font-black">{currentStructure.techDetails.escala}</strong></span>
              </div>
            </div>

            <img
              src={currentStructure.imageUrl}
              alt={currentStructure.title}
              referrerPolicy="no-referrer"
              className="max-h-[80vh] w-auto object-contain rounded-none border border-black bg-white"
            />
          </div>
        </div>
      )}

      {/* --- Technical Workstation Footer --- */}
      <footer className="border-t-2 border-black bg-white py-3.5 px-10 flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono font-bold uppercase tracking-widest text-[#1a1a1a]/60 shrink-0 select-none">
        <div className="mono">VCS-01 // MATERIAL_FORENSIC // ESTACIÓN_HUBS_01</div>
        <div className="mono flex gap-5 mt-1 sm:mt-0">
          <span>[ LATENCY: OPTIMAL ]</span>
          <span>[ REGION: MX_04 ]</span>
        </div>
      </footer>
    </div>
  );
}
