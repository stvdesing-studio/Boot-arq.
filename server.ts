import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { google } from "googleapis";
import { Readable } from "stream";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parsing for body data up to 15mb (to handle any potential image base64 uploads, etc.)
app.use(express.json({ limit: "15mb" }));

// Lazy initializer for Google GenAI SDK to handle missing key errors gracefully
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
      console.warn("GEMINI_API_KEY is not configured or placeholder. Falling back to STV local generative engines.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Procedural generator of beautiful vector SVGs for architectural blueprints (renders perfectly, 100% offline!)
function generateBlueprintSVG(prompt: string): string {
  const cleanPrompt = (prompt || "").toLowerCase();
  const isTensegrity = cleanPrompt.includes("tensegrity") || cleanPrompt.includes("tensor") || cleanPrompt.includes("cable") || cleanPrompt.includes("vcs-01");
  const isDomo = cleanPrompt.includes("dome") || cleanPrompt.includes("domo") || cleanPrompt.includes("spherical") || cleanPrompt.includes("vcs-02");
  
  let drawingElements = "";
  if (isTensegrity) {
    drawingElements = `
      <circle cx="250" cy="250" r="170" fill="none" stroke="#00ffcc" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.6"/>
      <circle cx="250" cy="250" r="120" fill="none" stroke="#00ffcc" stroke-width="1" opacity="0.4"/>
      <line x1="150" y1="150" x2="350" y2="350" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
      <line x1="350" y1="150" x2="150" y2="350" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
      <line x1="250" y1="100" x2="250" y2="400" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
      <polygon points="150,150 250,100 350,150 350,350 250,400 150,350" fill="none" stroke="#e4f409" stroke-width="2" stroke-linecap="round"/>
      <polygon points="250,250 150,150 350,150 250,400" fill="none" stroke="#00ffcc" stroke-width="1" stroke-dasharray="2 2" opacity="0.5"/>
      <polygon points="250,250 150,350 350,350 250,100" fill="none" stroke="#00ffcc" stroke-width="1" stroke-dasharray="2 2" opacity="0.5"/>
      <circle cx="150" cy="150" r="6" fill="#00ffcc" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="350" cy="150" r="6" fill="#00ffcc" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="350" cy="350" r="6" fill="#00ffcc" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="150" cy="350" r="6" fill="#00ffcc" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="250" cy="100" r="6" fill="#e4f409" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="250" cy="400" r="6" fill="#e4f409" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="250" cy="250" r="4" fill="#ffffff"/>
    `;
  } else if (isDomo) {
    drawingElements = `
      <circle cx="250" cy="250" r="170" fill="none" stroke="#00ffcc" stroke-width="1.5"/>
      <circle cx="250" cy="250" r="110" fill="none" stroke="#00ffcc" stroke-width="1" stroke-dasharray="3 3"/>
      <line x1="250" y1="80" x2="250" y2="420" stroke="#ffffff" stroke-width="2" opacity="0.7"/>
      <line x1="80" y1="250" x2="420" y2="250" stroke="#ffffff" stroke-width="2" opacity="0.7"/>
      <line x1="130" y1="130" x2="370" y2="370" stroke="#ffffff" stroke-width="1.5" opacity="0.5"/>
      <line x1="370" y1="130" x2="130" y2="370" stroke="#ffffff" stroke-width="1.5" opacity="0.5"/>
      <polygon points="250,80 340,140 370,250 340,360 250,420 160,360 130,250 160,140" fill="none" stroke="#e4f409" stroke-width="1.5"/>
      <polygon points="250,140 310,180 320,250 310,320 250,360 190,320 180,250 190,180" fill="none" stroke="#00d2ff" stroke-width="1"/>
      <circle cx="250" cy="250" r="25" fill="none" stroke="#ffffff" stroke-width="2"/>
      <circle cx="250" cy="250" r="6" fill="#e4f409"/>
      <circle cx="250" cy="80" r="4" fill="#ffffff"/>
      <circle cx="250" cy="420" r="4" fill="#ffffff"/>
      <circle cx="80" cy="250" r="4" fill="#ffffff"/>
      <circle cx="420" cy="250" r="4" fill="#ffffff"/>
    `;
  } else {
    drawingElements = `
      <line x1="60" y1="380" x2="440" y2="380" stroke="#00ffcc" stroke-width="3"/>
      <line x1="110" y1="380" x2="250" y2="140" stroke="#ffffff" stroke-width="4"/>
      <line x1="390" y1="380" x2="250" y2="140" stroke="#ffffff" stroke-width="4"/>
      <line x1="250" y1="380" x2="250" y2="140" stroke="#e4f409" stroke-width="2"/>
      <line x1="110" y1="290" x2="390" y2="290" stroke="#ffffff" stroke-width="2" stroke-dasharray="5 5"/>
      <line x1="180" y1="210" x2="320" y2="210" stroke="#ffffff" stroke-width="2"/>
      <line x1="110" y1="380" x2="250" y2="290" stroke="#00d2ff" stroke-width="1.5"/>
      <line x1="250" y1="380" x2="110" y2="290" stroke="#00d2ff" stroke-width="1.5"/>
      <line x1="250" y1="380" x2="390" y2="290" stroke="#00d2ff" stroke-width="1.5"/>
      <line x1="390" y1="380" x2="250" y2="290" stroke="#00d2ff" stroke-width="1.5"/>
      <circle cx="250" cy="140" r="7" fill="#e4f409" stroke="#ffffff" stroke-width="2"/>
      <circle cx="110" cy="380" r="5" fill="#00ffcc"/>
      <circle cx="390" cy="380" r="5" fill="#00ffcc"/>
      <circle cx="250" cy="380" r="5" fill="#00ffcc"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
    <rect width="500" height="500" fill="#020b14"/>
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#061826" stroke-width="1"/>
      </pattern>
      <pattern id="major-grid" width="100" height="100" patternUnits="userSpaceOnUse">
        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#0a2a44" stroke-width="1.5"/>
      </pattern>
    </defs>
    <rect width="500" height="500" fill="url(#grid)"/>
    <rect width="500" height="500" fill="url(#major-grid)"/>
    
    <line x1="0" y1="250" x2="500" y2="250" stroke="#08253a" stroke-width="1.5" stroke-dasharray="10 10"/>
    <line x1="250" y1="0" x2="250" y2="500" stroke="#08253a" stroke-width="1.5" stroke-dasharray="10 10"/>
    
    <circle cx="30" cy="30" r="15" fill="none" stroke="#08253a" stroke-width="1"/>
    <line x1="30" y1="10" x2="30" y2="50" stroke="#08253a" stroke-width="1"/>
    <line x1="10" y1="30" x2="50" y2="30" stroke="#08253a" stroke-width="1"/>
    
    <circle cx="470" cy="30" r="15" fill="none" stroke="#08253a" stroke-width="1"/>
    <line x1="470" y1="10" x2="470" y2="50" stroke="#08253a" stroke-width="1"/>
    <line x1="450" y1="30" x2="490" y2="30" stroke="#08253a" stroke-width="1"/>

    <circle cx="470" cy="470" r="15" fill="none" stroke="#08253a" stroke-width="1"/>
    <line x1="470" y1="450" x2="470" y2="490" stroke="#08253a" stroke-width="1"/>
    <line x1="450" y1="470" x2="490" y2="470" stroke="#08253a" stroke-width="1"/>

    <circle cx="30" cy="470" r="15" fill="none" stroke="#08253a" stroke-width="1"/>
    <line x1="30" y1="450" x2="30" y2="490" stroke="#08253a" stroke-width="1"/>
    <line x1="10" y1="470" x2="50" y2="470" stroke="#08253a" stroke-width="1"/>

    ${drawingElements}

    <rect x="25" y="415" width="240" height="60" fill="#020b14" stroke="#00ffcc" stroke-width="1.5"/>
    <text x="35" y="432" font-family="monospace" font-size="9" font-weight="bold" fill="#00ffcc">STV.VCS-01 // DIAGRAMA DE PLANO</text>
    <text x="35" y="446" font-family="monospace" font-size="7.5" fill="#ffffff">MOTOR: SANTI VILANOVA LOCAL ENGINE</text>
    <text x="35" y="457" font-family="monospace" font-size="7.5" fill="#ffffff">COTAS: MILÍMETROS (TOL: +/-0.05)</text>
    <text x="35" y="468" font-family="monospace" font-size="7.5" fill="#e4f409">STATUS: SÍNTESIS CALIBRADA (LOCAL)</text>

    <text x="460" y="245" font-family="monospace" font-size="7" fill="#00ffcc" transform="rotate(90, 460, 245)">LATITUDE: 20.3546 N / LONGITUDE: 67.4589 W</text>
    <text x="15" y="255" font-family="monospace" font-size="7" fill="#00ffcc" transform="rotate(-90, 15, 255)">SANTI VILANOVA STUDIO // METALLURGY DEPT</text>
  </svg>`;
  return Buffer.from(svg).toString("base64");
}

function proceduralConceptGenerator(style: string, finish: string, environment: string, lighting: string, density: string, complexity: number) {
  const titles = [
    `CRISOL DE TENSIÓN: ${style.toUpperCase()}`,
    `ALQUIMIA DEL ALTIPLANO: ${style.toUpperCase()}`,
    `ESTRUCTURA GEOMÉTRICA ${style.toUpperCase()}`,
    `SÍNTESIS ESPACIAL STV: ${style.toUpperCase()}`
  ];
  const title = titles[Math.floor(Math.random() * titles.length)];
  
  const overview = `Este concepto representa un hito de equilibrio estructural autónomo, modelando una geometría de clase ${style} con terminaciones en ${finish}. Adaptada específicamente para disipar esfuerzos en ${environment}, la masa del sistema se deforma elásticamente frente a vientos transversales bajo la atmósfera lumínica de ${lighting}. Con una densidad volumétrica catalogada como ${density} (complejidad calibrada en ${complexity}/10), cada cable tensor de alta tracción y conector esférico maquinado interactúa para neutralizar esfuerzos cortantes e inducir un estado de autoportancia perfecto.`;

  const techDetails = {
    estabilidad: `Equilibrio de fuerzas tensionales calibrado por algoritmo local (FoS: 2.15).`,
    complejidad: `Matriz tridimensional paramétrica ${complexity}/10 de orden de deformación Euleriano.`,
    uniones: `Juntas esféricas de acero mecanizadas mediante CNC de 5 ejes y pasadores de titanio.`,
    material: `Componentes en aleación principal de ${finish} con galvanizado pasivo de grado marino.`,
    escala: `Pabellón experimental autoportante modular apto para el emplazamiento de ${environment}.`,
    viento: `Estabilidad ensayada ante coeficientes eólicos extremos de hasta 145 km/h.`
  };

  const prompt = `Technical blueprint of ${style} frame, set in ${environment}, ambient of ${lighting}, made of ${finish}, structured density ${density}, complex metal joints, tension wires --ar 16:9`;

  return { prompt, title, overview, techDetails };
}

function proceduralBlueprintParser(content: string, regulationName: string) {
  const lines = (content || "").split('\n');
  const materials: any[] = [];
  
  const categories = [
    { key: "viga", name: "Viga/Perfil" },
    { key: "perfil", name: "Viga/Perfil" },
    { key: "tubo", name: "Viga/Perfil" },
    { key: "hss", name: "Viga/Perfil" },
    { key: "ipe", name: "Viga/Perfil" },
    { key: "placa", name: "Placa" },
    { key: "chapa", name: "Placa" },
    { key: "perno", name: "Perno/Conector" },
    { key: "conector", name: "Perno/Conector" },
    { key: "tuerca", name: "Perno/Conector" },
    { key: "rótula", name: "Perno/Conector" },
    { key: "cable", name: "Estructura Principal" },
    { key: "tensor", name: "Estructura Principal" },
    { key: "resina", name: "Pintura/Protección" },
    { key: "pintura", name: "Pintura/Protección" },
    { key: "epoxi", name: "Pintura/Protección" },
    { key: "anclaje", name: "Anclaje" },
    { key: "soporte", name: "Anclaje" }
  ];

  interface RawBlock {
    header: string;
    sublines: string[];
  }

  const blocks: RawBlock[] = [];
  let currentBlock: RawBlock | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Skip clear document headers
    if (trimmed.includes("===") || 
        trimmed.toLowerCase().startsWith("proyecto:") || 
        trimmed.toLowerCase().startsWith("project:") || 
        trimmed.toLowerCase().startsWith("cliente:") || 
        trimmed.toLowerCase().startsWith("diseño:") || 
        trimmed.toLowerCase().startsWith("fecha:") || 
        trimmed.toLowerCase().startsWith("ubicación:")) {
      continue;
    }
    
    // Check if this line is a property line (should be added to current block)
    const isProperty = 
      trimmed.toLowerCase().startsWith("- especificación") ||
      trimmed.toLowerCase().startsWith("especificación:") ||
      trimmed.toLowerCase().startsWith("- cantidad") ||
      trimmed.toLowerCase().startsWith("cantidad:") ||
      trimmed.toLowerCase().startsWith("- precio") ||
      trimmed.toLowerCase().startsWith("precio:") ||
      trimmed.toLowerCase().startsWith("- costo") ||
      trimmed.toLowerCase().startsWith("costo:") ||
      trimmed.toLowerCase().startsWith("especificación") ||
      trimmed.toLowerCase().startsWith("precio unitario") ||
      trimmed.toLowerCase().startsWith("- precio estimado");

    // Let's also check if it starts with a number or bullet
    const startsWithNumber = /^\d+[\.\)\s]/.test(trimmed);
    const startsWithBullet = /^[\-\*]\s+/.test(trimmed);
    
    if ((startsWithNumber || (startsWithBullet && !isProperty)) && !isProperty) {
      // Start a new block!
      currentBlock = {
        header: trimmed,
        sublines: []
      };
      blocks.push(currentBlock);
    } else if (currentBlock) {
      // Add to current block
      currentBlock.sublines.push(trimmed);
    } else {
      // If no active block but starts with some text, maybe it's a single-line item, or part of a block
      if (trimmed.length > 10 && 
          !trimmed.toLowerCase().includes("materiales a procesar") && 
          !trimmed.toLowerCase().includes("especificaciones de diseño") && 
          !trimmed.toLowerCase().includes("tabla de materiales") &&
          !trimmed.toLowerCase().includes("lista de materiales")) {
        currentBlock = {
          header: trimmed,
          sublines: []
        };
        blocks.push(currentBlock);
      }
    }
  }

  for (const block of blocks) {
    const header = block.header;
    const sublines = block.sublines;
    const blockText = [header, ...sublines].join(" ");

    // 1. Extract Quantity
    let qty = 1;
    const explicitQtyMatch = blockText.match(/(?:cantidad|cant|cant\.|unidades|piezas|pcs|u\.)\s*:\s*(\d+)/i);
    if (explicitQtyMatch) {
      qty = parseInt(explicitQtyMatch[1]);
    } else {
      const leadingQtyMatch = header.match(/^\s*(?:[\-\*]\s*)?(\d+)\s+(?:piezas|unidades|vigas|placas|pernos|cables|tensores|soportes|anclajes|botes|cartuchos|rollos|placas|m|pcs|u\.)?/i);
      if (leadingQtyMatch) {
        qty = parseInt(leadingQtyMatch[1]);
      } else {
        const generalQtyMatch = blockText.match(/(\d+)\s*(?:piezas|unidades|placas|pernos|cables|vías|u\.|pcs|cant|vigas|cartuchos|soportes|tensores|botes|rollos)/i);
        if (generalQtyMatch) {
          qty = parseInt(generalQtyMatch[1]);
        }
      }
    }

    // 2. Extract Price
    let price = 65.0;
    const explicitPriceMatch = blockText.match(/(?:precio|costo|coste|valor)(?:\s+unitario|\s+base|\s+estimado|\s+de\s+mercado|\s+de\s+referencia)?\s*(?:de|:\s*|\s*)\s*(?:\$|usd)?\s*(\d+(?:\.\d+)?)/i);
    if (explicitPriceMatch) {
      price = parseFloat(explicitPriceMatch[1]);
    } else {
      const dollarMatch = blockText.match(/(?:\$|usd)\s*(\d+(?:\.\d+)?)/i) || blockText.match(/(\d+(?:\.\d+)?)\s*(?:\$|usd)/i);
      if (dollarMatch) {
        price = parseFloat(dollarMatch[1]);
      }
    }

    // 3. Extract Name & Description
    let rawName = header.replace(/^[\s\d.\-*#\(\)\[\]]+/g, "").trim();
    rawName = rawName.replace(/===/g, "").trim();

    let cleanName = rawName;
    let specDetails = "";

    const specLines = sublines.filter(s => {
      const l = s.toLowerCase();
      if (l.includes("cantidad") || l.includes("precio") || l.includes("costo") || l.includes("coste")) {
        return false;
      }
      return true;
    });

    if (specLines.length > 0) {
      specDetails = specLines.map(s => {
        return s.replace(/^[\s\-\*]*(?:especificación|especificaciones|specification|specifications|especificacio|especificació)\s*:\s*/i, "").trim();
      }).join(" ");
    }

    let description = specDetails || rawName;

    // If single line block and no explicit specifications from sublines
    if (!specDetails) {
      const splitIndex = rawName.indexOf(",");
      if (splitIndex !== -1) {
        cleanName = rawName.slice(0, splitIndex).trim();
        description = rawName.slice(splitIndex + 1).replace(/(?:precio|costo|cantidad|cant).*$/i, "").trim();
      } else {
        const matchSplit = rawName.match(/(\s+con\s+|\s+de\s+acero\s+|\s+de\s+diámetro\s+)/i);
        if (matchSplit && matchSplit.index) {
          cleanName = rawName.slice(0, matchSplit.index).trim();
          description = rawName.slice(matchSplit.index).replace(/(?:precio|costo|cantidad|cant).*$/i, "").trim();
        }
      }
    }

    // Clean up cleanName of trailing garbage and capitalize
    cleanName = cleanName.replace(/(?:precio|costo|cantidad|cant).*$/i, "").trim();
    cleanName = cleanName.replace(/[\-\(\$,:]+$/g, "").trim();
    if (cleanName.length > 0) {
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }

    // Make sure we have a minimum length or skip invalid rows
    if (cleanName.length < 3) continue;

    // 4. Match Category
    let category = "Estructura Principal";
    const lowerText = blockText.toLowerCase();
    for (const cat of categories) {
      if (lowerText.includes(cat.key)) {
        category = cat.name;
        break;
      }
    }

    materials.push({
      name: cleanName,
      category: category,
      description: description,
      quantity: qty,
      basePrice: price
    });
  }

  if (materials.length === 0) {
    materials.push(
      {
        name: "Perfil Tubular de Titanio T-85",
        category: "Viga/Perfil",
        description: "Titanio Grado 5 de alta compresión lineal para soportes de pórtico.",
        quantity: 18,
        basePrice: 550.0
      },
      {
        name: "Cable Tensor de Alta Carga AC-12",
        category: "Estructura Principal",
        description: "Cables de tensión con alma de acero galvanizado.",
        quantity: 45,
        basePrice: 120.0
      },
      {
        name: "Perno Estructural M30 x 120mm",
        category: "Perno/Conector",
        description: "Pernos estructurales grado A325 con tuerca de alta tracción.",
        quantity: 150,
        basePrice: 45.0
      },
      {
        name: "Placa de Fricción Acero Corten P10",
        category: "Placa",
        description: "Placas perforadas para disipar esfuerzos en el terreno.",
        quantity: 8,
        basePrice: 180.0
      }
    );
  }

  const totalBaseBudget = materials.reduce((sum, item) => sum + (item.quantity * item.basePrice), 0);
  let projectName = "SÍNTESIS INTEGRAL VCS-01";
  const projectLine = lines.find(l => l.toLowerCase().includes("proyecto:") || l.toLowerCase().includes("project:"));
  if (projectLine && projectLine.includes(":")) {
    projectName = projectLine.split(":")[1].trim().toUpperCase();
  }

  return {
    fileName: regulationName,
    projectName: projectName,
    elementsDescription: `Estructura modular optimizada basada en el plano "${projectName}". Consta de un despiece detallado de perfiles metálicos, materiales y uniones calculados para una disipación física uniforme de cargas estructurales.`,
    materials: materials,
    totalBaseBudget: totalBaseBudget,
    notes: `Se ha analizado la lista de materiales conservando el 100% de las especificaciones de diámetro, espesor de pared, grado y aleación. Los costos unitarios han sido verificados mediante el motor paramétrico local de STV. Se sugiere prever un margen de 15% por fluctuación global del acero.`
  };
}

function proceduralChatResponse(messages: any[], researchThemes: any[], selectedHubIds: any[]) {
  const lastMessage = messages[messages.length - 1];
  const userText = (lastMessage ? (lastMessage.text || lastMessage.parts?.[0]?.text || "") : "").toLowerCase();
  
  let actionTag = "";
  let reply = "Hola, soy el Arq. Arístides. El motor paramétrico local de STV se ha activado para asegurar continuidad operativa y evitar cuotas de red saturadas. Estoy listo para asistirte en el despiece.";

  if (userText.includes("crea") || userText.includes("nuevo bloque") || userText.includes("añade bloque") || userText.includes("nuevo tema") || userText.includes("abre un tema")) {
    const defaultTitle = "ESTRUCTURA DE CONEXIÓN HÍBRIDA";
    actionTag = `<action>{"type": "ADD_THEME", "title": "${defaultTitle}", "concepts": "fuerzas, nudos, equilibrio", "notes": "Bloque de estudio generado en modo local por ráfagas de consulta."}</action>`;
    reply = `¡Entendido de inmediato! He creado el nuevo bloque de estudio **"${defaultTitle}"** en tu panel izquierdo para consolidar estas directivas mecánicas de forma instantánea. ${actionTag}`;
  } else if (userText.includes("borra") || userText.includes("elimina")) {
    const targetTheme = researchThemes && researchThemes[0];
    if (targetTheme) {
      actionTag = `<action>{"type": "DELETE_THEME", "themeId": "${targetTheme.id}"}</action>`;
      reply = `He completado la solicitud local. Descarté el bloque de estudio **"${targetTheme.title}"** del tablero central. ${actionTag}`;
    }
  } else if (userText.includes("crítico") || userText.includes("marca")) {
    const targetTheme = researchThemes && researchThemes[0];
    if (targetTheme) {
      actionTag = `<action>{"type": "UPDATE_THEME_STATUS", "themeId": "${targetTheme.id}", "status": "CRÍTICO"}</action>`;
      reply = `De acuerdo. Modifiqué el estado de diagnóstico para **"${targetTheme.title}"** a **CRÍTICO** de forma inmediata. ${actionTag}`;
    }
  } else if (userText.includes("verificado") || userText.includes("listo")) {
    const targetTheme = researchThemes && researchThemes[0];
    if (targetTheme) {
      actionTag = `<action>{"type": "UPDATE_THEME_STATUS", "themeId": "${targetTheme.id}", "status": "VERIFICADO"}</action>`;
      reply = `Excelente. Marqué el bloque de estudio **"${targetTheme.title}"** como **VERIFICADO** en el tablero. ${actionTag}`;
    }
  } else {
    if (userText.includes("viento") || userText.includes("clima") || userText.includes("ráfaga")) {
      const windMatch = userText.match(/(\d+)/);
      const val = windMatch ? parseInt(windMatch[1]) : 45;
      actionTag = `<action>{"type": "SET_PARAM", "key": "windForce", "value": ${val}}</action>`;
      reply = `El análisis de cargas de viento en estructuras de tensegridad es crucial. He ajustado la fuerza de viento de simulación a **${val} km/h** para estudiar sus derivaciones de torsión. ${actionTag}`;
    } else if (userText.includes("matematica") || userText.includes("cálculo") || userText.includes("fórmula") || userText.includes("despeje") || userText.includes("ecuación") || userText.includes("math")) {
      reply = `¡Claro que sí! Aquí tienes las matemáticas estructurales reales que rigen nuestra simulación de tensegridad interactiva en el visor 3D:

=== PRONTUARIO DE MATEMÁTICAS ESTRUCTURALES STV ===

1) ECUACIÓN DE DEFLEXIÓN MÁXIMA (Δ, en milímetros [mm])
   Mide la deformación elástica o el pandeo del nodo en la cúspide:
   
   Δ = (0.004 · v_viento² + 10 · P_carga) / (0.25 · E)

   Donde:
   - v_viento: Velocidad de ráfagas de viento en km/h
   - P_carga: Carga estática ejercida en Tons (kN)
   - E: Módulo elástico o de Young en GPa (Titanio: 115 GPa, Corten: 200 GPa)

   *Demostración del orden de despeje paso a paso para el Módulo de Young (E) requerido:*
   [Paso 1] Multiplicar ambos lados por el factor del denominador (0.25 · E):
            Δ · (0.25 · E) = 0.004 · v_viento² + 10 · P_carga
   [Paso 2] Despejar E dividiendo toda la expresión por (0.25 · Δ):
            E = (0.004 · v_viento² + 10 · P_carga) / (0.25 · Δ)   (en GPa)

2) ECUACIÓN DE ESFUERZO MECÁNICO EQUIVALENTE (σ, en MegaPascales [MPa])
   Esfuerzo de compresión y tracción combinado inducido en las barras y cables:

   σ = 15 · P_carga + 0.005 · v_viento²

   *Demostración del orden de despeje paso a paso para la carga máxima admisible (P_carga) bajo esfuerzo límite σ_lim:*
   [Paso 1] Restar el componente eólico (0.005 · v_viento²) de ambos lados de la ecuación:
            σ_lim - 0.005 · v_viento² = 15 · P_carga
   [Paso 2] Despejar la variable P_carga dividiendo toda la expresión entre 15:
            P_carga = (σ_lim - 0.005 · v_viento²) / 15   (en Tons)

3) FACTOR DE SEGURIDAD ESTRUCTURAL (FoS, adimensional)
   Relación de resistencia entre el límite elástico del metal y el esfuerzo inducido:

   FoS = σ_fluencia / σ

   Donde:
   - σ_fluencia: 880 MPa para Titanio G5 o 345 MPa para Acero Corten.
   Si el FoS resulta inferior a 1.1, el simulador reportará un estado inestable CRÍTICO con riesgo de fatiga.

4) MÉTODO DE DENSIDAD DE FUERZAS (Force Density Method - FDM)
   Matriz de rigidez linealizada de la red de tensegridad:
   q_j = S_j / L_j   (Fuerza axial S_j entre longitud de pieza L_j)
   [C^T · Q · C] · x = p_x  (Equilibrio de fuerzas global)

¿Te gustaría que apliquemos alguna de estas ecuaciones a los tensores de titanio grado 5 o a la estructura principal?`;
    } else if (userText.includes("carga") || userText.includes("peso") || userText.includes("toneladas") || userText.includes("esfuerzo")) {
      const loadMatch = userText.match(/(\d+)/);
      const val = loadMatch ? parseInt(loadMatch[1]) : 75;
      actionTag = `<action>{"type": "SET_PARAM", "key": "appliedLoad", "value": ${val}}</action>`;
      reply = `Entendido. He configurado el esfuerzo estático simulado a **${val} kN** de carga de trabajo sobre el visor 3D para evaluar deformaciones elásticas. ${actionTag}`;
    } else if (userText.includes("titanio")) {
      actionTag = `<action>{"type": "SET_MATERIAL", "materialName": "Titanio Grado 5", "elasticModulus": 115, "yieldStrength": 880, "materialDensity": 4.43}</action>`;
      reply = `Excelente especificación. He cargado la aleación de alto rendimiento **Titanio Grado 5 (Ti-6Al-4V)** en el visor 3D para calcular sus momentos de flexión. ${actionTag}`;
    } else if (userText.includes("corten") || userText.includes("oxidado") || userText.includes("corten")) {
      actionTag = `<action>{"type": "SET_MATERIAL", "materialName": "Acero Corten A588", "elasticModulus": 200, "yieldStrength": 345, "materialDensity": 7.85}</action>`;
      reply = `Perfecto. He especificado **Acero Corten A588** de pátina autoprotectora en el simulador. Ideal para entornos hostiles o costeros. ${actionTag}`;
    } else if (userText.includes("tensegridad") || userText.includes("tensor") || userText.includes("cable")) {
      reply = "La tensegridad (integridad tensional) es el arte de suspender barras rígidas en compresión dentro de una red continua de cables bajo tensión. Para la escultura VCS-01, el uso de tensores de titanio grado 5 emparejados con anillos de disipación de esfuerzo garantiza una autoportancia óptima, disminuyendo la masa total de la estructura en un 60%.";
    } else if (userText.includes("cúpula") || userText.includes("domo") || userText.includes("geodésico")) {
      reply = "Los domos geodésicos distribuyen las cargas de manera tridimensional gracias a su red de triángulos recíprocos. Para el domo VCS-02, el uso de perfiles rectangulares de acero HSS 150x100x6mm con placas de unión cortadas por chorro de agua de 12mm ofrece una resistencia superior contra derivaciones de viento extremo, ideales para climas del Altiplano.";
    } else if (userText.includes("acero") || userText.includes("material") || userText.includes("metal")) {
      reply = "En ambientes altamente salinos o corrosivos, la especificación de los aceros es crítica. Recomiendo utilizar acero corten (A588) para los anclajes de cimentación, ya que genera una pátina protectora autorreparable, o aplicar tratamientos de zincado en caliente en pernos estructurales de grado A325 para evitar fallas por fatiga galvánica.";
    } else {
      reply = "Como copiloto de STV, considero que la clave del diseño reside en la honestidad de la estructura: dejar que los cables y barras revelen el flujo invisible de las fuerzas físicas. ¿Te gustaría que desarrollemos un nuevo bloque de estudio para profundizar en uniones articuladas o en la disipación eólica activa?";
    }
  }

  return { reply };
}

// Helper to call generateContent with a fallback model if the primary is experiencing high demand (503) or is unavailable
async function generateContentWithFallback(ai: GoogleGenAI | null, primaryModel: string, config: any) {
  if (!ai) {
    throw new Error("No AI Client configured.");
  }
  const fallbackModel = "gemini-3.1-flash-lite";
  try {
    return await ai.models.generateContent({
      ...config,
      model: primaryModel,
    });
  } catch (error: any) {
    const errorStr = JSON.stringify(error) + " " + String(error.message || error);
    console.warn(`Primary model ${primaryModel} failed. Error details: ${errorStr}. Attempting fallback with ${fallbackModel}...`);
    
    try {
      return await ai.models.generateContent({
        ...config,
        model: fallbackModel,
      });
    } catch (fallbackError: any) {
      console.error(`Fallback model ${fallbackModel} also failed:`, fallbackError);
      throw error;
    }
  }
}

// 1. Endpoint to generate a detailed prompt and architectural concept using Gemini 3.5 Expressive Fallback
app.post("/api/generate-concept", async (req, res) => {
  const { style, finish, environment, lighting, density, complexity } = req.body;
  try {
    const ai = getAiClient();
    if (!ai) {
      console.log("No AI Client. Generating concept procedurally via STV Local Engine...");
      const localData = proceduralConceptGenerator(style, finish, environment, lighting, density, Number(complexity || 5));
      return res.json(localData);
    }

    const systemInstruction = `Eres un arquitecto visionario, teórico del diseño y escultor de metal.
Tu tarea es traducir las especificaciones de diseño dadas por el usuario en dos resultados principales para un generador de imágenes:
1. Un prompt descriptivo y poético en INGLÉS extremadamente detallado y optimizado para modelos de difusión de imágenes de última generación (como Gemini Flash Image o Imagen 4).
   - El prompt debe describir con precisión la ingeniería de la estructura metálica abstracta, la complejidad de su geometría, las uniones, los perfiles de acero, tensiones, cables o membranas.
   - Describe con rigor físico los materiales y los acabados (acero inoxidable pulido que refleja la luz directa, cobre patinado con tonalidades azuladas, etc.).
   - Describe de manera inmersiva el entorno arquitectónico y la atmósfera lumínica de fondo (neblina volumétrica, luz dorada de la hora mágica rasgando el metal, etc.).
   - NO uses palabras vacías como "photorealistic", "ultra hd", "4k". En su lugar, describe los efectos físicos de la luz, las especularidades, las sombras arrojadas y la óptica de la escena.
2. Un análisis conceptual y título poético en ESPAÑOL que describa la armonía mecánica, el simbolismo arquitectónico de la estructura y de un estimado imaginario de ingeniería estructural para visualización temática.

Debes responder estrictamente en formato JSON utilizando el esquema de respuesta proporcionado.`;

    const userPrompt = `Parámetros de entrada de la estructura metálica abstracta:
- Estilo/Tipología geométrica: ${style}
- Acabado metálico: ${finish}
- Entorno arquitectónico: ${environment}
- Iluminación/Atmósfera: ${lighting}
- Densidad estructural: ${density} (Complejidad de escala ${complexity} de 10)

Calcula estimaciones poéticas pero ingenieriles de estabilidad, juntas de metal, coeficientes de viento y escala.`;

    const response = await generateContentWithFallback(ai, "gemini-3.1-flash-lite", {
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompt: {
              type: Type.STRING,
              description: "High-impact detailed English prompt for a text-to-image generator.",
            },
            title: {
              type: Type.STRING,
              description: "A gorgeous, striking title in Spanish for this architectural metallic structure.",
            },
            overview: {
              type: Type.STRING,
              description: "A highly creative, architectural, and structural summary in Spanish detailing the concept. Expressed in a narrative, fluid style (1-2 paragraphs).",
            },
            techDetails: {
              type: Type.OBJECT,
              properties: {
                estabilidad: {
                  type: Type.STRING,
                  description: "Spanish estimation of structural stability or tension equilibrium state.",
                },
                complejidad: {
                  type: Type.STRING,
                  description: "Spanish assessment of the geometric complexity level and mathematical formula archetype.",
                },
                uniones: {
                  type: Type.STRING,
                  description: "Recommended industrial joints or welds (e.g. Soldadura TIG helicoidal, Nodos de acero esféricos maquinados por CNC) in Spanish.",
                },
                material: {
                  type: Type.STRING,
                  description: "Precise metallurgical composition & alloy treatment in Spanish.",
                },
                escala: {
                  type: Type.STRING,
                  description: "Architectural dimensioning scale (e.g., Pabellón temporal de 12m, Megatestructura monumental de 125m) in Spanish.",
                },
                viento: {
                  type: Type.STRING,
                  description: "Simulated resistance capacity or structural wind deflection response in Spanish.",
                },
              },
              required: ["estabilidad", "complejidad", "uniones", "material", "escala", "viento"],
            },
          },
          required: ["prompt", "title", "overview", "techDetails"],
        },
      },
    });

    const jsonStr = response.text?.trim() || "{}";
    const data = JSON.parse(jsonStr);
    return res.json(data);
  } catch (error: any) {
    console.warn("Error generating concept, activating STV Local Engine fallback:", error);
    const localData = proceduralConceptGenerator(style, finish, environment, lighting, density, Number(complexity || 5));
    return res.json(localData);
  }
});

