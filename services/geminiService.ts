import { UnitType, ItemType, AISuggestion, AIResponse, AIHierarchyItem, AIClarification, ProductSuggestion, AiGenerationOptions, AiMeasurementTarget, AiMeasurementStep, CostPlanDrawingBasis, Project, ItemLibrary, TradePackage, AppraisalCostCategory } from "../types";
import { GEMINI_MODEL_FLASH, modelForAnalysis, modelForHierarchy } from "../config/models";
import type { GeminiPart } from "./geminiTypes";
import { type Result, ok, err } from "./geminiTypes";
import type { AppSettings } from "../utils/appSettings";
import { generateLocalChatCompletion, isLocalAiReady } from "./localAiService";
import { GEMINI_KEY_MESSAGE, isGeminiApiKeySet } from "./geminiConfig";
import { calculateLiveDirectRate, hasHalfBrickLabourOutlier, isHalfBrickWallRate, type LiveDirectRateBuildUp } from '../utils/liveBoQRate';
export {
  GEMINI_KEY_MESSAGE,
  getGeminiConfigStatus,
  importGeminiConfigFromDialog,
  importGeminiConfigFromJson,
  importGeminiConfigFromPath,
  removeGeminiConfig,
  validateAndStoreGeminiConfig,
  type GeminiConfigStatus,
} from "./geminiConfig";

const Type = {
  ARRAY: "ARRAY",
  BOOLEAN: "BOOLEAN",
  NUMBER: "NUMBER",
  OBJECT: "OBJECT",
  STRING: "STRING",
} as const;

async function getTauriInvoke() {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke;
}

async function ensureConfigured(): Promise<void> {
  const configured = await isGeminiApiKeySet();
  if (!configured) throw new Error(GEMINI_KEY_MESSAGE);
}

async function generateContentText(
  model: string,
  parts: GeminiPart[],
  config: { responseMimeType?: string; responseSchema?: unknown; tools?: unknown }
): Promise<string> {
  await ensureConfigured();
  const invoke = await getTauriInvoke();
  const contents = { parts };
  const generationConfig =
    config.responseMimeType || config.responseSchema || config.tools
      ? {
          responseMimeType: config.responseMimeType,
          responseSchema: config.responseSchema,
          tools: config.tools,
        }
      : undefined;
  const text = await invoke<string>("gemini_generate_content", {
    model,
    contents,
    generationConfig: generationConfig ?? null,
  });
  return text ?? "";
}

const runWithRetry = async <T>(operation: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const errObj = error as { status?: number; code?: number; response?: { status?: number }; message?: string };
      const errorCode = errObj?.status ?? errObj?.code ?? errObj?.response?.status;
      const errorMessage = errObj?.message ?? "";
      const isRetryable =
        errorCode === 503 ||
        errorCode === 429 ||
        errorMessage.includes("503") ||
        errorMessage.includes("high demand") ||
        errorMessage.includes("429");
      if (isRetryable && attempt < retries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`Gemini API Busy (Attempt ${attempt + 1}/${retries}). Retrying in ${Math.round(delay)}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

const HIERARCHY_TIMEOUT_MS = 120000; // 2 minutes

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/** Parse JSON safely; on failure return err with clear message so callers can show toast / fallback. */
function safeParseJson<T>(text: string, fallback: T, apiLabel: string): Result<T> {
  const raw = text?.trim() || JSON.stringify(fallback);
  try {
    const parsed = JSON.parse(raw) as T;
    return ok(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`Invalid JSON from API (${apiLabel}): ${msg}`);
  }
}

function tryExtractJsonArray<T>(text: string): T[] | null {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T[];
  } catch {
    return null;
  }
}

export function sanitizeUnit(raw: string): string {
  if (!raw) return "";
  const clean = raw.toLowerCase().trim().replace(/\.$/, "");
  if (clean === "m" || clean === "lm" || clean.startsWith("lin")) return UnitType.M;
  if (clean === "m2" || clean === "m²" || clean === "sqm" || clean.startsWith("square")) return UnitType.M2;
  if (clean === "m3" || clean === "m³" || clean === "cum" || clean.startsWith("cubic")) return UnitType.M3;
  if (clean === "kg" || clean.startsWith("kilo")) return UnitType.KG;
  if (clean === "t" || clean.startsWith("ton")) return UnitType.T;
  if (clean === "nr" || clean === "no" || clean === "each" || clean.startsWith("num")) return UnitType.NR;
  if (clean === "sum" || clean === "item") return UnitType.SUM;
  if (clean === "hrs" || clean.startsWith("hour")) return UnitType.HRS;
  if (clean.includes("m3") || clean.includes("m³")) return UnitType.M3;
  if (clean.includes("m2") || clean.includes("m²")) return UnitType.M2;
  if (clean.endsWith(" m")) return UnitType.M;
  if (clean.length > 5) return UnitType.NR;
  return raw;
}

export async function analyzeBoQRequest(
  prompt: string,
  history: string[] = [],
  files: { mimeType: string; data: string }[] = [],
  aiOptions?: AiGenerationOptions,
  phase: 'items' | 'measurements' = 'items'
): Promise<Result<AIClarification>> {
  const parts: GeminiPart[] = [];
  files.forEach((file) => {
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
  });
  if (history.length > 0) {
    parts.push({ text: `CONVERSATION HISTORY:\n${history.join("\n")}\n` });
  }
  const fileContextInstruction =
    files.length > 0
      ? `[IMPORTANT]: The user has attached ${files.length} file(s). These files likely contain the SPECIFICATIONS and DIMENSIONS needed. You must analyze them. If the answer to your previous questions is in these files, do NOT ask the question again. Treat the file content as the user's answer.`
      : "";
  const measurementInstruction = aiOptions?.includeMeasurements && phase === 'measurements'
    ? files.length > 0
      ? `Measurement mode is enabled. Use the attached files as the primary measurement source and only ask follow-up questions if critical dimensions or assumptions are still missing.`
      : `Measurement mode is enabled. Ask for drawings, schedules, or explicit dimensional assumptions before allowing quantity generation. If the prompt lacks measurable lengths, areas, volumes, counts, heights, thicknesses, or spacing, return needsClarification: true with direct measurement questions.`
    : `Measurement mode is disabled. Do not block generation just because drawings or dimensions are missing.`;
  parts.push({
    text: `Act as a senior Quantity Surveyor. Analyze the following BoQ request/update: "${prompt}".
    ${fileContextInstruction}
    ${measurementInstruction}
    Task:
    Determine if there is enough information (in the prompt + history + attached files) to generate a Bill of Quantities.
    Decision Rules:
    1. If files are attached, assume they are the source of truth. READ THEM.
    2. Only return 'needsClarification: true' if the files are illegible, empty, or completely unrelated to the work scope.
    3. If the user provided a snapshot of a schedule/spec, 'needsClarification' must be FALSE.
    4. ${phase === 'measurements' ? 'If measurement mode is enabled and no drawings or measurable assumptions are available, ask for the missing measurement information.' : 'Focus on scope, specification, and bill structure. Do not hold up phase 1 for measurement questions.'}
    Return JSON.`,
  });

  const model = modelForAnalysis(files.length > 0);
  const config = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        needsClarification: { type: Type.BOOLEAN },
        questions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of missing details as questions",
        },
      },
      required: ["needsClarification", "questions"],
    },
  };

  try {
    const text = await runWithRetry(() => generateContentText(model, parts, config));
    const fallback: AIClarification = { needsClarification: false, questions: [] };
    const parseResult = safeParseJson(text, fallback, 'analysis');
    if (parseResult.ok === false) return err(parseResult.error);
    return ok(parseResult.data);
  } catch (e) {
    console.error("Analyze Request Failed", e);
    return err(e instanceof Error ? e.message : "Analysis request failed.");
  }
}

function formatMeasurementTargets(items: AiMeasurementTarget[]): string {
  return items
    .map((item, index) => `${index + 1}. Description: "${item.description}" | Unit: "${item.unit}" | Type: "${item.type || 'PRICED'}"`)
    .join('\n');
}

function buildSingleMeasurementQuestion(step: AiMeasurementStep, primaryItem: AiMeasurementTarget): string {
  const description = primaryItem.description;
  switch (step.nextField) {
    case 'drawing':
      return `Please upload the measurement drawing for "${description}".`;
    case 'length':
      return `What is the measured length for "${description}"?`;
    case 'width':
      return `What is the measured width for "${description}"?`;
    case 'height':
      return `What is the measured height for "${description}"?`;
    case 'thickness':
      return `What is the measured thickness for "${description}"?`;
    case 'depth':
      return `What is the measured depth for "${description}"?`;
    case 'count':
      return `How many units are required for "${description}"?`;
    case 'spacing':
      return `What is the measured spacing for "${description}"?`;
    default:
      return step.question || `Please provide the next missing measurement for "${description}".`;
  }
}

export async function captureBoQMeasurements(
  items: AiMeasurementTarget[],
  history: string[] = [],
  files: { mimeType: string; data: string }[] = []
): Promise<Result<AiMeasurementStep>> {
  if (items.length === 0) {
    return ok({
      needsClarification: false,
      items: [],
      summary: 'No measurable items were provided.',
    });
  }

  const parts: GeminiPart[] = [];
  files.forEach((file) => {
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
  });
  if (history.length > 0) {
    parts.push({ text: `MEASUREMENT HISTORY:\n${history.join('\n')}\n` });
  }
  parts.push({
    text: `Act as a senior UK Quantity Surveyor focused only on measurement take-off.

Target items:
${formatMeasurementTargets(items)}

Rules:
1. You are only responsible for dimensions and quantities. Do not rewrite item descriptions or specifications.
2. If you do not yet have enough information, ask exactly ONE next specific measurement question.
3. You must also set "nextField" to exactly one of: drawing, length, width, height, thickness, depth, count, spacing, other.
4. The question must request only that single concrete missing input. Never ask for length, width, and thickness together in one question.
4. If drawings or schedules are attached, use them as the primary measurement source.
5. When you have enough information, return needsClarification false and measurement rows for the items you can now measure.
6. Use the exact item descriptions provided above.
7. For m units use length. For m2 use length and height/width as appropriate. For m3 use length, width, and height. For nr use multiplier/count.
8. Dimension values must be in meters. Comments should explain the assumption or location briefly.
9. If one item is still missing a critical size, keep asking one question at a time until enough information exists.

Return JSON.`,
  });

  const config = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        needsClarification: { type: Type.BOOLEAN },
        nextField: {
          type: Type.STRING,
          nullable: true,
          enum: ["drawing", "length", "width", "height", "thickness", "depth", "count", "spacing", "other"],
        },
        question: { type: Type.STRING, nullable: true },
        summary: { type: Type.STRING, nullable: true },
        items: {
          type: Type.ARRAY,
          nullable: true,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              unit: { type: Type.STRING, nullable: true },
              type: { type: Type.STRING, nullable: true },
              quantity: { type: Type.NUMBER, nullable: true },
              dimensionRows: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    multiplier: { type: Type.NUMBER, nullable: true },
                    length: { type: Type.NUMBER, nullable: true },
                    width: { type: Type.NUMBER, nullable: true },
                    height: { type: Type.NUMBER, nullable: true },
                    comment: { type: Type.STRING, nullable: true },
                    isDeduction: { type: Type.BOOLEAN, nullable: true },
                  },
                  required: [],
                },
              },
            },
            required: ["description", "dimensionRows"],
          },
        },
      },
      required: ["needsClarification"],
    },
  };

  try {
    const text = await runWithRetry(() => generateContentText(modelForAnalysis(files.length > 0), parts, config));
    const parseResult = safeParseJson<AiMeasurementStep>(text, { needsClarification: true, question: 'Please upload the relevant drawing or answer the next measurement question.' }, 'measurement capture');
    if (parseResult.ok === false) return err(parseResult.error);
    const data = parseResult.data;
    const primaryItem = items[0];
    return ok({
      needsClarification: data.needsClarification,
      nextField: data.nextField,
      question: data.needsClarification ? buildSingleMeasurementQuestion(data, primaryItem) : data.question,
      summary: data.summary,
      items: (data.items ?? []).map((item) => ({
        ...item,
        unit: sanitizeUnit(String(item.unit ?? '')),
      })),
    });
  } catch (e) {
    console.error('Measurement capture error', e);
    return err(e instanceof Error ? e.message : 'Measurement capture failed.');
  }
}

export async function getBoQSuggestions(userInput: string): Promise<Result<AIResponse>> {
  const parts: GeminiPart[] = [
    {
      text: `Acting as a professional Quantity Surveyor, provide 5 distinct, formal BoQ description suggestions based on this raw input: "${userInput}". 
      For each suggestion, also provide the standard unit of measurement.
      Include variations in complexity and detail.`,
    },
  ];
  // Schema enforces both root required ("suggestions") and item-level required ("description", "unit")
  // so malformed or partial API responses are rejected and we get type-safe suggestions.
  const config = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        suggestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              unit: { type: Type.STRING, enum: Object.values(UnitType) },
            },
            required: ["description", "unit"],
          },
        },
      },
      required: ["suggestions"],
    },
  };
  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, config));
    const parseResult = safeParseJson<{ suggestions?: { description: string; unit: string }[] }>(text, {}, 'BoQ suggestions');
    if (parseResult.ok === false) return err(parseResult.error);
    const result = parseResult.data;
    const data: AIResponse = {
      suggestions: (result.suggestions ?? []).map((s) => ({
        description: s.description,
        unit: sanitizeUnit(s.unit) as UnitType,
      })),
    };
    return ok(data);
  } catch (e) {
    console.error("Failed to get suggestions", e);
    return err(e instanceof Error ? e.message : "Failed to get suggestions.");
  }
}

export async function expandItemIntervals(
  baseDescription: string,
  interval: number,
  max: number
): Promise<Result<string[]>> {
  const parts: GeminiPart[] = [
    {
      text: `Acting as a professional Quantity Surveyor, take this base work description: "${baseDescription}".
      Identify the numerical interval mentioned (e.g. 0.50m). 
      Generate a series of similar, formal descriptions incrementing that specific value by ${interval} until it reaches ${max}.
      Ensure professional QS formatting (e.g. 2 decimal places, standard abbreviations).`,
    },
  ];
  const config = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        descriptions: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["descriptions"],
    },
  };
  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, config));
    const parseResult = safeParseJson<{ descriptions?: string[] }>(text, {}, 'interval expand');
    if (parseResult.ok === false) return err(parseResult.error);
    return ok(parseResult.data.descriptions ?? []);
  } catch (e) {
    console.error("Interval Expand Error", e);
    return err(e instanceof Error ? e.message : "Interval expand failed.");
  }
}

export async function generateBoQHierarchy(
  prompt: string,
  standard: "SMM7" | "NRM2",
  existingContext: string[] = [],
  additionalDetails: string = "",
  history: string[] = [],
  files: { mimeType: string; data: string }[] = [],
  aiOptions?: AiGenerationOptions
): Promise<Result<AIHierarchyItem[]>> {
  const standardContext =
    standard === "NRM2" ? "NRM2 (New Rules of Measurement 2)" : "SMM7 (Standard Method of Measurement 7)";
  const includeRates = aiOptions?.includeRates ?? true;
  const includeMeasurements = aiOptions?.includeMeasurements ?? false;
  const rateInstruction = includeRates
    ? `For 'PRICED' items, estimate a realistic direct UK market rate in GBP, excluding main-contractor O&P, site-wide preliminaries, contingency and VAT.`
    : `Do NOT estimate rates. Leave estimatedRate undefined or omit it entirely.`;
  const measurementInstruction = includeMeasurements
    ? files.length > 0
      ? `Measurement mode is enabled. Use the attached drawings, schedules, and mark-ups to derive measurable quantities and defaultDims where supported by the files or the user's answers.`
      : `Measurement mode is enabled. Use only the user's supplied dimensional assumptions in the prompt/history/additional details. If those assumptions are insufficient, defaultDims should be omitted.`
    : `Measurement mode is disabled. Do NOT infer or populate defaultDims.`;

  const parts: GeminiPart[] = [];
  files.forEach((file) => {
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
  });
  if (history.length > 0) {
    parts.push({ text: `CONVERSATION HISTORY:\n${history.join("\n")}\n` });
  }
  const fileInstruction = files.length > 0
    ? `[CRITICAL INSTRUCTION]
    You have ${files.length} file(s) attached.
    You MUST extract the specific items, quantities, dimensions, and specifications directly from these files.
    The files are the primary source of truth. Do not ignore them.
    If the file is an image of a schedule, table, or drawing, transcribe the relevant items into the Bill of Quantities.`
    : `No files are attached. Base the hierarchy only on the user's prompt, prior answers, and explicit assumptions already provided.`;
  parts.push({
    text: `Act as a senior Quantity Surveyor. Generate a full ${standardContext} compliant BoQ hierarchy for the following work scope: "${prompt}".
    ${fileInstruction}
    Additional user inputs: "${additionalDetails}".
    Current section context: [${existingContext.join(", ")}].
    Prefer refining or merging existing headings/comments/items when they are similar, rather than creating new duplicates.
    STRICT HIERARCHY RULES:
    1. Result MUST follow this order where useful: GENERAL_HEADING (H1), MAJOR_HEADING (H2), SUB_SECTION (H3), MINOR_HEADING (H4), COMMENT, SUB_COMMENT, PRICED.
    2. Do NOT duplicate headings already present in the "Existing Context".
    3. Ensure descriptions are formal and professional, adhering strictly to ${standardContext} syntax.
    4. Provide valid units strictly from this list: m, m2, m3, nr, kg, t, Sum.
    5. ${includeMeasurements ? `If a description implies specific measurable dimensions and they are supported by the files or user inputs, extract them into 'defaultDims' in meters.` : `Do not populate 'defaultDims'.`}
    6. ${rateInstruction}
    7. Return an array of objects.`,
  });
  parts.push({ text: measurementInstruction });

  const model = modelForHierarchy(files.length > 0);
  const config = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ["GENERAL_HEADING", "MAJOR_HEADING", "SUB_SECTION", "MINOR_HEADING", "COMMENT", "SUB_COMMENT", "PRICED", "PROVISIONAL_SUM", "PC_SUM"],
          },
          description: { type: Type.STRING },
          unit: { type: Type.STRING, description: "Strictly only the measurement unit symbol (e.g. m3, m2, nr)." },
          estimatedRate: { type: Type.NUMBER, description: "Estimated market rate in GBP" },
          defaultDims: {
            type: Type.OBJECT,
            properties: { length: { type: Type.NUMBER }, width: { type: Type.NUMBER }, height: { type: Type.NUMBER } },
            nullable: true,
          },
        },
        required: ["type", "description"],
      },
    },
  };

  try {
    const text = await withTimeout(
      runWithRetry(() => generateContentText(model, parts, config)),
      HIERARCHY_TIMEOUT_MS,
      "Hierarchy generation timed out. The request may be too complex or the service is busy. Try again or simplify the scope."
    );
    const parseResult = safeParseJson<AIHierarchyItem[]>(text, [], 'hierarchy generation');
    let rawResult: AIHierarchyItem[] | null;
    let parseError: string | null = null;
    if (parseResult.ok === false) {
      rawResult = tryExtractJsonArray<AIHierarchyItem>(text);
      parseError = parseResult.error;
    } else {
      rawResult = parseResult.data;
    }
    if (!rawResult) return err(parseError || 'Hierarchy generation returned an unreadable response.');
    const data = rawResult.map((item) => ({
      ...item,
      unit:
        item.type === "PRICED" || item.type === "PROVISIONAL_SUM" || item.type === "PC_SUM"
          ? sanitizeUnit(item.unit ?? "")
          : "",
    }));
    return ok(data);
  } catch (e) {
    console.error("Hierarchy generation error", e);
    return err(e instanceof Error ? e.message : "Hierarchy generation failed.");
  }
}

