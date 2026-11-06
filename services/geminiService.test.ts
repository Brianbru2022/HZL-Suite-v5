import { describe, it, expect } from 'vitest';
import { sanitizeUnit } from './geminiService';
import { UnitType } from '../types';

describe('sanitizeUnit', () => {
  it('returns empty for empty input', () => {
    expect(sanitizeUnit('')).toBe('');
  });

  it('normalizes linear meters', () => {
    expect(sanitizeUnit('m')).toBe(UnitType.M);
    expect(sanitizeUnit('M')).toBe(UnitType.M);
    expect(sanitizeUnit('lm')).toBe(UnitType.M);
    expect(sanitizeUnit('linear')).toBe(UnitType.M);
    expect(sanitizeUnit('m.')).toBe(UnitType.M);
  });

  it('normalizes area m²', () => {
    expect(sanitizeUnit('m2')).toBe(UnitType.M2);
    expect(sanitizeUnit('m²')).toBe(UnitType.M2);
    expect(sanitizeUnit('sqm')).toBe(UnitType.M2);
    expect(sanitizeUnit('square metre')).toBe(UnitType.M2);
  });

  it('normalizes volume m³', () => {
    expect(sanitizeUnit('m3')).toBe(UnitType.M3);
    expect(sanitizeUnit('m³')).toBe(UnitType.M3);
    expect(sanitizeUnit('cum')).toBe(UnitType.M3);
    expect(sanitizeUnit('cubic')).toBe(UnitType.M3);
  });

  it('normalizes number/no', () => {
    expect(sanitizeUnit('nr')).toBe(UnitType.NR);
    expect(sanitizeUnit('no')).toBe(UnitType.NR);
    expect(sanitizeUnit('no.')).toBe(UnitType.NR);
    expect(sanitizeUnit('each')).toBe(UnitType.NR);
  });

  it('normalizes kg and tonnes', () => {
    expect(sanitizeUnit('kg')).toBe(UnitType.KG);
    expect(sanitizeUnit('t')).toBe(UnitType.T);
    expect(sanitizeUnit('tonne')).toBe(UnitType.T);
  });

  it('returns raw string when no match and short', () => {
    expect(sanitizeUnit('xyz')).toBe('xyz');
  });

  it('returns NR for long unknown strings', () => {
    expect(sanitizeUnit('somethinglong')).toBe(UnitType.NR);
  });
});

describe('Gemini response shapes (parse safety)', () => {
  it('BoQ suggestions shape: suggestions array with description and unit', () => {
    const valid = JSON.stringify({
      suggestions: [
        { description: 'Excavate topsoil', unit: 'm³' },
        { description: 'Concrete base', unit: 'm²' },
      ],
    });
    const parsed = JSON.parse(valid) as { suggestions?: { description: string; unit: string }[] };
    expect(parsed.suggestions).toHaveLength(2);
    expect(parsed.suggestions![0].description).toBe('Excavate topsoil');
    expect(parsed.suggestions![0].unit).toBe('m³');
  });

  it('AIClarification shape: needsClarification and questions', () => {
    const valid = JSON.stringify({ needsClarification: true, questions: ['What depth?'] });
    const parsed = JSON.parse(valid) as { needsClarification: boolean; questions: string[] };
    expect(parsed.needsClarification).toBe(true);
    expect(parsed.questions).toEqual(['What depth?']);
  });

  it('invalid JSON throws', () => {
    expect(() => JSON.parse('not json')).toThrow(SyntaxError);
    expect(() => JSON.parse('{')).toThrow();
  });
});