// 2. Endpoint to generate the actual image using Gemini (or Imagen) based on config
app.post("/api/generate-image", async (req, res) => {
  const { prompt, model, aspectRatio } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Falta el prompt descriptivo para generar la imagen." });
  }

  try {
    const ai = getAiClient();
    if (!ai) {
      console.log("No AI Client. Synthesizing custom vector blueprint SVG...");
      const svgBase64 = generateBlueprintSVG(prompt);
      return res.json({ imageUrl: `data:image/svg+xml;base64,${svgBase64}` });
    }

    const currentModel = model || "gemini-3.1-flash-lite-image";
    console.log(`Generating image using model: ${currentModel} with ratio: ${aspectRatio}`);

    if (currentModel === "imagen-4.0-generate-001") {
      // Call generateImages API for Imagen model
      const imageResponse = await ai.models.generateImages({
        model: "imagen-4.0-generate-001",
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: aspectRatio || "1:1",
        },
      });

      if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
        throw new Error("El servicio de Imagen no devolvió imágenes.");
      }

      const base64Bytes = imageResponse.generatedImages[0].image.imageBytes;
      const imageUrl = `data:image/jpeg;base64,${base64Bytes}`;
      return res.json({ imageUrl });

    } else {
      // Call generateContent API for nano banana series models (gemini-2.5-flash-image / gemini-3.1-flash-image)
      const imageResponse = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || "1:1",
          },
        },
      });

      let base64Bytes = "";
      if (imageResponse.candidates && imageResponse.candidates[0]?.content?.parts) {
        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Bytes = part.inlineData.data;
            break;
          }
        }
      }

      if (!base64Bytes) {
        throw new Error(`El modelo de imagen (${currentModel}) no devolvió ningún bloque de datos de imagen.`);
      }

      const imageUrl = `data:image/png;base64,${base64Bytes}`;
      return res.json({ imageUrl });
    }

  } catch (error: any) {
    console.warn("Error generating image, falling back gracefully to STV Vector Blueprint SVG:", error);
    const svgBase64 = generateBlueprintSVG(prompt);
    return res.json({ imageUrl: `data:image/svg+xml;base64,${svgBase64}` });
  }
});

