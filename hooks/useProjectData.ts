import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { Project, ItemLibrary, TradePackage, DevelopmentAppraisal, AppraisalHouseTypeLibraryItem, AppraisalRateLibraryItem, WorkspaceFolder } from '../types';
import {
  loadPersistedAppSettings,
  loadPersistedAppState,
  parseStoredJson,
  persistAppState,
  persistAppSettings,
  type EntityMutation,
  type PersistedStateKey,
  type PersistenceBackend,
} from '../utils/appPersistence';
import { DEFAULT_APP_SETTINGS, normalizeAppSettings, type AppSettings } from '../utils/appSettings';
import { setLocalCrashReportingConsent } from '../utils/crashReporting';
import { normalizeAppraisalHouseTypeLibraryItems, normalizeAppraisalRateLibraryItems, normalizeDevelopmentAppraisals } from '../utils/appraisal';
import { preserveFrozenAppraisals } from '../utils/appraisalFreeze';
import { normalizeWorkspaceFolders } from '../utils/workspaceFolders';
import { startAppraisalPerformance } from '../utils/appraisalPerformance';
import { ensureAhSmm7Library } from '../utils/ensureAhSmm7Library';
import { ensureCostAdviserSmm7Library } from '../utils/ensureCostAdviserSmm7Library';
import { ensureENrm2Library } from '../utils/ensureENrm2Library';
import { ensureE2018Smm7Library } from '../utils/ensureE2018Smm7Library';

const PERSIST_DEBOUNCE_MS = 400;
const PERSISTENCE_KEYS = ['projects', 'libraries', 'trades', 'appraisals', 'appraisalHouseTypes', 'appraisalRates', 'workspaceFolders'] as const;
const UNDO_LIMIT = 40;

type WorkspaceSnapshot = {
  projects: Project[];
  libraries: ItemLibrary[];
  trades: TradePackage[];
  appraisals: DevelopmentAppraisal[];
  appraisalHouseTypes: AppraisalHouseTypeLibraryItem[];
  appraisalRates: AppraisalRateLibraryItem[];
  workspaceFolders: WorkspaceFolder[];
  appSettings: AppSettings;
};

function sameWorkspaceSnapshot(left: WorkspaceSnapshot, right: WorkspaceSnapshot) {
  return left.projects === right.projects
    && left.libraries === right.libraries
    && left.trades === right.trades
    && left.appraisals === right.appraisals
    && left.appraisalHouseTypes === right.appraisalHouseTypes
    && left.appraisalRates === right.appraisalRates
    && left.workspaceFolders === right.workspaceFolders
    && left.appSettings === right.appSettings;
}

type PersistKey = PersistedStateKey;
type PersistedEntity = { id: string };

interface DirtyCollectionState {
  version: number;
  upsertIds: Set<string>;
  deleteIds: Set<string>;
  reconcile: boolean;
}

function createDirtyCollectionState(): DirtyCollectionState {
  return { version: 0, upsertIds: new Set(), deleteIds: new Set(), reconcile: false };
}

function createDirtyCollections(): Record<PersistKey, DirtyCollectionState> {
  return Object.fromEntries(PERSISTENCE_KEYS.map((key) => [key, createDirtyCollectionState()])) as Record<PersistKey, DirtyCollectionState>;
}

export function diffEntityMutation<T extends PersistedEntity>(
  previous: T[],
  next: T[],
) : EntityMutation | null {
  if (previous === next) return null;
  const previousById = new Map(previous.map((entry) => [entry.id, entry]));
  const nextById = new Map(next.map((entry) => [entry.id, entry]));
  const orderChanged = previous.length !== next.length || previous.some((entry, index) => next[index]?.id !== entry.id);
  const upsertIds = new Set<string>();
  const deleteIds = new Set<string>();

  for (const entry of next) {
    if (previousById.get(entry.id) !== entry) {
      upsertIds.add(entry.id);
      deleteIds.delete(entry.id);
    }
  }
  for (const entry of previous) {
    if (!nextById.has(entry.id)) {
      deleteIds.add(entry.id);
      upsertIds.delete(entry.id);
    }
  }
  return { upsertIds: [...upsertIds], deleteIds: [...deleteIds], reconcile: orderChanged };
}

