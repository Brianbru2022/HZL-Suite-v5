export type ExportArtifactKind = 'PDF' | 'XLSX' | 'DOCX' | 'OTHER';

function kindFromFilename(filename: string): ExportArtifactKind {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'PDF';
  if (extension === 'xlsx') return 'XLSX';
  if (extension === 'docx') return 'DOCX';
  return 'OTHER';
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export async function verifyExportArtifact(blob: Blob, filename: string): Promise<{ kind: ExportArtifactKind; valid: boolean; message?: string }> {
  const kind = kindFromFilename(filename);
  if (kind === 'OTHER') return { kind, valid: blob.size > 0, message: blob.size > 0 ? undefined : 'The export is empty.' };
  if (blob.size === 0) return { kind, valid: false, message: 'The export is empty.' };

  const bytes = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  if (kind === 'PDF') {
    return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])
      ? { kind, valid: true }
      : { kind, valid: false, message: 'The generated file does not have a PDF signature.' };
  }

  return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])
    ? { kind, valid: true }
    : { kind, valid: false, message: `The generated ${kind === 'XLSX' ? 'Excel' : 'Word'} file is not a valid ZIP container.` };
}

export async function assertExportArtifact(blob: Blob, filename: string) {
  const result = await verifyExportArtifact(blob, filename);
  if (!result.valid) throw new Error(result.message || 'The generated export could not be verified.');
  return result;
}
