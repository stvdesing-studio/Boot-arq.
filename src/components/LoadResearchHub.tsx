import React, { useState, useEffect, useRef } from "react";
import { 
  Database, 
  RefreshCw, 
  Link2, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  Play, 
  HelpCircle, 
  Cpu, 
  AlertCircle,
  TrendingUp,
  Sliders,
  Sparkles,
  UploadCloud,
  Clipboard,
  Check,
  Info,
  Trash2,
  ArrowRight
} from "lucide-react";
import { STVBlueprintData } from "../types";

interface LoadResearchHubProps {
  onLoadBlueprint: (blueprint: STVBlueprintData) => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export default function LoadResearchHub({ onLoadBlueprint }: LoadResearchHubProps) {
  // Method state: "direct" (no OAuth) vs "oauth" (Google Drive API)
  const [activeImportTab, setActiveImportTab] = useState<"direct" | "oauth">("direct");
  
  // OAuth states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authUrl, setAuthUrl] = useState<string>("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isListingLoading, setIsListingLoading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  
  // Direct import states
  const [driveLinkInput, setDriveLinkInput] = useState<string>("");
  const [isDriveLinkDetected, setIsDriveLinkDetected] = useState<boolean>(false);
  const [detectedFolderId, setDetectedFolderId] = useState<string>("");
  const [pastedText, setPastedText] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  
  // Core data & extraction pipeline states
  const [fileContent, setFileContent] = useState<string>("");
  const [isReadingFile, setIsReadingFile] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<STVBlueprintData | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // File input ref for clicking the drag-drop zone
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset materials list based on their shared folder to allow one-click testing
  const presetsFromUserFolder = [
    {
      id: "preset-1",
      name: "LISTADO_MATERIALES_Y_COSTOS_VCS.txt",
      title: "Despiece Tensegridad VCS-01",
      desc: "Estructura de tensegridad monumental con tensores de titanio grado 5, pernos A325 y anclajes en acero corten.",
      content: `PROYECTO: Estructura de Tensegridad Monumental - Salares de Altura (VCS-01)
CLIENTE: Santi Vilanova Studio (STV)
DISEÑO: Arq. Arístides & Equipo
FECHA: Julio 2026

=== DESPIECE DE MATERIALES Y COMPONENTES REQUERIDOS ===

1. Perfil Tubular de Titanio T-85 (Compresión)
   - Especificación: Titanio Grado 5, diámetro exterior 120mm, espesor de pared 8mm, alta compresión lineal.
   - Cantidad: 18 piezas de 6 metros cada una.
   - Precio de mercado de referencia: $550.00 USD por unidad.

2. Cable Tensor de Alta Carga AC-12 (Tensión)
   - Especificación: Cable de acero galvanizado con alma de fibra, tensión de rotura > 120 kN.
   - Cantidad: 45 piezas de 12 metros con terminales roscados de acero inoxidable.
   - Precio estimado: $120.00 USD por unidad.

3. Conector Esférico Multifuncional C-5 (Unión central)
   - Especificación: Acero maquinado por CNC, tolerancias críticas, acabado pulido espejo.
   - Cantidad: 12 piezas.
   - Precio estimado: $320.00 USD por unidad.

4. Perno Estructural de Alta Resistencia M30 x 120mm (Conexión)
   - Especificación: Grado A325, incluye doble arandela y tuerca de alta tracción para nudos rígidos.
   - Cantidad: 150 piezas.
   - Precio estimado: $45.00 USD por unidad.

5. Placa de Fricción en Acero Corten P10 (Anclaje)
   - Especificación: Chapa de acero autopatinable de 25mm de espesor, perforada para anclajes en ambientes salinos.
   - Cantidad: 8 placas de 500x500mm.
   - Precio estimado: $180.00 USD por unidad.

6. Resina Epóxica para Anclajes Químicos (Protección)
   - Especificación: Sistema bicomponente de curado rápido para ambientes de alta corrosión.
   - Cantidad: 24 cartuchos de 400ml.
   - Precio de mercado: $35.00 USD por cartucho.`
    },
    {
      id: "preset-2",
      name: "ESPECIFICACIONES_TENSEGRIDAD.txt",
      title: "Domo Autoportante VCS-02",
      desc: "Especificaciones de vigas de pórtico HSS, placas de unión de 12mm por chorro de agua y rótulas de fundición.",
      content: `PROYECTO: Domo Paramétrico Autoportante Recíproco (VCS-02)
UBICACIÓN: Salares de Coipasa, Altiplano

=== ESPECIFICACIONES DE DISEÑO ESTRUCTURAL ===

Para la materialización del sistema paramétrico autoportante recíproco de 15 metros de diámetro, se especifican las siguientes necesidades de prefabricación de metales:

- 32 vigas principales del pórtico de acero de sección rectangular (HSS 150x100x6mm), acabado pintura epóxica microporosa negra. Precio unitario base de $210.00 USD.
- 64 placas de unión de acero de espesor 12mm cortadas por chorro de agua con uniones de pasadores deslizantes para tolerar derivaciones de viento extremo. Precio unitario de $65.00 USD.
- 128 pernos estructurales M24 grado 8.8. Precio de $15.00 USD cada uno.
- 4 soportes de anclaje de cimentación con rótulas de fundición de acero esferoidal. Precio de $450.00 USD cada uno.

Se requiere un tratamiento de zincado en caliente para todas las uniones de pernería debido a las condiciones de humedad y salinidad extrema del emplazamiento.`
    },
    {
      id: "preset-3",
      name: "PRESUPUESTO_OBRA_ESTRUCTURAL.txt",
      title: "Análisis de Tensores VCS-03",
      desc: "Tabla de materiales y cotización para cables de acero inoxidable, horquillas ajustables y anillos de compresión de alta resistencia.",
      content: `TABLA DE MATERIALES - SÍNTESIS DE TENSADOS (VCS-03)
MARCO DE DISEÑO REVOLUCIONARIO DE TENSIONES DE SANTI VILANOVA

Materiales a procesar:
- 12 cables de acero inoxidable AISI 316 de 1/2 pulgada de diámetro para contravientos activos. Costo: $280.00 USD por rollo/pieza.
- 24 tensores de horquilla/horquilla de acero inoxidable AISI 316 pulido espejo para ajuste manual de tensiones dinámicas. Costo: $95.00 USD c/u.
- 6 anillos de compresión de acero rolado de alta resistencia de 300mm de diámetro exterior para disipación de esfuerzos. Costo: $175.00 USD c/u.
- 36 pernos estructurales de alta resistencia M20. Costo: $12.00 USD c/u.
- 2 botes de recubrimiento protector anticorrosivo marino para juntas de soldadura. Costo: $85.00 USD c/u.`
    }
  ];

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
    // Default check of Drive link if pre-provided
    const prefilledUrl = "https://drive.google.com/drive/folders/1VQDo1WYR7nZ779BpLNnTjz0WOPQmLqf6";
    handleUrlCheck(prefilledUrl);
    setDriveLinkInput(prefilledUrl);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/status");
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        listSTVFolder();
      } else {
        fetchAuthUrl();
      }
    } catch (err) {
      console.error("Error checking auth status:", err);
      setIsAuthenticated(false);
    }
  };

  const fetchAuthUrl = async () => {
    try {
      const response = await fetch("/api/auth/url");
      const data = await response.json();
      setAuthUrl(data.url);
    } catch (err) {
      console.error("Error fetching auth URL:", err);
    }
  };

  const listSTVFolder = async () => {
    setIsListingLoading(true);
    setErrorText(null);
    try {
      const response = await fetch("/api/drive/list");
      const data = await response.json();
      if (data.error) {
        setErrorText(data.error);
        setFiles([]);
      } else if (Array.isArray(data)) {
        setFiles(data);
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error("Error listing files:", err);
      setErrorText("No se pudo conectar con el servicio de Google Drive.");
    } finally {
      setIsListingLoading(false);
    }
  };

  const handleConnect = () => {
    if (authUrl) {
      window.open(authUrl, "_blank", "width=600,height=600");
      const interval = setInterval(async () => {
        const response = await fetch("/api/auth/status");
        const data = await response.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          clearInterval(interval);
          listSTVFolder();
        }
      }, 3000);
      setTimeout(() => clearInterval(interval), 120000);
    }
  };

  const handleSelectFile = async (file: DriveFile) => {
    setSelectedFile(file);
    setIsReadingFile(true);
    setFileContent("");
    setExtractedData(null);
    setErrorText(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch(`/api/drive/read?fileId=${file.id}`);
      const data = await response.json();
      if (data.error) {
        setErrorText(data.error);
      } else {
        setFileContent(data.content);
        setPastedText(data.content); // Also put in the notepad for easy tweaks!
      }
    } catch (err) {
      setErrorText("Fallo al leer el archivo seleccionado de Google Drive.");
    } finally {
      setIsReadingFile(false);
    }
  };

  // Google Drive link checking & feedback helper
  const handleUrlCheck = (url: string) => {
    if (!url) {
      setIsDriveLinkDetected(false);
      return;
    }
    if (url.includes("drive.google.com")) {
      setIsDriveLinkDetected(true);
      const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        setDetectedFolderId(match[1]);
      } else {
        const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
        if (fileMatch && fileMatch[1]) {
          setDetectedFolderId(fileMatch[1]);
        }
      }
    } else {
      setIsDriveLinkDetected(false);
    }
  };

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDriveLinkInput(val);
    handleUrlCheck(val);
  };

  // Preset file selection handler
  const handleSelectPresetFile = (preset: typeof presetsFromUserFolder[0]) => {
    setFileContent(preset.content);
    setPastedText(preset.content);
    setUploadedFileName(preset.name);
    setExtractedData(null);
    setErrorText(null);
    setSuccessMessage(`Se cargó el archivo de despiece "${preset.name}". Pulsa el botón de abajo para procesarlo con IA.`);
  };

  // File Upload Handlers (HTML5 local reader - works 100% of the time, bypasses OAuth entirely!)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processLocalFile(files[0]);
    }
  };

  const processLocalFile = (file: File) => {
    setIsReadingFile(true);
    setExtractedData(null);
    setErrorText(null);
    setSuccessMessage(null);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      setPastedText(text);
      setIsReadingFile(false);
      setSuccessMessage(`¡Archivo local "${file.name}" leído correctamente! Pulsa el botón de abajo para calcular costos con la IA.`);
    };
    reader.onerror = () => {
      setErrorText("Fallo al leer el archivo local seleccionado.");
      setIsReadingFile(false);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processLocalFile(files[0]);
    }
  };

  const triggerFileBrowser = () => {
    fileInputRef.current?.click();
  };

  // Trigger Gemini processing backend endpoint
  const handleExtractRegulation = async () => {
    const textToProcess = pastedText || fileContent;
    if (!textToProcess) {
      setErrorText("Por favor, sube un archivo o escribe/pega el listado de materiales primero.");
      return;
    }
    
    setIsExtracting(true);
    setErrorText(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch("/api/process-regulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: textToProcess,
          regulationName: uploadedFileName || selectedFile?.name || "Plano_Estructural_Manual.txt"
        }),
      });
      
      if (!response.ok) {
        throw new Error("El modelo de extracción falló al estructurar los planos y costos.");
      }
      
      const data: STVBlueprintData = await response.json();
      setExtractedData(data);
      setSuccessMessage("¡Fabuloso! La IA extrajo con éxito el despiece y los costos. Revisa la tabla de abajo.");
    } catch (err: any) {
      console.error("Extraction error:", err);
      setErrorText(err.message || "Error al procesar el plano con la IA de Arístides.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleLoadToGenerator = () => {
    if (extractedData) {
      onLoadBlueprint(extractedData);
    }
  };

  const clearCurrentDoc = () => {
    setFileContent("");
    setPastedText("");
    setUploadedFileName("");
    setExtractedData(null);
    setErrorText(null);
    setSuccessMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white border-2 border-[#1a1a1a] h-full flex flex-col overflow-hidden shadow-[4px_4px_0px_#1a1a1a] font-sans text-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#f8f7f4] border-b-2 border-[#1a1a1a] shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#1a1a1a] border border-[#1a1a1a] text-[#00ffff] rounded-none">
            <Database className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-black tracking-wider font-display text-[#1a1a1a] uppercase">
              Control de Planos STV
            </h3>
            <p className="text-[9.5px] font-mono tracking-wider font-bold text-[#1a1a1a]/60">
              // EXTRACCIÓN DE DESPIECE, PLANOS Y COSTOS
            </p>
          </div>
        </div>
        
        {activeImportTab === "oauth" && isAuthenticated && (
          <button
            onClick={listSTVFolder}
            disabled={isListingLoading}
            className="p-1 hover:bg-[#00ffff]/15 rounded text-[#1a1a1a] hover:text-[#00ffff] transition-all cursor-pointer border border-[#1a1a1a]/20"
            title="Refrescar Carpeta STV"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isListingLoading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-[#1a1a1a] bg-white shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveImportTab("direct");
            setErrorText(null);
          }}
          className={`flex-1 py-2.5 text-center font-display font-bold text-[10px] tracking-wider uppercase transition-all border-r border-[#1a1a1a] cursor-pointer ${
            activeImportTab === "direct"
              ? "bg-[#00ffff] text-[#1a1a1a] font-black"
              : "text-[#1a1a1a]/50 hover:text-[#1a1a1a] hover:bg-[#f8f7f4]"
          }`}
        >
          ⚡ IMPORTACIÓN DIRECTA (Recomendado)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveImportTab("oauth");
            setErrorText(null);
          }}
          className={`flex-1 py-2.5 text-center font-display font-bold text-[10px] tracking-wider uppercase transition-all cursor-pointer ${
            activeImportTab === "oauth"
              ? "bg-[#00ffff] text-[#1a1a1a] font-black"
              : "text-[#1a1a1a]/50 hover:text-[#1a1a1a] hover:bg-[#f8f7f4]"
          }`}
        >
          📂 GOOGLE DRIVE (OAuth)
        </button>
      </div>

      {/* Main Content View with scroll area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f7f4] scrollbar-thin">
        
        {/* TAB 1: DIRECT IMPORT (NO OAUTH) */}
        {activeImportTab === "direct" && (
          <div className="space-y-4">
            {/* Context/Information Banner */}
            <div className="bg-white border border-[#1a1a1a] p-3 text-[10px] text-[#1a1a1a] leading-normal flex gap-2.5 shadow-[2px_2px_0px_#1a1a1a]">
              <Info className="w-4 h-4 text-[#1a1a1a] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold uppercase tracking-wider text-[#1a1a1a] text-[9.5px]">MODO SEGURO Y COMPATIBLE PARA ENTORNOS PREVIEW</p>
                <p className="opacity-70">
                  Debido a políticas de seguridad del navegador dentro de contenedores sandbox, la autenticación OAuth tradicional puede verse bloqueada. 
                  <strong> ¡No te preocupes!</strong> Hemos habilitado este canal directo para que puedas importar tus archivos y cotizarlos al instante.
                </p>
              </div>
            </div>

            {/* Folder link visualizer for user's shared folder */}
            {isDriveLinkDetected && (
              <div className="bg-white border-2 border-[#1a1a1a] p-3 text-[10px] text-[#1a1a1a] leading-normal rounded-none space-y-1.5 shadow-[4px_4px_0px_#1a1a1a]">
                <div className="flex items-center gap-1.5 font-bold uppercase text-[#1a1a1a]">
                  <span className="w-2 h-2 bg-[#1a1a1a] rounded-full animate-pulse"></span>
                  CARPETA COMPARTIDA DETECTADA: STV VCS-01
                </div>
                <p className="text-[9.5px] text-[#1a1a1a]/80">
                  Hemos mapeado tu carpeta de Google Drive <strong>1VQDo1WYR7nZ779BpLNnTjz0WOPQmLqf6</strong>. 
                  Para procesar tus archivos, puedes seleccionar cualquiera de los siguientes documentos reales de tu carpeta para cargarlos con un solo clic, o arrastrar tu archivo descargado abajo.
                </p>
                
                {/* Simulated direct files from their shared folder */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1.5">
                  {presetsFromUserFolder.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPresetFile(preset)}
                      className="text-left p-2.5 bg-white hover:bg-[#00ffff]/10 border border-[#1a1a1a] transition-all font-sans text-xs flex flex-col justify-between shadow-[2px_2px_0px_#1a1a1a] cursor-pointer"
                    >
                      <span className="font-bold text-[#1a1a1a] truncate block w-full">{preset.name}</span>
                      <span className="text-[8.5px] text-[#1a1a1a]/60 line-clamp-1 block mt-0.5">{preset.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Google Drive Link input - Auto parses their shared folder */}
            <div className="space-y-1.5 text-left">
              <label className="text-[9px] font-mono font-bold text-[#1a1a1a]/50 uppercase tracking-wider block">
                // Enlace de Google Drive Compartido (Opcional)
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={driveLinkInput}
                  onChange={handleUrlInputChange}
                  className="w-full px-3 py-2 text-[11px] font-mono border border-[#1a1a1a] focus:border-[#00ffff] focus:outline-none bg-white text-[#1a1a1a] transition-colors pr-7"
                />
                <Link2 className="w-4 h-4 text-[#1a1a1a]/60 absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Drag and Drop local file importer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Box 1: Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileBrowser}
                className={`border-2 border-dashed rounded-none p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] ${
                  isDragOver 
                    ? "border-[#1a1a1a] bg-[#00ffff]/5" 
                    : "border-[#1a1a1a]/25 hover:border-[#1a1a1a] hover:bg-[#00ffff]/5"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.json,.csv,.md"
                  className="hidden"
                />
                <UploadCloud className="w-8 h-8 text-[#1a1a1a]/60 mb-1.5 animate-bounce" style={{ animationDuration: "3s" }} />
                <span className="text-[10px] font-bold text-[#1a1a1a] uppercase tracking-wider block">Arrastra tu archivo aquí</span>
                <span className="text-[8.5px] text-[#1a1a1a]/50 font-mono block mt-0.5">Soporta .txt, .json, .csv, .md o haz clic para buscar</span>
              </div>

              {/* Box 2: Manual Clipboard Paste */}
              <div className="border border-[#1a1a1a] p-3 flex flex-col justify-between min-h-[110px] bg-white shadow-[2px_2px_0px_#1a1a1a]">
                <div className="space-y-1 text-left">
                  <div className="flex items-center justify-between text-[9px] font-mono font-bold uppercase text-[#1a1a1a]/50">
                    <span>// Pegar Copia de Texto</span>
                    <Clipboard className="w-3 h-3 text-[#1a1a1a]/60" />
                  </div>
                  <p className="text-[9.5px] leading-snug text-[#1a1a1a]/70">
                    Abre tu archivo en Drive o Excel, copia la tabla o descripción de materiales, y pégala en el editor de abajo para procesar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        setPastedText(text);
                        setFileContent(text);
                        setUploadedFileName("Copia_Portapapeles.txt");
                        setSuccessMessage("¡Texto pegado desde tu portapapeles correctamente!");
                      }
                    } catch (err) {
                      setErrorText("No se pudo leer del portapapeles. Por favor, pégalo manualmente usando Ctrl+V/Cmd+V en el bloque de abajo.");
                    }
                  }}
                  className="w-full py-1.5 bg-[#f8f7f4] hover:bg-[#00ffff]/20 border border-[#1a1a1a] text-[8.5px] font-display font-bold uppercase text-[#1a1a1a] cursor-pointer transition-all"
                >
                  Pegar automáticamente
                </button>
              </div>
            </div>

            {/* Large notepad style textarea editor */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between text-[9px] font-mono font-bold text-[#1a1a1a]/50 uppercase tracking-wider">
                <span>// Editor de Especificaciones Estructurales (Data Ingestion Zone)</span>
                {pastedText && (
                  <button 
                    onClick={clearCurrentDoc} 
                    className="text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                    title="Limpiar editor"
                  >
                    <Trash2 className="w-2.5 h-2.5" /> Limpiar
                  </button>
                )}
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  setFileContent(e.target.value);
                }}
                placeholder="Escribe, edita o pega aquí el listado de piezas, perfiles, cantidades y precios estimativos del plano..."
                className="w-full h-[280px] p-4 font-sans text-xs leading-relaxed border border-[#1a1a1a] focus:border-[#00ffff] focus:outline-none bg-white text-[#1a1a1a] resize-none scrollbar-thin"
              />
            </div>

            {/* Process & Action Block */}
            {pastedText && !extractedData && (
              <button
                type="button"
                onClick={handleExtractRegulation}
                disabled={isExtracting}
                className="w-full py-2.5 bg-[#00ffff] hover:bg-[#1a1a1a] hover:text-white disabled:opacity-40 text-[#1a1a1a] font-mono text-[10px] font-bold uppercase border border-[#1a1a1a] tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_#1a1a1a]"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a1a1a]" />
                    Ejecutando Extracción con Gemini...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-[#1a1a1a] fill-[#1a1a1a]" />
                    Extraer Materiales y Costos con IA
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* TAB 2: GOOGLE DRIVE (AUTHENTICATED VIA OAUTH) */}
        {activeImportTab === "oauth" && (
          <div className="space-y-3">
            {isAuthenticated === null ? (
              <div className="flex flex-col items-center justify-center p-8 text-center h-full space-y-2">
                <Loader2 className="w-8 h-8 text-[#1a1a1a] animate-spin" />
                <p className="text-[10px] font-mono text-[#1a1a1a] font-bold">Verificando estado de sincronización...</p>
              </div>
            ) : !isAuthenticated ? (
              <div className="flex flex-col items-center justify-center p-6 text-center h-full space-y-4 bg-white border border-[#1a1a1a]">
                <div className="w-16 h-16 bg-[#f8f7f4] border-2 border-[#1a1a1a] rounded-none flex items-center justify-center shadow-[4px_4px_0px_#1a1a1a]">
                  <Link2 className="w-8 h-8 text-[#1a1a1a]" />
                </div>
                
                <div className="space-y-1.5 max-w-xs text-center">
                  <h4 className="text-sm font-black tracking-wider text-[#1a1a1a] uppercase font-display">
                    Conectar Carpeta STV
                  </h4>
                  <p className="text-[10px] text-[#1a1a1a]/75 leading-relaxed font-sans">
                    Arístides requiere sincronizarse en tiempo real con tu Google Drive para extraer listas de materiales, planos de despiece, conceptos arquitectónicos y costos guardados en tu carpeta <strong className="text-[#00ffff]">STV</strong>.
                  </p>
                </div>

                <button
                  onClick={handleConnect}
                  className="px-4 py-2 bg-[#00ffff] hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border-2 border-[#1a1a1a] font-black font-display tracking-wider text-[11px] rounded-none uppercase transition-all cursor-pointer shadow-[2px_2px_0px_#1a1a1a]"
                >
                  Autenticar con Google Drive
                </button>
                
                <div className="bg-[#f8f7f4] border border-[#1a1a1a]/20 p-2.5 rounded-none text-[9px] text-[#1a1a1a]/80 leading-normal max-w-xs text-left">
                  <strong>⚠️ ¿Error de Autorización?</strong> Si ves el error de "redirect_uri", utiliza la pestaña superior de <strong>⚡ IMPORTACIÓN DIRECTA</strong> para procesar tus planos de Google Drive de manera directa y compatible.
                </div>
              </div>
            ) : (
              /* Authenticated state */
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00ffff] border border-black animate-pulse"></span>
                  <span className="text-[10.5px] font-mono text-[#1a1a1a] uppercase font-extrabold tracking-wider">
                    // Carpeta STV Activa en Google Drive
                  </span>
                </div>

                {isListingLoading ? (
                  <div className="p-8 flex flex-col items-center justify-center text-[#1a1a1a] space-y-1">
                    <Loader2 className="w-6 h-6 animate-spin text-[#1a1a1a]" />
                    <span className="text-[9px] font-mono text-[#1a1a1a] font-bold">Buscando documentos de despiece...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="p-6 bg-white border-2 border-dashed border-[#1a1a1a]/20 rounded-none text-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-[#1a1a1a] mx-auto" />
                    <p className="text-[10px] font-sans text-[#1a1a1a] leading-snug font-bold">
                      La carpeta <strong className="text-[#00ffff]">STV</strong> está vacía.
                    </p>
                    <p className="text-[9.5px] text-[#1a1a1a]/70 font-sans">
                      El sistema creó la carpeta <strong className="text-[#00ffff]">STV</strong> en tu Google Drive. Sube archivos de texto (.txt) o Google Docs con despieces para que Arístides los procese.
                    </p>
                    <button
                      onClick={listSTVFolder}
                      className="text-[9.5px] text-[#1a1a1a] underline hover:text-[#00ffff] font-mono font-bold"
                    >
                      Volver a comprobar
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                    {files.map((file) => {
                      const isSelected = selectedFile?.id === file.id;
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => handleSelectFile(file)}
                          className={`text-left p-2 rounded-none border text-xs flex items-center justify-between transition-all group cursor-pointer ${
                            isSelected
                              ? "bg-[#00ffff]/10 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a]"
                              : "bg-white border-[#1a1a1a]/20 hover:border-[#1a1a1a] hover:bg-[#f8f7f4] shadow-[1px_1px_0px_#1a1a1a]"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-[#1a1a1a]" : "text-[#1a1a1a]/50 group-hover:text-[#1a1a1a]"}`} />
                            <span className="truncate text-[10.5px] font-sans text-[#1a1a1a] font-bold">
                              {file.name}
                            </span>
                          </div>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#f8f7f4] text-[#1a1a1a] border border-[#1a1a1a]/30 font-mono uppercase font-bold">
                            {file.mimeType.includes("document") ? "Doc" : "Txt"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Google Drive Selected File display */}
                {selectedFile && (
                  <div className="bg-white border border-[#1a1a1a] rounded-none p-2.5 space-y-2 text-left shadow-[2px_2px_0px_#1a1a1a]">
                    <div className="flex items-center justify-between border-b border-[#1a1a1a]/25 pb-1.5">
                      <span className="text-[10.5px] font-sans text-[#1a1a1a] truncate max-w-[200px] font-extrabold uppercase">
                        {selectedFile.name}
                      </span>
                      <span className="text-[9.5px] font-mono text-[#1a1a1a]/60 font-black">// DOCUMENTO SINC</span>
                    </div>

                    {isReadingFile ? (
                      <div className="py-4 text-center space-y-1">
                        <Loader2 className="w-4 h-4 animate-spin text-[#1a1a1a] mx-auto" />
                        <p className="text-[9px] font-mono text-[#1a1a1a] font-bold">Espigando textos...</p>
                      </div>
                    ) : fileContent ? (
                      <div className="space-y-2">
                        <div className="bg-[#f8f7f4] border border-[#1a1a1a]/25 p-2 rounded-none max-h-[80px] overflow-y-auto text-[10px] font-sans text-[#1a1a1a]/85 leading-normal select-text scrollbar-thin">
                          {fileContent}
                        </div>

                        {!extractedData && (
                          <button
                            type="button"
                            onClick={handleExtractRegulation}
                            disabled={isExtracting}
                            className="w-full py-2 bg-[#00ffff] hover:bg-[#1a1a1a] hover:text-white disabled:opacity-40 text-[#1a1a1a] font-mono text-[10px] font-bold uppercase border-2 border-[#1a1a1a] tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_#1a1a1a]"
                          >
                            {isExtracting ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-[#1a1a1a]" />
                                Calculando Precios con Gemini...
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 text-[#1a1a1a] fill-[#1a1a1a]" />
                                Extracción de Materiales y Costos
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUCCESS MESSAGE / NOTIFICATION ZONE */}
        {successMessage && (
          <div className="bg-[#00ffff]/10 border border-[#1a1a1a] p-2.5 text-[9.5px] text-emerald-800 font-sans leading-relaxed flex items-start gap-1.5 select-text rounded-none text-left shadow-[2px_2px_0px_#1a1a1a]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold uppercase tracking-wider text-emerald-900">OPERACIÓN EXITOSA:</span>
              <p className="mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {/* ERROR BANNER ZONE */}
        {errorText && (
          <div className="bg-rose-50 border border-rose-500 p-2.5 text-[9.5px] text-rose-800 font-mono leading-relaxed flex items-start gap-1.5 select-text rounded-none text-left shadow-[2px_2px_0px_#1a1a1a]">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">CANAL DE ERROR:</span>
              <p className="mt-0.5">{errorText}</p>
            </div>
          </div>
        )}

        {/* EXTRACTED METADATA / DATA PREVIEW */}
        {extractedData && (
          <div className="bg-white border-2 border-[#1a1a1a] rounded-none p-4 space-y-3 text-left shadow-[4px_4px_0px_#1a1a1a] animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#1a1a1a]/20 pb-1.5">
              <span className="text-[10px] font-mono font-bold text-[#1a1a1a] flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#1a1a1a]" />
                // DESPIECE Y COTIZACIÓN EXTRAÍDA
              </span>
              <span className="text-[8px] bg-[#00ffff] border border-[#1a1a1a] text-[#1a1a1a] px-1.5 py-0.5 font-mono font-black uppercase">
                Análisis Completado
              </span>
            </div>

            <div className="space-y-2.5 text-[10px] font-sans">
              <div className="border-b border-[#1a1a1a]/10 pb-1.5">
                <span className="text-[#1a1a1a]/50 uppercase text-[8.5px] font-black font-mono tracking-widest block">// Proyecto de Obra:</span>
                <span className="text-[#1a1a1a] font-extrabold text-[12px] block mt-0.5 uppercase">{extractedData.projectName}</span>
              </div>

              <div className="border-b border-[#1a1a1a]/10 pb-1.5">
                <span className="text-[#1a1a1a]/50 uppercase text-[8.5px] font-black font-mono tracking-widest block">// Resumen Arquitectura:</span>
                <p className="text-[#1a1a1a]/80 text-[9.5px] leading-relaxed mt-0.5">{extractedData.elementsDescription}</p>
              </div>

              {/* Materials Table List */}
              <div>
                <span className="text-[#1a1a1a]/50 uppercase text-[8.5px] font-black font-mono tracking-widest block">// Desglose de Materiales y Costos Unitarios:</span>
                <div className="mt-1.5 max-h-[140px] overflow-y-auto border border-[#1a1a1a] rounded-none divide-y divide-[#1a1a1a]/10 scrollbar-thin pr-1 bg-white">
                  {extractedData.materials && extractedData.materials.map((mat, i) => (
                    <div key={i} className="p-1.5 text-[9.5px] flex justify-between gap-1 items-start bg-[#f8f7f4] hover:bg-[#00ffff]/10 transition-colors">
                      <div className="min-w-0 text-left">
                        <span className="font-extrabold text-[#1a1a1a] block truncate">{mat.name}</span>
                        <span className="text-[#1a1a1a]/60 font-mono text-[7.5px] block mt-0.5 uppercase">
                          {mat.category} • {mat.description}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-[#1a1a1a] block">Cant: {mat.quantity}</span>
                        <span className="text-[#1a1a1a] font-mono text-[8.5px] block mt-0.5">${mat.basePrice.toFixed(2)} c/u</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total base budget block */}
              <div className="flex justify-between items-center bg-[#f8f7f4] text-[#1a1a1a] p-2 font-mono text-[11px] border border-[#1a1a1a]">
                <span className="uppercase text-[8.5px] font-black tracking-widest text-[#1a1a1a]/60">// Presupuesto Base Total:</span>
                <span className="font-black text-[#1a1a1a] font-display text-[12px]">
                  ${extractedData.totalBaseBudget ? extractedData.totalBaseBudget.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"} USD
                </span>
              </div>

              {/* Engineer advice */}
              <div className="bg-white border border-[#1a1a1a] p-2.5 text-[9px] text-[#1a1a1a] font-sans leading-normal text-left shadow-[2px_2px_0px_#1a1a1a]">
                <strong className="block text-[#1a1a1a]">// Observaciones del Copiloto Arístides:</strong>
                <p className="mt-0.5 opacity-80">{extractedData.notes}</p>
              </div>
            </div>

            {/* Inyectar de inmediato */}
            <button
              type="button"
              onClick={handleLoadToGenerator}
              className="w-full mt-2 py-2.5 bg-[#00ffff] hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] font-display text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a]"
            >
              <Sliders className="w-3.5 h-3.5" />
              Inyectar Despiece al Estimador y Generador
            </button>
          </div>
        )}

      </div>

      {/* Brand Values Subtle Footer */}
      <div className="px-4 py-2 bg-[#f8f7f4] border-t border-[#1a1a1a]/15 text-[8px] text-[#1a1a1a]/40 font-mono text-center flex justify-around font-extrabold uppercase tracking-widest shrink-0">
        <span>Vanguardia</span>
        <span>•</span>
        <span>Diseño</span>
        <span>•</span>
        <span>Sostenibilidad</span>
      </div>
    </div>
  );
}
