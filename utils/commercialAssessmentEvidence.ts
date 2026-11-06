import type { AppraisalPricingReport } from '../types';
import { cleanEvidenceText, isUsableEvidenceText } from './appraisalEvidenceExtraction';

const MAX_TEXT_LENGTH = 24000;
const MAX_FIGURES = 80;

export type CommercialAssessmentEvidence = {
  notes: string[];
  extractedText: string;
  figures: string[];
};

function extractFigures(text: string) {
  const matches = text.match(/(?:£\s?|GBP\s?)\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s?(?:m2|sqm|ft2|spaces?|units?|beds?|rooms?|months?|years?|%|pa|p\.a\.)(?=\s|$|[,.;:])/gi) || [];
  return [...new Set(matches.map((value) => value.replace(/\s+/g, ' ').trim()))].slice(0, MAX_FIGURES);
}

function selectRelevantEvidence(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const keywords = /\b(site area|area|acres?|floor area|parking|spaces?|bays?|cost|price|value|land|rent|income|revenue|yield|profit|finance|interest|lifecycle|capex|programme|months?|years?|risk|constraint|recommend)/i;
  const selected = new Set<number>();
  let length = 0;
  const include = (index: number) => {
    const sentence = sentences[index]?.trim();
    if (!sentence || selected.has(index) || length + sentence.length + 1 > maxLength) return;
    selected.add(index);
    length += sentence.length + 1;
  };

  // Keep the report basis and recommendation, then draw evidence from across the document.
  sentences.slice(0, 22).forEach((_, index) => include(index));
  sentences.forEach((sentence, index) => {
    if (keywords.test(sentence)) include(index);
  });
  return Array.from(selected).sort((left, right) => left - right).map((index) => sentences[index].trim()).join(' ');
}

export function buildCommercialAssessmentEvidence(reports: AppraisalPricingReport[] | undefined): CommercialAssessmentEvidence | undefined {
  const usable = (reports || []).map((report) => ({
    text: cleanEvidenceText(report.extractedText),
    note: cleanEvidenceText(report.notes),
  })).filter((entry) => isUsableEvidenceText(entry.text) || entry.note.length > 0);
  if (usable.length === 0) return undefined;
  const extractedText = selectRelevantEvidence(usable.map((entry) => entry.text).filter(Boolean).join('\n\n'), MAX_TEXT_LENGTH);
  return {
    notes: usable.map((entry) => entry.note).filter(Boolean),
    extractedText,
    figures: extractFigures(extractedText),
  };
}