export async function getRealTimeProductAnalysis(
  description: string,
  requirements: string = ""
): Promise<Result<string>> {
  let promptText = `Find current UK market prices and product availability for: "${description}".`;
  if (requirements) promptText += `\nStrictly prioritize these specific user requirements: "${requirements}".`;
  promptText += `\nProvide a concise summary of price ranges (low/avg/high) in GBP, key suppliers, and any relevant technical standards. Use markdown bullet points for readability.`;

  const parts: GeminiPart[] = [{ text: promptText }];
  const configWithSearch = { tools: [{ googleSearch: {} }] };
  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, configWithSearch));
    return ok(text || "No analysis available.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isToolError =
      /tool|grounding|google.?search|400|403/i.test(msg) ||
      (e as { status?: number })?.status === 400 ||
      (e as { code?: number })?.code === 400;
    if (isToolError) {
      try {
        const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, {}));
        return ok((text || "No analysis available.") + "\n\n_(Google Search grounding was not available; response is model-only.)_");
      } catch (fallbackErr) {
        console.error("Market Analysis fallback error", fallbackErr);
        return err(fallbackErr instanceof Error ? fallbackErr.message : "Market analysis unavailable.");
      }
    }
    console.error("Market Analysis Error", e);
    return err(e instanceof Error ? e.message : "Market analysis unavailable.");
  }
}

export async function getConstructionPriceIndex(
  date: string
): Promise<Result<{ index: number | null; rationale: string }>> {
  const parts: GeminiPart[] = [{
    text: `Find a suitable UK construction tender/build cost price index for a residential development appraisal at this date: "${date}".
Prefer recognised UK construction cost or tender price index sources where available.
Return JSON only in this shape:
{"index": number or null, "rationale": "short source/date note"}
If there is no reliable exact value, return the closest available period and explain that briefly in rationale.`,
  }];
  const configWithSearch = { tools: [{ googleSearch: {} }] };
  const parse = (text: string) => {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as { index?: unknown; rationale?: unknown };
    const index = typeof parsed.index === "number" && Number.isFinite(parsed.index) ? parsed.index : null;
    return {
      index,
      rationale: typeof parsed.rationale === "string" ? parsed.rationale : "AI returned a price index response without a rationale.",
    };
  };

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, configWithSearch));
    return ok(parse(text || "{}"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isToolError =
      /tool|grounding|google.?search|400|403/i.test(msg) ||
      (e as { status?: number })?.status === 400 ||
      (e as { code?: number })?.code === 400;
    try {
      const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, {}));
      const parsed = parse(text || "{}");
      return ok({
        ...parsed,
        rationale: `${parsed.rationale}${isToolError ? " Search grounding was not available; this is model-only." : ""}`,
      });
    } catch (fallbackErr) {
      console.error("Construction price index lookup error", fallbackErr);
      return err(fallbackErr instanceof Error ? fallbackErr.message : "Construction price index lookup failed.");
    }
  }
}

export async function getBoQRateEstimate(
  description: string,
  unit: string,
  requirements: string = ""
): Promise<Result<{ rate: number; rationale: string }>> {
  const parts: GeminiPart[] = [{
    text: `Act as a senior UK Quantity Surveyor.

Estimate a realistic direct market unit rate in GBP for this BoQ item:
- Description: "${description}"
- Unit: "${unit}"
${requirements ? `- Additional requirements: "${requirements}"` : ''}

Rules:
1. Return one realistic direct working rate in GBP for the stated site location. If the site is outside the UK, show the conversion basis in the rationale. Exclude main-contractor overhead and profit, site-wide preliminaries, contingency and VAT.
2. Assume a normal competitive subcontract market unless the description says otherwise.
3. Keep the rationale concise and commercial.
4. Rate must be in GBP per stated unit.

Return JSON with "rate" and "rationale".`,
  }];

  const config = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        rate: { type: Type.NUMBER },
        rationale: { type: Type.STRING },
      },
      required: ["rate", "rationale"],
    },
  };

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, config));
    const parseResult = safeParseJson<{ rate: number; rationale: string }>(text, { rate: 0, rationale: "" }, 'rate estimate');
    if (parseResult.ok === false) return err(parseResult.error);
    return ok(parseResult.data);
  } catch (e) {
    console.error("Rate estimate error", e);
    return err(e instanceof Error ? e.message : "Rate estimate failed.");
  }
}

export interface LiveBoQRateEstimate {
  rate: number;
  rationale: string;
  evidence: string;
  sources: Array<{ title: string; url: string }>;
  assessedAt: string;
}

/** Search first, then price against that evidence. Never fall back to an ungrounded rate. */
export async function getLiveBoQRateEstimate(
  description: string,
  unit: string,
  context = '',
): Promise<Result<LiveBoQRateEstimate>> {
  const searchPrompt = `Find current published construction pricing evidence relevant to the site location below. Use Google Search. Give 2–4 source URLs, publication or access dates where available, quoted prices and units, and whether each price is materials-only or installed. Find a defensible labour basis: hourly direct employment or trade cost AND measured person-hours or output per BoQ unit. Distinguish a wage from an installed labour charge; include employer on-costs only if justified. Find material, plant and waste components as needed. If the site is outside the UK, also find a current source for converting local prices to GBP. Exclude main-contractor overhead and profit, site-wide preliminaries, contingency and VAT. Do not invent a quotation or claim a national source is local. If evidence is thin, say so.\nWork: ${description}\nUnit: ${unit}\nBill and site location: ${context || 'United Kingdom (site location not supplied)'}\nReturn concise evidence with explicit https:// source links.`;
  let evidence: string;
  try {
    evidence = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: searchPrompt }], { tools: [{ googleSearch: {} }] }));
  } catch (error) {
    return err(`Live market search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const urls = [...new Set((evidence.match(/https?:\/\/[^\s)\]>"']+/g) || []).map((url) => url.replace(/[.,;]+$/, '')))];
  if (urls.length === 0) return err('Live search returned no source links. No AI rate was proposed.');
  const sources = urls.slice(0, 6).flatMap((url) => {
    try { return [{ title: new URL(url).hostname.replace(/^www\./, ''), url }]; }
    catch { return []; }
  });
  if (sources.length === 0) return err('Live search returned no valid source links. No AI rate was proposed.');
  const brickworkBenchmark = isHalfBrickWallRate(description, unit)
    ? 'For ordinary 102.5 mm brickwork only, the Northern Ireland government 2023 schedule used 45 bricks per hour and £29.40/m² labour (https://library2.nics.gov.uk/pdf/dof/2023/PDF230058.pdf). This is a historic productivity cross-check, not a current local quotation; update the cost basis for the site and date. A threefold labour uplift needs specific evidence.'
    : '';
  const pricingPrompt = `Act as a quantity surveyor. Price ONE unit of the described bill work at DIRECT COST only, expressed in GBP. Use the live evidence below, adjusted for the specified site location only where a published local basis supports it. For a non-UK site, use a sourced currency conversion and state it in the rationale; return zero components if unavailable. Exclude separate main-contractor O&P, site-wide preliminaries, contingency and VAT. Do not use a generic percentage for those costs. A normal trade supplier's quoted direct supply-and-install price can be used as otherDirect if it is not broken into materials and labour; do not also count its components. Never invent an hourly rate or labour productivity. For labour, state the person-hours per bill unit (a gang's combined person-hours, not elapsed hours) and a supported direct cost per person-hour. Do not treat an hourly wage as a fully burdened subcontract charge. Cross-check the labour cost per unit against the stated output. If evidence is inadequate, return zero components and explain the gap. ${brickworkBenchmark}\nWork: ${description}\nBill unit: ${unit}\nSite and bill context: ${context}\nEvidence:\n${evidence.slice(0, 12000)}\nReturn JSON with non-negative GBP-per-bill-unit components materials, plant, waste, otherDirect, numeric labourHours and labourHourlyCost, plus labourBasis and concise rationale. Do not include a total; the application calculates it.`;
  const config = { responseMimeType: 'application/json' as const, responseSchema: { type: Type.OBJECT, properties: {
    materials: { type: Type.NUMBER }, labourHours: { type: Type.NUMBER }, labourHourlyCost: { type: Type.NUMBER },
    plant: { type: Type.NUMBER }, waste: { type: Type.NUMBER }, otherDirect: { type: Type.NUMBER },
    labourBasis: { type: Type.STRING }, rationale: { type: Type.STRING },
  }, required: ['materials', 'labourHours', 'labourHourlyCost', 'plant', 'waste', 'otherDirect', 'labourBasis', 'rationale'] } };
  let buildUp: LiveDirectRateBuildUp;
  try {
    const response = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: pricingPrompt }], config));
    const parsed = safeParseJson<LiveDirectRateBuildUp>(response, { materials: 0, labourHours: 0, labourHourlyCost: 0, plant: 0, waste: 0, otherDirect: 0, labourBasis: '', rationale: '' }, 'live direct rate');
    if ('error' in parsed) return err(parsed.error);
    buildUp = parsed.data;
  } catch (error) {
    return err(`Live rate assessment failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const total = calculateLiveDirectRate(buildUp);
  if (!total) return err('The evidence did not support a complete direct unit rate. No rate was proposed.');
  if (hasHalfBrickLabourOutlier(description, unit, total.labour)) {
    return err('Half-brick labour exceeds £75/m². Check measured productivity and site conditions before entering a rate; no AI rate was proposed.');
  }
  const money = (amount: number) => `£${amount.toFixed(2)}`;
  const breakdown = `Materials ${money(buildUp.materials)} + labour ${money(total.labour)} (${buildUp.labourHours} person-hours × ${money(buildUp.labourHourlyCost)}/hour) + plant ${money(buildUp.plant)} + waste ${money(buildUp.waste)} + other direct ${money(buildUp.otherDirect)} = ${money(total.rate)}/${unit}. No main-contractor O&P, site-wide preliminaries, contingency or VAT.`;
  return ok({ rate: total.rate, rationale: `${breakdown} ${buildUp.labourBasis ? `Labour basis: ${buildUp.labourBasis}. ` : ''}${buildUp.rationale}`, evidence, sources, assessedAt: new Date().toISOString() });
}

export async function getBoQRateBuildUp(
  description: string,
  unit: string,
  requirements: string = ""
): Promise<Result<{ rationale: string; components: Array<{ category: 'LABOUR' | 'PLANT' | 'MATERIALS' | 'PRELIMINARIES' | 'SUBCONTRACTOR'; description: string; quantity: number; unit: string; rate: number; note?: string }> }>> {
  const parts: GeminiPart[] = [{ text: `Act as a senior UK Quantity Surveyor. Build an internal LPMS-style rate build-up for this BoQ item, in GBP per stated item unit.
- Description: "${description}"
- Item unit: "${unit}"
${requirements ? `- Additional requirements: "${requirements}"` : ''}
Use only the categories Labour, Plant, Materials and Subcontractor where genuinely relevant. Exclude main-contractor O&P, site-wide preliminaries, contingency and VAT. Do not add a category with a zero allowance. Each component must be a real, editable direct cost allowance. Quantities and rates must reconcile to the direct item rate. Give a concise commercial rationale.
Return JSON with "rationale" and "components". Each component needs category, description, quantity, unit, rate and optional note.` }];
  const config = { responseMimeType: 'application/json' as const, responseSchema: { type: Type.OBJECT, properties: {
    rationale: { type: Type.STRING }, components: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, description: { type: Type.STRING }, quantity: { type: Type.NUMBER }, unit: { type: Type.STRING }, rate: { type: Type.NUMBER }, note: { type: Type.STRING } }, required: ['category', 'description', 'quantity', 'unit', 'rate'] } },
  }, required: ['rationale', 'components'] } };
  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, config));
    const parsed = safeParseJson<{ rationale: string; components: Array<{ category: 'LABOUR' | 'PLANT' | 'MATERIALS' | 'PRELIMINARIES' | 'SUBCONTRACTOR'; description: string; quantity: number; unit: string; rate: number; note?: string }> }>(text, { rationale: '', components: [] }, 'rate build-up');
    if (parsed.ok === false) return err(parsed.error);
    return ok({ ...parsed.data, components: parsed.data.components.filter((component) => Number.isFinite(component.quantity) && Number.isFinite(component.rate) && component.description.trim()) });
  } catch (error) { return err(error instanceof Error ? error.message : 'Rate build-up failed.'); }
}

export async function suggestProducts(
  description: string,
  requirements: string = ""
): Promise<Result<ProductSuggestion[]>> {
  let promptText = `Suggest 3 specific construction products available in the UK market that match this description: "${description}".`;
  if (requirements)
    promptText += `\nIMPORTANT: The suggestions MUST strictly adhere to these specific user requirements: "${requirements}".`;
  promptText += `\nFor each, provide the manufacturer, specific product name, and a brief description.`;

  const parts: GeminiPart[] = [{ text: promptText }];
  const configWithSearch = {
    tools: [{ googleSearch: {} }],
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          manufacturer: { type: Type.STRING },
          description: { type: Type.STRING },
          priceIndication: { type: Type.STRING, description: "Rough price indication if found" },
        },
        required: ["name", "description"],
      },
    },
  };
  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, configWithSearch));
    const parseResult = safeParseJson<ProductSuggestion[]>(text, [], 'product suggestions');
    if (parseResult.ok === false) return err(parseResult.error);
    return ok(parseResult.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isToolError =
      /tool|grounding|google.?search|400|403/i.test(msg) ||
      (e as { status?: number })?.status === 400 ||
      (e as { code?: number })?.code === 400;
    if (isToolError) {
      try {
        const text = await runWithRetry(() =>
          generateContentText(GEMINI_MODEL_FLASH, parts, {
            responseMimeType: "application/json" as const,
            responseSchema: configWithSearch.responseSchema,
          })
        );
        const parseResult = safeParseJson<ProductSuggestion[]>(text, [], 'product suggestions');
        if (parseResult.ok === false) return err(parseResult.error);
        return ok(parseResult.data);
      } catch (fallbackErr) {
        console.error("Product suggestion fallback error", fallbackErr);
        return err(fallbackErr instanceof Error ? fallbackErr.message : "Product suggestion failed.");
      }
    }
    console.error("Product suggestion error", e);
    return err(e instanceof Error ? e.message : "Product suggestion failed.");
  }
}

export async function generateSpecItemsFromProduct(
  currentDesc: string,
  product: ProductSuggestion
): Promise<Result<AIHierarchyItem[]>> {
  const promptText = `Act as a senior Quantity Surveyor.
  The user is updating a Bill Item: "${currentDesc}".
  They have selected this specific product:
  Name: ${product.name}
  Manufacturer: ${product.manufacturer}
  Details: ${product.description}
  Price Indication: ${product.priceIndication || "N/A"}
  Generate a sequence of BoQ items to replace the original item, ensuring full specification compliance (SMM7/NRM2).
  Structure:
  1. (Optional) Major Heading if the product implies a distinct category change.
  2. Specification Note (Type: COMMENT) detailing the product, manufacturer, and key performance specs.
  3. The Priced Item (Type: PRICED) with a precise description, unit, and estimated installation rate (Material + Labor).
  Return a JSON array of objects with keys: type, description, unit, estimatedRate.`;

  const parts: GeminiPart[] = [{ text: promptText }];
  const config = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ["GENERAL_HEADING", "MAJOR_HEADING", "SUB_SECTION", "MINOR_HEADING", "COMMENT", "SUB_COMMENT", "PRICED", "PROVISIONAL_SUM", "PC_SUM"],
          },
          description: { type: Type.STRING },
          unit: { type: Type.STRING },
          estimatedRate: { type: Type.NUMBER },
        },
        required: ["type", "description"],
      },
    },
  };
  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, config));
    const parseResult = safeParseJson<AIHierarchyItem[]>(text, [], 'spec items from product');
    if (parseResult.ok === false) return err(parseResult.error);
    const rawResult = parseResult.data;
    const data = rawResult.map((item) => ({ ...item, unit: sanitizeUnit(item.unit ?? "") }));
    return ok(data);
  } catch (e) {
    console.error("Generate Spec Items Error", e);
    return err(e instanceof Error ? e.message : "Failed to generate spec items.");
  }
}

export async function compileAiCostPlan(
  projectName: string,
  drawingBasis: CostPlanDrawingBasis,
  sourceRows: Array<{ billName: string; sectionName?: string; value: number }>
): Promise<Result<Array<{ title: string; notes?: string; baseValue: number; provenance?: string[] }>>> {
  const basisLabel = drawingBasis === 'DETAILED_DRAWINGS'
    ? 'detailed drawings'
    : drawingBasis === 'OUTLINE_DRAWINGS'
      ? 'outline drawings'
      : 'no drawings';

  const parts: GeminiPart[] = [{
    text: `Act as a senior UK Quantity Surveyor preparing a high-level elemental cost plan.

Project: "${projectName}"
Drawing basis: ${basisLabel}

Available priced work packages:
${sourceRows.map((row, index) => `${index + 1}. Bill: "${row.billName}"${row.sectionName ? ` | Section: "${row.sectionName}"` : ''} | Value GBP ${row.value.toFixed(2)}`).join('\n')}

Rules:
1. Re-group these priced work packages into a concise professional cost plan structure suitable for UK early-stage reporting.
2. Prefer elemental / commercial headings such as substructure, superstructure, finishes, MEP services, external works, preliminaries, and risk allowances where relevant.
3. Do not invent extra value. Reallocate only the value already supplied, and make sure the returned baseValue total matches the supplied total as closely as possible.
4. Use the drawing basis to influence how broad or cautious the headings are:
   - detailed drawings: more precise and trade-informed groupings
   - outline drawings: moderate consolidation into broader cost headings
   - no drawings: very high-level elemental groupings only
5. Keep the number of headings practical for a client-facing cost plan, usually between 6 and 15 unless the source scope is very small.
6. Notes should briefly explain what was grouped together and flag any broad assumptions.
7. Include a "provenance" array showing the exact bill / section packages that fed each line. Use labels exactly like "Bill Name / Section Name" or "Bill Name" if there is no section.
8. Return JSON only.

Return an array with: title, notes, baseValue, provenance.`,
  }];

  const config = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          notes: { type: Type.STRING, nullable: true },
          baseValue: { type: Type.NUMBER },
          provenance: {
            type: Type.ARRAY,
            nullable: true,
            items: { type: Type.STRING },
          },
        },
        required: ["title", "baseValue"],
      },
    },
  };

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, config));
    const parseResult = safeParseJson<Array<{ title: string; notes?: string; baseValue: number; provenance?: string[] }>>(text, [], 'AI cost plan');
    if (parseResult.ok === false) return err(parseResult.error);
    return ok(parseResult.data);
  } catch (e) {
    console.error('AI cost plan error', e);
    return err(e instanceof Error ? e.message : 'AI cost plan failed.');
  }
}

