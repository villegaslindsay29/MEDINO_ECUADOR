import { config } from "../config.js";
import { findDiseaseById, findDiseaseByName, listDiseases, upsertDisease, type Disease } from "./database.js";

type ChatMessage = { role: "user" | "assistant"; content: string };
type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
  }>;
  error?: { message?: string };
};
type SelectedDisease = { nombre: string; categoria: string };

export type AlbaResponse = {
  orientation: string;
  actions: string[];
  warnings: string[];
  question: string | null;
  quickReplies: string[];
  urgency: "baja" | "media" | "alta" | "emergencia";
  relatedDisease: string | null;
  relatedDiseaseDetails: { id: string; nombre: string; especialista: string } | null;
  suggestedDiseases: Array<{ nombre: string; categoria: string; motivo: string; matchingSymptoms: string[] }>;
  discoveredDisease: Disease | null;
  savedDisease: Disease | null;
  savedDiseaseStatus: "created" | "published_existing" | "existing" | null;
};

const provinces = [
  "Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro",
  "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí",
  "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena",
  "Santo Domingo de los Tsáchilas", "Sucumbíos", "Tungurahua", "Zamora Chinchipe",
];

const systemInstruction = `Eres ALBA, asistente educativo de MedInfo Ecuador para salud pública en Ecuador.
Tu función es orientar e informar, nunca diagnosticar ni prescribir medicamentos o dosis.

CONVERSACIÓN:
- Responde en español sencillo, empático y directo.
- Si faltan datos, formula una sola pregunta útil y ofrece entre 2 y 4 respuestas rápidas.
- Considera rango de edad, síntomas, duración e intensidad.
- Si los síntomas descritos coinciden razonablemente con una enfermedad del catálogo, usa en relatedDisease exactamente su nombre canónico; si no hay una coincidencia clara, usa null.
- Si hay dificultad respiratoria, desmayo, confusión, convulsiones, sangrado importante, dolor intenso de pecho o abdomen, debilidad repentina, coloración azulada o riesgo vital, marca urgencia "emergencia" y recomienda ECU 911 inmediatamente.
- No solicites nombre, cédula, dirección, teléfono ni información identificable.
- La orientación debe recordar que no reemplaza una consulta médica.
- Nunca afirmes "tienes", "seguramente tienes" o "es probable que sea" una enfermedad. Si los síntomas coinciden, indica únicamente que pueden ser compatibles y que otras condiciones pueden causar síntomas similares.

DESCUBRIMIENTO:
- Cuando el usuario pida enfermedades nuevas, sugerencias u "otras opciones", devuelve exactamente 5 opciones en suggestedDiseases.
- Nunca devuelvas una enfermedad que ya aparezca en el catálogo actual, ni siquiera con una variante del mismo nombre (por ejemplo, no propongas "Dengue hemorrágico", "Dengue con signos de alarma" ni "Dengue grave" si "Dengue" ya está registrado).
- Ofrece diversidad real de categorías: no devuelvas todas del mismo grupo. Incluye, cuando sea posible, al menos una enfermedad transmisible, una crónica o no transmisible, una de salud mental y una materno-infantil o nutricional.
- Si solicita enfermedades asociadas a un síntoma o tema, como caída del cabello, devuelve enfermedades reales que puedan incluirlo entre sus manifestaciones y explica la relación sin diagnosticar.
- Las sugerencias deben ser enfermedades reales con información aplicable a Ecuador, aunque no sean exclusivas del país.
- No repitas nombres incluidos en el catálogo actual ni nombres ya sugeridos en la conversación.
- En este modo, explica brevemente que el usuario puede elegir una para investigarla; no uses discoveredDisease todavía.
- Para consultas normales por síntomas, suggestedDiseases debe ser un arreglo vacío.

ENFERMEDADES NUEVAS:
- Solo usa discoveredDisease cuando el usuario pregunte explícitamente por una enfermedad real y su nombre no aparezca en el catálogo recibido.
- Contrasta la información con fuentes oficiales conocidas de MSP Ecuador, OPS y OMS.
- No agregues una enfermedad únicamente porque sea una posibilidad asociada a síntomas.
- No inventes enfermedades, brotes, estadísticas, provincias ni fuentes.
- Usa exclusivamente nombres de provincias incluidos en la lista permitida.
- especialista debe indicar una especialidad apropiada para orientar una valoración. Si no hay una claramente preferente, usa "Medicina general".
- Toda enfermedad nueva se guarda con origen "ALBA", estado_revision "pendiente" y publicada true para aparecer con un aviso de revisión.
- fuentes debe contener entre 3 y 6 URL HTTPS completas y verificables, sin repetir la misma URL. Incluye al menos una fuente ecuatoriana cuando exista (MSP Ecuador, INSPI, IESS o SciELO Ecuador) y complementa con OPS, OMS, MedlinePlus/NIH, CDC, Cochrane, Mayo Clinic o NHS.
- No inventes una distribución provincial. Para condiciones generales usa todas las provincias y zona "Todo el país"; limita provincias solo si una fuente respalda esa distribución.
- Si recibes una selección explícita, investiga exactamente esa enfermedad, devuelve suggestedDiseases vacío y completa discoveredDisease.`;