function markCollectionDirty<T extends PersistedEntity>(
  dirtyCollections: Record<PersistKey, DirtyCollectionState>,
  key: PersistKey,
  previous: T[],
  next: T[],
) {
  const mutation = diffEntityMutation(previous, next);
  if (!mutation) return;
  const dirty = dirtyCollections[key];
  mutation.upsertIds?.forEach((id) => {
    dirty.upsertIds.add(id);
    dirty.deleteIds.delete(id);
  });
  mutation.deleteIds?.forEach((id) => {
    dirty.deleteIds.add(id);
    dirty.upsertIds.delete(id);
  });
  dirty.reconcile ||= Boolean(mutation.reconcile);
  dirty.version += 1;
}

export const useProjectData = () => {
  const [projects, setProjectsState] = useState<Project[]>([]);
  const [libraries, setLibrariesState] = useState<ItemLibrary[]>([]);
  const [trades, setTradesState] = useState<TradePackage[]>([]);
  const [appraisals, setAppraisalsState] = useState<DevelopmentAppraisal[]>([]);
  const [appraisalHouseTypes, setAppraisalHouseTypesState] = useState<AppraisalHouseTypeLibraryItem[]>([]);
  const [appraisalRates, setAppraisalRatesState] = useState<AppraisalRateLibraryItem[]>([]);
  const [workspaceFolders, setWorkspaceFoldersState] = useState<WorkspaceFolder[]>([]);
  const [appSettings, setAppSettingsState] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef({ projects, libraries, trades, appraisals, appraisalHouseTypes, appraisalRates, workspaceFolders });
  const latestSettingsRef = useRef(appSettings);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saving');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lastManualSaveAt, setLastManualSaveAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [persistenceBackend, setPersistenceBackend] = useState<PersistenceBackend>('localStorage');
  const persistenceBackendRef = useRef<PersistenceBackend>('localStorage');
  const dirtyCollectionsRef = useRef<Record<PersistKey, DirtyCollectionState>>(createDirtyCollections());
  const lastPersistedSettingsRef = useRef(JSON.stringify(DEFAULT_APP_SETTINGS));
  const undoHistoryRef = useRef<{ past: WorkspaceSnapshot[]; future: WorkspaceSnapshot[] }>({ past: [], future: [] });
  const lastUndoSnapshotRef = useRef<WorkspaceSnapshot | null>(null);
  const restoringUndoRef = useRef(false);

  latestDataRef.current = { projects, libraries, trades, appraisals, appraisalHouseTypes, appraisalRates, workspaceFolders };
  latestSettingsRef.current = appSettings;

  // Track committed workspace edits across all persisted collections. A single React
  // commit becomes one undo step even when it changes several collections.
  useEffect(() => {
    if (!isHydrated) return;
    const current: WorkspaceSnapshot = { projects, libraries, trades, appraisals, appraisalHouseTypes, appraisalRates, workspaceFolders, appSettings };
    const previous = lastUndoSnapshotRef.current;
    if (!previous) { lastUndoSnapshotRef.current = current; return; }
    if (sameWorkspaceSnapshot(previous, current)) return;
    if (restoringUndoRef.current) {
      restoringUndoRef.current = false;
    } else {
      undoHistoryRef.current.past.push(previous);
      if (undoHistoryRef.current.past.length > UNDO_LIMIT) undoHistoryRef.current.past.shift();
      undoHistoryRef.current.future = [];
    }
    lastUndoSnapshotRef.current = current;
  }, [projects, libraries, trades, appraisals, appraisalHouseTypes, appraisalRates, workspaceFolders, appSettings, isHydrated]);

  const applyPersistenceOutcome = useCallback((backend: PersistenceBackend) => {
    persistenceBackendRef.current = backend;
    setPersistenceBackend(backend);
    setLastSavedAt(Date.now());

    if (backend === 'sqlite') {
      setSaveStatus('saved');
      setSaveError(null);
      return;
    }

    setSaveStatus('error');
    setSaveError('Primary SQLite storage is unavailable. Saving is currently using a temporary browser fallback.');
  }, []);

  const persistLatestState = useCallback(async () => {
    const changedKeys = PERSISTENCE_KEYS.filter((key) => {
      const dirty = dirtyCollectionsRef.current[key];
      return dirty.reconcile || dirty.upsertIds.size > 0 || dirty.deleteIds.size > 0;
    });

    if (changedKeys.length === 0) {
      applyPersistenceOutcome(persistenceBackendRef.current);
      return;
    }

    const capturedMutations = Object.fromEntries(changedKeys.map((key) => {
      const dirty = dirtyCollectionsRef.current[key];
      const mutation: EntityMutation = {
        upsertIds: [...dirty.upsertIds],
        deleteIds: [...dirty.deleteIds],
        reconcile: dirty.reconcile,
      };
      return [key, { version: dirty.version, mutation }];
    })) as Partial<Record<PersistKey, { version: number; mutation: EntityMutation }>>;
    const completeMeasure = startAppraisalPerformance('persistenceCommit');
    const backend = await persistAppState(latestDataRef.current, {
      changedKeys,
      entityMutations: Object.fromEntries(
        changedKeys.map((key) => [key, capturedMutations[key]!.mutation])
      ) as Partial<Record<PersistKey, EntityMutation>>,
    });
    completeMeasure();
    applyPersistenceOutcome(backend);

    if (backend === 'sqlite') {
      for (const key of changedKeys) {
        const captured = capturedMutations[key];
        const dirty = dirtyCollectionsRef.current[key];
        if (captured && dirty.version === captured.version) {
          dirtyCollectionsRef.current[key] = createDirtyCollectionState();
        }
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      return;
    }

    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = setTimeout(() => {
      void persistLatestState().catch((error) => {
        console.warn('Background SQLite retry failed', error);
      });
    }, 2000);
  }, [applyPersistenceOutcome]);

  useEffect(() => {
    if (!isHydrated || persistenceBackend !== 'sqlite') return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const ahCatalogs = await ensureAhSmm7Library();
        const costAdviserCatalogs = await ensureCostAdviserSmm7Library();
        const eNrm2Catalogs = await ensureENrm2Library();
        const e2018Smm7Catalogs = await ensureE2018Smm7Library();
        if (!cancelled && (e2018Smm7Catalogs || eNrm2Catalogs || costAdviserCatalogs || ahCatalogs)) {
          setLibrariesState(e2018Smm7Catalogs || eNrm2Catalogs || costAdviserCatalogs || ahCatalogs!);
        }
      })().catch((error) => console.warn('Bundled estimating library installation failed', error));
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isHydrated, persistenceBackend]);

  const saveNow = useCallback(async (): Promise<PersistenceBackend> => {
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = null;
    }
    if (settingsPersistTimeoutRef.current) {
      clearTimeout(settingsPersistTimeoutRef.current);
      settingsPersistTimeoutRef.current = null;
    }

    setSaveStatus('saving');
    try {
      await persistLatestState();
      const serializedSettings = JSON.stringify(latestSettingsRef.current);
      if (serializedSettings !== lastPersistedSettingsRef.current) {
        const settingsBackend = await persistAppSettings(latestSettingsRef.current);
        lastPersistedSettingsRef.current = serializedSettings;
        applyPersistenceOutcome(settingsBackend);
      }
      const backend = persistenceBackendRef.current;
      setLastManualSaveAt(Date.now());
      return backend;
    } catch (error) {
      console.warn('Manual save failed', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Manual save failed');
      throw error;
    }
  }, [persistLatestState]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const [persisted, persistedSettings] = await Promise.all([
          loadPersistedAppState(),
          loadPersistedAppSettings(),
        ]);
        if (cancelled) return;

        const hydratedAppraisals = normalizeDevelopmentAppraisals(persisted.appraisals, persistedSettings);
        const hydratedRates = normalizeAppraisalRateLibraryItems(persisted.appraisalRates);

        latestDataRef.current = {
          projects: persisted.projects,
          libraries: persisted.libraries,
          trades: persisted.trades,
          appraisals: hydratedAppraisals,
          appraisalHouseTypes: persisted.appraisalHouseTypes,
          appraisalRates: hydratedRates,
          workspaceFolders: persisted.workspaceFolders,
        };
        dirtyCollectionsRef.current = createDirtyCollections();
        if (persisted.appraisalRateBasisMigrationIds?.length) {
          const dirty = dirtyCollectionsRef.current.appraisals;
          persisted.appraisalRateBasisMigrationIds.forEach(id => dirty.upsertIds.add(id));
          dirty.version += 1;
        }
        latestSettingsRef.current = persistedSettings;
        lastPersistedSettingsRef.current = JSON.stringify(persistedSettings);

        setProjectsState(persisted.projects);
        setLibrariesState(persisted.libraries);
        setTradesState(persisted.trades);
        setAppraisalsState(hydratedAppraisals);
        setAppraisalHouseTypesState(normalizeAppraisalHouseTypeLibraryItems(persisted.appraisalHouseTypes));
        setAppraisalRatesState(hydratedRates);
        setWorkspaceFoldersState(normalizeWorkspaceFolders(persisted.workspaceFolders));
        setAppSettingsState(persistedSettings);
        applyPersistenceOutcome(persisted.backend);
      } catch (error) {
        console.warn('Persistence hydration failed', error);
        if (cancelled) return;
        setSaveStatus('error');
        setSaveError(error instanceof Error ? error.message : 'Storage hydration failed');
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [applyPersistenceOutcome]);

  useEffect(() => {
    if (!isHydrated) return;

    const flush = async () => {
      try {
        await persistLatestState();
      } catch (error) {
        console.warn('Storage write failed', error);
        setSaveStatus('error');
        setSaveError(error instanceof Error ? error.message : 'Storage write failed');
      }
      persistTimeoutRef.current = null;
    };

    setSaveStatus('saving');
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      void flush();
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      // Keep the pending timer alive across rerenders; unload/pagehide handles the last flush.
    };
  }, [projects, libraries, trades, appraisals, appraisalHouseTypes, appraisalRates, workspaceFolders, isHydrated, persistLatestState]);

  useEffect(() => {
    if (!isHydrated) return;

    const normalized = normalizeAppSettings(appSettings);
    const serializedSettings = JSON.stringify(normalized);
    if (serializedSettings === lastPersistedSettingsRef.current) return;

    const flush = async () => {
      try {
        const backend = await persistAppSettings(normalized);
        lastPersistedSettingsRef.current = serializedSettings;
        applyPersistenceOutcome(backend);
      } catch (error) {
        console.warn('App settings write failed', error);
        setSaveStatus('error');
        setSaveError(error instanceof Error ? error.message : 'App settings write failed');
      }
      settingsPersistTimeoutRef.current = null;
    };

    setSaveStatus('saving');
    if (settingsPersistTimeoutRef.current) clearTimeout(settingsPersistTimeoutRef.current);
    settingsPersistTimeoutRef.current = setTimeout(() => {
      void flush();
    }, PERSIST_DEBOUNCE_MS);
  }, [appSettings, applyPersistenceOutcome, isHydrated]);

  useEffect(() => {
    setLocalCrashReportingConsent(appSettings.general.crashReportingEnabled);
  }, [appSettings.general.crashReportingEnabled]);

  useEffect(() => {
    const flushPending = () => {
      if (!isHydrated) return;
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;

        void persistLatestState().catch((error) => {
          console.warn('Storage flush failed', error);
          setSaveStatus('error');
          setSaveError(error instanceof Error ? error.message : 'Storage write failed');
        });
      }

      if (settingsPersistTimeoutRef.current) {
        clearTimeout(settingsPersistTimeoutRef.current);
        settingsPersistTimeoutRef.current = null;

        void persistAppSettings(latestSettingsRef.current)
          .then((backend) => {
            lastPersistedSettingsRef.current = JSON.stringify(latestSettingsRef.current);
            applyPersistenceOutcome(backend);
          })
          .catch((error) => {
            console.warn('App settings flush failed', error);
            setSaveStatus('error');
            setSaveError(error instanceof Error ? error.message : 'App settings write failed');
          });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };

    window.addEventListener('beforeunload', flushPending);
    window.addEventListener('pagehide', flushPending);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flushPending);
      window.removeEventListener('pagehide', flushPending);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (settingsPersistTimeoutRef.current) {
        clearTimeout(settingsPersistTimeoutRef.current);
        settingsPersistTimeoutRef.current = null;
      }
      flushPending();
    };
  }, [applyPersistenceOutcome, isHydrated, persistLatestState]);

  const setAppSettings = useCallback<Dispatch<SetStateAction<AppSettings>>>((next) => {
    setAppSettingsState((current) => normalizeAppSettings(typeof next === 'function' ? next(current) : next));
  }, []);

  const setProjects = useCallback<Dispatch<SetStateAction<Project[]>>>((next) => {
    setProjectsState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      markCollectionDirty(dirtyCollectionsRef.current, 'projects', current, resolved);
      return resolved;
    });
  }, []);
  const setLibraries = useCallback<Dispatch<SetStateAction<ItemLibrary[]>>>((next) => {
    setLibrariesState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      markCollectionDirty(dirtyCollectionsRef.current, 'libraries', current, resolved);
      return resolved;
    });
  }, []);
  const setTrades = useCallback<Dispatch<SetStateAction<TradePackage[]>>>((next) => {
    setTradesState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      markCollectionDirty(dirtyCollectionsRef.current, 'trades', current, resolved);
      return resolved;
    });
  }, []);
  const setAppraisals = useCallback<Dispatch<SetStateAction<DevelopmentAppraisal[]>>>((next) => {
    setAppraisalsState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      markCollectionDirty(dirtyCollectionsRef.current, 'appraisals', current, resolved);
      return resolved;
    });
  }, []);
  const setAppraisalHouseTypes = useCallback<Dispatch<SetStateAction<AppraisalHouseTypeLibraryItem[]>>>((next) => {
    setAppraisalHouseTypesState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      markCollectionDirty(dirtyCollectionsRef.current, 'appraisalHouseTypes', current, resolved);
      return resolved;
    });
  }, []);
  const setAppraisalRates = useCallback<Dispatch<SetStateAction<AppraisalRateLibraryItem[]>>>((next) => {
    setAppraisalRatesState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      markCollectionDirty(dirtyCollectionsRef.current, 'appraisalRates', current, resolved);
      return resolved;
    });
  }, []);
  const setWorkspaceFolders = useCallback<Dispatch<SetStateAction<WorkspaceFolder[]>>>((next) => {
    setWorkspaceFoldersState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      markCollectionDirty(dirtyCollectionsRef.current, 'workspaceFolders', current, resolved);
      return resolved;
    });
  }, []);

  const restoreWorkspaceSnapshot = useCallback((snapshot: WorkspaceSnapshot) => {
    restoringUndoRef.current = true;
    setProjects(snapshot.projects);
    setLibraries(snapshot.libraries);
    setTrades(snapshot.trades);
    setAppraisals((current) => preserveFrozenAppraisals(current, snapshot.appraisals));
    setAppraisalHouseTypes(snapshot.appraisalHouseTypes);
    setAppraisalRates(snapshot.appraisalRates);
    setWorkspaceFolders(snapshot.workspaceFolders);
    setAppSettings(snapshot.appSettings);
  }, [setProjects, setLibraries, setTrades, setAppraisals, setAppraisalHouseTypes, setAppraisalRates, setWorkspaceFolders, setAppSettings]);

  const undo = useCallback(() => {
    const history = undoHistoryRef.current;
    const previous = history.past.pop();
    const current = lastUndoSnapshotRef.current;
    if (!previous || !current) return false;
    history.future.push(current);
    restoreWorkspaceSnapshot(previous);
    return true;
  }, [restoreWorkspaceSnapshot]);

  const redo = useCallback(() => {
    const history = undoHistoryRef.current;
    const next = history.future.pop();
    const current = lastUndoSnapshotRef.current;
    if (!next || !current) return false;
    history.past.push(current);
    restoreWorkspaceSnapshot(next);
    return true;
  }, [restoreWorkspaceSnapshot]);

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? { ...project, ...updates, updatedAt: new Date().toISOString() }
          : project
      )
    );
  };

  return {
    projects,
    setProjects,
    libraries,
    setLibraries,
    trades,
    setTrades,
    appraisals,
    setAppraisals,
    appraisalHouseTypes,
    setAppraisalHouseTypes,
    appraisalRates,
    setAppraisalRates,
    workspaceFolders,
    setWorkspaceFolders,
    appSettings,
    setAppSettings,
    updateProject,
    undo,
    redo,
    saveStatus,
    lastSavedAt,
    lastManualSaveAt,
    saveError,
    persistenceBackend,
    isHydrated,
    saveNow,
  };
};

export { parseStoredJson };