export async function analyzeAiConceptCostPlanRequest(
  prompt: string,
  drawingBasis: CostPlanDrawingBasis,
  history: string[] = []
): Promise<Result<AIClarification>> {
  const basisLabel = drawingBasis === 'DETAILED_DRAWINGS'
    ? 'detailed drawings'
    : drawingBasis === 'OUTLINE_DRAWINGS'
      ? 'outline drawings'
      : 'no drawings';

  const parts: GeminiPart[] = [];
  if (history.length > 0) {
    parts.push({ text: `CONVERSATION HISTORY:\n${history.join('\n')}\n` });
  }
  parts.push({
    text: `Act as a senior UK Quantity Surveyor preparing an elemental cost plan from an early concept brief.

Project brief:
"${prompt}"

Drawing basis: ${basisLabel}

Task:
Decide whether you already have enough information to generate a useful elemental cost plan with a base price and lower / higher range.

Ask follow-up questions only for the most commercially important missing inputs, such as:
- building type and use
- gross internal floor area or indicative size
- number of storeys
- quality level / specification level
- location / market context
- abnormal works, basements, lifts, unusual externals, or site constraints

Rules:
1. Keep the questions practical and QS-oriented.
2. Limit questions to the most valuable missing details.
3. If the prompt already gives enough information for a meaningful early-stage build-up, return needsClarification false.
4. This is an interactive concept-cost-plan conversation, not a BoQ generation workflow.
5. Return JSON only.`,
  });

  const config = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        needsClarification: { type: Type.BOOLEAN },
        questions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["needsClarification", "questions"],
    },
  };

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, config));
    const fallback: AIClarification = { needsClarification: false, questions: [] };
    const parseResult = safeParseJson<AIClarification>(text, fallback, 'AI concept cost plan analysis');
    if (parseResult.ok === false) return err(parseResult.error);
    return ok(parseResult.data);
  } catch (e) {
    console.error('AI concept cost plan analysis error', e);
    return err(e instanceof Error ? e.message : 'AI concept cost plan analysis failed.');
  }
}

export async function analyzeAiProjectSetupRequest(
  projectName: string,
  prompt: string,
  drawingBasis: CostPlanDrawingBasis,
  history: string[] = []
): Promise<Result<AIClarification>> {
  const basisLabel = drawingBasis === 'DETAILED_DRAWINGS'
    ? 'detailed drawings'
    : drawingBasis === 'OUTLINE_DRAWINGS'
      ? 'outline drawings'
      : 'no drawings';

  const parts: GeminiPart[] = [];
  if (history.length > 0) {
    parts.push({ text: `CONVERSATION HISTORY:\n${history.join('\n')}\n` });
  }
  parts.push({
    text: `Act as a senior UK Quantity Surveyor preparing an early project setup.

Project name:
"${projectName}"

Client brief:
"${prompt}"

Drawing basis: ${basisLabel}

Task:
Decide whether you have enough information to create:
1. a starter bill and section structure,
2. high-level priced allowance items for that structure,
3. an elemental concept cost plan with a base price and lower / higher range.

Ask follow-up questions only for the most important commercial and scope gaps, such as:
- building type / use
- approximate size or floor area
- number of storeys
- quality / specification level
- location / market context
- abnormal works, basements, lifts, unusual externals, site constraints
- whether external works, preliminaries, or utilities should be included

Rules:
1. Keep the questions practical and QS-oriented.
2. Ask only ONE most valuable next question at a time.
3. If the brief is already good enough for a meaningful starter estimate, return needsClarification false.
4. This is for AI-led project setup, so think about both the bill structure and the concept cost plan.
5. Bias toward the information needed for a BCIS-style elemental build-up.
6. Return at most one question in the questions array.
7. Return JSON only.`,
  });

  const config = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        needsClarification: { type: Type.BOOLEAN },
        questions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["needsClarification", "questions"],
    },
  };

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, config));
    const fallback: AIClarification = { needsClarification: false, questions: [] };
    const parseResult = safeParseJson<AIClarification>(text, fallback, 'AI project setup analysis');
    if (parseResult.ok === false) return err(parseResult.error);
    return ok(parseResult.data);
  } catch (e) {
    console.error('AI project setup analysis error', e);
    return err(e instanceof Error ? e.message : 'AI project setup analysis failed.');
  }
}

export async function generateAiProjectSetup(
  projectName: string,
  prompt: string,
  drawingBasis: CostPlanDrawingBasis,
  history: string[] = []
): Promise<Result<{
  summary?: string;
  confidenceSummary?: string;
  assumptions?: string[];
  bills: Array<{
    name: string;
    sections: Array<{
      name: string;
      notes?: string;
      items: Array<{
        type: ItemType;
        description: string;
        unit?: UnitType | string;
        quantity?: number;
        estimatedRate?: number;
      }>;
    }>;
  }>;
  costPlanLines: Array<{
    title: string;
    notes?: string;
    baseValue: number;
    lowValue: number;
    highValue: number;
    confidenceLabel: 'LOW' | 'MEDIUM' | 'HIGH';
    confidenceNote?: string;
    provenance?: string[];
  }>;
}>> {
  const basisLabel = drawingBasis === 'DETAILED_DRAWINGS'
    ? 'detailed drawings'
    : drawingBasis === 'OUTLINE_DRAWINGS'
      ? 'outline drawings'
      : 'no drawings';

  const parts: GeminiPart[] = [];
  if (history.length > 0) {
    parts.push({ text: `CONVERSATION HISTORY:\n${history.join('\n')}\n` });
  }
  parts.push({
    text: `Act as a senior UK Quantity Surveyor preparing an AI-led starter estimate.

Project name: "${projectName}"
Initial brief: "${prompt}"
Drawing basis: ${basisLabel}

Use the conversation history as the agreed briefing context.

Return BOTH:
1. A practical starter elemental bill / section structure with priced allowance items.
2. A client-facing elemental concept cost plan with ranges.

Rules for bills and sections:
1. Keep the structure concise and commercially useful for an early-stage estimate.
2. Prefer a single bill called "Elemental estimate" unless there is a very strong reason to split it.
3. Use BCIS-style elemental section headings where possible, such as substructure, superstructure, finishes, fittings, services, external works, preliminaries, and contingencies / risk-sensitive allowances.
4. Each section should contain 1 to 4 starter priced allowances, not a detailed BoQ.
5. Use item types from: GENERAL_HEADING, MAJOR_HEADING, SUB_SECTION, MINOR_HEADING, COMMENT, SUB_COMMENT, PRICED, PROVISIONAL_SUM, PC_SUM.
6. For priced items, give a realistic UK allowance rate in GBP.
7. Where the scope is still concept-level, quantity can be 1 and unit can be "Sum" so the rate represents the package allowance.
8. Use units only from: m, m2, m3, nr, kg, t, Sum, Hrs.
9. Keep the starter bill structure aligned directly with the elemental cost plan totals.
10. Do not return trade-package bills like separate groundworks / concrete / masonry bills unless the user explicitly asked for trade packaging.

Rules for the cost plan:
1. Build a concise BCIS-style elemental cost plan suitable for early client conversations.
2. Return one central baseValue plus lowValue and highValue for each line.
3. Use confidenceLabel as HIGH, MEDIUM, or LOW.
4. confidenceSummary should explain the overall certainty and what is driving the range.
5. assumptions should be a short list of key pricing assumptions in plain English.
6. provenance can contain short notes about what scope was grouped together.
7. Return JSON only.`,
  });

  const config = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, nullable: true },
        confidenceSummary: { type: Type.STRING, nullable: true },
        assumptions: {
          type: Type.ARRAY,
          nullable: true,
          items: { type: Type.STRING },
        },
        bills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    notes: { type: Type.STRING, nullable: true },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          type: {
                            type: Type.STRING,
                            enum: ["GENERAL_HEADING", "MAJOR_HEADING", "SUB_SECTION", "MINOR_HEADING", "COMMENT", "SUB_COMMENT", "PRICED", "PROVISIONAL_SUM", "PC_SUM"],
                          },
                          description: { type: Type.STRING },
                          unit: { type: Type.STRING, nullable: true },
                          quantity: { type: Type.NUMBER, nullable: true },
                          estimatedRate: { type: Type.NUMBER, nullable: true },
                        },
                        required: ["type", "description"],
                      },
                    },
                  },
                  required: ["name", "items"],
                },
              },
            },
            required: ["name", "sections"],
          },
        },
        costPlanLines: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              notes: { type: Type.STRING, nullable: true },
              baseValue: { type: Type.NUMBER },
              lowValue: { type: Type.NUMBER },
              highValue: { type: Type.NUMBER },
              confidenceLabel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
              confidenceNote: { type: Type.STRING, nullable: true },
              provenance: {
                type: Type.ARRAY,
                nullable: true,
                items: { type: Type.STRING },
              },
            },
            required: ['title', 'baseValue', 'lowValue', 'highValue', 'confidenceLabel'],
          },
        },
      },
      required: ['bills', 'costPlanLines'],
    },
  };

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, config));
    const parseResult = safeParseJson<{
      summary?: string;
      confidenceSummary?: string;
      assumptions?: string[];
      bills: Array<{
        name: string;
        sections: Array<{
          name: string;
          notes?: string;
          items: Array<{
            type: ItemType;
            description: string;
            unit?: UnitType | string;
            quantity?: number;
            estimatedRate?: number;
          }>;
        }>;
      }>;
      costPlanLines: Array<{
        title: string;
        notes?: string;
        baseValue: number;
        lowValue: number;
        highValue: number;
        confidenceLabel: 'LOW' | 'MEDIUM' | 'HIGH';
        confidenceNote?: string;
        provenance?: string[];
      }>;
    }>(text, { bills: [], costPlanLines: [] }, 'AI project setup');
    if (parseResult.ok === false) return err(parseResult.error);
    return ok({
      ...parseResult.data,
      bills: (parseResult.data.bills || []).map((bill) => ({
        ...bill,
        sections: (bill.sections || []).map((section) => ({
          ...section,
          items: (section.items || []).map((item) => ({
            ...item,
            unit: item.unit ? sanitizeUnit(item.unit) : UnitType.SUM,
          })),
        })),
      })),
    });
  } catch (e) {
    console.error('AI project setup error', e);
    return err(e instanceof Error ? e.message : 'AI project setup failed.');
  }
}

export async function generateAiConceptCostPlan(
  projectName: string,
  prompt: string,
  drawingBasis: CostPlanDrawingBasis,
  history: string[] = []
): Promise<Result<{
  title?: string;
  notes?: string;
  confidenceSummary?: string;
  assumptions?: string[];
  lines: Array<{
    title: string;
    notes?: string;
    baseValue: number;
    lowValue: number;
    highValue: number;
    confidenceLabel: 'LOW' | 'MEDIUM' | 'HIGH';
    confidenceNote?: string;
    provenance?: string[];
  }>;
}>> {
  const basisLabel = drawingBasis === 'DETAILED_DRAWINGS'
    ? 'detailed drawings'
    : drawingBasis === 'OUTLINE_DRAWINGS'
      ? 'outline drawings'
      : 'no drawings';

  const parts: GeminiPart[] = [];
  if (history.length > 0) {
    parts.push({ text: `CONVERSATION HISTORY:\n${history.join('\n')}\n` });
  }
  parts.push({
    text: `Act as a senior UK Quantity Surveyor preparing an elemental concept cost plan.

Project name: "${projectName}"
Initial brief: "${prompt}"
Drawing basis: ${basisLabel}

Use the conversation history as the agreed briefing context.

Rules:
1. Build a concise UK-style elemental cost plan suitable for an early client conversation.
2. Typical headings can include substructure, frame / upper floors, roof, external envelope, internal finishes, fittings, MEP services, preliminaries, external works, and contingency / risk-sensitive areas where appropriate.
3. Return one central baseValue plus lowValue and highValue for each line.
4. lowValue should reflect an optimistic but still realistic lower bound.
5. highValue should reflect a cautious but still realistic upper bound.
6. The ranges must reflect your confidence in the available information.
7. Use confidenceLabel as HIGH, MEDIUM, or LOW for each line.
8. confidenceSummary should explain the overall certainty and what is driving the range.
9. assumptions should be a short list of key pricing assumptions in plain English.
10. provenance can contain short notes such as "AI concept build-up from client brief".
11. Return JSON only.`,
  });

  const config = {
    responseMimeType: "application/json" as const,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, nullable: true },
        notes: { type: Type.STRING, nullable: true },
        confidenceSummary: { type: Type.STRING, nullable: true },
        assumptions: {
          type: Type.ARRAY,
          nullable: true,
          items: { type: Type.STRING },
        },
        lines: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              notes: { type: Type.STRING, nullable: true },
              baseValue: { type: Type.NUMBER },
              lowValue: { type: Type.NUMBER },
              highValue: { type: Type.NUMBER },
              confidenceLabel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
              confidenceNote: { type: Type.STRING, nullable: true },
              provenance: {
                type: Type.ARRAY,
                nullable: true,
                items: { type: Type.STRING },
              },
            },
            required: ['title', 'baseValue', 'lowValue', 'highValue', 'confidenceLabel'],
          },
        },
      },
      required: ['lines'],
    },
  };

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, config));
    const parseResult = safeParseJson<{
      title?: string;
      notes?: string;
      confidenceSummary?: string;
      assumptions?: string[];
      lines: Array<{
        title: string;
        notes?: string;
        baseValue: number;
        lowValue: number;
        highValue: number;
        confidenceLabel: 'LOW' | 'MEDIUM' | 'HIGH';
        confidenceNote?: string;
        provenance?: string[];
      }>;
    }>(text, { lines: [] }, 'AI concept cost plan');
    if (parseResult.ok === false) return err(parseResult.error);
    return ok(parseResult.data);
  } catch (e) {
    console.error('AI concept cost plan error', e);
    return err(e instanceof Error ? e.message : 'AI concept cost plan failed.');
  }
}

export async function refineDescriptionWithProduct(
  currentDesc: string,
  product: ProductSuggestion
): Promise<Result<string>> {
  const promptText = `Act as a senior Quantity Surveyor.

You are updating an existing BoQ line. Your goal is to preserve as much of the original text as possible and only change or add the minimum needed to incorporate the product specification.

Current description:
"${currentDesc}"

Selected product:
Name: ${product.name}
Manufacturer: ${product.manufacturer}
Details: ${product.description}

Requirements:
1. Keep any existing structure, clause wording, and measurement references unless they directly conflict with the selected product.
2. Insert or adjust wording to clearly specify the manufacturer and product, ideally as a short specification note within the description.
3. Do NOT remove useful content that is not directly about the product (e.g. measurement rules, references, ancillary requirements).
4. Output a single, professionally formatted SMM7/NRM2-compliant description.
5. Do not use markdown (no bullets, no **bold**). Just plain text.`;

  const parts: GeminiPart[] = [{ text: promptText }];
  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, {}));
    return ok(text || currentDesc);
  } catch (e) {
    console.error("Refine Description Error", e);
    return err(e instanceof Error ? e.message : "Refine description failed.");
  }
}

function buildWorkspaceQuestionContext(
  project: Project | null,
  libraries: ItemLibrary[],
  trades: TradePackage[],
  activeBillId?: string | null
): string {
  const projectSummary = project
    ? {
        name: project.name,
        client: project.client,
        location: project.location,
        reference: project.reference,
        measurementStandard: project.measurementStandard,
        ohpPercentage: project.ohpPercentage,
        activeBillId: activeBillId || null,
        bills: project.bills.map((bill) => ({
          id: bill.id,
          name: bill.name,
          sections: bill.sections.map((section) => ({
            id: section.id,
            name: section.name,
            pageCount: section.pages?.length || 0,
            itemCount: (section.pages?.length || 0) > 0
              ? (section.pages || []).reduce((acc, page) => acc + (page.items || []).length, 0)
              : (section.items || []).length,
            pricedValue: ((section.pages?.length || 0) > 0
              ? (section.pages || []).flatMap((page) => page.items || [])
              : (section.items || [])
            ).reduce((acc, item) => acc + (['PRICED', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type) ? (item.total || 0) : 0), 0),
          })),
        })),
        costPlan: project.costPlan
          ? {
              title: project.costPlan.title,
              source: project.costPlan.source,
              drawingBasis: project.costPlan.drawingBasis,
              contingencyPercentage: project.costPlan.contingencyPercentage,
              lineCount: project.costPlan.lines.length,
            }
          : null,
      }
    : null;

  const workspaceSummary = {
    libraryCount: libraries.length,
    libraries: libraries.slice(0, 8).map((library) => ({
      name: library.name,
      folderCount: library.folders.length,
    })),
    tradeCount: trades.length,
    trades: trades.slice(0, 12).map((trade) => ({
      name: trade.name,
      contractorCount: trade.contractors.length,
      winnerId: trade.winnerId || null,
    })),
  };

  return JSON.stringify({ project: projectSummary, workspace: workspaceSummary }, null, 2);
}

export async function askWorkspaceQuestion(
  question: string,
  project: Project | null,
  libraries: ItemLibrary[],
  trades: TradePackage[],
  activeBillId?: string | null
): Promise<Result<string>> {
  const context = buildWorkspaceQuestionContext(project, libraries, trades, activeBillId);
  const parts: GeminiPart[] = [{
    text: `Act as a senior UK Quantity Surveyor's project assistant.

You must answer using only the workspace data below. If the answer is not supported by the data, say that clearly and state what is missing.
Keep the answer concise, practical, and commercially useful.
Use GBP terminology and UK construction wording where relevant.

WORKSPACE DATA:
${context}

QUESTION:
${question}

Return plain text only.`,
  }];

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, parts, {}));
    return ok(text || 'No answer available.');
  } catch (e) {
    console.error('Workspace question error', e);
    return err(e instanceof Error ? e.message : 'Workspace question failed.');
  }
}

