import type { AppraisalPricingReport } from '../types';

type ManagedEvidenceWriteResult = {
  localEvidencePath: string;
  contentSha256: string;
  size: number;
};

type ManagedEvidenceReadResult = {
  dataBase64: string;
  contentSha256: string;
  size: number;
};

export type AppraisalEvidenceIntegrity = {
  status: NonNullable<AppraisalPricingReport['integrityStatus']>;
  detail: string;
  checkedAt: string;
};

function isDesktopRuntime() {
  return typeof window !== 'undefined' && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

function base64FromDataUrl(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

async function invokeDesktop<T>(command: string, args: Record<string, unknown>) {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

/**
 * New desktop evidence is stored alongside the local database rather than in
 * its JSON appraisal row. Browser-only use remains compatible with embedded
 * files, but the native desktop route is the supported path for large files.
 */
export async function storeAppraisalEvidence(
  report: Pick<AppraisalPricingReport, 'id' | 'fileName' | 'mimeType' | 'size'>,
  dataUrl: string,
): Promise<Pick<AppraisalPricingReport, 'dataUrl' | 'storageMode' | 'localEvidencePath' | 'contentSha256' | 'integrityStatus' | 'integrityCheckedAt'>> {
  if (!isDesktopRuntime()) {
    return { dataUrl, storageMode: 'EMBEDDED', integrityStatus: 'UNAVAILABLE' };
  }

  try {
    const stored = await invokeDesktop<ManagedEvidenceWriteResult>('store_appraisal_evidence', {
      evidenceId: report.id,
      fileName: report.fileName,
      mimeType: report.mimeType,
      dataBase64: base64FromDataUrl(dataUrl),
    });
    return {
      storageMode: 'MANAGED_LOCAL',
      localEvidencePath: stored.localEvidencePath,
      contentSha256: stored.contentSha256,
      integrityStatus: 'VERIFIED',
      integrityCheckedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('Unable to store evidence outside the appraisal database; retaining an embedded copy.', error);
    return {
      dataUrl,
      storageMode: 'EMBEDDED',
      integrityStatus: 'UNAVAILABLE',
    };
  }
}

/** Resolves either a legacy embedded file or a managed local evidence file. */
export async function resolveAppraisalEvidenceDataUrl(report: AppraisalPricingReport): Promise<string | null> {
  if (report.dataUrl) return report.dataUrl;
  if (!report.localEvidencePath || !isDesktopRuntime()) return null;

  try {
    const stored = await invokeDesktop<ManagedEvidenceReadResult>('read_appraisal_evidence', {
      localEvidencePath: report.localEvidencePath,
    });
    if (report.contentSha256 && stored.contentSha256 !== report.contentSha256) return null;
    return `data:${report.mimeType || 'application/octet-stream'};base64,${stored.dataBase64}`;
  } catch (error) {
    console.warn('Unable to read managed appraisal evidence.', error);
    return null;
  }
}

export async function verifyAppraisalEvidence(report: AppraisalPricingReport): Promise<AppraisalEvidenceIntegrity> {
  const checkedAt = new Date().toISOString();
  if (report.dataUrl) {
    return { status: 'VERIFIED', detail: 'Embedded appraisal evidence is available.', checkedAt };
  }
  if (!report.localEvidencePath) {
    return { status: 'MISSING', detail: 'The evidence file is not stored with this appraisal.', checkedAt };
  }
  if (!isDesktopRuntime()) {
    return { status: 'UNAVAILABLE', detail: 'Open this appraisal in the desktop app to check its managed evidence file.', checkedAt };
  }

  try {
    const result = await invokeDesktop<{ exists: boolean; contentSha256?: string }>('verify_appraisal_evidence', {
      localEvidencePath: report.localEvidencePath,
      expectedSha256: report.contentSha256 || null,
    });
    if (!result.exists) return { status: 'MISSING', detail: 'The managed evidence file is missing. Re-upload the source file to relink it.', checkedAt };
    if (report.contentSha256 && result.contentSha256 !== report.contentSha256) {
      return { status: 'CHANGED', detail: 'The managed evidence file no longer matches the appraisal record. Re-upload it to relink the evidence.', checkedAt };
    }
    return { status: 'VERIFIED', detail: 'Managed evidence file verified.', checkedAt };
  } catch (error) {
    return { status: 'UNAVAILABLE', detail: error instanceof Error ? error.message : 'Evidence verification is unavailable.', checkedAt };
  }
}

export function appraisalEvidenceStatusLabel(report: AppraisalPricingReport) {
  if (report.integrityStatus === 'MISSING') return 'Evidence missing - re-upload required';
  if (report.integrityStatus === 'CHANGED') return 'Evidence changed - re-upload required';
  if (report.storageMode === 'MANAGED_LOCAL') return 'Managed local evidence';
  return 'Embedded evidence';
}
