# Ficha Técnica Exhaustiva: "Arq. Arístides" (Matriz Central de Control y Co-Piloto de Arquitectura)

## 1. Identificación y Justificación del Hub
- **Nombre oficial:** Sistema Integrado Arq. Arístides (AI Architect Co-Pilot)
- **Acrónimo:** SIAA / Arístides
- **Versión:** 2.1.0 (Build Paramétrico y Matemático)
- **Estado:** Experimental / Estable (Operativo en entornos de simulación y validación)
- **Dominio al que pertenece:** Inteligencia Artificial Aplicada a Arquitectura, Deconstruccionismo, Diseño Paramétrico y Cálculo Estructural Metálico.
- **Propósito:** Actuar como la "Matriz Central de Control" y un **Motor Universal de Propagación**. Gobernar los procesos de ideación, simulación estructural en el visor 3D, investigación simultánea a través de bloques de estudio (hubs) y el cálculo matemático real de fuerzas (vistas como flujos sobre un grafo).
- **¿Por qué existe?:** Nace de la necesidad de fusionar la poética del diseño arquitectónico de vanguardia (específicamente esculturas metálicas y tensegridad) con el rigor absoluto de la física y las matemáticas, orquestando una simulación interactiva que responde a instrucciones en lenguaje natural, llevando al usuario desde un entendimiento superficial hasta el **Nivel 3 (Desarrollador de motores FEA)**.
- **¿Qué problema resuelve?:** Cierra la brecha entre el boceto conceptual y la viabilidad estructural. Traduce ideas poéticas o modificaciones discursivas en mutaciones geométricas (nudos, conexiones) y ajusta parámetros de simulación (viento, cargas, material) validando de forma autónoma el pandeo, esfuerzo elástico y factor de seguridad en tiempo real.
- **¿Qué ocurriría si desapareciera?:** La herramienta se reduciría a un visor 3D pasivo y a un tablero de notas inerte. Se perdería el núcleo inteligente capaz de vincular el comportamiento estructural con la toma de decisiones.

## 2. Alcance y Límites de Responsabilidad
- **Qué hace:** 
  - Entabla diálogos poéticos, técnicos y elocuentes sobre arquitectura.
  - Administra, crea, cruza información y muta bloques de estudio (Hubs).
  - Interviene el visor 3D emitiendo mutaciones geométricas (agregar/mover/conectar nudos).
  - Actúa como Motor Universal de Propagación: concibe la estructura como una red de grafos (nodos y aristas) para propagar flujos de fuerza mediante Álgebra Lineal, Mecánica del Continuo y Métodos Numéricos.
  - Calcula derivadas físicas reales en base a Ecuaciones de Deflexión, Esfuerzo Equivalente, Factor de Seguridad Estructural (FoS), Método de Densidad de Fuerzas (FDM) y la Ecuación General de Propagación ([K]·{u} = {F}).
  - Genera consultas cruzadas para extraer lecciones unificadas de múltiples bloques de investigación.
- **Qué no hace:** 
  - No ejecuta operaciones en bases de datos fuera de la sesión actual de estado (los cambios persisten solo local o a nivel de sesión, dependiente del cliente).
  - No reemplaza la firma final de un ingeniero calculista (sus métricas, aunque basadas en matemáticas reales de simulación, son conceptualmente educativas e ilustrativas para pre-dimensionamiento).
  - No realiza renderizado de texturas fotorealistas (su foco es form-finding analítico e interactivo vectorial y 3D alámbrico).