const responseSchema = {
  type: "OBJECT",
  required: ["orientation", "actions", "warnings", "question", "quickReplies", "urgency", "relatedDisease", "suggestedDiseases", "discoveredDisease"],
  properties: {
    orientation: { type: "STRING" },
    actions: { type: "ARRAY", items: { type: "STRING" }, maxItems: 6 },
    warnings: { type: "ARRAY", items: { type: "STRING" }, maxItems: 6 },
    question: { anyOf: [{ type: "STRING" }, { type: "NULL" }] },
    quickReplies: { type: "ARRAY", items: { type: "STRING" }, maxItems: 4 },
    urgency: { type: "STRING", enum: ["baja", "media", "alta", "emergencia"] },
    relatedDisease: { anyOf: [{ type: "STRING" }, { type: "NULL" }] },
    suggestedDiseases: {
      type: "ARRAY",
      maxItems: 5,
      items: {
        type: "OBJECT",
        required: ["nombre", "categoria", "motivo", "matchingSymptoms"],
        properties: {
          nombre: { type: "STRING" },
          categoria: { type: "STRING" },
          motivo: { type: "STRING" },
          matchingSymptoms: {
            type: "ARRAY",
            items: { type: "STRING" },
            maxItems: 6,
          },
        },
      },
    },
    discoveredDisease: {
      anyOf: [
        { type: "NULL" },
        {
          type: "OBJECT",
          required: ["id", "nombre", "categoria", "especialista", "resumen", "sintomas", "prevencion", "alertas", "provincias", "zona", "color", "fuentes", "origen", "estado_revision", "publicada"],
          properties: {
            id: { type: "STRING" }, nombre: { type: "STRING" }, categoria: { type: "STRING" }, especialista: { type: "STRING" },
            resumen: { type: "STRING" }, sintomas: { type: "ARRAY", items: { type: "STRING" } },
            prevencion: { type: "ARRAY", items: { type: "STRING" } }, alertas: { type: "ARRAY", items: { type: "STRING" } },
            provincias: { type: "ARRAY", items: { type: "STRING", enum: provinces } }, zona: { type: "STRING" },
            color: { type: "STRING", enum: ["green", "coral", "blue", "amber"] },
            fuentes: { type: "ARRAY", minItems: 3, maxItems: 6, items: { type: "OBJECT", required: ["titulo", "organismo", "url"], properties: { titulo: { type: "STRING" }, organismo: { type: "STRING" }, url: { type: "STRING" } } } },
            origen: { type: "STRING", enum: ["ALBA"] }, estado_revision: { type: "STRING", enum: ["pendiente"] }, publicada: { type: "BOOLEAN" },
          },
        },
      ],
    },
  },
};

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
}

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeNameArray(values: string[]): string[] {
  return values.map((v) => normalizeName(v)).filter(Boolean);
}

