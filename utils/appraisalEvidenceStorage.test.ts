import { describe, expect, it, vi } from 'vitest';
import { createDefaultAppraisalOption, normalizeDevelopmentAppraisalOption } from './appraisal';
import {
  appraisalEvidenceStatusLabel,
  resolveAppraisalEvidenceDataUrl,
  storeAppraisalEvidence,
  verifyAppraisalEvidence,
} from './appraisalEvidenceStorage';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => ({ localEvidencePath: 'evidence/ab/abc.bin', contentSha256: 'abc', size: 4 })),
}));

const report = {
  id: 'evidence-1',
  fileName: 'brief.pdf',
  mimeType: 'application/pdf',
  size: 12,
  uploadedAt: '2026-08-31T12:00:00.000Z',
};

describe('appraisal evidence storage', () => {
  it('uses managed storage when Tauri internals are available without the optional global API', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: { invoke: () => undefined } });
    try {
      const stored = await storeAppraisalEvidence(report, 'data:application/pdf;base64,dGVzdA==');
      expect(stored).toMatchObject({ storageMode: 'MANAGED_LOCAL', localEvidencePath: 'evidence/ab/abc.bin' });
      expect(stored.dataUrl).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps managed evidence links when an appraisal is saved and reopened', () => {
    const managed = { ...report, storageMode: 'MANAGED_LOCAL' as const,
      localEvidencePath: 'evidence/ab/abc.bin', contentSha256: 'abc', integrityStatus: 'VERIFIED' as const };
    const option = normalizeDevelopmentAppraisalOption({
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      architectFeasibilityLayouts: [managed],
      baseMeasurementFiles: [managed],
      pricingReport: managed,
    });
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)));
    expect(reopened.architectFeasibilityLayouts?.[0]).toMatchObject(managed);
    expect(reopened.baseMeasurementFiles?.[0]).toMatchObject(managed);
    expect(reopened.pricingReport).toMatchObject(managed);
  });

  it('retains a compatible embedded file outside the desktop runtime', async () => {
    const stored = await storeAppraisalEvidence(report, 'data:application/pdf;base64,dGVzdA==');

    expect(stored).toMatchObject({
      storageMode: 'EMBEDDED',
      dataUrl: 'data:application/pdf;base64,dGVzdA==',
      integrityStatus: 'UNAVAILABLE',
    });
  });

  it('resolves and labels legacy embedded evidence', async () => {
    const embedded = { ...report, dataUrl: 'data:application/pdf;base64,dGVzdA==' };

    await expect(resolveAppraisalEvidenceDataUrl(embedded)).resolves.toBe(embedded.dataUrl);
    await expect(verifyAppraisalEvidence(embedded)).resolves.toMatchObject({ status: 'VERIFIED' });
    expect(appraisalEvidenceStatusLabel(embedded)).toBe('Embedded evidence');
  });

  it('identifies an unlinked managed-evidence record', async () => {
    const unlinked = { ...report, storageMode: 'MANAGED_LOCAL' as const };

    await expect(resolveAppraisalEvidenceDataUrl(unlinked)).resolves.toBeNull();
    await expect(verifyAppraisalEvidence(unlinked)).resolves.toMatchObject({ status: 'MISSING' });
    expect(appraisalEvidenceStatusLabel({ ...unlinked, integrityStatus: 'MISSING' })).toContain('re-upload');
  });
});