export async function generateAppraisalExecutiveSummary(
  context: unknown,
  files: { mimeType: string; data: string }[] = [],
  aiSettings?: AppSettings['ai']
): Promise<Result<string>> {
  const promptText = (includeFiles: boolean) => `Act as a senior UK development QS preparing a professional appraisal final report executive summary.

Use only the appraisal data, notes, attachment evidence, and metrics provided below. Do not invent facts or unsupported market commentary.
Write concise report-ready prose with these headings:
Overview
Sales prices and basis
Costs and abnormals
GDV improvement considerations
Summary and recommendation

Cover:
- the appraisal position, indexed GDV/GSV, total costs, residual land value, profit and profit on GDV/GSV
- how the sales prices are arrived at, using house price notes and extracted pricing evidence where available; explain base sales plus sales index uplift equals indexed sales/GDV where indexation is applied
- where an architect feasibility layout or plan is supplied, use it as visual evidence of the site arrangement, capacity, access, parking, open space, constraints and development form where those points are clear from the layout; reconcile it with the live appraisal inputs and do not describe the upload itself
- recommendations or considerations for improving GDV from the house-price evidence, such as mix, specification, premium plots, outlook, parking, incentives, or tenure assumptions where supported by the evidence
- where GDV improvement may require changing house type, GIFA, specification, density, or tenure mix, explain that construction cost, prelims, infrastructure, plot works, ASHP/EV allowances, and programme should also be re-tested
- costs and abnormals, distinguishing known costs, estimated costs, and unknown / information-required costs; explain the rationale rather than saying only that a report or quote exists
- the constructionCostBasis block defines the live construction index treatment. Base house-type and site-work costs are intentionally held at their own trade/base indices, while all valid index movement to the expected site-start index is carried once in construction contingency. Never describe the base costs and indexed reference values as a construction-cost discrepancy, mismatch, gap, or reconciliation issue. Only raise a genuine discrepancy when the supplied appraisal data explicitly identifies one that is unrelated to this index treatment.
- any negative residual land adjustment to zero
- any likely seller land price scenario if provided
- one concise recommendation paragraph only, focused on the appraisal conclusion and residual land value. Do not recommend next steps, further actions, issue checks, or regeneration.

Section-specific requirements:
- "Sales prices and basis" must be a coherent explanation of how the live sales schedule has been formed, not a summary of an attachment. Treat the pricing report as the primary sales-evidence source. For every live house type (or a clearly named group where the report applies the same evidence and rate), state the quantity, GIFA/measurement basis, base price and rate, and the specific pricing indicators used by the evidence: for example comparable evidence, local demand, plot position, parking, outlook, specification, tenure or incentives. Explain any adjustment from that evidence and the resulting indexed value where indexation applies. If the pricing report does not support a distinction for a particular type, say exactly that; never invent a comparable, premium or market indicator. Use short labelled paragraphs or bullets by house type, followed by a concise schedule-level explanation of indexation. Do not reproduce a contents list, document opening, repeated headings, page references, or a long quotation/extract.
- "GDV improvement considerations" must be an appraisal-specific commercial analysis, not generic advice. Use every relevant data block: the house-type commercial signals, sales schedule, construction costs, site costs/abnormals, programme, layout/design evidence, constraints and consents, and the pricing evidence. Give only concrete recommendations for this site. Each recommendation must name the relevant current house type, plot/layout feature, pricing indicator or recorded constraint and explain both the potential GDV rationale and the linked cost, programme, planning or delivery trade-off. Do not write generic statements such as "consider the mix" or "review parking" without applying them to a named feature in the appraisal evidence. The houseTypeCommercialSignals are indicators only, not final profit by type; never represent them as final project profitability. If the evidence is not detailed enough to support a site-specific recommendation, say which specific evidence is missing and limit the recommendation to a clearly framed test.
- Keep both of those sections below 350 words each. Never paste raw extracted text into either section, even if it is readable.

The documentaryEvidence block contains readable extracts from all evidence recorded in this appraisal. Treat it as substantive source material, not as a list of attachments. Draw out the material figures, scope constraints, market evidence, design assumptions, quantities, rates, risks and stated qualifications that support the report conclusion. Where a document extract supports a cost, sales or abnormal assumption, explain the resulting appraisal logic in sufficient detail for a reader to understand how the figure has been assessed. Reconcile it against the live appraisal data and paraphrase it; do not repeat it verbatim. Do not mention filenames, uploads, documents, attachments, systems, AI, Gemini, ChatGPT, prompts or models in the report.

Recommendation rules:
- Profit on GDV/GSV over 18% should normally be recommended.
- Profit on GDV/GSV from 12% to 18% should be described as "Consider depending on requirement".
- Profit on GDV/GSV under 12% should not be recommended unless the land can be obtained at a discount or substantial discount sufficient to restore the return.
- Use judgement where the residual land value is negative or where abnormal costs are uncertain, and explain the commercial reason.

Write complete sentences with punctuation. Do not say "see report", "the quote says", "the attached report", or rely on filenames. Summarise the substance of readable extracted evidence into the logic for the conclusion. Do not output raw extracted text if it appears corrupted, binary, or illegible. If extraction is not readable, rely on the entered value, linked source and recorded notes without printing the corrupt extract.

${includeFiles ? 'Attached files are provided where possible. If a file cannot be interpreted, rely on the entered values and notes in the appraisal data.' : 'Attached file content is not included. Use notes and extracted appraisal data only.'}

APPRAISAL DATA:
${JSON.stringify(context, null, 2)}

Return plain text only.`;

  const buildParts = (includeFiles: boolean): GeminiPart[] => {
    const parts: GeminiPart[] = [];
    if (includeFiles) {
      files.forEach((file) => {
        parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
      });
    }
    parts.push({
      text: promptText(includeFiles),
    });
    return parts;
  };

  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(promptText(false), aiSettings);
      if (localResult.ok) return localResult;
      if (aiSettings.providerMode === 'LOCAL_LM_STUDIO') return localResult;
    }
  }

  try {
    const text = await runWithRetry(() => generateContentText(modelForAnalysis(files.length > 0), buildParts(true), {}));
    return ok(text || 'No executive summary generated.');
  } catch (e) {
    if (files.length > 0) {
      try {
        const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, buildParts(false), {}), 1);
        return ok(text || 'No executive summary generated.');
      } catch (retryError) {
        console.error('Appraisal executive summary retry error', retryError);
      }
    }
    console.error('Appraisal executive summary error', e);
    return err(e instanceof Error ? e.message : 'Appraisal executive summary failed.');
  }
}

export type CommercialRevenueAssessmentResult = {
  rentRate: number;
  yieldPercent: number;
  voidPercent: number;
  annualRent: number;
  summary: string;
};

export type CommercialRevenueGuidanceStepResult = CommercialRevenueAssessmentResult & {
  needsClarification: boolean;
  question: string;
};

export type CommercialScopeGuidanceStepResult = {
  needsClarification: boolean;
  question: string;
  proposedMeasures: Record<string, number>;
  summary: string;
};

export type CommercialSiteScopeGuidanceStepResult = {
  needsClarification: boolean;
  question: string;
  summary: string;
};

export type CommercialAssetAssessmentResult = {
  needsClarification: boolean;
  question: string;
  summary: string;
  assets: Array<{
    title: string;
    description: string;
    included: boolean;
    revenueModel: 'LEASE' | 'OWNER_OPERATED' | 'CONCESSION' | 'SALE' | 'OTHER';
    siteAllocationM2: number;
    annualIncome: number;
    operatingCostPercent: number;
    revenueGrowthPercent: number;
    lifecycleCapexPercent: number;
    exitYieldPercent: number;
    sellingCostsPercent: number;
    developmentCost: number;
    costTitle: string;
    rationale: string;
    excludedReason: string;
  }>;
  proposedMeasures: Record<string, number>;
  siteWideCosts: Array<{
    title: string;
    category: AppraisalCostCategory;
    amount: number;
    notes: string;
  }>;
  durationMonths?: number;
  financeAnnualRatePercent?: number;
  annualOperatingCostPercent?: number;
  annualRevenueGrowthPercent?: number;
  annualCostInflationPercent?: number;
  annualLifecycleCapexPercent?: number;
  exitYieldPercent?: number;
  sellingCostsPercent?: number;
};

export type CommercialLifecycleAssessmentResult = {
  operatingCostPercent: number;
  revenueGrowthPercent: number;
  costInflationPercent: number;
  lifecycleCapexPercent: number;
  exitYieldPercent: number;
  sellingCostsPercent: number;
  summary: string;
};

export async function generateAppraisalReportNoteRewrite(
  input: {
    section: string;
    notes: string;
    extractedText?: string;
    appraisalName?: string;
  },
  aiSettings?: AppSettings['ai']
): Promise<Result<string>> {
  const prompt = `Act as a senior UK development QS writing a concise final appraisal report paragraph.

Rewrite the notes below into professional report prose for the "${input.section}" section.

Rules:
- Use only the supplied notes and extracted text.
- Do not mention filenames, uploads, attachments, "the report says", or "see report".
- Do not add recommendations or next steps.
- Do not invent values, facts, or market commentary.
- Keep it to one short paragraph, normally 1-3 sentences.
- Use complete sentences and punctuation.
- If the notes are brief, preserve their meaning and make the wording report-ready.
- If extracted text is illegible or irrelevant, ignore it.

APPRAISAL:
${input.appraisalName || ''}

NOTES:
${input.notes || ''}

EXTRACTED TEXT:
${input.extractedText || ''}

Return plain text only.`;

  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok && localResult.data.trim()) return ok(localResult.data.trim());
      if (aiSettings.providerMode === 'LOCAL_LM_STUDIO') return localResult;
    }
  }

  if (!aiSettings || aiSettings.providerMode === 'AUTO' || aiSettings.providerMode === 'GEMINI') {
    try {
      await ensureConfigured();
      const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {}));
      return ok((text || '').trim());
    } catch (e) {
      console.error('Appraisal report note rewrite error', e);
      return err(e instanceof Error ? e.message : 'Appraisal note rewrite failed.');
    }
  }

  return err('No AI provider available for appraisal note rewrite.');
}

export type HouseTypeCostAssessmentResult = {
  costPerM2: number;
  totalCost: number;
  buildMonths: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  costBreakdown?: Array<{
    key?: string;
    label: string;
    amount: number;
    included?: boolean;
    notes?: string;
    detailRows?: Array<{
      label: string;
      quantity: number;
      unit: string;
      rate: number;
      total: number;
      basis?: string;
      included?: boolean;
    }>;
  }>;
};

export type HouseTypeCostGuidanceStepResult = HouseTypeCostAssessmentResult & {
  needsClarification: boolean;
  question: string;
  houseTypeName?: string;
  constructionQuantity?: number;
  constructionQuantityLabel?: string;
  salesQuantity?: number;
  salesQuantityLabel?: string;
  salesRows?: Array<{
    id?: string;
    label: string;
    quantity: number;
    gifaM2: number;
    saleValuePerUnit?: number;
    saleRatePerM2?: number;
    notes?: string;
  }>;
  gifaM2?: number;
  quantitySeparationNotes?: string;
};

function optionalPositiveNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function optionalCleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeGuidanceSalesRows(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const rows = value
    .map((entry, index) => {
      const source = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
      const quantity = optionalPositiveNumber(source.quantity) || 0;
      const gifaM2 = optionalPositiveNumber(source.gifaM2) || 0;
      const label = optionalCleanString(source.label) || `Sale unit ${index + 1}`;
      if (quantity <= 0 || gifaM2 <= 0) return null;
      return {
        id: optionalCleanString(source.id),
        label,
        quantity,
        gifaM2,
        saleValuePerUnit: optionalPositiveNumber(source.saleValuePerUnit) || 0,
        saleRatePerM2: optionalPositiveNumber(source.saleRatePerM2) || 0,
        notes: optionalCleanString(source.notes) || '',
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  return rows.length ? rows : undefined;
}

function normalizeHouseTypeAssessmentDetailRows(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const rows = value
    .map((entry) => {
      const source = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
      const label = optionalCleanString(source.label);
      const quantity = optionalPositiveNumber(source.quantity) || 0;
      const rate = optionalPositiveNumber(source.rate) || 0;
      const total = optionalPositiveNumber(source.total) || (quantity > 0 && rate > 0 ? quantity * rate : 0);
      if (!label || total <= 0) return null;
      return {
        label,
        quantity,
        unit: optionalCleanString(source.unit) || 'item',
        rate: rate > 0 ? rate : total / Math.max(1, quantity || 1),
        total: Math.round(total),
        basis: optionalCleanString(source.basis) || '',
        included: source.included === false ? false : true,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  return rows.length ? rows : undefined;
}

function normalizeHouseTypeAssessmentBreakdown(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const rows = value
    .map((entry) => {
      const source = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
      const amount = optionalPositiveNumber(source.amount) || 0;
      const label = optionalCleanString(source.label);
      if (!label || amount <= 0) return null;
      return {
        key: optionalCleanString(source.key),
        label,
        amount: Math.round(amount),
        included: source.included === false ? false : true,
        notes: optionalCleanString(source.notes) || '',
        detailRows: normalizeHouseTypeAssessmentDetailRows(source.detailRows),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  return rows.length ? rows : undefined;
}

function normalizeHouseTypeCostAssessment(
  result: HouseTypeCostAssessmentResult,
  context: unknown
): HouseTypeCostAssessmentResult {
  const record = context && typeof context === 'object' ? context as Record<string, unknown> : {};
  const custom = record.customHouseType && typeof record.customHouseType === 'object'
    ? record.customHouseType as Record<string, unknown>
    : {};
  const resultRecord = result && typeof result === 'object' ? result as Record<string, unknown> : {};
  const resultGifaM2 = Number(resultRecord.gifaM2);
  const contextGifaM2 = Number(custom.gifaM2);
  const gifaM2 = Number.isFinite(resultGifaM2) && resultGifaM2 > 0 ? resultGifaM2 : contextGifaM2;
  const parsedRate = Number(result.costPerM2);
  const costPerM2 = Number.isFinite(parsedRate) && parsedRate > 0 ? Math.round(parsedRate) : 0;
  const parsedTotal = Number(result.totalCost);
  const totalCost = Number.isFinite(parsedTotal) && parsedTotal > 0
    ? Math.round(parsedTotal)
    : Math.round(costPerM2 * (Number.isFinite(gifaM2) ? Math.max(0, gifaM2) : 0));
  const parsedMonths = Number(result.buildMonths);
  const buildMonths = Number.isFinite(parsedMonths) && parsedMonths > 0 ? Math.max(1, Math.round(parsedMonths)) : 4;
  const confidence = ['LOW', 'MEDIUM', 'HIGH'].includes(String(result.confidence)) ? result.confidence : 'MEDIUM';
  return {
    costPerM2,
    totalCost,
    buildMonths,
    confidence,
    summary: typeof result.summary === 'string' && result.summary.trim()
      ? result.summary.trim()
      : 'The custom house type has been assessed using the closest standard house type comparables and available market context.',
    costBreakdown: normalizeHouseTypeAssessmentBreakdown((result as { costBreakdown?: unknown }).costBreakdown),
  };
}

function normalizeHouseTypeCostGuidanceStep(
  result: HouseTypeCostGuidanceStepResult,
  context: unknown
): HouseTypeCostGuidanceStepResult {
  const needsClarification = result.needsClarification === true;
  if (needsClarification) {
    const question = typeof result.question === 'string' && result.question.trim()
      ? result.question.trim()
      : 'What specification, construction form, or abnormal feature most affects this custom house type cost?';
    if (/\b(style|configuration|house\s*type)\b/i.test(question)) {
      const record = guidedCostContextRecord(context);
      const custom = guidedCostNestedRecord(record, 'customHouseType');
      const answers = guidedCostAnswers(record);
      const inferredBasics = guidedCostInferBasics(
        guidedCostText(custom.guidedConstructionDescription),
        guidedCostText(custom.guidedSalesDescription),
        answers.map((entry) => `${entry.question} ${entry.answer}`).join('\n')
      );
      if (inferredBasics.style && inferredBasics.configuration) {
        return buildHouseTypeGuidanceFallback(context, 'The AI asked for a style already implied by the descriptions.');
      }
    }
    return {
      needsClarification: true,
      question,
      costPerM2: 0,
      totalCost: 0,
      buildMonths: 0,
      confidence: 'LOW',
      summary: '',
    };
  }
  const assessment = normalizeHouseTypeCostAssessment(result, context);
  return {
    ...assessment,
    needsClarification: false,
    question: '',
    houseTypeName: optionalCleanString(result.houseTypeName),
    constructionQuantity: optionalPositiveNumber(result.constructionQuantity),
    constructionQuantityLabel: optionalCleanString(result.constructionQuantityLabel),
    salesQuantity: optionalPositiveNumber(result.salesQuantity),
    salesQuantityLabel: optionalCleanString(result.salesQuantityLabel),
    salesRows: normalizeGuidanceSalesRows(result.salesRows),
    gifaM2: optionalPositiveNumber(result.gifaM2),
    quantitySeparationNotes: optionalCleanString(result.quantitySeparationNotes),
  };
}

function guidedCostContextRecord(context: unknown) {
  return context && typeof context === 'object' ? context as Record<string, unknown> : {};
}

function guidedCostNestedRecord(record: Record<string, unknown>, key: string) {
  return record[key] && typeof record[key] === 'object' ? record[key] as Record<string, unknown> : {};
}

function guidedCostText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function guidedCostNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function guidedCostAnswers(record: Record<string, unknown>) {
  const history = Array.isArray(record.guidedQuestionAnswerHistory) ? record.guidedQuestionAnswerHistory : [];
  return history
    .map((entry) => entry && typeof entry === 'object' ? entry as Record<string, unknown> : {})
    .map((entry) => ({
      question: guidedCostText(entry.question),
      answer: guidedCostText(entry.answer),
    }))
    .filter((entry) => entry.question || entry.answer);
}

function guidedCostInferQuantity(text: string, labels: string[]) {
  const normalized = text.toLowerCase();
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const before = normalized.match(new RegExp(`(\\d+)\\s+(?:\\w+\\s+){0,2}${escaped}s?\\b`));
    if (before) return Number(before[1]);
    const after = normalized.match(new RegExp(`${escaped}s?\\s+(?:of\\s+)?(\\d+)\\b`));
    if (after) return Number(after[1]);
  }
  const firstNumber = normalized.match(/\b(\d+)\b/);
  return firstNumber ? Number(firstNumber[1]) : 0;
}

function guidedCostInferAreaM2(text: string) {
  const normalized = text.toLowerCase().replace(/,/g, '');
  const explicitArea = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:m2|sq\s*m|sqm|square\s*metres?|square\s*meters?)\b/);
  if (explicitArea) return Number(explicitArea[1]);
  const gifaArea = normalized.match(/\b(?:gifa|gia|floor\s*area|gross\s*internal\s*floor\s*area)\D{0,24}(\d+(?:\.\d+)?)\b/);
  return gifaArea ? Number(gifaArea[1]) : 0;
}

function guidedCostInferSaleFlatAreaM2(text: string) {
  const normalized = text.toLowerCase().replace(/,/g, '');
  const flatOfArea = normalized.match(/\b(?:flat|flats|apartment|apartments)\s+(?:of|at)\s+(\d+(?:\.\d+)?)\s*(?:m2|sq\s*m|sqm|square\s*metres?|square\s*meters?)\b/);
  if (flatOfArea) return Number(flatOfArea[1]);
  const areaFlat = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:m2|sq\s*m|sqm|square\s*metres?|square\s*meters?)\s+(?:flat|flats|apartment|apartments)\b/);
  return areaFlat ? Number(areaFlat[1]) : 0;
}

function guidedCostInferFlatLevelQuantity(text: string, levelPattern: string): number {
  const patterns = [
    new RegExp(`\\b(\\d+)\\s*(?:nr|no\\.?|number)?\\s*(?:of\\s+)?(?:${levelPattern})(?:\\s+floor)?\\s*(?:flat|flats|apartment|apartments)?\\b`, 'i'),
    new RegExp(`\\b(\\d+)\\s+(?:on\\s+(?:the\\s+)?)?(?:${levelPattern})(?:\\s+floor)?\\b`, 'i'),
    new RegExp(`\\b(?:${levelPattern})(?:\\s+floor)?\\s*(?:flat|flats|apartment|apartments)?\\D{0,16}(\\d+)\\b`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match ? Number(match[1]) : 0;
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function guidedCostInferFlatLevelQuantities(text: string, salesQuantity: number) {
  const ground = guidedCostInferFlatLevelQuantity(text, 'gf|ground(?:\\s+floor)?');
  const mid = guidedCostInferFlatLevelQuantity(text, 'mid(?:dle)?(?:\\s+floor)?');
  const top = guidedCostInferFlatLevelQuantity(text, 'top(?:\\s+floor)?|upper(?:\\s+floor)?');
  const explicitTotal = ground + mid + top;
  if (ground > 0 && mid > 0 && top > 0) {
    const scale = explicitTotal > 0 && explicitTotal < salesQuantity && salesQuantity % explicitTotal === 0
      ? salesQuantity / explicitTotal
      : 1;
    return { ground: Math.round(ground * scale), mid: Math.round(mid * scale), top: Math.round(top * scale) };
  }
  const mentionsAllLevels = /\b(gf|ground(?:\s+floor)?)\b/i.test(text)
    && /\bmid(?:dle)?(?:\s+floor)?\b/i.test(text)
    && /\b(top(?:\s+floor)?|upper(?:\s+floor)?)\b/i.test(text);
  const impliesThreeFloors = /\b(?:3|three)[-\s]*storey\b/i.test(text)
    || /\b(?:3|three)\s+floors?\b/i.test(text)
    || /\bper\s+floor\b/i.test(text);
  if (!mentionsAllLevels && !impliesThreeFloors) return null;
  const equalQuantity = Math.max(1, Math.round(salesQuantity / 3));
  return { ground: equalQuantity, mid: equalQuantity, top: Math.max(0, salesQuantity - equalQuantity * 2) };
}

function guidedCostInferFlatSalesRows(text: string, salesQuantity: number, fallbackGifaM2 = 0) {
  const normalized = text.toLowerCase().replace(/,/g, '');
  if (!/\b(flat|flats|apartment|apartments)\b/.test(normalized) || salesQuantity <= 1) return undefined;
  const levelQuantities = guidedCostInferFlatLevelQuantities(normalized, salesQuantity);
  if (!levelQuantities) return undefined;
  const gifaM2 = guidedCostInferSaleFlatAreaM2(normalized) || fallbackGifaM2 || guidedCostInferAreaM2(normalized);
  if (gifaM2 <= 0) return undefined;
  return [
    { label: 'Ground floor flat', quantity: levelQuantities.ground, gifaM2, notes: '' },
    { label: 'Mid floor flat', quantity: levelQuantities.mid, gifaM2, notes: '' },
    { label: 'Top floor flat', quantity: levelQuantities.top, gifaM2, notes: '' },
  ].filter((row) => row.quantity > 0);
}

function guidedCostInferBasics(constructionDescription: string, salesDescription: string, answerText = '') {
  const combined = `${constructionDescription}\n${salesDescription}\n${answerText}`.toLowerCase();
  if (/\b(flat|flats|apartment|apartments)\b/.test(combined) || /\bblock\b/.test(combined)) {
    return {
      houseTypeName: 'Block of flats',
      style: 'FLAT',
      configuration: 'OTHER',
      constructionQuantityLabel: 'block',
      salesQuantityLabel: 'flat',
    };
  }
  if (/\b(mid\s*terrace|end\s*terrace|terrace|terraced)\b/.test(combined)) {
    return {
      houseTypeName: 'Terrace housing',
      style: 'TERRACE',
      configuration: 'TERRACE',
      constructionQuantityLabel: 'unit',
      salesQuantityLabel: 'house',
    };
  }
  if (/\b(bungalow|bungalows)\b/.test(combined)) {
    return {
      houseTypeName: 'Bungalow',
      style: 'BUNGALOW',
      configuration: 'OTHER',
      constructionQuantityLabel: 'unit',
      salesQuantityLabel: 'house',
    };
  }
  return {
    houseTypeName: '',
    style: '',
    configuration: '',
    constructionQuantityLabel: '',
    salesQuantityLabel: '',
  };
}

function buildHouseTypeGuidanceFallback(context: unknown, reason = ''): HouseTypeCostGuidanceStepResult {
  const record = guidedCostContextRecord(context);
  const custom = guidedCostNestedRecord(record, 'customHouseType');
  const comparable = guidedCostNestedRecord(record, 'fallbackComparableAssessment');
  const answers = guidedCostAnswers(record);
  const answeredText = answers.map((entry) => `${entry.question} ${entry.answer}`).join('\n');
  const constructionDescription = guidedCostText(custom.guidedConstructionDescription);
  const salesDescription = guidedCostText(custom.guidedSalesDescription);
  const combinedConstruction = `${constructionDescription}\n${answeredText}`;
  const combinedSales = `${salesDescription}\n${answeredText}`;
  const combined = `${combinedConstruction}\n${combinedSales}`;
  const inferredBasics = guidedCostInferBasics(constructionDescription, salesDescription, answeredText);
  const customName = guidedCostText(custom.name);
  const customGifa = guidedCostNumber(custom.gifaM2);
  const customLooksDefault = customName === 'Manual house type' && customGifa === 90;
  const gifaM2 = Math.max(0, customLooksDefault ? guidedCostInferAreaM2(combined) || customGifa : customGifa || guidedCostInferAreaM2(combined));
  const hasStyleAndConfiguration = Boolean(
    (guidedCostText(custom.style) || inferredBasics.style)
    && (guidedCostText(custom.configuration) || inferredBasics.configuration)
  );
  const asked = new Set(answers.map((entry) => entry.question));
  const questions = [
    !constructionDescription
      ? 'Describe the construction item that should be costed, for example one block of flats, a terrace block, or a bespoke house type.'
      : '',
    !salesDescription
      ? 'Describe the sales units that will be sold from this construction item, for example 12 flats, 6 townhouses, or one private house.'
      : '',
    gifaM2 <= 0
      ? 'What gross internal floor area should be costed per construction unit, in m2?'
      : '',
    !hasStyleAndConfiguration
      ? 'What is the intended style and configuration, for example block of flats, detached villa, semi-detached, bungalow, mid terrace, or end terrace?'
      : '',
    !guidedCostText(custom.storeys) || !guidedCostText(custom.bedrooms)
      ? 'How many storeys and bedrooms should be assumed, or what is the approximate unit mix?'
      : '',
    'What specification level should be assumed for the construction, finishes, MEP, heating system, renewables, and kitchen/bathroom fit-out?',
    'Is there anything unusual about the design, construction method, access, structure, envelope, or services that should increase or reduce the house cost?',
  ].filter(Boolean);
  const nextQuestion = questions.find((question) => !asked.has(question));
  if (nextQuestion && (answers.length < 4 || gifaM2 <= 0)) {
    return {
      needsClarification: true,
      question: nextQuestion,
      costPerM2: 0,
      totalCost: 0,
      buildMonths: 0,
      confidence: 'LOW',
      summary: '',
    };
  }

  const isFlatBlock = inferredBasics.houseTypeName === 'Block of flats';
  const constructionQuantityLabel = inferredBasics.constructionQuantityLabel || guidedCostText(custom.constructionQuantityLabel) || 'unit';
  const salesQuantityLabel = inferredBasics.salesQuantityLabel || guidedCostText(custom.salesQuantityLabel) || 'sale unit';
  const constructionQuantity = Math.max(1, guidedCostInferQuantity(combinedConstruction, [constructionQuantityLabel, 'block', 'unit', 'house']) || guidedCostNumber(custom.quantity) || 1);
  const salesQuantity = Math.max(1, guidedCostInferQuantity(combinedSales, [salesQuantityLabel, 'flat', 'apartment', 'house', 'plot', 'unit']) || guidedCostNumber(custom.salesQuantity) || constructionQuantity);
  const salesRows = guidedCostInferFlatSalesRows(combinedSales, salesQuantity, guidedCostInferAreaM2(combinedSales));
  const costPerM2 = Math.max(0, Math.round(guidedCostNumber(comparable.costPerM2) || guidedCostNumber(custom.buildCostPerM2)));
  const totalCost = Math.round(costPerM2 * gifaM2);
  const comparables = Array.isArray(comparable.comparables)
    ? comparable.comparables.map((entry) => String(entry)).filter(Boolean).slice(0, 3)
    : [];
  const reasonText = reason ? ` The AI route was unavailable (${reason}), so this is a provisional fallback assessment.` : '';
  return {
    needsClarification: false,
    question: '',
    costPerM2,
    totalCost,
    buildMonths: Math.max(1, Math.round(guidedCostNumber(custom.buildPeriodMonths) || 4)),
    confidence: 'LOW',
    summary: `The construction and sales bases have been interpreted from the descriptions and guided answers.${reasonText} The provisional rate uses the current internal house type comparables${comparables.length ? `, including ${comparables.join(', ')}` : ''}, and should be reviewed before being relied on. The construction basis is ${constructionQuantity} ${constructionQuantityLabel}${constructionQuantity === 1 ? '' : 's'} and the sales basis is ${salesRows?.length ? salesRows.map((row) => `${row.quantity} ${row.label}`).join(', ') : `${salesQuantity} ${salesQuantityLabel}${salesQuantity === 1 ? '' : 's'}`}.`,
    houseTypeName: customName && customName !== 'Manual house type'
      ? customName
      : inferredBasics.houseTypeName || (isFlatBlock ? 'Block of flats' : 'Custom house type'),
    constructionQuantity,
    constructionQuantityLabel,
    salesQuantity,
    salesQuantityLabel,
    salesRows,
    gifaM2,
    quantitySeparationNotes: [
      constructionDescription ? `Construction basis: ${constructionDescription}` : '',
      salesDescription ? `Sales basis: ${salesDescription}` : '',
      answers.length ? `Guided answers: ${answers.map((entry) => `${entry.question} ${entry.answer}`).join(' ')}` : '',
    ].filter(Boolean).join('\n'),
  };
}

export async function generateHouseTypeCostAssessment(
  context: unknown,
  aiSettings?: AppSettings['ai']
): Promise<Result<HouseTypeCostAssessmentResult>> {
  const fallback: HouseTypeCostAssessmentResult = {
    costPerM2: 0,
    totalCost: 0,
    buildMonths: 4,
    confidence: 'LOW',
    summary: '',
  };
  const prompt = `Act as a senior UK residential development Quantity Surveyor.

Assess a cautious build cost for a custom house type in a house-building appraisal.
Use the supplied custom house type inputs, current standard house type library data, and appraisal context. Where available, use current online construction market context for comparable UK/Scottish residential build costs, specification pressure, labour/material inflation, and new-build housing delivery risk. Do not invent specific live comparables.

Rules:
- The primary answer is a build cost per m2 for the house type and a total cost per unit.
- Also return a component costBreakdown with editable QS cost rows. Use the available component keys in the context where possible, and make the included component amounts sum to the totalCost.
- You may clear the preset component structure and return any QS cost rows you think are appropriate. The app will use your returned costBreakdown list directly. Use a known key where it genuinely fits, otherwise use key "CUSTOM_ALLOWANCE" with a clear row label.
- Do not pad the build-up with preset rows that are not relevant. A concise first-principles list is better than forcing costs into the standard library headings.
- For each costBreakdown row, include detailRows where possible. detailRows should be measured build-up lines with label, quantity, unit, rate, total, basis and included. Use real QS measurement logic where possible, e.g. foundation linear metres, slab area, pipe lengths, chambers, service duct route lengths, roof area, number of kitchens/flats, wet rooms, doors, or common-area GIFA.
- The parent costBreakdown amount should equal the sum of its included detailRows unless the row is intentionally a single allowance, in which case provide one detail row explaining the basis.
- Respect customHouseType.aiCostingBasis. If it is FIRST_PRINCIPLES, do not use current standard library comparables or component amounts to set the cost level; price from first principles using QS judgement, current market context, specification, GIFA, structure, MEP, access, and risk. You may still use the listed component keys as editable row names.
- If customHouseType.aiCostingBasis is USE_LIBRARY_WHERE_SUITABLE, treat the current standard library comparables and their component rows as optional reference evidence only. Use them only where they are genuinely suitable comparables. If the custom house type is materially different, such as a block of flats/apartments, price from first principles and explain why the library data has limited relevance.
- Adjust for GIFA, style, configuration, storeys, bedrooms, garage/private drive, tenure, comments, and any abnormal specification clues.
- For flats/apartment blocks, explicitly test for and price likely non-standard house-library items, including passenger lift and lift shaft, precast/common stairs, handrails/balustrades, landlord/common lighting and power, door entry/access control, fire alarms, smoke ventilation, fire stopping, fire compartmentation, acoustic separation, communal corridors/stairwell finishes, cycle/refuse stores inside the building, ASHPs, and EV infrastructure where described.
- For flats/apartment blocks, assess groundworks/substructure against the building footprint or ground-floor slab area where this can be inferred, not against total multi-storey GIFA. Put upper-floor/common-area requirements into their own component rows.
- Use explicit component keys for non-standard apartment/block items where relevant: LIFT, COMMON_STAIRS, HANDRAILS_BALUSTRADES, LANDLORD_LIGHTING, DOOR_ENTRY_ACCESS, SMOKE_VENT_FIRE_ALARM, ACOUSTIC_COMPARTMENTATION, COMMUNAL_FINISHES, and REFUSE_CYCLE_STORES.
- If a non-standard item has no exact component key, allocate it to the nearest available editable component key and explain the allocation in notes. Do not omit a cost simply because it is not in the standard house library. Do not hide lift, stair, landlord lighting, fire/acoustic, or communal finish allowances inside generic library rows if an explicit row is available.
- If online evidence is thin or unavailable and the standard library is not a good comparable, use a cautious QS first-principles allowance and say so.
- Before pricing, confirm or infer key cost drivers. If they are missing and materially affect cost, ask a clarification question instead of guessing. Key drivers include construction form (timber kit, masonry/brick/block, steel frame, concrete frame), lift/no lift, common stairs, landlord lighting/power, fire/acoustic requirements, ASHP, EV chargers, PV, specification level, and exclusions already counted elsewhere.
- Do not include land, infrastructure, plot works, prelims, sales, finance, overhead/profit, or abnormals unless explicitly described as part of the house type itself.
- Keep the summary to 3 to 5 complete sentences with punctuation.
- Return JSON only.

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only with:
{
  "costPerM2": number,
  "totalCost": number,
  "buildMonths": number,
  "confidence": "LOW" | "MEDIUM" | "HIGH",
  "summary": string,
  "costBreakdown": [
    {
      "key": string,
      "label": string,
      "amount": number,
      "included": boolean,
      "notes": string,
      "detailRows": [
        { "label": string, "quantity": number, "unit": string, "rate": number, "total": number, "basis": string, "included": boolean }
      ]
    }
  ]
}`;

  const parseResult = (text: string): Result<HouseTypeCostAssessmentResult> => {
    try {
      const parsed = extractJsonObject<HouseTypeCostAssessmentResult>(text, fallback);
      return ok(normalizeHouseTypeCostAssessment(parsed, context));
    } catch (error) {
      return err(error instanceof Error ? error.message : 'House type cost assessment could not be parsed.');
    }
  };

  if (!aiSettings || aiSettings.providerMode === 'AUTO' || aiSettings.providerMode === 'GEMINI') {
    try {
      const searchText = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
        tools: [{ googleSearch: {} }],
      }), 1);
      const parsed = parseResult(searchText);
      if (parsed.ok) return parsed;
    } catch (searchError) {
      console.warn('House type cost search assessment unavailable', searchError);
    }
  }

  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok) {
        const parsed = parseResult(localResult.data);
        if (parsed.ok) return parsed;
        if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && parsed.ok === false) return err(parsed.error);
      } else if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && localResult.ok === false) {
        return err(localResult.error);
      }
    }
  }

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          costPerM2: { type: Type.NUMBER },
          totalCost: { type: Type.NUMBER },
          buildMonths: { type: Type.NUMBER },
          confidence: { type: Type.STRING },
          summary: { type: Type.STRING },
          costBreakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING },
                label: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                included: { type: Type.BOOLEAN },
                notes: { type: Type.STRING },
                detailRows: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      unit: { type: Type.STRING },
                      rate: { type: Type.NUMBER },
                      total: { type: Type.NUMBER },
                      basis: { type: Type.STRING },
                      included: { type: Type.BOOLEAN },
                    },
                  },
                },
              },
            },
          },
        },
        required: ['costPerM2', 'totalCost', 'buildMonths', 'confidence', 'summary'],
      },
    }), 2);
    const parsed = parseResult(text);
    if (parsed.ok) return parsed;
    if (parsed.ok === false) return err(parsed.error);
    return err('House type cost assessment could not be parsed.');
  } catch (error) {
    console.error('House type cost assessment error', error);
    return err(error instanceof Error ? error.message : 'House type cost assessment failed.');
  }
}