function validateDiscoveredDisease(value: Disease | null): Disease | null {
  if (!value || !value.nombre || !value.resumen || !value.fuentes?.length) return null;
  const specialist = typeof value.especialista === "string" ? value.especialista.trim() : "";
  if (specialist.length < 2 || specialist.length > 100) return null;
  const validProvinces = value.provincias.filter((province) => provinces.includes(province));
  if (!validProvinces.length || !value.sintomas?.length || !value.prevencion?.length || !value.alertas?.length) return null;
  const trustedDomains = [
    "salud.gob.ec", "inspi.gob.ec", "iess.gob.ec", "senescyt.gob.ec", "paho.org", "who.int",
    "medlineplus.gov", "nih.gov", "cdc.gov", "scielo.org", "cochrane.org",
    "mayoclinic.org", "nhs.uk", "unicef.org",
  ];
  const seenUrls = new Set<string>();
  const sources = value.fuentes.filter((source) => {
    try {
      const url = new URL(source.url);
      const trusted = url.protocol === "https:" && trustedDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
      if (!trusted) return false;
      const key = url.href.replace(/\/$/, "").toLowerCase();
      if (seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    } catch { return false; }
  });
  if (sources.length < 3) return null;
  const orderedSources = [...sources].sort((a, b) => {
    const aEc = a.url.includes(".gob.ec") ? 0 : 1;
    const bEc = b.url.includes(".gob.ec") ? 0 : 1;
    return aEc - bEc;
  });
  return {
    ...value,
    id: slugify(value.nombre),
    especialista: specialist,
    provincias: validProvinces,
    fuentes: orderedSources.slice(0, 6),
    origen: "ALBA",
    estado_revision: "pendiente",
    publicada: true,
  };
}

function shouldGroundResearch(message: string, selectedDisease: SelectedDisease | null) {
  if (selectedDisease) return true;
  return /(dame|sugiere|busca|descubre|investiga|agrega|enfermedad(?:es)?\s+(?:con|relacionad|asociad)|relacionad[ao]s?\s+con)/i.test(message);
}

function isDiscoveryIntent(message: string) {
  return /(enfermedad(?:es)?\s+nueva|nueva\s+enfermedad|nuevas\s+enfermedades|otras\s+enfermedades|otras\s+opciones|m(a|á)s\s+opciones|no\s+registrad|descubr|sugier|recomiend|recomién)/i.test(message);
}

async function getGroundedResearch(message: string, selectedDisease: SelectedDisease | null) {
  const apiKey = config.geminiApiKey;
  if (!apiKey) return "";
  const model = process.env.GEMINI_SEARCH_MODEL || config.geminiModel;
  const topic = selectedDisease
    ? `${selectedDisease.nombre}, categoría ${selectedDisease.categoria}`
    : message;
  const prompt = `Investiga ${topic} con relación sanitaria a Ecuador. Busca enfermedades reales y evidencia sobre síntomas, prevención, señales de alerta y profesional de referencia. Prioriza fuentes ecuatorianas oficiales: MSP Ecuador (salud.gob.ec), INSPI, IESS y SciELO Ecuador; complementa con OPS, OMS, MedlinePlus/NIH, CDC, Cochrane, Mayo Clinic y NHS. Reúne al menos tres fuentes verificables, no repitas la misma URL y menciona sus enlaces. No diagnostiques y no inventes provincias.`;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1400 },
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) return "";
    const data = (await response.json()) as GeminiResponse;
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "";
    const sources = (candidate?.groundingMetadata?.groundingChunks || [])
      .map((chunk) => chunk.web)
      .filter((source): source is { uri: string; title?: string } => Boolean(source?.uri))
      .slice(0, 10)
      .map((source) => `${source.title || "Fuente"}: ${source.uri}`)
      .join("\n");
    return [text, sources ? `Fuentes encontradas:\n${sources}` : ""].filter(Boolean).join("\n\n").slice(0, 12000);
  } catch (error) {
    console.error("Búsqueda fundamentada no disponible:", error instanceof Error ? error.message : error);
    return "";
  }
}