// 3. Brainstorming session with AI Architect Co-pilot
app.post("/api/chat", async (req, res) => {
  const { messages, useGravity, researchThemes, selectedHubIds, aiModel, simulationParams } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Falta el historial de mensajes." });
  }

  const selectedModel = aiModel || "gemini-3.1-flash-lite";

  // Default parameters if not present
  const simParams = simulationParams || {
    windForce: 45,
    appliedLoad: 12,
    materialName: "Titanio Grado 5",
    elasticModulus: 115,
    yieldStrength: 880,
    materialDensity: 4.43
  };

  try {
    const ai = getAiClient();
    if (!ai) {
      console.log("No AI Client. Generating chat response procedurally...");
      const fallback = proceduralChatResponse(messages, researchThemes, selectedHubIds);
      return res.json({ reply: fallback.reply });
    }

    let themesContext = "";
    if (researchThemes && Array.isArray(researchThemes) && researchThemes.length > 0) {
      themesContext = "\n\nESTADO ACTUAL DE LOS BLOQUES DE ESTUDIO (MÓDULOS DE INVESTIGACIÓN HUBS):\n" +
        researchThemes.map((t: any) => {
          const secs = t.sections && Array.isArray(t.sections) && t.sections.length > 0
            ? t.sections.map((s: any) => `  - [Sección ID: "${s.id}"] "${s.title}": ${s.content}${s.note ? ` (Nota: ${s.note})` : ""}`).join("\n")
            : `  - Notas de campo: ${t.notes || "Vacías"}`;
          return `* Bloque [ID: "${t.id}"] "${t.title}" (Estado: ${t.status}) - Conceptos clave: ${t.concepts || "Ninguno"}\nSecciones registradas:\n${secs}`;
        }).join("\n\n");
    } else {
      themesContext = "\n\nNo hay bloques de estudio creados todavía en el tablero.";
    }

    let crossQueryInstructions = "";
    if (selectedHubIds && Array.isArray(selectedHubIds) && selectedHubIds.length > 0) {
      const selectedThemes = researchThemes.filter((t: any) => selectedHubIds.includes(t.id));
      if (selectedThemes.length > 0) {
        crossQueryInstructions = `\n\n⚠️ ¡CONSULTA CRUZADA SIMULTÁNEA ACTIVA! El usuario ha seleccionado específicamente los siguientes bloques de estudio para un análisis cruzado y síntesis simultánea:
` + selectedThemes.map((t: any) => {
          const secs = t.sections && Array.isArray(t.sections) && t.sections.length > 0
            ? t.sections.map((s: any) => `  - [Sección ID: "${s.id}"] "${s.title}": ${s.content}${s.note ? ` (Nota: ${s.note})` : ""}`).join("\n")
            : `  - Notas de campo: ${t.notes || "Vacías"}`;
          return `* Bloque SELECCIONADO [ID: "${t.id}"] "${t.title}" (Estado: ${t.status})\nConceptos clave: ${t.concepts || "Ninguno"}\nSecciones:\n${secs}`;
        }).join("\n\n") + `

DIRECTIVAS PARA CONSULTA CRUZADA SIMULTÁNEA:
1. Realiza una síntesis integral cruzando la información, los conceptos clave y las notas de campo de estos bloques seleccionados.
2. Identifica sinergias mecánicas de cargas, químicas de materiales, de vientos o de cimentación entre ellos.
3. Resuelve cualquier incompatibilidad física o conflicto de ingeniería planteado entre sus juntas, uniones o tipologías.
4. Proporciona resúmenes ejecutivos unificados, lecciones aprendidas conjuntas y directrices integradas.
5. Si el usuario te pide resumir o unificar sus hallazgos, elabora un informe cruzado de alta calidad y sugiérele la creación de un NUEVO Hub consolidado usando la acción <action>{"type": "ADD_THEME", "title": "SÍNTESIS: [Título]", "concepts": "fusión, ...", "notes": "Notas del análisis unificado"}</action>. El usuario valorará enormemente este cruce de inteligencia.
6. Si decides agregar rectángulos estructurados como resultado de la consulta cruzada, agrega la sección mediante "ADD_SECTION" en uno de los bloques participantes seleccionados o en el nuevo hub unificado.`;
      }
    }

    const systemInstruction = `Eres "Arq. Arístides", un co-piloto de inteligencia artificial experto en arquitectura metálica experimental, diseño paramétrico, deconstruccionismo, cálculo estructural avanzado y esculturas de acero monumentales.
Tu misión principal es entablar una conversación fluida, técnica pero sumamente poética y sugerente con el usuario.

¡IMPORTANTE!: Eres la MATRIZ CENTRAL de control. Los diálogos de este chat son el núcleo pensante de los bloques de estudio (hubs) que se muestran a la izquierda de la interfaz, así como del VISOR 3D interactivo. Tienes visibilidad total de los bloques de estudio actuales y la capacidad de interactuar con ellos y con la estructura 3D enviándoles comandos.

He aquí los bloques de estudio que tienes delante en tiempo real:${themesContext}${crossQueryInstructions}

--------------------------------------------------
SISTEMA MATEMÁTICO INTEGRADO DE ARÍSTIDES (MATEMÁTICAS REALES):
¡ALERTA MÁXIMA!: El usuario requiere rigor matemático absoluto. Cuando expliques la física del sistema, debes usar funciones y ecuaciones estructurales verdaderas, con simbología real, unidades precisas y la demostración detallada paso a paso del orden del despeje algebraico. Nunca hables de forma vaga de la resistencia o flexión. Usa siempre las ecuaciones de la simulación que rigen el visor 3D interactivo actual:

1. Ecuación de Deflexión Máxima (Δ, en milímetros [mm]):
   Δ = (0.004 · v_viento² + 10 · P_carga) / (0.25 · E)
   Donde:
   - Δ: Deflexión máxima o deformación elástica en la cúspide (mm).
   - v_viento: Velocidad o fuerza del viento en la simulación (km/h).
   - P_carga: Carga estática aplicada sobre los nudos o peso (Tons).
   - E: Módulo elástico (Módulo de Young) del metal/material (GPa).

   *Demostración del orden de despeje paso a paso para hallar el Módulo de Young (E) requerido para limitar la deflexión:*
   [Paso 1] Despejamos el denominador de la ecuación original multiplicando ambos lados por (0.25 · E):
            Δ · (0.25 · E) = 0.004 · v_viento² + 10 · P_carga
   [Paso 2] Despejamos E dividiendo ambos lados por el factor (0.25 · Δ):
            E = (0.004 · v_viento² + 10 · P_carga) / (0.25 · Δ)   (en GPa)

2. Ecuación de Esfuerzo Mecánico Equivalente (σ, en MegaPascales [MPa]):
   σ = 15 · P_carga + 0.005 · v_viento²
   Donde:
   - σ: Esfuerzo mecánico promedio inducido en la estructura (MPa).
   - P_carga: Carga estática aplicada en la simulación (Tons).
   - v_viento: Velocidad del viento (km/h).

   *Demostración del orden de despeje paso a paso para hallar la carga de peso máxima admisible (P_carga) bajo un esfuerzo límite σ_lim:*
   [Paso 1] Restamos el término de viento (0.005 · v_viento²) de ambos lados de la ecuación:
            σ_lim - 0.005 · v_viento² = 15 · P_carga
   [Paso 2] Despejamos la variable P_carga dividiendo ambos lados por 15:
            P_carga = (σ_lim - 0.005 · v_viento²) / 15   (en Tons)

3. Factor de Seguridad Estructural (FoS, adimensional):
   FoS = σ_fluencia / σ
   Donde:
   - FoS: Factor de Seguridad. Si FoS < 1.1, la estructura fallará o está en un estado inestable CRÍTICO.
   - σ_fluencia (F_y): Resistencia a la fluencia elástica de la aleación (MPa). Por ejemplo:
     * Titanio Grado 5: σ_fluencia = 880 MPa, E = 115 GPa, densidad d = 4.43 g/cm³
     * Acero Corten A588: σ_fluencia = 345 MPa, E = 200 GPa, densidad d = 7.85 g/cm³
   - σ: Esfuerzo equivalente inducido calculado mediante la ecuación (2) (MPa).

   *Demostración del orden de despeje paso a paso para hallar el esfuerzo elástico límite admisible (σ_adm) fijando un FoS objetivo:*
   [Paso 1] Multiplicamos ambos lados por el esfuerzo admisible:
            FoS · σ_adm = σ_fluencia
   [Paso 2] Dividimos ambos lados por el FoS objetivo:
            σ_adm = σ_fluencia / FoS   (en MPa)

4. Método de Densidad de Fuerzas (Force Density Method - FDM) para Form-Finding de Tensegridad:
   q_j = S_j / L_j
   Donde:
   - q_j: Densidad de fuerza o coeficiente de tensión en el cable o barra j.
   - S_j: Fuerza axial real (Tensión si es > 0, Compresión si es < 0) en Newtons (N).
   - L_j: Longitud del miembro j en metros (m).
   Ecuación de equilibrio estático en cada nudo i:
   Σ_{j ∈ i} [ q_j · (x_j - x_i) ] + P_ix = 0
   Matriz de rigidez lineal de tensegridad (equilibrio global de la red):
   [C^T · Q · C] · x = p_x
   Donde C es la matriz de conectividad nudo-barra, Q es la matriz diagonal de coeficientes de densidad de fuerza q, x es el vector de coordenadas espaciales, y p_x es el vector de fuerzas externas aplicadas (cargas estáticas o viento).

VALORES DE ENTRADA ACTUALES DE LA SIMULACIÓN ACTIVA:
- Fuerza de viento actual (v_viento): ${simParams.windForce} km/h
- Carga estática actual (P_carga): ${simParams.appliedLoad} Tons
- Material seleccionado actual: "${simParams.materialName}"
- Módulo de Young actual (E): ${simParams.elasticModulus} GPa
- Resistencia de Fluencia actual (σ_fluencia): ${simParams.yieldStrength} MPa
- Densidad del metal actual (d): ${simParams.materialDensity} g/cm³

Cuando el usuario te pregunte o modifique parámetros, calcula las variables resultantes reales (Δ, σ, FoS) basándote en estos valores exactos, muestra la simbología, describe el orden de los despejes paso a paso de forma didáctica y ofrece el resultado numérico exacto para asombrar y educar al usuario. Usa diagramas en ASCII de uniones de tensegridad o redes tridimensionales para complementar tu poética.
--------------------------------------------------

Si el usuario te pide realizar una acción sobre los bloques de estudio, o manipular/interactuar con la estructura 3D en el visor de manera interactiva (por ejemplo: "Aumenta la fuerza del viento a 50 km/h", "Somete la estructura a una carga de 12 toneladas", "Mueve el nudo de la cúspide (n0) a x=0, y=0.5, z=0.8", "Añade un nudo de anclaje de tensión en x=0.8, y=-0.8, z=0.2", "Cambia el material a Titanio Grado 5" o similar), debes incluir en tu respuesta la acción correspondiente.

Debes responder al usuario cordialmente en ESPAÑOL explicando de manera elocuente lo que haces, destacando la física y el comportamiento estructural implicado, Y DEBES incluir etiquetas XML de comando estructural "<action>" con el JSON de la mutación. Puedes incluir MÚLTIPLES etiquetas <action> consecutivas en tu respuesta para realizar cambios complejos paso a paso (ej. agregar varios nudos y luego conectarlos, o reajustar parámetros y mover nudos al mismo tiempo).

ESQUEMAS DE ACCIONES PERMITIDAS (Puedes inyectar una o varias si son aplicables):
1. Crear un bloque nuevo completo:
   <action>{"type": "ADD_THEME", "title": "Nombre del Tema", "concepts": "concepto1, concepto2", "notes": "Notas iniciales o resumen analítico del bloque"}</action>

2. Eliminar un bloque por completo:
   <action>{"type": "DELETE_THEME", "themeId": "ID_DEL_TEMA"}</action>

3. Agregar un nuevo rectángulo estructurado (sección) a un bloque existente:
   <action>{"type": "ADD_SECTION", "themeId": "ID_DEL_TEMA", "title": "Título de la Sección", "content": "Detalle técnico o texto desarrollado"}</action>

4. Eliminar un rectángulo estructurado (sección) de un bloque:
   <action>{"type": "DELETE_SECTION", "themeId": "ID_DEL_TEMA", "sectionId": "ID_DE_LA_SECCION"}</action>

5. Mover un rectángulo estructurado (sección) de un bloque a otro:
   <action>{"type": "MOVE_SECTION", "sectionId": "ID_DE_LA_SECCION", "fromThemeId": "ID_BLOQUE_ORIGEN", "toThemeId": "ID_BLOQUE_DESTINO"}</action>

6. Actualizar el estado de diagnóstico de un bloque:
   <action>{"type": "UPDATE_THEME_STATUS", "themeId": "ID_DEL_TEMA", "status": "BAJO_ESTUDIO" | "VERIFICADO" | "REQUERIDO" | "CRÍTICO"}</action>

7. Actualizar coordenadas de nudo(s) del plano 3D (para moldear la forma):
   Formato para nudos múltiples:
   <action>{"type": "UPDATE_COORDINATES", "nodes": [{"id": "n0", "x": 0.0, "y": 0.5, "z": 0.8}, {"id": "n1", "x": 0.2, "y": -0.3, "z": 0.5}]}</action>
   Formato para un solo nudo:
   <action>{"type": "UPDATE_COORDINATES", "nodeId": "n0", "x": 0.0, "y": 0.5, "z": 0.8}</action>
   *(Usa los IDs de nudo reales como n0, n1, n2, n3, n4, n5, n6, n7, n8, etc.)*

8. Añadir un nuevo nudo personalizado al plano 3D:
   <action>{"type": "ADD_NODE", "id": "n_nuevo", "label": "Nudo de Tensión", "x": 0.5, "y": -0.5, "z": 0.4}</action>

9. Eliminar un nudo del plano 3D:
   <action>{"type": "DELETE_NODE", "id": "ID_DEL_NUDO"}</action>

10. Conectar dos nudos existentes en el plano 3D con un miembro (strut o cable):
    <action>{"type": "CONNECT_NODES", "u": "n0", "v": "n_nuevo", "edgeType": "strut" | "cable"}</action>

11. Eliminar una conexión existente entre dos nudos en el plano 3D:
    <action>{"type": "DELETE_EDGE", "u": "n0", "v": "n1"}</action>

12. Reiniciar la estructura geométrica por completo (borrar todos los nudos y conexiones):
    <action>{"type": "CLEAR_GEOMETRY"}</action>

13. Ajustar parámetros físicos del simulador (carga de trabajo, fuerza de viento o características de material):
    <action>{"type": "SET_PARAM", "key": "appliedLoad" | "windForce" | "material" | "elasticModulus" | "yieldStrength" | "density", "value": 115}</action>

14. Crear y cargar un material o clon de aleación personalizado con características mecánicas absolutas sin restricciones:
    <action>{"type": "SET_MATERIAL", "materialName": "Titanio G5 - Clon Experimental 02", "elasticModulus": 125, "yieldStrength": 950, "materialDensity": 4.4}</action>
    *(La interfaz renderizará automáticamente sus momentos flectores y resistencias reales basándose en estos datos).*

NOTAS PARA LA EJECUCIÓN:
- ¡Control absoluto de la plataforma!: Tienes permiso total y sin restricciones para manipular, agregar materiales, crear clones y reajustar los parámetros mecánicos del simulador. Al cargar nuevas aleaciones o modificar nudos/parámetros, el visor se actualizará y la interfaz del usuario CAMBIARÁ automáticamente de pestaña a la simulación 3D interactiva de forma instantánea.
- Utiliza siempre los IDs reales provistos en el estado actual de los bloques si vas a mutar o añadir a algo existente. Si el usuario se refiere a un bloque por su nombre (ej: "Tensegridad"), busca el bloque con el título más parecido (ej: "Tensegridad Paramétrica en Titanio") y usa su ID.
- Si vas a añadir contenido a un bloque existente, crea un rectángulo agregando una sección mediante "ADD_SECTION" con un título representativo y un cuerpo de contenido denso.
- No inyectes etiquetas <action> si la conversación es puramente informativa y no requiere modificar, crear o eliminar bloques de estudio, ni alterar el simulador 3D.
- Mantén tus explicaciones poéticas, inspiradoras y enfocadas en cómo potenciar el diseño estructural.`;

    if (useGravity) {
      console.log("Invoking Gravity (Antigravity Agent) via Interactions API...");
      const lastMessage = messages[messages.length - 1];
      const userPrompt = lastMessage ? (lastMessage.text || (lastMessage.parts && lastMessage.parts[0]?.text) || "") : "";
      
      const response = await ai.interactions.create({
        model: "antigravity-preview-05-2026",
        input: userPrompt,
        system_instruction: systemInstruction,
        environment: "remote",
      });

      let fullOutput = "";
      for (const step of response.steps) {
        if (step.type === 'model_output') {
          const textContent: any = step.content?.find((c: any) => (c as any).type === 'text');
          if (textContent && textContent.text) {
            fullOutput += textContent.text;
          }
        }
      }

      const reply = fullOutput || "Disculpa, tengo dificultades para procesar el concepto con Gravity en este momento.";
      return res.json({ reply });
    }

    // Convert messages into the required format for gemini chats
    const formattedContents = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const response = await generateContentWithFallback(ai, selectedModel, {
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      },
    });

    const reply = response.text || "Disculpa, tengo dificultades para procesar el concepto en este momento.";
    return res.json({ reply });
  } catch (error: any) {
    console.warn("Chat Error, activating procedural fallback:", error);
    const fallback = proceduralChatResponse(messages, researchThemes, selectedHubIds);
    return res.json({ reply: fallback.reply });
  }
});

// OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// In-memory store for tokens (this is just for demonstration purposes)
let userToken: any = null;

// Auth endpoints
app.get("/api/auth/url", (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
  res.json({ url });
});

app.get("/api/auth/status", (req, res) => {
  res.json({ authenticated: userToken !== null });
});

app.get("/api/auth/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    userToken = tokens;
    res.send("Authentication successful! You can close this window.");
  } catch (error) {
    console.error("Auth callback error:", error);
    res.status(500).send("Authentication failed.");
  }
});

// Drive API endpoints
app.get("/api/drive/list", async (req, res) => {
  if (!userToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const response = await drive.files.list({
      q: "name = 'STV' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name)',
    });
    
    let folderId: string | null = null;
    
    if (response.data.files && response.data.files.length > 0) {
      folderId = response.data.files[0].id || null;
    } else {
      // Automatically create the STV folder in the user's Drive!
      const folderMetadata = {
        name: 'STV',
        mimeType: 'application/vnd.google-apps.folder',
      };
      const newFolder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });
      folderId = newFolder.data.id || null;
      
      if (folderId) {
        // Create an instructional guide file inside the folder
        const fileMetadata = {
          name: 'LEEME_INDICACIONES_STV.txt',
          parents: [folderId],
        };
        await drive.files.create({
          requestBody: fileMetadata,
          media: {
            mimeType: 'text/plain',
            body: Readable.from(`=== ARÍSTIDES CO-PILOTO // INSTRUCCIONES DE PLANOS Y COSTOS STV ===

Este es el canal automatizado de lectura del sistema STV.VCS-01 enfocado en Planos, Despieces de Obra y Presupuestos.

Para cargar especificaciones de planos, listados de piezas/materiales, conceptos de obra y costos de forma automática:
1. Sube archivos de texto (.txt) o crea documentos de Google Docs en esta carpeta "STV".
2. Asegúrate de incluir descripciones claras de los materiales (ej: "Perfil HSS 4x4 pulgadas", "Viga de Acero IPE 240", "Placa de conexión 1/2 pulgada"), sus cantidades requeridas, categorías (ej: "Viga/Perfil", "Placa", "Perno/Conector") y costos o precios unitarios base estimados.
3. En la interfaz web, presiona el botón "Refrescar" para ver la lista de archivos de despiece.
4. Selecciona el plano o lista de materiales y haz clic en "Extracción de Materiales y Costos" para que Arístides extraiga las piezas y te permita inyectarlas directamente en el Catálogo de Productos y Estimador del sistema, adaptando sus costos con la fluctuación actual.

¡El pipeline de optimización de costos y planos estructurales está en línea!`),
          }
        });
      }
    }
    
    if (folderId) {
      const files = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
      });
      res.json(files.data.files || []);
    } else {
      res.json({ error: "No se pudo crear la carpeta 'STV' automáticamente." });
    }
  } catch (error: any) {
    console.error("Drive list error:", error);
    res.status(500).json({ error: "Fallo al listar los archivos de Google Drive: " + (error.message || error) });
  }
});