## 3. Estructura Interna: Composición, Arquitectura y Código de Generación
- **Arquitectura interna (jerarquía):**
  - **API (Router Backend):** `server.ts` -> Expone el endpoint `/api/chat` recibiendo payloads enriquecidos (mensajes, temas, hubs seleccionados, y parámetros de simulación).
  - **Core (Prompt Engineering & Context Injection):** Inyección masiva de contexto en el backend. Arístides no es solo un LLM, es un prompt envuelto en un sistema de inyección de estado. Se le provee:
    - Estado de los bloques (`themesContext`).
    - Directivas de cruce de datos (`crossQueryInstructions`).
    - *Sistema Matemático Integrado* (Leyes físicas, parámetros actuales para despejes matemáticos, Álgebra Lineal, Teoría de Grafos, FEA).
    - Esquemas de mutación (`<action> JSON </action>`).
  - **Engine (Generative Model):** Google GenAI (`gemini-3.1-flash-lite` u otros especificados) orquestando la inferencia de lenguaje e instrucciones de acción.
  - **Services (Parser & Client UI):** `ArchitectChat.tsx` en el cliente. Intercepta las respuestas, extrae mediante expresiones regulares (`/<action>([\s\S]*?)<\/action>/g`) los JSONs de comando y los ejecuta en el state de React, permitiendo la mutación del DOM y del Canvas 3D.
  - **Storage:** Estado efímero gestionado en React State (React Hook `useState` y contexto global en `App.tsx`).

- **Layout:**
  - Front-end: Panel lateral para el chat, grilla central para el canvas 3D y barra lateral de Hubs de investigación.
  - Back-end: Middleware Express de Node.js.

## 4. Recepción de Datos e Interacciones
- **Entradas (¿Qué recibe?):**
  - Payload JSON en `/api/chat`.
- **Documentos/Objetos/Eventos:**
  - `messages`: Arreglo de objetos `{ role, content }` de la conversación.
  - `researchThemes`: JSON con el array del estado completo de los Hubs (ID, título, secciones, estatus).
  - `selectedHubIds`: Array de strings para invocar la subrutina de "Consulta Cruzada Simultánea".
  - `simulationParams`: Objeto que incluye el estado actual físico del entorno (`windForce`, `appliedLoad`, `materialName`, `elasticModulus`, `yieldStrength`, `materialDensity`).
  - `useGravity`: Booleano de estado de entorno.

## 5. Generación de Resultados y Artefactos
- **Salidas (¿Qué produce?):**
  - String crudo de texto que el cliente parsea.
- **Objetos y Eventos generados (Artefactos de control):**
  - Respuestas textuales con formato Markdown y descripciones matemáticas paso a paso.
  - Etiquetas XML incrustadas `<action>...</action>` que contienen JSON. Estos son los "artefactos de mutación".
  - Ejemplos de eventos producidos (parcial): `ADD_THEME`, `ADD_SECTION`, `UPDATE_THEME_STATUS`, `UPDATE_COORDINATES`, `ADD_NODE`, `CONNECT_NODES`, `SET_PARAM`, `SET_MATERIAL`.
- **Estados:** Modifica indirectamente el estado de React mutando propiedades (viento, nodos, enlaces) y creando nuevos componentes de UI (tarjetas de hub).

## 6. Requisitos y Componentes Externos
- **Dependencias (¿Qué necesita para funcionar?):**
  - **Runtime:** Node.js (Servidor) y Navegador (Cliente).
  - **Kernel / Framework:** Express.js (API), React.js (UI), Vite (Bundler).
  - **Ontology (Model):** SDK de Google GenAI (`@google/genai`). Requiere validación de la variable de entorno `GEMINI_API_KEY`.
  - **Compiler:** TypeScript (`tsc` o `esbuild`).

## 7. Usuarios y Dependencias de Terceros
- **Consumidores (¿Quién utiliza esta herramienta?):**
  - **Usuarios Directos:** Arquitectos, artistas experimentales, estudiantes de ingeniería, ingenieros de form-finding.
  - **Componentes que dependen de Arístides:**
    - `ArchitectChat.tsx`: Depende del endpoint de Arístides para renderizar la conversación.
    - `Blueprint3DViewer.tsx`: Aunque renderiza la geometría, la *orquestación* paramétrica (cambios de viento, de material, coordenadas impulsadas por lenguaje natural) dependen de los eventos `<action>` emitidos por Arístides.
    - El Gestor de "Research Themes" (Hubs) depende de Arístides para resumir, cruzar y crear contenido de investigación.

## 8. Puntos de Interacción Externa
- **Interfaces públicas:**
  - `POST /api/chat`: Invocado por `ArchitectChat.tsx` para razonamiento general y mutaciones.
  - `POST /api/generate-blueprint`: (Endpoints hermanos) para la generación de SVG usando modelos Flash.