export async function generateHouseTypeCostGuidanceStep(
  context: unknown,
  aiSettings?: AppSettings['ai']
): Promise<Result<HouseTypeCostGuidanceStepResult>> {
  const fallback: HouseTypeCostGuidanceStepResult = {
    needsClarification: true,
    question: 'Please describe the intended specification level and any key cost drivers for this custom house type.',
    costPerM2: 0,
    totalCost: 0,
    buildMonths: 0,
    confidence: 'LOW',
    summary: '',
  };
  const prompt = `Act as a senior UK residential development Quantity Surveyor.

You are guiding the user through a custom house type cost assessment. Decide whether enough information exists to calculate a cautious cost, or ask the next single most valuable question.

Rules:
- Ask only ONE question at a time.
- Ask as many iterative questions as needed across repeated calls, but do not repeat questions already answered.
- Start from the construction description and sales description. Infer the construction quantity/basis and saleable quantity/basis where possible.
- Respect customHouseType.aiCostingBasis. If it is FIRST_PRINCIPLES, do not use current standard library comparables or component amounts to set the cost level; price from first principles using QS judgement, current market context, specification, GIFA, structure, MEP, access, and risk. You may still use the listed component keys as editable row names.
- If customHouseType.aiCostingBasis is USE_LIBRARY_WHERE_SUITABLE, use library data only where it is genuinely suitable. If the custom type is materially different, ask the right questions and price from first principles.
- Keep construction and sales separate where they use different measurement bases. For blocks of flats/apartments, the construction row should remain by block, but the sales/pricing rows must be the individual saleable flat types.
- For example, if the construction is two blocks of flats and the sales description is 12 flats sold individually as 4 GF flats, 4 mid floor flats, and 4 top floor flats, return constructionQuantity 2, constructionQuantityLabel "block", salesQuantity 12, salesQuantityLabel "flat", houseTypeName "Block of flats", and three salesRows: Ground floor flat quantity 4, Mid floor flat quantity 4, and Top floor flat quantity 4.
- Treat GF / ground floor, mid / middle floor, and top / upper floor as separate saleable flat types because they can carry different sale prices.
- Do not return one sales/pricing row called "Block of flats" unless the whole block is explicitly sold as a single investment asset.
- Prefer practical QS questions about specification, construction form, storeys, GIFA, garage/drive, MEP/ASHP/EV requirements, façade/envelope, tenure/spec level, access constraints, build method, and any unusual design or abnormal cost included in the house type itself.
- If the current inputs and answer history are sufficient for a meaningful appraisal rate, return needsClarification false with the interpreted schedule basis and cost assessment.
- Before pricing, confirm or infer key cost drivers. If they are missing and materially affect cost, ask a clarification question instead of guessing. Key drivers include construction form (timber kit, masonry/brick/block, steel frame, concrete frame), lift/no lift, common stairs, landlord lighting/power, fire/acoustic requirements, ASHP, EV chargers, PV, specification level, and exclusions already counted elsewhere.
- Treat current standard library comparables and their component rows as optional reference evidence only. Use them only where they are genuinely suitable comparables. If the custom house type is materially different, such as a block of flats/apartments, price from first principles and explain why the library data has limited relevance. Where available, use current online construction market context, but do not invent specific live comparables.
- For flats/apartment blocks, explicitly test for and price likely non-standard house-library items, including passenger lift and lift shaft, precast/common stairs, handrails/balustrades, landlord/common lighting and power, door entry/access control, fire alarms, smoke ventilation, fire stopping, fire compartmentation, acoustic separation, communal corridors/stairwell finishes, cycle/refuse stores inside the building, ASHPs, and EV infrastructure where described.
- For flats/apartment blocks, assess groundworks/substructure against the building footprint or ground-floor slab area where this can be inferred, not against total multi-storey GIFA. Put upper-floor/common-area requirements into their own component rows.
- Use explicit component keys for non-standard apartment/block items where relevant: LIFT, COMMON_STAIRS, HANDRAILS_BALUSTRADES, LANDLORD_LIGHTING, DOOR_ENTRY_ACCESS, SMOKE_VENT_FIRE_ALARM, ACOUSTIC_COMPARTMENTATION, COMMUNAL_FINISHES, and REFUSE_CYCLE_STORES.
- If a non-standard item has no exact component key, allocate it to the nearest available editable component key and explain the allocation in notes. Do not omit a cost simply because it is not in the standard house library. Do not hide lift, stair, landlord lighting, fire/acoustic, or communal finish allowances inside generic library rows if an explicit row is available.
- Do not include land, infrastructure, plot works, prelims, sales, finance, overhead/profit, or abnormals unless explicitly described as part of the house type itself.
- gifaM2 should be the construction gross internal floor area per construction unit used for costing.
- totalCost should be the cost per construction unit, not the full development total where there are multiple construction units.
- Return a costBreakdown with editable QS component rows. You may clear the preset component structure and return any QS cost rows you think are appropriate. The app will use your returned costBreakdown list directly. Use a known key where it genuinely fits, otherwise use key "CUSTOM_ALLOWANCE" with a clear row label.
- Do not pad the build-up with preset rows that are not relevant. A concise first-principles list is better than forcing costs into the standard library headings. Make included component amounts sum to totalCost, with sensible notes such as "flat block uplift", "lift allowance", "fire compartmentation", "communal finishes", or "ASHP allowance" where relevant.
- For each costBreakdown row, include detailRows where possible. detailRows should be measured build-up lines with label, quantity, unit, rate, total, basis and included. Use real QS measurement logic where possible, e.g. foundation linear metres, slab area, pipe lengths, chambers, service duct route lengths, roof area, number of kitchens/flats, wet rooms, doors, or common-area GIFA.
- The parent costBreakdown amount should equal the sum of its included detailRows unless the row is intentionally a single allowance, in which case provide one detail row explaining the basis.
- Summary must be 3 to 5 complete sentences with punctuation and explain the key rationale.
- Return JSON only.

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only with:
{
  "needsClarification": boolean,
  "question": string,
  "costPerM2": number,
  "totalCost": number,
  "buildMonths": number,
  "confidence": "LOW" | "MEDIUM" | "HIGH",
  "summary": string,
  "houseTypeName": string,
  "constructionQuantity": number,
  "constructionQuantityLabel": string,
  "salesQuantity": number,
  "salesQuantityLabel": string,
  "salesRows": [
    { "label": string, "quantity": number, "gifaM2": number, "notes": string }
  ],
  "gifaM2": number,
  "quantitySeparationNotes": string,
  "costBreakdown": [
    {
      "key": string,
      "label": string,
      "amount": number,
      "included": boolean,
      "notes": string,
      "detailRows": [
        { "label": string, "quantity": number, "unit": string, "rate": number, "total": number, "basis": string, "included": boolean }
      ]
    }
  ]
}`;

  const parseResult = (text: string): Result<HouseTypeCostGuidanceStepResult> => {
    try {
      const parsed = extractJsonObject<HouseTypeCostGuidanceStepResult>(text, fallback);
      return ok(normalizeHouseTypeCostGuidanceStep(parsed, context));
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Guided house type cost step could not be parsed.');
    }
  };

  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    try {
      const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
      if (canUseLocal) {
        const localResult = await generateLocalChatCompletion(prompt, aiSettings);
        if (localResult.ok) {
          const parsed = parseResult(localResult.data);
          if (parsed.ok) return parsed;
          if (parsed.ok === false) {
            console.warn('Guided house type local AI response could not be parsed', parsed.error);
          }
        } else if (localResult.ok === false) {
          console.warn('Guided house type local AI unavailable', localResult.error);
        }
      }
    } catch (localError) {
      console.warn('Guided house type local AI route failed', localError);
    }
    if (aiSettings.providerMode === 'LOCAL_LM_STUDIO') {
      return ok(buildHouseTypeGuidanceFallback(context, 'Local AI did not return a usable guided response.'));
    }
  }

  if (!aiSettings || aiSettings.providerMode === 'AUTO' || aiSettings.providerMode === 'GEMINI') {
    try {
      const searchText = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
        tools: [{ googleSearch: {} }],
      }), 1);
      const parsed = parseResult(searchText);
      if (parsed.ok) return parsed;
    } catch (searchError) {
      console.warn('Guided house type cost search assessment unavailable', searchError);
    }
  }

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          needsClarification: { type: Type.BOOLEAN },
          question: { type: Type.STRING },
          costPerM2: { type: Type.NUMBER },
          totalCost: { type: Type.NUMBER },
          buildMonths: { type: Type.NUMBER },
          confidence: { type: Type.STRING },
          summary: { type: Type.STRING },
          houseTypeName: { type: Type.STRING },
          constructionQuantity: { type: Type.NUMBER },
          constructionQuantityLabel: { type: Type.STRING },
          salesQuantity: { type: Type.NUMBER },
          salesQuantityLabel: { type: Type.STRING },
          salesRows: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                gifaM2: { type: Type.NUMBER },
                notes: { type: Type.STRING },
              },
            },
          },
          gifaM2: { type: Type.NUMBER },
          quantitySeparationNotes: { type: Type.STRING },
          costBreakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING },
                label: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                included: { type: Type.BOOLEAN },
                notes: { type: Type.STRING },
                detailRows: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      unit: { type: Type.STRING },
                      rate: { type: Type.NUMBER },
                      total: { type: Type.NUMBER },
                      basis: { type: Type.STRING },
                      included: { type: Type.BOOLEAN },
                    },
                  },
                },
              },
            },
          },
        },
        required: ['needsClarification', 'question', 'costPerM2', 'totalCost', 'buildMonths', 'confidence', 'summary'],
      },
    }), 2);
    const parsed = parseResult(text);
    if (parsed.ok) return parsed;
    if (parsed.ok === false) {
      console.warn('Guided house type Gemini response could not be parsed', parsed.error);
      return ok(buildHouseTypeGuidanceFallback(context, parsed.error));
    }
    return ok(buildHouseTypeGuidanceFallback(context, 'Guided response could not be parsed.'));
  } catch (error) {
    console.error('Guided house type cost step error', error);
    return ok(buildHouseTypeGuidanceFallback(
      context,
      error instanceof Error ? error.message : 'Guided house type cost step failed.'
    ));
  }
}

export type CustomCostProvisionAssessmentResult = {
  amount: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
};

export type CustomCostProvisionGuidanceStepResult = CustomCostProvisionAssessmentResult & {
  needsClarification: boolean;
  question: string;
};

function normalizeCustomCostProvisionAssessment(result: CustomCostProvisionAssessmentResult): CustomCostProvisionAssessmentResult {
  const parsedAmount = Number(result.amount);
  const amount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? Math.round(parsedAmount) : 0;
  const confidence = ['LOW', 'MEDIUM', 'HIGH'].includes(String(result.confidence)) ? result.confidence : 'MEDIUM';
  return {
    amount,
    confidence,
    summary: typeof result.summary === 'string' && result.summary.trim()
      ? result.summary.trim()
      : 'The custom provision has been assessed from the available appraisal context and user notes.',
  };
}

function normalizeCustomCostProvisionGuidanceStep(result: CustomCostProvisionGuidanceStepResult): CustomCostProvisionGuidanceStepResult {
  if (result.needsClarification === true) {
    return {
      needsClarification: true,
      question: typeof result.question === 'string' && result.question.trim()
        ? result.question.trim()
        : 'What specifically should this custom cost provision cover?',
      amount: 0,
      confidence: 'LOW',
      summary: '',
    };
  }
  const assessment = normalizeCustomCostProvisionAssessment(result);
  return {
    ...assessment,
    needsClarification: false,
    question: '',
  };
}

export async function generateCustomCostProvisionAssessment(
  context: unknown,
  aiSettings?: AppSettings['ai']
): Promise<Result<CustomCostProvisionAssessmentResult>> {
  const fallback: CustomCostProvisionAssessmentResult = {
    amount: 0,
    confidence: 'LOW',
    summary: '',
  };
  const prompt = `Act as a senior UK development Quantity Surveyor.

Assess a cautious custom cost provision for a residential development appraisal.

Rules:
- The provision must be a separate cost allowance not already represented elsewhere in the appraisal.
- Use the appraisal context, current cost summary, site metrics, house mix, abnormal notes, and the user's custom provision note.
- Do not double count house construction, infrastructure, plot works, prelims, abnormals, overheads, finance, land, sales incentives, or tax unless the user specifically says this custom provision is in addition to those sections.
- If the information is thin, use a cautious provisional allowance and clearly state the basis.
- Return a single allowance amount in GBP.
- Summary must be 2 to 4 complete sentences with punctuation and explain the basis.
- Return JSON only.

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only with:
{
  "amount": number,
  "confidence": "LOW" | "MEDIUM" | "HIGH",
  "summary": string
}`;

  const parseResult = (text: string): Result<CustomCostProvisionAssessmentResult> => {
    try {
      const parsed = extractJsonObject<CustomCostProvisionAssessmentResult>(text, fallback);
      return ok(normalizeCustomCostProvisionAssessment(parsed));
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Custom cost provision assessment could not be parsed.');
    }
  };

  if (aiSettings?.providerMode !== 'LOCAL_LM_STUDIO') {
    try {
      const searchText = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
        tools: [{ googleSearch: {} }],
      }), 1);
      const parsed = parseResult(searchText);
      if (parsed.ok) return parsed;
    } catch (searchError) {
      console.warn('Custom cost provision search assessment unavailable', searchError);
    }
  }

  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok) {
        const parsed = parseResult(localResult.data);
        if (parsed.ok) return parsed;
        if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && parsed.ok === false) return err(parsed.error);
      } else if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && localResult.ok === false) {
        return err(localResult.error);
      }
    }
  }

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER },
          confidence: { type: Type.STRING },
          summary: { type: Type.STRING },
        },
        required: ['amount', 'confidence', 'summary'],
      },
    }), 2);
    const parsed = parseResult(text);
    if (parsed.ok) return parsed;
    if (parsed.ok === false) return err(parsed.error);
    return err('Custom cost provision assessment could not be parsed.');
  } catch (error) {
    console.error('Custom cost provision assessment error', error);
    return err(error instanceof Error ? error.message : 'Custom cost provision assessment failed.');
  }
}

export async function generateCustomCostProvisionGuidanceStep(
  context: unknown,
  aiSettings?: AppSettings['ai'],
  assessmentKind: 'CUSTOM_COST' | 'ABNORMAL' | 'SITE_SPECIFIC' = 'CUSTOM_COST',
): Promise<Result<CustomCostProvisionGuidanceStepResult>> {
  const fallback: CustomCostProvisionGuidanceStepResult = {
    needsClarification: true,
    question: 'What specifically should this custom cost provision cover?',
    amount: 0,
    confidence: 'LOW',
    summary: '',
  };
  const prompt = `Act as a senior UK development Quantity Surveyor.

You are guiding the user through ${assessmentKind === 'ABNORMAL' ? 'an abnormal element' : assessmentKind === 'SITE_SPECIFIC' ? 'a site-specific works element' : 'a custom cost provision'} assessment. Decide whether enough information exists to calculate a cautious allowance, or ask the next single most valuable QS question.

Rules:
- Ask only ONE question at a time.
- Ask as many iterative questions as needed across repeated calls, but do not repeat questions already answered.
- Focus on what the provision covers, why it is separate from standard model costs, quantity/basis, source of rate, known exclusions, uncertainty, and whether it overlaps with house construction, infrastructure, plot works, prelims, abnormals, overheads, finance, land, or incentives.
- If enough information exists for a meaningful appraisal allowance, return needsClarification false with the assessed amount.
- Return a single allowance amount in GBP.
- Summary must be 2 to 4 complete sentences with punctuation and explain the basis.
- Return JSON only.

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only with:
{
  "needsClarification": boolean,
  "question": string,
  "amount": number,
  "confidence": "LOW" | "MEDIUM" | "HIGH",
  "summary": string
}`;

  const parseResult = (text: string): Result<CustomCostProvisionGuidanceStepResult> => {
    try {
      const parsed = extractJsonObject<CustomCostProvisionGuidanceStepResult>(text, fallback);
      return ok(normalizeCustomCostProvisionGuidanceStep(parsed));
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Guided custom cost provision step could not be parsed.');
    }
  };

  if (aiSettings?.providerMode !== 'LOCAL_LM_STUDIO') {
    try {
      const searchText = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
        tools: [{ googleSearch: {} }],
      }), 1);
      const parsed = parseResult(searchText);
      if (parsed.ok) return parsed;
    } catch (searchError) {
      console.warn('Guided custom cost provision search assessment unavailable', searchError);
    }
  }

  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok) {
        const parsed = parseResult(localResult.data);
        if (parsed.ok) return parsed;
        if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && parsed.ok === false) return err(parsed.error);
      } else if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && localResult.ok === false) {
        return err(localResult.error);
      }
    }
  }

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          needsClarification: { type: Type.BOOLEAN },
          question: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          confidence: { type: Type.STRING },
          summary: { type: Type.STRING },
        },
        required: ['needsClarification', 'question', 'amount', 'confidence', 'summary'],
      },
    }), 2);
    const parsed = parseResult(text);
    if (parsed.ok) return parsed;
    if (parsed.ok === false) return err(parsed.error);
    return err('Guided custom cost provision step could not be parsed.');
  } catch (error) {
    console.error('Guided custom cost provision step error', error);
    return err(error instanceof Error ? error.message : 'Guided custom cost provision step failed.');
  }
}

export type CommercialTemplateRecommendationResult = {
  commercialType: string;
  templateId: string;
  summary: string;
};

type CommercialTemplateRecommendationCandidate = {
  id: string;
  sector: string;
  name: string;
  description?: string;
  measures?: string[];
};

function commercialTemplateCandidates(context: unknown): CommercialTemplateRecommendationCandidate[] {
  const templates = (context as { templates?: unknown })?.templates;
  if (!Array.isArray(templates)) return [];
  return templates.flatMap((template) => {
    if (!template || typeof template !== 'object') return [];
    const candidate = template as Partial<CommercialTemplateRecommendationCandidate>;
    if (typeof candidate.id !== 'string' || typeof candidate.sector !== 'string' || typeof candidate.name !== 'string') return [];
    return [{
      id: candidate.id,
      sector: candidate.sector,
      name: candidate.name,
      description: typeof candidate.description === 'string' ? candidate.description : '',
      measures: Array.isArray(candidate.measures) ? candidate.measures.filter((measure): measure is string => typeof measure === 'string') : [],
    }];
  });
}

function normaliseCommercialTemplateRecommendation(
  result: CommercialTemplateRecommendationResult,
  candidates: CommercialTemplateRecommendationCandidate[],
): CommercialTemplateRecommendationResult {
  const selected = candidates.find((candidate) => candidate.id === result.templateId) || candidates[0];
  return {
    commercialType: selected?.sector || result.commercialType || 'Commercial',
    templateId: selected?.id || '',
    summary: typeof result.summary === 'string' && result.summary.trim()
      ? result.summary.trim()
      : `Selected ${selected?.name || 'the available commercial template'} as the closest available starting point.`,
  };
}

export async function generateCommercialTemplateRecommendation(
  context: unknown,
  aiSettings?: AppSettings['ai']
): Promise<Result<CommercialTemplateRecommendationResult>> {
  const candidates = commercialTemplateCandidates(context);
  if (candidates.length === 0) return err('No commercial templates are available for AI selection.');
  const fallback = normaliseCommercialTemplateRecommendation({
    commercialType: candidates[0].sector,
    templateId: candidates[0].id,
    summary: '',
  }, candidates);
  const prompt = `Act as a UK commercial development appraisal analyst.

Use the proposed commercial development brief and location to select the closest available commercial type and appraisal template. The result is a prudent starting template only, not a valuation or design recommendation.

Rules:
- Select exactly one templateId from the candidate templates supplied.
- Do not invent a template, template ID, floor area, rate, or commercial sector.
- Prefer the closest operational and cost-plan fit.
- Write a concise rationale in complete sentences, noting any important mismatch that the user should adjust after setup.

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only:
{
  "commercialType": string,
  "templateId": string,
  "summary": string
}`;
  const parseResult = (text: string): Result<CommercialTemplateRecommendationResult> => {
    try {
      const parsed = extractJsonObject<CommercialTemplateRecommendationResult>(text, fallback);
      return ok(normaliseCommercialTemplateRecommendation(parsed, candidates));
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Commercial template recommendation could not be parsed.');
    }
  };

  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok) {
        const parsed = parseResult(localResult.data);
        if (parsed.ok) return parsed;
        if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && parsed.ok === false) return err(parsed.error);
      } else if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && localResult.ok === false) {
        return err(localResult.error);
      }
    }
  }

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          commercialType: { type: Type.STRING },
          templateId: { type: Type.STRING },
          summary: { type: Type.STRING },
        },
        required: ['commercialType', 'templateId', 'summary'],
      },
    }), 2);
    return parseResult(text);
  } catch (error) {
    console.error('Commercial template recommendation error', error);
    return err(error instanceof Error ? error.message : 'Commercial template recommendation failed.');
  }
}

function normaliseCommercialSiteScopeGuidanceStep(
  result: CommercialSiteScopeGuidanceStepResult,
): CommercialSiteScopeGuidanceStepResult {
  const needsClarification = result.needsClarification === true;
  return {
    needsClarification,
    question: needsClarification && typeof result.question === 'string' && result.question.trim()
      ? result.question.trim()
      : needsClarification
        ? 'What commercial use, operator format and level of customer or service activity is proposed?'
        : '',
    summary: typeof result.summary === 'string' && result.summary.trim()
      ? result.summary.trim()
      : needsClarification
        ? 'Further scope information is needed before a site-fitting commercial proposal can be prepared.'
        : 'A prudent commercial scope has been proposed within the entered site boundary.',
  };
}

export async function generateCommercialSiteScopeGuidanceStep(
  context: unknown,
  aiSettings?: AppSettings['ai'],
): Promise<Result<CommercialSiteScopeGuidanceStepResult>> {
  const fallback: CommercialSiteScopeGuidanceStepResult = {
    needsClarification: true,
    question: 'What commercial use, operator format and level of customer or service activity is proposed?',
    summary: 'Further scope information is needed before a site-fitting commercial proposal can be prepared.',
  };
  const prompt = `Act as a senior UK commercial development feasibility analyst.

Assess what a commercial site could credibly accommodate from the supplied location, user brief, fixed site area and previous answers. This assessment happens before a cost or revenue template is selected.

Rules:
- The supplied siteAreaM2 is a hard boundary. Never increase, reduce, or replace it.
- Propose a commercially plausible broad scope that fits within the site area after allowing for access, servicing, parking, circulation, landscaping and drainage. A multi-storey built form may have gross floor area above the site area only where the stated use makes that reasonable.
- Ask only one focused follow-up question at a time when a material driver is missing. You may ask as many questions as necessary.
- Never repeat questions already answered and do not ask for information already supplied.
- Consider suitable uses or a mix of uses, but do not invent planning consent, a committed operator, title rights, or measured site constraints.
- Where assessment evidence contains figures, use those quantities, rates, values and percentages as the starting evidence base. Reconcile conflicts cautiously and ask a question instead of overriding a material figure without explanation.
- When sufficient information is available, set needsClarification to false and write a concise scope summary explaining what could fit, the broad form, key external requirements, and any significant assumptions or constraints.
- Use full sentences and punctuation. Do not select a template yet.

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only:
{
  "needsClarification": boolean,
  "question": string,
  "summary": string
}`;
  const parseResult = (text: string): Result<CommercialSiteScopeGuidanceStepResult> => {
    try {
      return ok(normaliseCommercialSiteScopeGuidanceStep(extractJsonObject<CommercialSiteScopeGuidanceStepResult>(text, fallback)));
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Commercial site scope guidance could not be parsed.');
    }
  };

  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok) {
        const parsed = parseResult(localResult.data);
        if (parsed.ok) return parsed;
        if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && parsed.ok === false) return err(parsed.error);
      } else if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && localResult.ok === false) {
        return err(localResult.error);
      }
    }
  }

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          needsClarification: { type: Type.BOOLEAN },
          question: { type: Type.STRING },
          summary: { type: Type.STRING },
        },
        required: ['needsClarification', 'question', 'summary'],
      },
    }), 2);
    return parseResult(text);
  } catch (error) {
    console.error('Commercial site scope guidance error', error);
    return err(error instanceof Error ? error.message : 'Commercial site scope guidance failed.');
  }
}

function normaliseCommercialAssetAssessment(value: CommercialAssetAssessmentResult): CommercialAssetAssessmentResult {
  const models = new Set(['LEASE', 'OWNER_OPERATED', 'CONCESSION', 'SALE', 'OTHER']);
  const costCategories = new Set<AppraisalCostCategory>([
    'LAND_ACQUISITION', 'CONSTRUCTION', 'EXTERNAL_WORKS', 'ABNORMALS', 'PROFESSIONAL_FEES',
    'STATUTORY_AUTHORITY', 'MARKETING_SALES', 'CONTINGENCY', 'FINANCE', 'OTHER',
  ]);
  const numeric = (input: unknown) => {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };
  const optionalNumeric = (input: unknown) => input === undefined || input === null || input === ''
    ? undefined
    : numeric(input);
  const assets = Array.isArray(value.assets) ? value.assets.slice(0, 12).map((asset, index) => ({
    title: typeof asset?.title === 'string' && asset.title.trim() ? asset.title.trim() : `Commercial asset ${index + 1}`,
    description: typeof asset?.description === 'string' ? asset.description.trim() : '',
    included: asset?.included !== false,
    revenueModel: models.has(String(asset?.revenueModel)) ? String(asset?.revenueModel) as 'LEASE' | 'OWNER_OPERATED' | 'CONCESSION' | 'SALE' | 'OTHER' : 'LEASE',
    siteAllocationM2: numeric(asset?.siteAllocationM2),
    annualIncome: numeric(asset?.annualIncome),
    operatingCostPercent: numeric(asset?.operatingCostPercent),
    revenueGrowthPercent: numeric(asset?.revenueGrowthPercent),
    lifecycleCapexPercent: numeric(asset?.lifecycleCapexPercent),
    exitYieldPercent: numeric(asset?.exitYieldPercent),
    sellingCostsPercent: numeric(asset?.sellingCostsPercent),
    developmentCost: numeric(asset?.developmentCost),
    costTitle: typeof asset?.costTitle === 'string' ? asset.costTitle.trim() : '',
    rationale: typeof asset?.rationale === 'string' ? asset.rationale.trim() : '',
    excludedReason: typeof asset?.excludedReason === 'string' ? asset.excludedReason.trim() : '',
  })) : [];
  const proposedMeasures = value.proposedMeasures && typeof value.proposedMeasures === 'object'
    ? Object.fromEntries(Object.entries(value.proposedMeasures)
      .map(([key, amount]) => [key, numeric(amount)])
      .filter(([key]) => String(key).trim().length > 0))
    : {};
  const siteWideCosts = Array.isArray(value.siteWideCosts) ? value.siteWideCosts.slice(0, 16).map((entry, index) => ({
    title: typeof entry?.title === 'string' && entry.title.trim() ? entry.title.trim() : `Site-wide cost ${index + 1}`,
    category: costCategories.has(entry?.category) ? entry.category : 'EXTERNAL_WORKS' as AppraisalCostCategory,
    amount: numeric(entry?.amount),
    notes: typeof entry?.notes === 'string' ? entry.notes.trim() : '',
  })).filter((entry) => entry.amount > 0) : [];
  return {
    needsClarification: value.needsClarification === true,
    question: value.needsClarification === true && typeof value.question === 'string' && value.question.trim()
      ? value.question.trim()
      : value.needsClarification === true ? 'What are the intended ownership, operating and income arrangements for the proposed commercial uses?' : '',
    summary: typeof value.summary === 'string' && value.summary.trim()
      ? value.summary.trim()
      : assets.length ? 'A commercial asset mix has been prepared for review.' : 'Further information is needed before the commercial asset mix can be assessed.',
    assets,
    proposedMeasures,
    siteWideCosts,
    durationMonths: optionalNumeric(value.durationMonths),
    financeAnnualRatePercent: optionalNumeric(value.financeAnnualRatePercent),
    annualOperatingCostPercent: optionalNumeric(value.annualOperatingCostPercent),
    annualRevenueGrowthPercent: optionalNumeric(value.annualRevenueGrowthPercent),
    annualCostInflationPercent: optionalNumeric(value.annualCostInflationPercent),
    annualLifecycleCapexPercent: optionalNumeric(value.annualLifecycleCapexPercent),
    exitYieldPercent: optionalNumeric(value.exitYieldPercent),
    sellingCostsPercent: optionalNumeric(value.sellingCostsPercent),
  };
}

export async function generateCommercialAssetAssessment(
  context: unknown,
  aiSettings?: AppSettings['ai'],
  files: { mimeType: string; data: string }[] = [],
): Promise<Result<CommercialAssetAssessmentResult>> {
  const fallback: CommercialAssetAssessmentResult = {
    needsClarification: true,
    question: 'What are the intended ownership, operating and income arrangements for the proposed commercial uses?',
    summary: 'Further information is needed before the commercial asset mix can be assessed.',
    assets: [],
    proposedMeasures: {},
    siteWideCosts: [],
  };
  const prompt = `Act as a senior UK commercial development and investment analyst.

Create a reviewable commercial asset schedule for the proposed site. The asset schedule must identify every credible value-bearing commercial use individually, together with its capital cost, annual income, operating costs, lifecycle reserve and exit basis. This is an early feasibility assessment, so remain cautious and do not invent consents, occupiers, market transactions, or utility capacity.

Rules:
- The siteAreaM2 in context is a hard limit. The total of included asset allocations must not exceed it; allow the remaining area for shared access, parking, servicing, landscaping and drainage.
- Ask one focused follow-up question only when a material driver is missing. Do not repeat supplied information.
- Use one row per commercial asset. Include shared site infrastructure only as a separate row where it carries value or a distinct income basis; otherwise leave it for site-wide costs.
- Choose one revenueModel for each asset: LEASE, OWNER_OPERATED, CONCESSION, SALE, or OTHER.
- Annual income must be net of voids/incentives where appropriate. Development cost must include the asset-specific build, servicing and fit-out allowance, but not land.
- Where information is insufficient, set included false and give a concise excludedReason rather than inventing a value.
- Treat the extracted assessment evidence and its figures as material inputs. Carry supported values into the relevant asset rows and rationale; where evidence conflicts or is incomplete, state the cautious assumption used instead of silently replacing it.
- Where the commercial brief provides a cost plan, revenue schedule, funding basis, lifecycle forecast, exit yield, programme, parking/capacity schedule or site-wide works allowance, carry those values into the appropriate fields below. Do not reduce the assessment to a single template line where the evidence supports a more detailed asset or site-wide schedule.
- proposedMeasures must use only the measure keys supplied in context.template.measures. Use the documented value when it is relevant; omit keys with no reliable evidence.
- siteWideCosts must cover shared access, external works, drainage, grid, professional fees, abnormal allowances, contingencies or other common costs that are evidenced but do not belong to one income-producing asset. Do not duplicate an asset-specific cost.
- Populate global programme, finance and lifecycle assumptions only when they are evidenced or can be clearly inferred from the supplied basis. Leave a field absent rather than inventing it.
- Use complete sentences and punctuation in summary and rationale.

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only:
{
  "needsClarification": boolean,
  "question": string,
    "summary": string,
    "proposedMeasures": { "templateMeasureKey": number },
    "siteWideCosts": [{
      "title": string,
      "category": "LAND_ACQUISITION|CONSTRUCTION|EXTERNAL_WORKS|ABNORMALS|PROFESSIONAL_FEES|STATUTORY_AUTHORITY|MARKETING_SALES|CONTINGENCY|FINANCE|OTHER",
      "amount": number,
      "notes": string
    }],
    "durationMonths": number,
    "financeAnnualRatePercent": number,
    "annualOperatingCostPercent": number,
    "annualRevenueGrowthPercent": number,
    "annualCostInflationPercent": number,
    "annualLifecycleCapexPercent": number,
    "exitYieldPercent": number,
    "sellingCostsPercent": number,
    "assets": [{
    "title": string,
    "description": string,
    "included": boolean,
    "revenueModel": "LEASE|OWNER_OPERATED|CONCESSION|SALE|OTHER",
    "siteAllocationM2": number,
    "annualIncome": number,
    "operatingCostPercent": number,
    "revenueGrowthPercent": number,
    "lifecycleCapexPercent": number,
    "exitYieldPercent": number,
    "sellingCostsPercent": number,
    "developmentCost": number,
    "costTitle": string,
    "rationale": string,
    "excludedReason": string
  }]
  }`;
  const parseResult = (text: string): Result<CommercialAssetAssessmentResult> => {
    try {
      return ok(normaliseCommercialAssetAssessment(extractJsonObject<CommercialAssetAssessmentResult>(text, fallback)));
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Commercial asset assessment could not be parsed.');
    }
  };
  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok) {
        const parsed = parseResult(localResult.data);
        if (parsed.ok) return parsed;
        if (aiSettings.providerMode === 'LOCAL_LM_STUDIO') return parsed;
      } else if (localResult.ok === false && aiSettings.providerMode === 'LOCAL_LM_STUDIO') return err(localResult.error);
    }
  }
  try {
    const parts: GeminiPart[] = [
      ...files.map((file) => ({ inlineData: { mimeType: file.mimeType, data: file.data } })),
      { text: prompt },
    ];
    const text = await runWithRetry(() => generateContentText(modelForAnalysis(files.length > 0), parts, {
      responseMimeType: 'application/json',
    }), 2);
    return parseResult(text);
  } catch (error) {
    console.error('Commercial asset assessment error', error);
    return err(error instanceof Error ? error.message : 'Commercial asset assessment failed.');
  }
}

function normaliseCommercialScopeGuidanceStep(
  result: CommercialScopeGuidanceStepResult,
): CommercialScopeGuidanceStepResult {
  const proposedMeasures = result.proposedMeasures && typeof result.proposedMeasures === 'object'
    ? Object.fromEntries(Object.entries(result.proposedMeasures).flatMap(([key, value]) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) && numeric >= 0 ? [[key, numeric]] : [];
    }))
    : {};
  const needsClarification = result.needsClarification === true;
  return {
    needsClarification,
    question: needsClarification && typeof result.question === 'string' && result.question.trim()
      ? result.question.trim()
      : needsClarification
        ? 'What is the proposed operational format, capacity and building height or storey count?'
        : '',
    proposedMeasures,
    summary: typeof result.summary === 'string' && result.summary.trim()
      ? result.summary.trim()
      : needsClarification
        ? 'Further scope information is needed before a site-fitting commercial extent can be proposed.'
        : 'A commercial site extent has been proposed within the entered site area.',
  };
}

export async function generateCommercialScopeGuidanceStep(
  context: unknown,
  aiSettings?: AppSettings['ai'],
): Promise<Result<CommercialScopeGuidanceStepResult>> {
  const fallback: CommercialScopeGuidanceStepResult = {
    needsClarification: true,
    question: 'What is the proposed operational format, capacity and building height or storey count?',
    proposedMeasures: {},
    summary: 'Further scope information is needed before a site-fitting commercial extent can be proposed.',
  };
  const prompt = `Act as a senior UK commercial development and feasibility analyst.

Develop a commercially credible site scope using the supplied template, site location, current measures, and previous answers. The entered siteAreaM2 is a fixed site boundary supplied by the user. You must never increase, reduce, or replace it.

Rules:
- Keep the physical proposal within the fixed site area, allowing sensible space for access, servicing, parking, landscaping, drainage and operational circulation. Gross internal floor area may exceed the site area only where a multi-storey form is justified.
- Ask one focused follow-up question at a time if an important extent driver is missing. You may ask as many questions as are needed.
- Never repeat a question already answered, and do not ask for information already in the context.
- Prioritise use/operator format, scale or capacity, height/storeys, parking, servicing, access, and unusual site constraints.
- Use quantities, rates, values and percentages in assessmentEvidence where relevant. Do not replace a material supported figure without explaining the reason in the summary.
- When enough information exists, set needsClarification to false and return values only for the allowed template measure keys. Set proposedMeasures.siteAreaM2 exactly to the supplied siteAreaM2.
- Do not invent planning consent, land ownership, a committed operator, or measured constraints. State prudent assumptions clearly in the summary.

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only:
{
  "needsClarification": boolean,
  "question": string,
  "proposedMeasures": { "measureKey": number },
  "summary": string
}`;
  const parseResult = (text: string): Result<CommercialScopeGuidanceStepResult> => {
    try {
      return ok(normaliseCommercialScopeGuidanceStep(extractJsonObject<CommercialScopeGuidanceStepResult>(text, fallback)));
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Commercial scope guidance could not be parsed.');
    }
  };

  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok) {
        const parsed = parseResult(localResult.data);
        if (parsed.ok) return parsed;
        if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && parsed.ok === false) return err(parsed.error);
      } else if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && localResult.ok === false) {
        return err(localResult.error);
      }
    }
  }

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          needsClarification: { type: Type.BOOLEAN },
          question: { type: Type.STRING },
          proposedMeasures: { type: Type.OBJECT },
          summary: { type: Type.STRING },
        },
        required: ['needsClarification', 'question', 'proposedMeasures', 'summary'],
      },
    }), 2);
    return parseResult(text);
  } catch (error) {
    console.error('Commercial scope guidance error', error);
    return err(error instanceof Error ? error.message : 'Commercial scope guidance failed.');
  }
}