export async function askGemini(
  message: string,
  ageRange: string,
  history: ChatMessage[],
  selectedDisease: SelectedDisease | null = null,
  symptoms: string[] = [],
): Promise<AlbaResponse> {
  const apiKey = config.geminiApiKey;
  const model = config.geminiModel;
  if (!apiKey) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");

  let allDiseases: Disease[] = [];
  try { allDiseases = await listDiseases(true); } catch { /* The assistant still works if the database is unavailable. */ }
  const knownDiseases = allDiseases.filter((disease) => disease.publicada);
  const catalog = JSON.stringify(allDiseases.map((disease) => ({
    nombre: disease.nombre,
    sintomas: disease.sintomas,
    especialista: disease.especialista,
    estado: disease.estado_revision,
  })));
  const groundedResearch = shouldGroundResearch(message, selectedDisease)
    ? await getGroundedResearch(message, selectedDisease)
    : "";

  const contents = [
    ...history.slice(-6).map((item) => ({ role: item.role === "assistant" ? "model" : "user", parts: [{ text: item.content }] })),
    { role: "user", parts: [{ text: `Rango de edad: ${ageRange}.
Catálogo actual: ${catalog || "no disponible"}.
Provincias permitidas: ${provinces.join(", ")}.
${selectedDisease ? `Selección explícita para investigar y agregar: ${selectedDisease.nombre} (${selectedDisease.categoria}).` : ""}
${groundedResearch ? `Investigación fundamentada disponible:\n${groundedResearch}` : ""}
Consulta: ${message}` }] },
  ];

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1800,
      responseMimeType: "application/json",
      responseSchema,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) });
  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) throw new Error(data.error?.message || "GEMINI_REQUEST_FAILED");

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new Error("GEMINI_EMPTY_RESPONSE");

  let parsed: Omit<AlbaResponse, "savedDisease" | "savedDiseaseStatus" | "relatedDiseaseDetails">;
  try { parsed = JSON.parse(text) as Omit<AlbaResponse, "savedDisease" | "savedDiseaseStatus" | "relatedDiseaseDetails">; }
  catch { throw new Error("GEMINI_INVALID_RESPONSE"); }

  parsed.discoveredDisease = validateDiscoveredDisease(parsed.discoveredDisease);
  const knownNames = new Set(allDiseases.map((disease) => normalizeName(disease.nombre)));
  const knownList = [...knownNames];
  const suggestionNames = new Set<string>();
  const isKnownOrVariant = (normalized: string) => {
    if (knownNames.has(normalized)) return true;
    if (normalized.length < 5) return false;
    return knownList.some((known) => known.length >= 5 && (known.includes(normalized) || normalized.includes(known)));
  };
  const filteredSuggestions = (parsed.suggestedDiseases || []).filter((suggestion) => {
    const normalized = normalizeName(suggestion.nombre);
    if (!normalized || isKnownOrVariant(normalized) || suggestionNames.has(normalized)) return false;
    suggestionNames.add(normalized);
    return Boolean(suggestion.categoria?.trim() && suggestion.motivo?.trim());
  });
  const categorySeen = new Set<string>();
  const diverseSuggestions: typeof filteredSuggestions = [];
  filteredSuggestions.forEach((suggestion) => {
    const categoryKey = normalizeName(suggestion.categoria || "");
    if (categoryKey && !categorySeen.has(categoryKey)) { categorySeen.add(categoryKey); diverseSuggestions.push(suggestion); }
  });
  filteredSuggestions.forEach((suggestion) => {
    if (diverseSuggestions.length < 5 && !diverseSuggestions.includes(suggestion)) diverseSuggestions.push(suggestion);
  });
  parsed.suggestedDiseases = diverseSuggestions.slice(0, 5);

  // Multi-symptom matching: solo para consultas por síntomas, no para descubrimiento ni selección explícita.
  const discoveryIntent = isDiscoveryIntent(message) || Boolean(selectedDisease);
  let diseaseMatches: Array<{ disease: Disease; matching: string[]; count: number }> = [];
  if (symptoms.length > 0 && !discoveryIntent) {
    const normalizedSymptoms = symptoms.map((s) => normalizeName(s));
    allDiseases.forEach((disease) => {
      const diseaseSymptoms = normalizeNameArray(disease.sintomas || []);
      const matching: string[] = [];
      normalizedSymptoms.forEach((sym) => {
        diseaseSymptoms.forEach((ds) => {
          if (normalizeName(sym) === normalizeName(ds)) matching.push(sym);
        });
      });
      if (matching.length > 0) {
        diseaseMatches.push({ disease, matching, count: matching.length });
      }
    });
    // Sort by count matching (desc), then by disease order
    diseaseMatches.sort((a, b) => b.count - a.count || 0);
    // Build suggested diseases from matches, limited to 5
    const seen = new Set<string>();
    diseaseMatches.slice(0, 5).forEach((dm) => {
      const normalized = normalizeName(dm.disease.nombre);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        const existingSuggestion = parsed.suggestedDiseases.find((s) => normalizeName(s.nombre) === normalized);
        if (existingSuggestion) {
          // Add matching symptoms to existing suggestion
          const alreadyMatching = new Set(existingSuggestion.matchingSymptoms || []);
          (dm.matching || []).forEach((ms) => alreadyMatching.add(ms));
          // Update the suggestion in place by marking it
          parsed.suggestedDiseases = parsed.suggestedDiseases.map((s) =>
            normalizeName(s.nombre) === normalized ? { ...s, matchingSymptoms: Array.from(alreadyMatching) } : s
          );
        } else {
          parsed.suggestedDiseases.push({
            nombre: dm.disease.nombre,
            categoria: dm.disease.categoria || "Medicina general",
            motivo: `Coincide con ${dm.count} síntoma(s): ${dm.matching.slice(0, 3).join(", ")}${dm.matching.length > 3 ? " + más" : ""}`,
            matchingSymptoms: dm.matching,
          });
        }
      }
    });
    // Remove duplicates by normalized name, keeping first occurrence
    const uniqueSuggestions: Array<{ nombre: string; categoria: string; motivo: string; matchingSymptoms?: string[] }> = [];
    const secondSeen = new Set<string>();
    parsed.suggestedDiseases.forEach((s) => {
      const norm = normalizeName(s.nombre);
      if (!secondSeen.has(norm)) {
        secondSeen.add(norm);
        uniqueSuggestions.push(s);
      }
    });
    parsed.suggestedDiseases = uniqueSuggestions.slice(0, 5) as AlbaResponse["suggestedDiseases"];
  }
  let savedDisease: Disease | null = null;
  let savedDiseaseStatus: AlbaResponse["savedDiseaseStatus"] = null;
  if (parsed.discoveredDisease) {
    try {
      const existing = await findDiseaseByName(parsed.discoveredDisease.nombre);
      if (existing) {
        if (!existing.publicada) {
          savedDisease = await upsertDisease({ ...existing, publicada: true });
          savedDiseaseStatus = "published_existing";
        } else {
          savedDisease = existing;
          savedDiseaseStatus = "existing";
        }
      } else {
        const idOwner = await findDiseaseById(parsed.discoveredDisease.id);
        if (idOwner) parsed.discoveredDisease.id = `${parsed.discoveredDisease.id}-alba-${Date.now().toString(36)}`;
        savedDisease = await upsertDisease(parsed.discoveredDisease);
        savedDiseaseStatus = "created";
      }
    } catch (error) {
      console.error("No se pudo guardar el descubrimiento de ALBA:", error instanceof Error ? error.message : error);
    }
  }

  const relatedDisease = parsed.urgency === "emergencia" || !parsed.relatedDisease
    ? null
    : knownDiseases.find((disease) => normalizeName(disease.nombre) === normalizeName(parsed.relatedDisease || "")) || null;
  parsed.relatedDisease = relatedDisease?.nombre || null;
  const relatedDiseaseDetails = relatedDisease
    ? { id: relatedDisease.id, nombre: relatedDisease.nombre, especialista: relatedDisease.especialista }
    : null;

  return { ...parsed, relatedDiseaseDetails, savedDisease, savedDiseaseStatus };
}