## 9. Gestión de Eventos Emitidos y Recibidos
- **Eventos que escucha (Input del usuario y del entorno):**
  - Clicks de selección de Hubs en la UI (que alimentan el payload de contexto).
  - Solicitudes textuales de los usuarios (prompts).
  - Detección de palabras clave en el servidor en el modo "procedural fallback" (si la API de Gemini falla, detecta "viento", "matemática", "titanio" para forzar inyección de respuestas y acciones).
- **Eventos que emite (Payload Actions):**
  - Mutaciones de UI: `ADD_THEME`, `DELETE_THEME`, `ADD_SECTION`, etc.
  - Mutaciones Físicas: `SET_PARAM`, `SET_MATERIAL`, `UPDATE_COORDINATES`, `ADD_NODE`, `CONNECT_NODES`, `CLEAR_GEOMETRY`.

## 10. Fases del Ciclo de Vida Operativo
- **Created:** Carga del cliente React y establecimiento de estado inicial (nudos por defecto, parámetros base).
- **Initialized:** El usuario envía el primer mensaje. El cliente empaqueta el estado (Hubs, Parámetros, Nudos) y lo envía a `/api/chat`.
- **Running (Inference):** El servidor Express inyecta el megacontexto ("Eres Arq. Arístides... Sistema Matemático... Valores Actuales"). El LLM procesa y responde.
- **Running (Parsing & Mutation):** El cliente recibe la respuesta, filtra el texto visible y procesa las etiquetas `<action>` actualizando el DOM y el Canvas 3D.
- **Paused / Stopped:** Esperando el siguiente prompt del usuario.
- **Disposed:** Cierre del navegador o limpieza del chat de sesión.

## 11. Procesos de Verificación y Control
- **Validaciones:**
  - Verifica si `req.body.messages` existe y es un array.
  - Comprueba la disponibilidad del cliente de IA (`getAiClient()`).
  - Tiene un sistema de "Fallback Procedural": Si falla la conexión con el LLM, usa expresiones regulares del lado del servidor para responder a intenciones comunes (e.g., inyectar fórmulas matemáticas, ajustar viento) garantizando resiliencia.

## 12. Definiciones y Advertencias Operativas
- **Reglas que impone:**
  - Uso riguroso de identidades: Debe referirse a los IDs exactos proporcionados en el contexto para mutar nudos (`n0`, `n1`, etc.) o Hubs.
  - Debe explicar el orden de los despejes matemáticos de forma didáctica utilizando valores y símbolos reales de la simulación.
  - En consultas cruzadas, si detecta sinergias, sugiere crear un Hub sintético.
- **Limitaciones:**
  - No puede crear modelos 3D poligonales masivos (trabaja sobre coordenadas de grafos/nudos espaciales).
  - La ventana de contexto limita qué tantos hubs y secciones extensas puede procesar de una vez sin pérdida de memoria o alucinación.
- **Riesgos (Qué nunca debe hacer):**
  - Nunca inventar o alucinar IDs de nudos para acciones `CONNECT_NODES`, ya que causaría errores fatales (Nulos/Undefined) en el renderizado del `Blueprint3DViewer`.
  - Nunca inyectar código de mutación XML con sintaxis rota, ya que el parser RegEx del cliente (`JSON.parse()`) fallaría, rompiendo la aplicación de interfaz de estado.
- **Qué puede romper si falla:** El motor de renderizado y el parser de estado pueden bloquear el hilo principal de React si se emite un JSON malformado.

## 13. Perspectivas de Desarrollo Futuro
- **Evolución prevista:**
  - Incorporar "Bio-feedback Branding": Vincular datos externos (sensores, APIs de clima real) al engine para que Arístides ajuste autónomamente `windForce` basado en la ubicación geográfica de un celular o condiciones del usuario.
  - Habilitar exportación del Form-Finding a formatos CAD (DXF, OBJ).
  - Incorporación de Análisis de Elementos Finitos (FEA) real integrado con WebAssembly para complementar el FDM (Force Density Method) y permitir análisis topológico dinámico.
