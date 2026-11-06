import { describe, expect, it } from 'vitest';
import type { BoQItem } from '../types';
import { buildLibraryCommentMarkers } from './libraryCommentMarkers';

const item = (id: string, type: BoQItem['type'], description: string): BoQItem => ({
  id,
  type,
  reference: '',
  description,
  unit: '',
  quantity: 0,
  rate: 0,
  total: 0,
});

describe('library comment markers', () => {
  it('extracts distinctive comment chips under the same heading', () => {
    const markers = buildLibraryCommentMarkers([
      item('h1', 'MAJOR_HEADING', 'Access notes'),
      item('c1', 'COMMENT', 'Access restrictions for occupied healthcare areas.'),
      item('c2', 'COMMENT', 'Access restrictions for school safeguarding areas.'),
    ]);

    expect(markers.c1.chips.join(' ').toLowerCase()).toContain('healthcare');
    expect(markers.c2.chips.join(' ').toLowerCase()).toContain('school');
    expect(markers.c1.highlightTerms.join(' ').toLowerCase()).toContain('healthcare');
    expect(markers.c2.highlightTerms.join(' ').toLowerCase()).toContain('safeguarding');
  });

  it('keeps groups separated by nearest parent heading', () => {
    const markers = buildLibraryCommentMarkers([
      item('h1', 'MAJOR_HEADING', 'Access notes'),
      item('c1', 'COMMENT', 'Temporary vehicle route constraints.'),
      item('h2', 'SUB_SECTION', 'Boundary notes'),
      item('c2', 'COMMENT', 'Temporary vehicle route constraints.'),
      item('c3', 'COMMENT', 'Boundary dispute evidence records.'),
    ]);

    expect(markers.c1.chips).toEqual([]);
    expect(markers.c2.chips.join(' ').toLowerCase()).toContain('vehicle');
    expect(markers.c3.chips.join(' ').toLowerCase()).toContain('boundary');
  });

  it('ignores generic library words', () => {
    const markers = buildLibraryCommentMarkers([
      item('h1', 'GENERAL_HEADING', 'Notes'),
      item('c1', 'COMMENT', 'Include standard item description for phasing constraints.'),
      item('c2', 'COMMENT', 'Include standard item description for drainage constraints.'),
    ]);

    expect(markers.c1.chips.map((chip) => chip.toLowerCase())).not.toContain('standard');
    expect(markers.c1.chips.join(' ').toLowerCase()).toContain('phasing');
    expect(markers.c2.chips.join(' ').toLowerCase()).toContain('drainage');
  });

  it('groups sub-comments beneath minor headings', () => {
    const markers = buildLibraryCommentMarkers([
      item('h1', 'MINOR_HEADING', 'Plot notes'),
      item('c1', 'SUB_COMMENT', 'Confirm scaffold access for terraced plots.'),
      item('c2', 'SUB_COMMENT', 'Confirm scaffold access for detached plots.'),
    ]);

    expect(markers.c1.chips.join(' ').toLowerCase()).toContain('terraced');
    expect(markers.c2.chips.join(' ').toLowerCase()).toContain('detached');
  });

  it('returns empty markers for isolated comments and no markers for non-comments', () => {
    const source = [
      item('h1', 'GENERAL_HEADING', 'Notes'),
      item('c1', 'COMMENT', 'Only one comment here.'),
      item('p1', 'PRICED', 'Measured item.'),
    ];
    const before = source.map((entry) => entry.description);
    const markers = buildLibraryCommentMarkers(source);

    expect(markers.c1).toEqual({ chips: [], highlightTerms: [] });
    expect(markers.p1).toBeUndefined();
    expect(source.map((entry) => entry.description)).toEqual(before);
  });
});
