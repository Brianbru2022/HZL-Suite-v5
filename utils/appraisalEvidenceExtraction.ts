import type { AppraisalPricingReport } from '../types';
import { loadExcelJS } from './excelJsRuntime';
import { generateId } from './generateId';
import { resolveAppraisalEvidenceDataUrl, storeAppraisalEvidence } from './appraisalEvidenceStorage';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

// Retain sufficient detail for a substantial commercial viability brief. Downstream
// consumers select bounded, relevant extracts for their model context.
const MAX_EXTRACTED_TEXT_LENGTH = 120000;
const MIN_USABLE_TEXT_LENGTH = 80;

// Vite must serve the PDF.js worker as a concrete asset. Without this explicit
// URL, PDF parsing can work in isolated environments but fails in the desktop
// app when it tries to render a page into an image for the final report.
export async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
  return pdfjs;
}

function truncateExtractedText(value: string) {
  const normalised = cleanEvidenceText(value);
  return normalised.length > MAX_EXTRACTED_TEXT_LENGTH
    ? `${normalised.slice(0, MAX_EXTRACTED_TEXT_LENGTH)}...`
    : normalised;
}

export function cleanEvidenceText(value: string | undefined) {
  return (value || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\uFFFD/g, ' ')
    .replace(/[^\p{L}\p{N}\s.,;:()/%£$€'"&+\-#@?!\[\]{}<>|=_\\]/gu, ' ')
    .replace(/([^\p{L}\p{N}\s])\1{3,}/gu, '$1$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isUsableEvidenceText(value: string | undefined) {
  const text = cleanEvidenceText(value);
  if (text.length < MIN_USABLE_TEXT_LENGTH) return false;
  const compact = text.replace(/\s/g, '');
  if (!compact) return false;
  const alphaNumeric = (compact.match(/[\p{L}\p{N}]/gu) || []).length;
  const ordinary = (compact.match(/[\p{L}\p{N}.,;:()/%£$€'"&+\-#@?!]/gu) || []).length;
  const nonWestern = (compact.match(/[^\x20-\x7E£€]/g) || []).length;
  const brokenRuns = (text.match(/[^\x20-\x7E£€\s]{2,}/g) || []).length;
  const words = text.match(/\b[\p{L}]{3,}\b/gu) || [];
  return words.length >= 10
    && alphaNumeric / compact.length >= 0.45
    && ordinary / compact.length >= 0.9
    && nonWestern / compact.length <= 0.04
    && brokenRuns <= 2;
}

function usableOrWarning(text: string, warning: string) {
  const extractedText = truncateExtractedText(text);
  if (isUsableEvidenceText(extractedText)) {
    return {
      extractedText,
      extractionStatus: 'EXTRACTED' as const,
      extractionError: '',
    };
  }
  return {
    extractedText: '',
    extractionStatus: 'WARNING' as const,
    extractionError: warning,
  };
}

function extensionFor(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function isPlainText(mimeType: string, extension: string) {
  return mimeType.startsWith('text/')
    || ['txt', 'csv', 'json', 'xml', 'html', 'htm', 'md', 'eml', 'msg'].includes(extension);
}

function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return `data:${mimeType || 'application/octet-stream'};base64,${btoa(binary)}`;
}

export function dataUrlToArrayBuffer(dataUrl: string) {
  const [, rawData = dataUrl] = dataUrl.split(',');
  const binary = atob(rawData);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function extractDocxText(buffer: ArrayBuffer) {
  const jsZipModule = await import('jszip');
  const JSZip = jsZipModule.default || jsZipModule;
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) throw new Error('No Word document text was found.');
  return documentXml
    .replace(/<w:tab\/>/g, ' ')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractXlsxText(buffer: ArrayBuffer) {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const lines: string[] = [];
  workbook.eachSheet((sheet) => {
    lines.push(`Sheet: ${sheet.name}`);
    sheet.eachRow((row) => {
      const values = row.values;
      if (Array.isArray(values)) {
        const text = values
          .slice(1)
          .map((value) => {
            if (value == null) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
          })
          .filter(Boolean)
          .join(' | ');
        if (text) lines.push(text);
      }
    });
  });
  return lines.join('\n');
}

function extractBasicPdfText(buffer: ArrayBuffer) {
  const raw = new TextDecoder('latin1').decode(buffer);
  const matches = Array.from(raw.matchAll(/\((?:\\.|[^\\)]){3,}\)/g))
    .map((match) => match[0].slice(1, -1)
      .replace(/\\\)/g, ')')
      .replace(/\\\(/g, '(')
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\+/g, ' '))
    .filter((text) => /[A-Za-z]{3,}/.test(text));
  return matches.join(' ');
}

async function extractPdfText(buffer: ArrayBuffer) {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer.slice(0)),
    disableFontFace: true,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const lines: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ');
      if (pageText.trim()) lines.push(pageText);
    }
  } finally {
    await loadingTask.destroy();
  }
  return lines.join('\n');
}

export async function extractAppraisalEvidenceText(fileName: string, mimeType: string, buffer: ArrayBuffer) {
  const extension = extensionFor(fileName);
  try {
    if (isPlainText(mimeType, extension)) {
      return usableOrWarning(new TextDecoder().decode(buffer), 'The file text was extracted but was not readable enough to use in report prose.');
    }
    if (extension === 'docx' || mimeType.includes('wordprocessingml.document')) {
      return usableOrWarning(await extractDocxText(buffer), 'The Word document text was extracted but was not readable enough to use in report prose.');
    }
    if (extension === 'xlsx' || mimeType.includes('spreadsheetml.sheet')) {
      return usableOrWarning(await extractXlsxText(buffer), 'The spreadsheet text was extracted but was not readable enough to use in report prose.');
    }
    if (extension === 'pdf' || mimeType === 'application/pdf') {
      try {
        return usableOrWarning(await extractPdfText(buffer), 'PDF text could not be reliably extracted. The report will rely on values, notes and linked sources instead.');
      } catch {
        const extractedText = truncateExtractedText(extractBasicPdfText(buffer));
        if (isUsableEvidenceText(extractedText)) {
          return {
            extractedText,
            extractionStatus: 'WARNING' as const,
            extractionError: 'Fallback PDF text extraction was used; scanned or compressed PDF text may be incomplete.',
          };
        }
      }
      return {
        extractedText: '',
        extractionStatus: 'WARNING' as const,
        extractionError: 'PDF text could not be reliably extracted. Add notes or upload a text-based report for fuller AI narrative.',
      };
    }
    return {
      extractedText: '',
      extractionStatus: 'UNSUPPORTED' as const,
      extractionError: 'This file type is stored as evidence but text extraction is not supported.',
    };
  } catch (error) {
    return {
      extractedText: '',
      extractionStatus: 'FAILED' as const,
      extractionError: error instanceof Error ? error.message : 'Text extraction failed.',
    };
  }
}

export async function buildAppraisalPricingReportFromFile(file: File): Promise<AppraisalPricingReport> {
  const buffer = await file.arrayBuffer();
  const mimeType = file.type || 'application/octet-stream';
  const extraction = await extractAppraisalEvidenceText(file.name, mimeType, buffer);
  const id = generateId();
  const dataUrl = arrayBufferToDataUrl(buffer, mimeType);
  const storage = await storeAppraisalEvidence({ id, fileName: file.name, mimeType, size: file.size }, dataUrl);
  return {
    id,
    fileName: file.name,
    mimeType,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    ...storage,
    notes: '',
    extractedAt: new Date().toISOString(),
    ...extraction,
  };
}

export async function ensureAppraisalReportExtracted(report: AppraisalPricingReport): Promise<AppraisalPricingReport> {
  if (report.extractionStatus && report.extractionStatus !== 'PENDING') {
    const extension = extensionFor(report.fileName);
    const shouldRetryPdf = (extension === 'pdf' || report.mimeType === 'application/pdf')
      && report.extractionStatus === 'WARNING'
      && report.dataUrl
      && !isUsableEvidenceText(report.extractedText);
    if (!shouldRetryPdf) return report;
  }
  const dataUrl = await resolveAppraisalEvidenceDataUrl(report);
  if (!dataUrl) {
    return {
      ...report,
      integrityStatus: 'MISSING',
      integrityCheckedAt: new Date().toISOString(),
      extractionStatus: 'WARNING',
      extractionError: 'The managed evidence file is unavailable. Re-upload the source file to relink it.',
    };
  }
  const buffer = dataUrlToArrayBuffer(dataUrl);
  const extraction = await extractAppraisalEvidenceText(report.fileName, report.mimeType, buffer);
  return {
    ...report,
    extractedAt: new Date().toISOString(),
    ...extraction,
  };
}
