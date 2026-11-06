/**
 * Centralized Gemini model names for consistency and easier A/B or env-driven config.
 * To override: set VITE_GEMINI_MODEL_FLASH / VITE_GEMINI_MODEL_PRO in .env and
 * add define in vite.config if needed.
 */
export const GEMINI_MODEL_FLASH = "gemini-3.1-pro-preview";
export const GEMINI_MODEL_PRO = "gemini-3.1-pro-preview";

/** Use Pro when files/images are present for better understanding; otherwise Flash. */
export function modelForAnalysis(hasFiles: boolean): string {
  return hasFiles ? GEMINI_MODEL_PRO : GEMINI_MODEL_FLASH;
}

/** Use Pro for hierarchy when attachments are present. */
export function modelForHierarchy(hasFiles: boolean): string {
  return hasFiles ? GEMINI_MODEL_PRO : GEMINI_MODEL_FLASH;
}