function normaliseCommercialRevenueGuidanceStep(
  result: CommercialRevenueGuidanceStepResult,
): CommercialRevenueGuidanceStepResult {
  const needsClarification = result.needsClarification === true;
  const question = typeof result.question === 'string' ? result.question.trim() : '';
  const summary = typeof result.summary === 'string' ? result.summary.trim() : '';
  return {
    needsClarification,
    question: needsClarification
      ? question || 'What is the intended occupier, operating model or lease basis for this property?'
      : '',
    rentRate: Number.isFinite(Number(result.rentRate)) ? Math.max(0, Number(result.rentRate)) : 0,
    yieldPercent: Number.isFinite(Number(result.yieldPercent)) ? Math.max(0, Number(result.yieldPercent)) : 0,
    voidPercent: Number.isFinite(Number(result.voidPercent)) ? Math.max(0, Number(result.voidPercent)) : 0,
    annualRent: Number.isFinite(Number(result.annualRent)) ? Math.max(0, Number(result.annualRent)) : 0,
    summary: summary || (needsClarification
      ? 'Further commercial revenue information is needed before assumptions can be assessed.'
      : 'Commercial revenue assumptions have been assessed from the available information.'),
  };
}

export async function generateCommercialRevenueGuidanceStep(
  context: unknown,
  aiSettings?: AppSettings['ai'],
): Promise<Result<CommercialRevenueGuidanceStepResult>> {
  const fallback: CommercialRevenueGuidanceStepResult = {
    needsClarification: true,
    question: 'What is the intended occupier, operating model or lease basis for this property?',
    rentRate: 0,
    yieldPercent: 0,
    voidPercent: 0,
    annualRent: 0,
    summary: 'Further commercial revenue information is needed before assumptions can be assessed.',
  };
  const prompt = `Act as a senior UK commercial property appraisal analyst guiding a user through an early-stage revenue assessment.

Work from the supplied location, commercial template, measurement data, current revenue assumptions and previous answers. Decide whether there is enough information to produce cautious commercial revenue assumptions.

Rules:
- Ask one focused follow-up question at a time whenever a material revenue driver is unknown. You may ask as many questions as needed.
- Never repeat a question already answered and do not ask for information already present in the context.
- Prioritise the occupier or operating model, tenure or income basis, lettable/trading area, target rent or trading assumptions, lease term, incentives, voids, yields, and any known local evidence.
- Do not invent a committed tenant, live comparable, rent, yield or trading income. If the information remains thin after reasonable questions, use cautious desktop assumptions and say so.
- Where assessmentEvidence contains an income, rate, yield, capacity or operating figure, treat it as the primary evidence basis unless the user gives a later conflicting instruction.
- When enough information exists, set needsClarification to false and return complete numeric assumptions. Rent rate should normally be GBP per m2 per annum for area-led investment property.
- Write complete, commercially useful sentences with punctuation.

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only:
{
  "needsClarification": boolean,
  "question": string,
  "rentRate": number,
  "yieldPercent": number,
  "voidPercent": number,
  "annualRent": number,
  "summary": string
}`;
  const parseResult = (text: string): Result<CommercialRevenueGuidanceStepResult> => {
    try {
      return ok(normaliseCommercialRevenueGuidanceStep(extractJsonObject<CommercialRevenueGuidanceStepResult>(text, fallback)));
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Commercial revenue guidance could not be parsed.');
    }
  };

  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok) {
        const parsed = parseResult(localResult.data);
        if (parsed.ok) return parsed;
        if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && parsed.ok === false) return err(parsed.error);
      } else if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && localResult.ok === false) {
        return err(localResult.error);
      }
    }
  }

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          needsClarification: { type: Type.BOOLEAN },
          question: { type: Type.STRING },
          rentRate: { type: Type.NUMBER },
          yieldPercent: { type: Type.NUMBER },
          voidPercent: { type: Type.NUMBER },
          annualRent: { type: Type.NUMBER },
          summary: { type: Type.STRING },
        },
        required: ['needsClarification', 'question', 'rentRate', 'yieldPercent', 'voidPercent', 'annualRent', 'summary'],
      },
    }), 2);
    return parseResult(text);
  } catch (error) {
    console.error('Commercial revenue guidance error', error);
    return err(error instanceof Error ? error.message : 'Commercial revenue guidance failed.');
  }
}

export async function generateCommercialRevenueAssessment(
  context: unknown,
  aiSettings?: AppSettings['ai']
): Promise<Result<CommercialRevenueAssessmentResult>> {
  const fallback: CommercialRevenueAssessmentResult = {
    rentRate: 0,
    yieldPercent: 0,
    voidPercent: 0,
    annualRent: 0,
    summary: '',
  };
  const prompt = `Act as a UK commercial property appraisal analyst.

Assess likely revenue assumptions for the commercial property using the provided location, commercial type, template, floor area and existing assumptions.
Return cautious desktop appraisal assumptions suitable for an early QS feasibility model.

Important:
- Use the location and property type to infer a reasonable rent rate and investment yield.
- If the location is too vague, say so in the summary and keep assumptions conservative.
- Do not claim live market evidence or specific comparable evidence unless it is provided in the context.
- Annual rent should be the net annual rent after void/incentive assumptions where possible.
- Rent rate should align with the template basis, normally GBP per m2 per annum for area-led commercial property.

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only with:
{
  "rentRate": number,
  "yieldPercent": number,
  "voidPercent": number,
  "annualRent": number,
  "summary": string
}`;

  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok) {
        const parsed = safeParseJson<CommercialRevenueAssessmentResult>(localResult.data, fallback, 'commercial revenue assessment');
        if (parsed.ok) return ok(parsed.data);
        if (parsed.ok === false && aiSettings.providerMode === 'LOCAL_LM_STUDIO') return err(parsed.error);
      } else if (localResult.ok === false && aiSettings.providerMode === 'LOCAL_LM_STUDIO') {
        return err(localResult.error);
      }
    }
  }

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rentRate: { type: Type.NUMBER },
          yieldPercent: { type: Type.NUMBER },
          voidPercent: { type: Type.NUMBER },
          annualRent: { type: Type.NUMBER },
          summary: { type: Type.STRING },
        },
        required: ['rentRate', 'yieldPercent', 'voidPercent', 'annualRent', 'summary'],
      },
    }));
    const parsed = safeParseJson<CommercialRevenueAssessmentResult>(text, fallback, 'commercial revenue assessment');
    if (parsed.ok === false) return err(parsed.error);
    return ok(parsed.data);
  } catch (error) {
    console.error('Commercial revenue assessment error', error);
    return err(error instanceof Error ? error.message : 'Commercial revenue assessment failed.');
  }
}

export async function generateCommercialLifecycleAssessment(
  context: unknown,
  aiSettings?: AppSettings['ai'],
): Promise<Result<CommercialLifecycleAssessmentResult>> {
  const fallback: CommercialLifecycleAssessmentResult = { operatingCostPercent: 25, revenueGrowthPercent: 2, costInflationPercent: 3, lifecycleCapexPercent: 1, exitYieldPercent: 5.5, sellingCostsPercent: 2, summary: 'Cautious lifecycle assumptions have been retained pending operator, lease and market evidence.' };
  const normalise = (value: CommercialLifecycleAssessmentResult): CommercialLifecycleAssessmentResult => ({
    operatingCostPercent: Math.min(100, Math.max(0, Number(value.operatingCostPercent) || fallback.operatingCostPercent)),
    revenueGrowthPercent: Math.min(25, Math.max(0, Number(value.revenueGrowthPercent) || 0)),
    costInflationPercent: Math.min(25, Math.max(0, Number(value.costInflationPercent) || 0)),
    lifecycleCapexPercent: Math.min(25, Math.max(0, Number(value.lifecycleCapexPercent) || 0)),
    exitYieldPercent: Math.min(25, Math.max(0.1, Number(value.exitYieldPercent) || fallback.exitYieldPercent)),
    sellingCostsPercent: Math.min(15, Math.max(0, Number(value.sellingCostsPercent) || 0)),
    summary: typeof value.summary === 'string' && value.summary.trim() ? value.summary.trim() : fallback.summary,
  });
  const prompt = `Act as a cautious UK commercial property investment analyst.

Set initial lifecycle and exit assumptions for an early-stage commercial appraisal using the supplied location, asset type, revenue basis, cost profile, and scope notes.

The model capitalises annual net operating income at the exit yield for an indicative sale value, deducts lifecycle capital reserves and selling costs, and charges interest on outstanding negative funding.

Rules:
- Do not claim live market evidence or a committed operator unless the context provides it.
- Use prudent desktop assumptions where evidence is thin and state the principal uncertainty in the summary.
- Use supported operating, income, cost and exit figures in assessmentEvidence as the baseline, and explain any cautious adjustment in the summary.
- Exit yield is a percentage, not a multiplier. Selling costs should include agent and legal disposal costs, excluding taxes unless explicitly supplied.
- Write one concise complete-sentence rationale.

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only:
{
  "operatingCostPercent": number,
  "revenueGrowthPercent": number,
  "costInflationPercent": number,
  "lifecycleCapexPercent": number,
  "exitYieldPercent": number,
  "sellingCostsPercent": number,
  "summary": string
}`;
  const parseResult = (text: string): Result<CommercialLifecycleAssessmentResult> => {
    try { return ok(normalise(extractJsonObject<CommercialLifecycleAssessmentResult>(text, fallback))); }
    catch (error) { return err(error instanceof Error ? error.message : 'Commercial lifecycle assessment could not be parsed.'); }
  };
  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok) {
        const parsed = parseResult(localResult.data);
        if (parsed.ok) return parsed;
        if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && parsed.ok === false) return err(parsed.error);
      } else if (aiSettings.providerMode === 'LOCAL_LM_STUDIO' && localResult.ok === false) return err(localResult.error);
    }
  }
  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          operatingCostPercent: { type: Type.NUMBER }, revenueGrowthPercent: { type: Type.NUMBER }, costInflationPercent: { type: Type.NUMBER }, lifecycleCapexPercent: { type: Type.NUMBER }, exitYieldPercent: { type: Type.NUMBER }, sellingCostsPercent: { type: Type.NUMBER }, summary: { type: Type.STRING },
        },
        required: ['operatingCostPercent', 'revenueGrowthPercent', 'costInflationPercent', 'lifecycleCapexPercent', 'exitYieldPercent', 'sellingCostsPercent', 'summary'],
      },
    }), 2);
    return parseResult(text);
  } catch (error) {
    console.error('Commercial lifecycle assessment error', error);
    return err(error instanceof Error ? error.message : 'Commercial lifecycle assessment failed.');
  }
}

export async function generateCommercialInvestmentReport(
  context: unknown,
  aiSettings?: AppSettings['ai'],
): Promise<Result<string>> {
  const prompt = `Act as a senior UK commercial development and investment adviser. Write a detailed, professional report for an early-stage commercial development appraisal.

Use only the supplied data. Explain the initial site-scope assessment, the proposed commercial asset mix and revenue basis, lifecycle costs and returns, year-by-year exit analysis, and the ultimate hold or sale recommendation. Use material figures from the supplied assessment evidence where they support the conclusion, but do not refer to uploads, attachments, reports, or AI. Do not invent planning consent, a lease, an occupier, market comparables, or tax assumptions.

Use these headings exactly:
Overview
Site scope and proposed mix
Revenue and lifecycle assumptions
Exit analysis and investment strategy
Recommendation

In the exit section explain the relationship between NOI, exit yield, gross exit value, selling costs, outstanding funding, net sale equity, profit on sale and return on equity. Compare the strongest profit year with the strongest return-on-equity year and make a commercially cautious recommendation. Use complete sentences and punctuation.

CONTEXT:
${JSON.stringify(context, null, 2)}

Return plain text only.`;
  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok && localResult.data.trim()) return ok(localResult.data.trim());
      if (aiSettings.providerMode === 'LOCAL_LM_STUDIO') return localResult;
    }
  }
  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {}), 2);
    return ok(text.trim());
  } catch (error) {
    console.error('Commercial investment report error', error);
    return err(error instanceof Error ? error.message : 'Commercial investment report generation failed.');
  }
}

export type SalesIndexationAssessmentResult = {
  percent: number;
  summary: string;
};

function extractJsonObject<T>(text: string, fallback: T): T {
  const raw = text?.trim() || JSON.stringify(fallback);
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || raw.match(/\{[\s\S]*\}/)?.[0] || raw;
  return JSON.parse(candidate) as T;
}

function dateFromContextValue(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function minimumSalesIndexationPercent(context: unknown): number {
  const record = context && typeof context === 'object' ? context as Record<string, unknown> : {};
  const startDate = dateFromContextValue(record.expectedStartDate);
  const appraisalDate = dateFromContextValue(record.appraisalDate) || dateFromContextValue(record.today);
  if (!startDate || !appraisalDate || startDate <= appraisalDate) return 0;
  const months = Math.max(1, Math.round((startDate.getTime() - appraisalDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
  return Number(Math.max(0.25, (months / 12) * 1.5).toFixed(2));
}

function normaliseSalesIndexationAssessment(
  result: SalesIndexationAssessmentResult,
  context: unknown
): SalesIndexationAssessmentResult {
  const minimumPercent = minimumSalesIndexationPercent(context);
  const parsedPercent = Number(result.percent);
  const aiPercent = Number.isFinite(parsedPercent) ? Math.max(0, parsedPercent) : 0;
  const percent = minimumPercent > 0 ? Math.max(aiPercent, minimumPercent) : aiPercent;
  const summary = typeof result.summary === 'string' && result.summary.trim()
    ? result.summary.trim()
    : 'A cautious sales price indexation allowance has been applied from the appraisal date to the expected site commencement date.';
  const floorNote = minimumPercent > 0 && aiPercent < minimumPercent
    ? ` A cautious minimum allowance of ${minimumPercent.toFixed(2)}% has been applied because the commencement date is after the appraisal date.`
    : '';
  return {
    percent: Number(percent.toFixed(2)),
    summary: `${summary}${floorNote}`,
  };
}

export async function generateSalesIndexationAssessment(
  context: unknown,
  aiSettings?: AppSettings['ai']
): Promise<Result<SalesIndexationAssessmentResult>> {
  const fallback: SalesIndexationAssessmentResult = {
    percent: 0,
    summary: '',
  };
  const prompt = `Act as a cautious UK residential development appraisal analyst.

Estimate a reasonable sales price indexation percentage from the appraisal/current date to the expected site commencement date.
This must be specific to the site location. Use the explicit site address/location where provided. If it is blank, infer location clues from the appraisal name, reference, client, and house-price notes.
Use current/local market evidence where available, including local authority/town-level residential price movement, new-build sales tone, mortgage/rate context, and any supplied pricing assumptions.
If evidence for the exact site or settlement is thin, widen the evidence search in this order:
1. exact site / neighbourhood / settlement
2. nearest comparable town or postcode area
3. local authority area
4. wider regional Scottish market
5. UK-wide residential market indicators
Prefer reliable sources such as Registers of Scotland, UK House Price Index / ONS, Scottish Government housing statistics, recognised bank or estate agency market reports, and credible new-build market commentary. Use wider evidence only to support a cautious local judgement, not as a blind national average.
If live search evidence is unavailable, make that limitation clear and use a cautious local desktop appraisal judgement based on the supplied appraisal evidence.
If the expected commencement date is after the appraisal/current date, return a positive percentage. Do not return 0 for a valid future period; use a cautious allowance if evidence is thin. Return 0 only where the commencement date is not after the appraisal/current date or the dates are missing.

The percentage should be the total expected sales value movement over the full period, not an annual percentage.
Keep the estimate commercially cautious and suitable for an early residual land appraisal.
The summary is a short saved assessment report. It should be 3 to 5 complete sentences explaining:
- the site/location basis used
- whether exact-area evidence was available or whether the assessment widened to a comparable/wider area
- the reliable source types used or searched
- the appraisal date to commencement date period
- the market/evidence logic for the percentage
- any caution/limitations

CONTEXT:
${JSON.stringify(context, null, 2)}

Return JSON only with:
{
  "percent": number,
  "summary": string
}`;

  const parseResult = (text: string): Result<SalesIndexationAssessmentResult> => {
    try {
      const parsed = extractJsonObject<SalesIndexationAssessmentResult>(text, fallback);
      return ok(normaliseSalesIndexationAssessment(parsed, context));
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Sales indexation assessment could not be parsed.');
    }
  };

  if (aiSettings?.providerMode !== 'LOCAL_LM_STUDIO') {
    try {
      const searchText = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
        tools: [{ googleSearch: {} }],
      }), 1);
      const parsed = parseResult(searchText);
      if (parsed.ok) return parsed;
    } catch (searchError) {
      console.warn('Sales indexation search assessment unavailable', searchError);
    }
  }

  if (aiSettings?.providerMode === 'LOCAL_LM_STUDIO' || aiSettings?.providerMode === 'AUTO') {
    const canUseLocal = aiSettings.providerMode === 'LOCAL_LM_STUDIO' || await isLocalAiReady(aiSettings);
    if (canUseLocal) {
      const localResult = await generateLocalChatCompletion(prompt, aiSettings);
      if (localResult.ok) {
        const parsed = parseResult(localResult.data);
        if (parsed.ok) return parsed;
        if (parsed.ok === false && aiSettings.providerMode === 'LOCAL_LM_STUDIO') return err(parsed.error);
      } else if (localResult.ok === false && aiSettings.providerMode === 'LOCAL_LM_STUDIO') {
        return err(localResult.error);
      }
    }
  }

  try {
    const text = await runWithRetry(() => generateContentText(GEMINI_MODEL_FLASH, [{ text: prompt }], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          percent: { type: Type.NUMBER },
          summary: { type: Type.STRING },
        },
        required: ['percent', 'summary'],
      },
    }), 2);
    const parsed = safeParseJson<SalesIndexationAssessmentResult>(text, fallback, 'sales indexation assessment');
    if (parsed.ok) return ok(normaliseSalesIndexationAssessment(parsed.data, context));
    if (parsed.ok === false) return err(parsed.error);
    return err('Sales indexation assessment could not be parsed.');
  } catch (e) {
    console.error('Sales indexation assessment error', e);
    const fallbackAssessment = normaliseSalesIndexationAssessment(fallback, context);
    if (fallbackAssessment.percent > 0) return ok(fallbackAssessment);
    return err(e instanceof Error ? e.message : 'Sales indexation assessment failed.');
  }
}

export type { Result } from "./geminiTypes";
