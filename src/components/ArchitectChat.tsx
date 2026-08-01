import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import {
  Send,
  Sparkles,
  MessageSquare,
  Compass,
  User,
  Hammer,
  Volume2,
  VolumeX,
  FolderPlus,
  Plus,
  ChevronDown,
  ChevronUp,
  Database,
  GitCompare,
  Layers,
  CheckSquare,
  Square
} from "lucide-react";

interface ArchitectChatProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string, selectedHubIds?: string[]) => void;
  onLoadPrompt: (prompt: string, title: string) => void;
  useGravity: boolean;
  onToggleGravity: (enabled: boolean) => void;
  researchThemes: any[];
  onAddAsNewTheme: (text: string) => void;
  onAddToExistingTheme: (themeId: string, text: string) => void;
  aiModel?: string;
  onChangeAiModel?: (model: string) => void;
}

export default function ArchitectChat({
  messages,
  isLoading,
  onSendMessage,
  onLoadPrompt,
  useGravity,
  onToggleGravity,
  researchThemes = [],
  onAddAsNewTheme,
  onAddToExistingTheme,
  aiModel = "gemini-3.1-flash-lite",
  onChangeAiModel = () => {},
}: ArchitectChatProps) {
  const [input, setInput] = useState("");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [openSelectorIndex, setOpenSelectorIndex] = useState<number | null>(null);
  const [selectedHubIds, setSelectedHubIds] = useState<string[]>([]);
  const [showCrossConsole, setShowCrossConsole] = useState(false);

  const [autoSpeak, setAutoSpeak] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auto_speak_aristides") === "true";
    }
    return false;
  });
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastSpokenIndexRef = useRef<number>(-1);

  const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!input.trim() || isLoading) return;
 onSendMessage(input.trim(), selectedHubIds);
 setInput("");
  };

  const triggerCrossQuery = (queryTemplate: string) => {
 if (isLoading) return;
 onSendMessage(queryTemplate, selectedHubIds);
  };

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isLoading]);

  // Clean any active audio speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleSpeech = (text: string, index: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      alert("Tu navegador no soporta la síntesis de voz (Web Speech API).");
      return;
    }

    const synth = window.speechSynthesis;

    if (playingIndex === index) {
      synth.cancel();
      setPlayingIndex(null);
      return;
    }

    // Cancel any current speaking active
    synth.cancel();

    // Clean text from code blocks or complex syntaxes so it reads nicely
    const cleanText = text
      .replace(/```[\s\S]*?```/g, " [Bloque de prompt o código omitido de la lectura] ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[*#_\-]/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Dynamic selection of the best available Spanish voice
    const voices = synth.getVoices();
    const spanishVoice = voices.find((v) => v.lang.startsWith("es-") && v.name.toLowerCase().includes("google")) ||
                         voices.find((v) => v.lang.startsWith("es-")) ||
                         voices[0];

    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }
    
    // Aesthetic voice configuration (scholarly and serene)
    utterance.pitch = 0.95; 
    utterance.rate = 1.05;

    // Synchronize react playing index state on events
    utterance.onend = () => {
      setPlayingIndex(null);
    };
    utterance.onerror = () => {
      setPlayingIndex(null);
    };

    setPlayingIndex(index);
    synth.speak(utterance);
  };

  // Automatic speech reading when new messages from Arístides are loaded
  useEffect(() => {
    if (messages.length > 0) {
      const lastIndex = messages.length - 1;
      const lastMsg = messages[lastIndex];
      if (
        autoSpeak &&
        lastMsg &&
        lastMsg.role === "model" &&
        lastSpokenIndexRef.current < lastIndex &&
        !isLoading
      ) {
        lastSpokenIndexRef.current = lastIndex;
        const timer = setTimeout(() => {
          handleToggleSpeech(lastMsg.text, lastIndex);
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, autoSpeak, isLoading]);

  const handleToggleAutoSpeak = () => {
    const newVal = !autoSpeak;
    setAutoSpeak(newVal);
    localStorage.setItem("auto_speak_aristides", String(newVal));

    if (!newVal && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setPlayingIndex(null);
    } else if (newVal && messages.length > 0) {
      // Speak the last message immediately when enabling autoSpeak
      const lastIndex = messages.length - 1;
      const lastMsg = messages[lastIndex];
      if (lastMsg && lastMsg.role === "model") {
        handleToggleSpeech(lastMsg.text, lastIndex);
      }
    }
  };

  // Suggestion chips to make the experience rapid and fun
  const suggestions = [
    "Sugerir estructura de tensegridad extrema",
    "¿Qué aleación de metal es mejor para salares?",
    "Explícame las estructuras recíprocas",
    "Inspiraciones de deconstructivismo pesado"
  ];

  // RegEx or heuristic to check if the co-pilot provides a prompt block the user can load
  // If we want a beautiful "Load Prompt" button directly extracted from code blocks
  const parsePromptInMessage = (msgText: string) => {
    // If the message contains a block like "PROMPT_ACERO: [detailed prompt]" or we can parse quotes,
    // let's look for markdown code blocks or structured quotes to inject a rapid load action.
    const codeBlockMatch = msgText.match(/```english-prompt\n([\s\S]*?)\n```/) || msgText.match(/```\n([\s\S]*?)\n```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return {
        prompt: codeBlockMatch[1].trim(),
        title: "Sugerencia de Arístides"
      };
    }
    // Fallback: search for prominent English text in quotes if requested
    return null;
  };

  return (
    <div id="architect-chat-panel" className="flex flex-col h-full bg-white overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col px-5 py-4 bg-stv-accent border-b-[3px] border-black text-left shrink-0">
        <div className="flex justify-between items-start w-full">
          <div>
            <h3 className="text-[15px] font-black tracking-wider text-black font-display uppercase leading-tight">ARÍSTIDES_VCS-01</h3>
            <p className="text-[10px] text-black font-mono tracking-widest font-bold">// CO-PILOTO_ESTRUCTURAL</p>
          </div>
          <span className="flex h-2 w-2 relative mt-1 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
          </span>
        </div>
        
        {/* Actions inside header row */}
        <div className="flex items-center gap-2 mt-3.5 flex-wrap">
          <button
            type="button"
            onClick={() => onToggleGravity(!useGravity)}
            title={useGravity ? "Desactivar conexión con el Agente Gravity" : "Activar conexión con el Agente Gravity"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-none border-2 text-[9px] font-mono transition-all duration-200 cursor-pointer ${
              useGravity
                ? "bg-black text-white border-black font-black shadow-[1px_1px_0px_#000]"
                : "bg-white text-black border-black hover:bg-black hover:text-white font-bold shadow-[2px_2px_0px_#000]"
            }`}
          >
            <Sparkles className={`w-3 h-3 ${useGravity ? "animate-pulse text-stv-accent" : ""}`} />
            <span>{useGravity ? "GRAVITY: ON" : "GRAVITY: OFF"}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleAutoSpeak}
            title={autoSpeak ? "Desactivar voz automática" : "Activar voz automática"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-none border-2 text-[9px] font-mono transition-all duration-200 cursor-pointer ${
              autoSpeak
                ? "bg-black text-white border-black font-black shadow-[1px_1px_0px_#000]"
                : "bg-white text-black border-black hover:bg-black hover:text-white font-bold shadow-[2px_2px_0px_#000]"
            }`}
          >
            <Volume2 className={`w-3 h-3 ${autoSpeak ? "animate-pulse text-stv-accent" : ""}`} />
            <span>{autoSpeak ? "VOICE: ON" : "VOICE: OFF"}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-white border-2 border-black px-2 py-0.5 shadow-[2px_2px_0px_#000] text-[9.5px] font-mono select-none">
            <span className="font-black text-neutral-400 uppercase tracking-wider">IA:</span>
            <select
              value={aiModel}
              onChange={(e) => onChangeAiModel(e.target.value)}
              className="bg-transparent text-[9.5px] text-black font-black outline-none border-none cursor-pointer max-w-[130px] p-0.5"
            >
              <option value="gemini-3.1-flash-lite">GEMINI 3.1 LITE (RECOMENDADO)</option>
              <option value="gemini-3.5-flash">GEMINI 3.5 FLASH</option>
              <option value="gemini-3.1-pro-preview">GEMINI 3.1 PRO</option>
              <option value="gemini-2.5-pro">GEMINI 2.5 PRO</option>
            </select>
          </div>
        </div>
      </div>

      {/* PANEL DE CONSULTAS CRUZADAS SIMULTÁNEAS */}
      <div className="bg-white border-b border-stv-ink/20">
        <button
          type="button"
          onClick={() => setShowCrossConsole(!showCrossConsole)}
          className="w-full px-4 py-2 flex items-center justify-between text-[9px] font-mono font-bold tracking-wider text-stv-accent hover:bg-stv-accent/5 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <GitCompare className={`w-3.5 h-3.5 ${selectedHubIds.length > 0 ? "text-stv-accent animate-pulse" : "text-stv-ink/60"}`} />
            <span className="uppercase tracking-widest text-stv-ink">
              CONSOLE DE CONSULTAS CRUZADAS SIMULTÁNEAS // 
              <span className="text-stv-accent ml-1">
                {selectedHubIds.length === 0 
                  ? "SÓLO CHAT INDIVIDUAL" 
                  : `${selectedHubIds.length} HUBS SELECCIONADOS`}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {selectedHubIds.length > 0 && (
              <span className="bg-stv-accent/10 text-stv-accent border border-stv-accent/40 px-1 py-0.2 text-[8px] animate-pulse">
                CROSS-ACTIVE
              </span>
            )}
            {showCrossConsole ? <ChevronUp className="w-3.5 h-3.5 text-stv-accent" /> : <ChevronDown className="w-3.5 h-3.5 text-stv-accent" />}
          </div>
        </button>

        {showCrossConsole && (
          <div className="px-4 pb-3.5 pt-1.5 border-t border-stv-ink/20 bg-stv-bg text-left animate-fadeIn space-y-3 max-h-[220px] overflow-y-auto">
            <div className="flex items-center justify-between text-[8px] font-mono text-stv-muted uppercase tracking-widest border-b border-stv-ink/10 pb-1.5 font-bold">
              <span>// MARCAR HUBS DE ESTUDIO PARA ANÁLISIS CRUZADO</span>
              {selectedHubIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedHubIds([])}
                  className="text-stv-accent hover:text-stv-ink underline cursor-pointer font-bold"
                >
                  DESMARCAR TODOS
                </button>
              )}
            </div>

            {researchThemes.length === 0 ? (
              <p className="text-[9.5px] font-mono text-stv-muted italic py-2">
                No hay bloques de estudio creados en el tablero a la izquierda. ¡Crea bloques para cruzarlos!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {researchThemes.map((theme) => {
                  const isChecked = selectedHubIds.includes(theme.id);
                  const sectionsCount = theme.sections?.length || 0;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        setSelectedHubIds((prev) =>
                          isChecked
                            ? prev.filter((id) => id !== theme.id)
                            : [...prev, theme.id]
                        );
                      }}
                      className={`flex items-start gap-2 p-1.5 text-left border font-mono transition-all duration-150 cursor-pointer ${
                        isChecked
                          ? "bg-stv-accent/10 border-stv-accent text-stv-ink shadow-[2px_2px_0px_#1A1A1A]"
                          : "bg-white hover:bg-stv-bg border-stv-ink/25 text-stv-ink/70 hover:text-stv-ink"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-stv-accent" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-stv-ink/30" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9.5px] font-bold truncate block uppercase tracking-wider">
                            {theme.title}
                          </span>
                          <span className={`text-[7px] border px-1 font-mono uppercase ${
                            theme.status === "CRÍTICO" ? "border-rose-500/45 text-rose-500" :
                            theme.status === "VERIFICADO" ? "border-emerald-600/45 text-emerald-600" :
                            "border-stv-accent/30 text-stv-accent"
                          }`}>
                            {theme.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[7.5px] text-stv-muted mt-1 font-mono">
                          <span>CONCEPTOS: {theme.concepts || "INVESTIGACIÓN"}</span>
                          <span>{sectionsCount} RECTS</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* QUICK ACTIONS FOR CROSS CONSULTATION */}
            {selectedHubIds.length > 0 && (
              <div className="flex flex-col gap-1 mt-2.5 pt-2.5 border-t border-stv-ink/20">
                <span className="text-[8px] font-mono tracking-widest text-stv-accent uppercase font-bold">
                  // DISPARAR ACCIONES DE CONSULTA CRUZADA SIMULTÁNEA:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const titles = researchThemes
                        .filter((t) => selectedHubIds.includes(t.id))
                        .map((t) => `"${t.title}"`)
                        .join(", ");
                      triggerCrossQuery(
                        `[SÍNTESIS SIMULTÁNEA] Por favor realiza un resumen ejecutivo cruzado de los hallazgos de los siguientes bloques seleccionados: ${titles}. Analiza sus sinergias teóricas y resume sus conclusiones clave en un informe unificado.`
                      );
                    }}
                    disabled={selectedHubIds.length < 2 || isLoading}
                    className="text-[8px] font-mono py-1 px-1.5 bg-stv-ink hover:bg-stv-accent text-white hover:text-white border border-stv-ink disabled:opacity-40 transition-all font-bold cursor-pointer uppercase text-center"
                    title={selectedHubIds.length < 2 ? "Requiere seleccionar al menos 2 bloques" : "Genera un resumen integrado"}
                  >
                    📄 RESUMIR HALLAZGOS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const titles = researchThemes
                        .filter((t) => selectedHubIds.includes(t.id))
                        .map((t) => `"${t.title}"`)
                        .join(", ");
                      triggerCrossQuery(
                        `[SÍNTESIS SIMULTÁNEA] Analiza la compatibilidad estructural y de ingeniería (esfuerzos, materiales recomendados, juntas mecánicas y respuesta al viento) de los siguientes bloques seleccionados: ${titles}. Identifica contradicciones físicas o cuellos de botella.`
                      );
                    }}
                    disabled={selectedHubIds.length < 2 || isLoading}
                    className="text-[8px] font-mono py-1 px-1.5 bg-stv-ink hover:bg-stv-accent text-white hover:text-white border border-stv-ink disabled:opacity-40 transition-all font-bold cursor-pointer uppercase text-center"
                    title={selectedHubIds.length < 2 ? "Requiere seleccionar al menos 2 bloques" : "Evalúa la compatibilidad física y mecánica"}
                  >
                    ⚙️ COMPATIBILIDAD MECÁNICA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const titles = researchThemes
                        .filter((t) => selectedHubIds.includes(t.id))
                        .map((t) => `"${t.title}"`)
                        .join(", ");
                      triggerCrossQuery(
                        `[SÍNTESIS SIMULTÁNEA] Genera directrices de ingeniería integradas y recomendaciones unificadas para consolidar las ideas de los siguientes bloques seleccionados: ${titles} en un único modelo paramétrico consolidado.`
                      );
                    }}
                    disabled={selectedHubIds.length < 2 || isLoading}
                    className="text-[8px] font-mono py-1 px-1.5 bg-stv-ink hover:bg-stv-accent text-white hover:text-white border border-stv-ink disabled:opacity-40 transition-all font-bold cursor-pointer uppercase text-center"
                    title={selectedHubIds.length < 2 ? "Requiere seleccionar al menos 2 bloques" : "Proporciona directrices unificadas para un prototipo"}
                  >
                    🏗️ DIRECTRICES DE UNIFICACIÓN
                  </button>
                </div>
                {selectedHubIds.length < 2 && (
                  <p className="text-[7.5px] font-mono text-stv-accent animate-pulse tracking-wide mt-1 uppercase font-bold text-center">
                    * SELECCIONE AL MENOS 2 HUBS DE ESTUDIO PARA DISPARAR LAS ACCIONES AUTOMÁTICAS DE CONSULTA CRUZADA SIMULTÁNEA *
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dot-grid relative">
        {/* Subtle scanline effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-stv-accent/5 to-transparent opacity-30 pointer-events-none animate-scanline"></div>

        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          const promptSuggestion = !isUser ? parsePromptInMessage(msg.text) : null;
          const isSpeakingThis = playingIndex === index;

          return (
            <div
              key={index}
              className={`flex flex-col relative z-10 ${isUser ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center w-full justify-between mb-1">
                <div className={`flex items-center gap-1.5 text-[9px] font-mono tracking-wider ${isUser ? "text-stv-muted font-bold" : "text-stv-accent font-bold"}`}>
                  {isUser ? (
                    <>
                      <span>DISEÑADOR_HUMANO</span>
                      <User className="w-3 h-3 text-stv-accent" />
                    </>
                  ) : (
                    <>
                      <Hammer className="w-3 h-3 text-stv-accent" />
                      <span>ARQ_ARÍSTIDES_VCS01</span>
                    </>
                  )}
                  <span className="opacity-50">// T_STAMP: {msg.timestamp}</span>
                </div>

                {/* Narrator TTS audio controller for Arístides' responses */}
                {!isUser && (
                  <button
                    type="button"
                    onClick={() => handleToggleSpeech(msg.text, index)}
                    title={isSpeakingThis ? "Detener reproducción" : "Escuchar mensaje"}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[8px] font-mono border transition-all cursor-pointer ${
                      isSpeakingThis
                        ? "bg-rose-100 text-rose-700 border-rose-500 animate-pulse font-bold"
                        : "bg-transparent border-stv-ink/30 text-stv-ink hover:bg-stv-accent hover:text-white"
                    }`}
                  >
                    {isSpeakingThis ? (
                      <>
                        <div className="flex items-center gap-0.5 h-2 px-0.5">
                          <div className="w-0.5 h-1 bg-rose-500 rounded-full animate-bounce" style={{ animationDuration: "0.6s", animationDelay: "0ms" }}></div>
                          <div className="w-0.5 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDuration: "0.4s", animationDelay: "80ms" }}></div>
                          <div className="w-0.5 h-1 bg-rose-500 rounded-full animate-bounce" style={{ animationDuration: "0.5s", animationDelay: "160ms" }}></div>
                        </div>
                        <span>MUTE</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-2.5 h-2.5 text-stv-ink" />
                        <span>AUDIO_PLAY</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div
                className={`max-w-[90%] rounded-none p-3 text-[11.5px] leading-relaxed border relative font-mono shadow-[2px_2px_0px_rgba(26,26,26,1)] ${
                  isUser
                    ? "bg-stv-ink border-stv-ink text-white text-right"
                    : "bg-stv-bg border-stv-ink text-stv-ink"
                } ${isSpeakingThis ? "border-stv-accent ring-1 ring-stv-accent/40" : ""}`}
              >
                {/* Micro reflection lights */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/5"></div>
                <div className="whitespace-pre-wrap select-text text-left">{msg.text}</div>

                {/* If the message contains a suggested prompt codeblock, expose a gorgeous call-to-action */}
                {promptSuggestion && (
                  <div className="mt-3 p-2 bg-white border-2 border-stv-ink space-y-1.5 shadow-[2px_2px_0px_#1A1A1A]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono text-stv-ink flex items-center gap-1 font-bold">
                        <Sparkles className="w-3 h-3 text-stv-accent animate-pulse" />
                        PROMPT_SUGERIDO_DETECTADO
                      </span>
                      <button
                        type="button"
                        onClick={() => onLoadPrompt(promptSuggestion.prompt, promptSuggestion.title)}
                        className="text-[8px] font-mono px-2 py-0.5 bg-stv-accent text-white hover:bg-stv-ink transition-colors font-bold cursor-pointer"
                      >
                        CARGAR_PROMPT
                      </button>
                    </div>
                    <p className="text-[10px] text-stv-muted font-mono italic line-clamp-2">
                      {promptSuggestion.prompt}
                    </p>
                  </div>
                )}

                {/* Interactive Study Blocks matrix-linking actions */}
                {!isUser && (
                  <div className="mt-3.5 pt-3 border-t border-stv-ink/10 flex flex-col gap-1.5">
                    <span className="text-[8px] font-mono tracking-widest text-stv-accent uppercase font-bold">
                      // ENLAZAR A BLOQUE DE ESTUDIO:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => onAddAsNewTheme(msg.text)}
                        className="text-[8.5px] font-mono px-2 py-1 bg-white hover:bg-stv-accent text-stv-ink hover:text-white border border-stv-ink transition-all flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <FolderPlus className="w-3 h-3" />
                        + NUEVO TEMA
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpenSelectorIndex(openSelectorIndex === index ? null : index)}
                        className={`text-[8.5px] font-mono px-2 py-1 flex items-center gap-1 cursor-pointer transition-all font-bold border ${
                          openSelectorIndex === index
                            ? "bg-stv-accent text-white border-stv-accent"
                            : "bg-white hover:bg-stv-accent/10 text-stv-accent border-stv-accent/50"
                        }`}
                      >
                        <Database className="w-3 h-3" />
                        + SUMAR A EXISTENTE
                        {openSelectorIndex === index ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                      </button>
                    </div>

                    {openSelectorIndex === index && (
                      <div className="mt-2 p-2 bg-stv-bg border border-stv-ink space-y-1.5 animate-fadeIn max-h-[160px] overflow-y-auto">
                        <span className="text-[7.5px] font-mono text-stv-muted block tracking-widest uppercase font-bold">
                          // SELECCIONAR TEMA DESTINO:
                        </span>
                        {researchThemes.length === 0 ? (
                          <span className="text-[9px] font-mono text-stv-muted italic block">
                            No hay temas creados. ¡Aborda un nuevo tema primero!
                          </span>
                        ) : (
                          <div className="grid grid-cols-1 gap-1">
                            {researchThemes.map((theme) => (
                              <button
                                key={theme.id}
                                type="button"
                                onClick={() => {
                                  onAddToExistingTheme(theme.id, msg.text);
                                  setOpenSelectorIndex(null);
                                }}
                                className="text-left text-[9px] font-mono px-2 py-1 bg-white hover:bg-stv-accent text-stv-ink hover:text-white border border-stv-ink/20 hover:border-stv-accent/50 transition-all cursor-pointer truncate font-bold uppercase"
                              >
                                &gt; {theme.title} ({theme.status})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex flex-col items-start relative z-10">
            <div className="flex items-center gap-1.5 mb-1 text-[9px] font-mono text-stv-accent font-bold">
              <Hammer className="w-3 h-3 animate-bounce text-stv-accent" />
              <span>ARÍSTIDES_MODELANDO_GEOMETRÍA...</span>
            </div>
            <div className="bg-white border border-stv-ink p-2.5 flex items-center justify-center">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-stv-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-1.5 h-1.5 bg-stv-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-1.5 h-1.5 bg-stv-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Quick Chips */}
      {messages.length < 5 && (
        <div className="px-4 py-2 border-t border-stv-ink bg-stv-bg">
          <span className="text-[8px] font-mono text-stv-ink block mb-1 font-bold tracking-widest uppercase text-left">// INYECCIÓN DE TEMAS:</span>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((sCircle, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={() => onSendMessage(sCircle, selectedHubIds)}
                disabled={isLoading}
                className="text-[8px] px-2 py-1 bg-white hover:bg-stv-accent text-stv-ink hover:text-white border border-stv-ink transition-colors disabled:opacity-40 cursor-pointer font-mono font-bold uppercase text-left"
              >
                {sCircle}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Linked Hubs Row */}
      {selectedHubIds.length > 0 && (
        <div className="px-3 py-1.5 bg-stv-accent/5 border-t border-stv-ink/20 flex flex-wrap items-center gap-1.5 text-[8.5px] font-mono text-stv-accent text-left">
          <span className="font-bold shrink-0 uppercase tracking-wider text-stv-ink animate-pulse">// HUBS SELECCIONADOS EN CONSULTA:</span>
          {researchThemes
            .filter((theme) => selectedHubIds.includes(theme.id))
            .map((theme) => (
              <span
                key={theme.id}
                className="bg-white border border-stv-ink px-1.5 py-0.5 flex items-center gap-1 text-[8.5px] text-stv-ink font-bold uppercase"
              >
                {theme.title}
                <button
                  type="button"
                  onClick={() => setSelectedHubIds((prev) => prev.filter((id) => id !== theme.id))}
                  className="text-stv-accent hover:text-rose-600 font-bold ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          <button
            type="button"
            onClick={() => setSelectedHubIds([])}
            className="ml-auto text-rose-500 hover:text-rose-700 font-bold underline cursor-pointer text-[7.5px]"
          >
            DESVINCULAR TODOS
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t-2 border-stv-ink flex gap-2 font-mono">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() && !isLoading) {
                // Call submit handler
                const mockEvent = { preventDefault: () => {} } as React.FormEvent;
                handleSubmit(mockEvent);
              }
            }
          }}
          placeholder="Consulte a Arístides (Tensegridad, acero corten, estructuras de domo...)"
          disabled={isLoading}
          rows={3}
          className="flex-1 bg-stv-bg text-stv-ink text-xs border border-stv-ink focus:border-stv-accent focus:outline-none rounded-none px-3 py-2 transition-colors disabled:opacity-50 font-mono font-bold placeholder:text-stv-ink/40 text-left resize-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 bg-stv-ink text-white hover:bg-stv-accent disabled:bg-stv-bg disabled:border-stv-ink/20 disabled:text-stv-ink/30 border border-stv-ink font-black transition-all flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_rgba(26,26,26,1)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
