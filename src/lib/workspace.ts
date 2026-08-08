import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { ResearchTheme, ProductItem, EstimationItem } from "../types";

// Initialize Firebase App securely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Sheets, Docs, and Drive file scopes
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/documents");
provider.addScope("https://www.googleapis.com/auth/drive.file");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize Auth Listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If user is signed in but we don't have token cached yet, we might need a re-auth or wait.
        // In SPAs, signInWithPopup must be triggered by a click, so we flag it.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("No se pudo obtener el token de acceso de Google Auth");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Error al iniciar sesión con Google:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Get cached or stored token
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Log out
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Creates a new Google Spreadsheet and populates it with details from a Research Hub.
 */
export const exportHubToSheets = async (theme: ResearchTheme): Promise<string> => {
  const token = cachedAccessToken;
  if (!token) throw new Error("No autenticado. Por favor, inicie sesión primero.");

  // 1. Create a spreadsheet
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: `STV.VCS-01 - Hub de Estudio: ${theme.title}`,
      },
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json();
    throw new Error(errData.error?.message || "Fallo al crear la hoja de cálculo.");
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // 2. Prepare spreadsheet values
  const values = [
    ["=== ESTACIÓN FORENSE DE ESTRUCTURAS METALICAS STV.VCS-01 ==="],
    ["MÓDULO DE INVESTIGACIÓN INTERACTIVA", theme.title],
    ["ID del Hub", theme.id],
    ["Estado de Diagnóstico", theme.status],
    ["Conceptos Clave", theme.concepts],
    ["Profundidad de Estudio", `${theme.depth}%`],
    ["Notas y Diagnóstico", theme.notes],
    [],
    ["=== RECTÁNGULOS DE ESTUDIO ASOCIADOS ==="],
    ["ID del Rectángulo", "Título del Rectángulo", "Contenido Analítico", "Nota de Campo"],
  ];

  if (theme.sections && theme.sections.length > 0) {
    theme.sections.forEach((sec) => {
      values.push([sec.id, sec.title, sec.content, sec.note || ""]);
    });
  } else {
    values.push(["", "Sin rectángulos de estudio asociados", "", ""]);
  }

  // 3. Update sheet cells
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!updateRes.ok) {
    throw new Error("Error al escribir los datos en la hoja de cálculo de Google.");
  }

  return spreadsheetUrl;
};

/**
 * Creates a new Google Doc with the Research Hub details and study sections.
 */
export const exportHubToDocs = async (theme: ResearchTheme): Promise<string> => {
  const token = cachedAccessToken;
  if (!token) throw new Error("No autenticado. Por favor, inicie sesión primero.");

  // 1. Create a document
  const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `STV.VCS-01 - Reporte Técnico: ${theme.title}`,
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json();
    throw new Error(errData.error?.message || "Fallo al crear el documento.");
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;
  const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  // 2. Compose beautifully formatted text body
  let text = `=== REPORTÉ DE INVESTIGACIÓN INDUSTRIAL ===\n`;
  text += `Estación Forense de Estructuras Metálicas STV.VCS-01\n\n`;
  text += `TÍTULO DEL HUB: ${theme.title.toUpperCase()}\n`;
  text += `ESTADO DEL DIAGNÓSTICO: ${theme.status}\n`;
  text += `PROFUNDIDAD DE ESTUDIO: ${theme.depth}%\n`;
  text += `CONCEPTOS CLAVE: ${theme.concepts}\n\n`;
  text += `DIAGNÓSTICO Y NOTAS OPERATIVAS:\n`;
  text += `${theme.notes || "Sin notas de diagnóstico."}\n\n`;
  text += `--------------------------------------------------\n`;
  text += `RECTÁNGULOS DE ESTUDIO ASOCIADOS:\n`;
  text += `--------------------------------------------------\n\n`;

  if (theme.sections && theme.sections.length > 0) {
    theme.sections.forEach((sec, idx) => {
      text += `[${idx + 1}] RECTÁNGULO: ${sec.title.toUpperCase()}\n`;
      text += `Contenido Analítico:\n${sec.content}\n`;
      if (sec.note) {
        text += `Nota de campo: ${sec.note}\n`;
      }
      text += `\n`;
    });
  } else {
    text += `No hay rectángulos de estudio vinculados a este módulo.\n`;
  }

  // 3. Batch update the document to insert this text
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: text,
          },
        },
      ],
    }),
  });

  if (!updateRes.ok) {
    throw new Error("Error al escribir los datos en el documento de Google.");
  }

  return docUrl;
};

/**
 * Creates a Google Spreadsheet for the Product catalog and estimated costs.
 */
export const exportCatalogToSheets = async (
  products: ProductItem[],
  estimates: EstimationItem[],
  volatilityFactor: number
): Promise<string> => {
  const token = cachedAccessToken;
  if (!token) throw new Error("No autenticado. Por favor, inicie sesión primero.");

  // 1. Create a spreadsheet
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: "STV.VCS-01 - Catálogo Dinámico de Piezas y Cotización Estructural (Volátil)",
      },
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json();
    throw new Error(errData.error?.message || "Fallo al crear la hoja de cálculo de catálogo.");
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // 2. Format values
  const values = [
    ["=== ESTACIÓN FORENSE DE ESTRUCTURAS METALICAS STV.VCS-01 ==="],
    ["SISTEMA DE ESTIMACIÓN Y VALORACIÓN DINÁMICA DE PIEZAS METÁLICAS"],
    ["Coeficiente de Volatilidad / Fluctuación del Mercado:", `${volatilityFactor.toFixed(2)}x`],
    [],
    ["=== CATÁLOGO GENERAL DE PRODUCTOS / PIEZAS (COSTOS VARIABLES) ==="],
    ["ID Producto", "Nombre de la Pieza", "Categoría", "Descripción", "Precio Unitario Base (MXN)", "Precio Volátil Ajustado (MXN)"],
  ];

  products.forEach((p) => {
    const volatilePrice = p.priceMXN * volatilityFactor;
    values.push([p.id, p.name, p.family, p.description, `$${p.priceMXN.toFixed(2)}`, `$${volatilePrice.toFixed(2)}`]);
  });

  values.push([]);
  values.push(["=== ESTIMACIÓN ACTUAL DE MATERIALES (Ajustado por Volatilidad) ==="]);
  values.push(["Nombre de la Pieza", "Precio Unitario Ajustado (MXN)", "Cantidad Requerida", "Subtotal Ajustado (MXN)"]);

  let grandTotal = 0;
  estimates.forEach((est) => {
    const prod = products.find((p) => p.id === est.productId);
    if (prod) {
      const volatilePrice = prod.priceMXN * volatilityFactor;
      const subtotal = volatilePrice * est.quantity;
      grandTotal += subtotal;
      values.push([prod.name, `$${volatilePrice.toFixed(2)}`, est.quantity.toString(), `$${subtotal.toFixed(2)}`]);
    }
  });

  values.push([]);
  values.push(["", "", "COSTO TOTAL ESTIMADO CON VOLATILIDAD:", `$${grandTotal.toFixed(2)}`]);

  // 3. Update cells
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!updateRes.ok) {
    throw new Error("Error al escribir el catálogo en la hoja de cálculo de Google.");
  }

  return spreadsheetUrl;
};