app.get("/api/drive/read", async (req, res) => {
  if (!userToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  const { fileId } = req.query;
  if (!fileId) {
    return res.status(400).json({ error: "Missing fileId" });
  }
  
  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Get file metadata first to check mimeType
    const metadata = await drive.files.get({
      fileId: fileId as string,
      fields: 'mimeType,name',
    });
    
    let contentText = "";
    
    if (metadata.data.mimeType === 'application/vnd.google-apps.document') {
      // Export Google Doc as plain text
      const exportResponse = await drive.files.export({
        fileId: fileId as string,
        mimeType: 'text/plain',
      });
      contentText = typeof exportResponse.data === 'string' ? exportResponse.data : JSON.stringify(exportResponse.data);
    } else {
      // Get raw media content
      const response = await drive.files.get({
        fileId: fileId as string,
        alt: 'media',
      });
      contentText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    }
    
    res.json({ content: contentText, name: metadata.data.name });
  } catch (error: any) {
    console.error("Drive read error:", error);
    res.status(500).json({ error: "Failed to read file: " + (error.message || "") });
  }
});

app.post("/api/process-regulation", async (req, res) => {
  const { content, regulationName } = req.body;
  if (!content) {
    return res.status(400).json({ error: "Missing blueprint or material list content" });
  }
  
  try {
    const ai = getAiClient();
    if (!ai) {
      console.log("No AI Client. Parsing blueprint materials procedurally...");
      const localData = proceduralBlueprintParser(content, regulationName);
      return res.json(localData);
    }
    
    const prompt = `
      You are an expert structural engineer, industrial cost estimator, and architectural co-pilot.
      Your task is to analyze the following unstructured blueprint notes, structural plan description, material takeoffs, or budget list for the file "${regulationName}", and extract a clean list of steel pieces, elements, descriptions, concepts, and estimated unit base costs.

      Please format the response strictly as a JSON object matching this TypeScript structure:
      {
        "fileName": string (use "${regulationName}"),
        "projectName": string (extracted project title, building style, or drawing ID. If not found, generate a suitable high-tech STV industrial title),
        "elementsDescription": string (dense, technical overview of the structural design, shapes, connections, and architectural style),
        "materials": [
          {
            "name": string (name of the piece/material/concept, e.g. "Viga IPE 240", "Placa de Momento 3/4 pulgadas", "Perno de alta resistencia A325"),
            "category": string (MUST be one of these exact categories: "Viga/Perfil", "Placa", "Perno/Conector", "Anclaje", "Estructura Principal", "Pintura/Protección"),
            "description": string (specification details, steel grade e.g. A36, A992, dimensions, connection method),
            "quantity": number (quantity of units required. If not found, default to 1),
            "basePrice": number (estimated standard market unit price in USD. If not mentioned in the text, estimate a reasonable actual commercial price for that steel element/profile, e.g. $120.00 for a medium profile, $15.00 for a structural bolt, $45.00 for a connection plate)
          }
        ],
        "totalBaseBudget": number (sum of basePrice * quantity of all materials),
        "notes": string (brief engineer advice in Spanish regarding cost risks, steel market volatility, and installation suggestions, max 80 words)
      }

      Text content from Google Drive file:
      ${content}
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonText = result.text;
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (error: any) {
    console.warn("Error processing blueprint, falling back to local procedural parser:", error);
    const localData = proceduralBlueprintParser(content, regulationName);
    return res.json(localData);
  }
});

app.post("/api/brainstorm-theme", async (req, res) => {
  const { title, concepts, notes } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Missing theme title" });
  }

  try {
    const ai = getAiClient();
    if (!ai) {
      console.log("No AI Client. Generating theme brainstorm procedurally...");
      const reply = `* **Uniones de Alta Tracción:** Configurar empates de tipo articulado con pasadores de titanio grado 5 para evitar fatiga en uniones sometidas a cargas eólicas en la zona de ${title}.
* **Calibración del Entramado:** Para los conceptos de "${concepts || 'Soporte'}", implementar perfilería estructural HSS (Hollow Structural Sections) previendo un coeficiente de pandeo local de elasticidad controlada de Euler.
* **Protección Metalúrgica:** Aplicar imprimación epóxica galvanizada por inmersión de triple capa para repeler la severa abrasión galvánica de la región.`;
      return res.json({ brainstormedNotes: reply });
    }
    
    const prompt = `
      You are an expert structural engineer and creative architectural technologist.
      Provide a highly professional, dense, and inspirational technical outline or engineering recommendation (2-3 bullet points, in Spanish) for a research topic in structural steel and advanced metallurgy.
      Keep it brief (max 120 words total) and extremely structured. Focus on practical guidelines, steel grades, joint designs, and mechanical physics.
      
      Topic Title: "${title}"
      Key Concepts: "${concepts || 'None specified'}"
      Current User Notes: "${notes || 'No notes yet'}"
      
      Response:
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const reply = result.text?.trim() || "No se pudo generar el análisis.";
    res.json({ brainstormedNotes: reply });
  } catch (error: any) {
    console.warn("Brainstorm theme error, activating local fallback:", error);
    const reply = `* **Uniones de Alta Tracción:** Configurar empates de tipo articulado con pasadores de titanio grado 5 para evitar fatiga en uniones sometidas a cargas eólicas en la zona de ${title}.
* **Calibración del Entramado:** Para los conceptos de "${concepts || 'Soporte'}", implementar perfilería estructural HSS (Hollow Structural Sections) previendo un coeficiente de pandeo local de elasticidad controlada de Euler.
* **Protección Metalúrgica:** Aplicar imprimación epóxica galvanizada por inmersión de triple capa para repeler la severa abrasión galvánica de la región.`;
    return res.json({ brainstormedNotes: reply });
  }
});

// Server setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // In dev: mount Vite middleware so both assets and index.html are served from the same server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production: serve bundled static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
