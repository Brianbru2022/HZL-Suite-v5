import { describe, expect, it } from 'vitest';
import { buildCommercialAssessmentEvidence } from './commercialAssessmentEvidence';

describe('commercial assessment evidence', () => {
  it('retains usable extracted text and promotes commercial figures for assessment context', () => {
    const evidence = buildCommercialAssessmentEvidence([{
      id: 'brief',
      fileName: 'criteria.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 10,
      uploadedAt: '2026-07-01T00:00:00.000Z',
      dataUrl: 'data:text/plain;base64,dGVzdA==',
      notes: 'Use the proposed commercial criteria.',
      extractedText: 'The 2,300 m2 site allows a 320 m2 building, 32 spaces, £420 per m2 per annum income and a 5.25% exit yield. Servicing is from the east access road.',
      extractionStatus: 'EXTRACTED',
    }]);

    expect(evidence?.extractedText).toContain('2,300 m2 site');
    expect(evidence?.figures).toEqual(expect.arrayContaining(['2,300 m2', '320 m2', '32 spaces', '£420', '5.25%']));
  });
});
