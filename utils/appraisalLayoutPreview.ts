import type { AppraisalPricingReport, DevelopmentAppraisalOption } from '../types';
import { dataUrlToArrayBuffer, loadPdfJs } from './appraisalEvidenceExtraction';
import { resolveAppraisalEvidenceDataUrl } from './appraisalEvidenceStorage';

export type AppraisalLayoutPreview = {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  fileName: string;
  width: number;
  height: number;
};

function isPdfLayout(report: AppraisalPricingReport) {
  return report.mimeType === 'application/pdf' || /\.pdf$/i.test(report.fileName);
}

function isImageLayout(report: AppraisalPricingReport) {
  return report.mimeType.startsWith('image/') || /\.(png|jpe?g)$/i.test(report.fileName);
}

export function currentArchitectFeasibilityLayout(option: Pick<DevelopmentAppraisalOption, 'architectFeasibilityLayouts'>) {
  return (option.architectFeasibilityLayouts || [])
    .slice()
    .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime())
    .find((report) => isPdfLayout(report) || isImageLayout(report));
}

export async function renderArchitectFeasibilityLayout(report: AppraisalPricingReport | undefined): Promise<AppraisalLayoutPreview | null> {
  if (!report) return null;
  const dataUrl = await resolveAppraisalEvidenceDataUrl(report);
  if (!dataUrl) return null;
  if (isImageLayout(report)) {
    const isPng = report.mimeType === 'image/png' || /\.png$/i.test(report.fileName);
    if (typeof Image === 'undefined') return null;
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to load architect layout image.'));
      image.src = dataUrl;
    });
    return { dataUrl, format: isPng ? 'PNG' : 'JPEG', fileName: report.fileName, width: image.naturalWidth, height: image.naturalHeight };
  }
  if (!isPdfLayout(report) || typeof document === 'undefined') return null;

  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(dataUrlToArrayBuffer(dataUrl)),
    disableFontFace: true,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const initialViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, Math.max(1, 1500 / Math.max(initialViewport.width, 1)));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // pdfjs-dist v6 accepts either `canvas` or `canvasContext`. Passing both
    // makes it reject the render at runtime, which previously hid layouts in
    // exported reports because the caller treated the rejection as no layout.
    await page.render({ canvas, viewport }).promise;
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), format: 'JPEG', fileName: report.fileName, width: canvas.width, height: canvas.height };
  } finally {
    await loadingTask.destroy();
  }
}
