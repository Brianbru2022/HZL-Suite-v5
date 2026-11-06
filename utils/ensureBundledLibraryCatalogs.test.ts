import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  importLibrariesToRepository: vi.fn(),
  renameLibrary: vi.fn(),
}));

vi.mock('./appPersistence', () => ({ getDatabase: mocks.getDatabase }));
vi.mock('./libraryRepository', () => ({
  importLibrariesToRepository: mocks.importLibrariesToRepository,
  renameLibrary: mocks.renameLibrary,
}));

describe('bundled library installation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renames an existing complete CostAdviser catalogue without replacing its items', async () => {
    mocks.getDatabase.mockResolvedValue({ select: vi.fn().mockResolvedValue([{
      name: 'CostAdviser SMM7 BQ Library',
      item_count: 11483,
    }]) });
    mocks.renameLibrary.mockResolvedValue([]);
    const { ensureCostAdviserSmm7Library } = await import('./ensureCostAdviserSmm7Library');
    await ensureCostAdviserSmm7Library();
    expect(mocks.renameLibrary).toHaveBeenCalledWith('builtin-costadviser-smm7-bq', 'SMM7 [CA-Edition]');
    expect(mocks.importLibrariesToRepository).not.toHaveBeenCalled();
  });

  it('installs the E-Edition catalogue only when absent', async () => {
    mocks.getDatabase.mockResolvedValue({ select: vi.fn().mockResolvedValue([]) });
    mocks.importLibrariesToRepository.mockResolvedValue([]);
    const { ensureENrm2Library } = await import('./ensureENrm2Library');
    await ensureENrm2Library();
    expect(mocks.importLibrariesToRepository).toHaveBeenCalledOnce();
    const [libraries, locked] = mocks.importLibrariesToRepository.mock.calls[0];
    expect(locked).toBe(false);
    expect(libraries).toHaveLength(1);
    expect(libraries[0].id).toBe('builtin-nrm2-e-edition');
    expect(libraries[0].name).toBe('NRM2 [E-Edition]');
    expect(libraries[0].folders).toHaveLength(34);
  });

  it('installs the 2018r1 SMM7 catalogue only when absent', async () => {
    mocks.getDatabase.mockResolvedValue({ select: vi.fn().mockResolvedValue([]) });
    mocks.importLibrariesToRepository.mockResolvedValue([]);
    const { ensureE2018Smm7Library } = await import('./ensureE2018Smm7Library');
    await ensureE2018Smm7Library();
    expect(mocks.importLibrariesToRepository).toHaveBeenCalledOnce();
    const [libraries, locked] = mocks.importLibrariesToRepository.mock.calls[0];
    expect(locked).toBe(false);
    expect(libraries).toHaveLength(1);
    expect(libraries[0].id).toBe('builtin-smm7-e2018-edition');
    expect(libraries[0].name).toBe('SMM7 Library [E2018-Edition]');
    expect(libraries[0].folders).toHaveLength(17);
  });
});
