import { describe, expect, it } from 'vitest';
import { assertExportArtifact, verifyExportArtifact } from './exportArtifactVerification';

describe('export artifact verification', () => {
  it('accepts PDF and Office Open XML signatures', async () => {
    await expect(assertExportArtifact(new Blob(['%PDF-1.7\ncontent']), 'report.pdf')).resolves.toMatchObject({ kind: 'PDF', valid: true });
    await expect(assertExportArtifact(new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])]), 'report.xlsx')).resolves.toMatchObject({ kind: 'XLSX', valid: true });
    await expect(assertExportArtifact(new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])]), 'report.docx')).resolves.toMatchObject({ kind: 'DOCX', valid: true });
  });

  it('rejects a corrupt PDF before it is saved', async () => {
    await expect(verifyExportArtifact(new Blob(['not a PDF']), 'report.pdf')).resolves.toMatchObject({ valid: false });
    await expect(assertExportArtifact(new Blob(['not a PDF']), 'report.pdf')).rejects.toThrow('PDF signature');
  });
});
