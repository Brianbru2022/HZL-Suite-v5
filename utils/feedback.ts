function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').replace(/[. ]+$/g, '');
}

function withPeriod(text: string): string {
  const normalized = normalize(text);
  return normalized ? `${normalized}.` : '';
}

export function feedbackSuccess(subject: string, detail?: string): string {
  return withPeriod(detail ? `${subject} complete. ${detail}` : `${subject} complete`);
}

export function feedbackSaved(subject: string): string {
  return withPeriod(`${subject} saved successfully`);
}

export function feedbackError(subject: string, error?: unknown, fallback = 'Please try again.'): string {
  const detail = typeof error === 'string'
    ? normalize(error)
    : error instanceof Error && error.message
      ? normalize(error.message)
      : normalize(fallback);

  return withPeriod(`${subject} couldn't be completed. ${detail || normalize(fallback)}`);
}
