import type { BoQItem } from '../types';

export type LibraryCommentMarker = {
  chips: string[];
  highlightTerms: string[];
};

const PARENT_HEADING_TYPES = new Set<BoQItem['type']>(['GENERAL_HEADING', 'MAJOR_HEADING', 'SUB_SECTION', 'MINOR_HEADING']);
const COMMENT_TYPES = new Set<BoQItem['type']>(['COMMENT', 'SUB_COMMENT']);

const STOP_WORDS = new Set([
  'about',
  'above',
  'after',
  'again',
  'against',
  'allow',
  'allowed',
  'allowance',
  'also',
  'and',
  'any',
  'are',
  'been',
  'being',
  'bill',
  'boq',
  'but',
  'can',
  'clause',
  'clauses',
  'comment',
  'complete',
  'contract',
  'contractor',
  'cost',
  'description',
  'does',
  'each',
  'else',
  'from',
  'have',
  'include',
  'included',
  'including',
  'into',
  'item',
  'items',
  'line',
  'lines',
  'make',
  'may',
  'must',
  'not',
  'note',
  'only',
  'other',
  'provisional',
  'provide',
  'provided',
  'quantity',
  'rate',
  'section',
  'shall',
  'should',
  'standard',
  'standards',
  'sum',
  'that',
  'the',
  'their',
  'then',
  'there',
  'these',
  'this',
  'under',
  'unit',
  'use',
  'used',
  'when',
  'where',
  'which',
  'with',
  'work',
  'works',
]);

type Candidate = {
  key: string;
  label: string;
  index: number;
};

function normalizeTerm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
}

function isUsefulWord(value: string) {
  const normalized = normalizeTerm(value);
  return normalized.length >= 4
    && !STOP_WORDS.has(normalized)
    && !/^\d+$/.test(normalized);
}

function extractCandidates(description: string): Candidate[] {
  const matches = Array.from(description.matchAll(/[A-Za-z][A-Za-z0-9-]{3,}/g));
  const words = matches
    .map((match) => ({
      key: normalizeTerm(match[0]),
      label: match[0],
      index: match.index ?? 0,
    }))
    .filter((candidate) => isUsefulWord(candidate.key));

  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < words.length - 1; index += 1) {
    const first = words[index];
    const second = words[index + 1];
    if (second.index - first.index > first.label.length + 8) continue;
    const phraseKey = `${first.key} ${second.key}`;
    if (!seen.has(phraseKey)) {
      seen.add(phraseKey);
      candidates.push({ key: phraseKey, label: `${first.label} ${second.label}`, index: first.index });
    }
  }

  for (const word of words) {
    if (!seen.has(word.key)) {
      seen.add(word.key);
      candidates.push(word);
    }
  }

  return candidates;
}

export function buildLibraryCommentMarkers(items: BoQItem[]): Record<string, LibraryCommentMarker> {
  const markers: Record<string, LibraryCommentMarker> = {};
  const groups = new Map<string, BoQItem[]>();
  let currentParentId = 'root';

  for (const item of items) {
    if (PARENT_HEADING_TYPES.has(item.type)) {
      currentParentId = item.id || `heading-${item.reference || item.description}`;
      continue;
    }
    if (!COMMENT_TYPES.has(item.type)) continue;
    const group = groups.get(currentParentId) || [];
    group.push(item);
    groups.set(currentParentId, group);
  }

  for (const comments of groups.values()) {
    if (comments.length < 2) {
      comments.forEach((comment) => {
        markers[comment.id] = { chips: [], highlightTerms: [] };
      });
      continue;
    }

    const candidatesByComment = comments.map((comment) => ({
      comment,
      candidates: extractCandidates(comment.description || ''),
    }));

    const documentFrequency = new Map<string, number>();
    for (const entry of candidatesByComment) {
      const keys = new Set(entry.candidates.map((candidate) => candidate.key));
      keys.forEach((key) => documentFrequency.set(key, (documentFrequency.get(key) || 0) + 1));
    }

    for (const entry of candidatesByComment) {
      const labelByKey = new Map(entry.candidates.map((candidate) => [candidate.key, candidate.label]));
      const indexByKey = new Map(entry.candidates.map((candidate) => [candidate.key, candidate.index]));
      const scored = Array.from(labelByKey.keys())
        .map((key) => {
          const frequency = documentFrequency.get(key) || 0;
          const isPhrase = key.includes(' ');
          return {
            key,
            label: labelByKey.get(key) || key,
            score: (comments.length - frequency) + (isPhrase ? 0.35 : 0),
            frequency,
            index: indexByKey.get(key) || 0,
          };
        })
        .filter((candidate) => candidate.frequency < comments.length)
        .sort((a, b) => b.score - a.score || a.index - b.index || a.key.localeCompare(b.key));

      markers[entry.comment.id] = {
        chips: scored.slice(0, 3).map((candidate) => candidate.label),
        highlightTerms: scored.map((candidate) => candidate.label),
      };
    }
  }

  return markers;
}
