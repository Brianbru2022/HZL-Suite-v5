/**
 * Result type for Gemini service: callers can distinguish success data from errors.
 */

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T>(message: string): Result<T> {
  return { ok: false, error: message };
}

/** Content part for Gemini API (text or inline image/data). */
export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };
