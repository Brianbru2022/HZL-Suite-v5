import React from 'react';
import { ArrowRight, Copy, X } from 'lucide-react';
import { useHelpContext } from '../../hooks/useHelpContext';
import { useAppContextOptional } from '../../contexts/AppContext';
import { HelpButton } from '../Help/HelpButton';

export type CopySourceKind = 'BILL' | 'SECTION' | 'PAGE';
export type CopyDestinationKind = 'NEW_PROJECT' | 'PROJECT' | 'BILL' | 'SECTION' | 'LIBRARY';

export interface CopyTargetProjectOption {
  id: string;
  name: string;
  bills: Array<{
    id: string;
    name: string;
    sections: Array<{
      id: string;
      name: string;
      pages: Array<{ id: string; name: string }>;
    }>;
  }>;
}

export interface CopyTargetLibraryOption {
  id: string;
  name: string;
  folders: Array<{ id: string; name: string }>;
}

export interface CopyContentSubmitPayload {
  destination: CopyDestinationKind;
  targetProjectId?: string;
  targetBillId?: string;
  targetSectionId?: string;
  targetLibraryId?: string;
  targetFolderId?: string;
  newName?: string;
}

interface CopyContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CopyContentSubmitPayload) => void;
  sourceKind: CopySourceKind;
  sourceLabel: string;
  projects: CopyTargetProjectOption[];
  libraries: CopyTargetLibraryOption[];
  currentProjectId?: string | null;
}

type DestinationOption = {
  value: CopyDestinationKind;
  label: string;
  detail: string;
};

function getDestinationOptions(sourceKind: CopySourceKind): DestinationOption[] {
  switch (sourceKind) {
    case 'BILL':
      return [
        { value: 'NEW_PROJECT', label: 'New project', detail: 'Create a fresh project with this bill already in place.' },
        { value: 'PROJECT', label: 'Existing project', detail: 'Add this bill into another project as a new bill.' },
        { value: 'LIBRARY', label: 'Library', detail: 'Flatten this bill into reusable standards content.' },
      ];
    case 'SECTION':
      return [
        { value: 'NEW_PROJECT', label: 'New project', detail: 'Create a fresh project from this section.' },
        { value: 'PROJECT', label: 'New bill in project', detail: 'Create a new bill from this section inside a chosen project.' },
        { value: 'BILL', label: 'Existing bill', detail: 'Add this section into a selected bill.' },
        { value: 'LIBRARY', label: 'Library', detail: 'Save this section as reusable standards content.' },
      ];
    default:
      return [
        { value: 'NEW_PROJECT', label: 'New project', detail: 'Create a fresh project from this page.' },
        { value: 'PROJECT', label: 'New bill in project', detail: 'Create a new bill from this page inside a chosen project.' },
        { value: 'BILL', label: 'New section in bill', detail: 'Create a new section from this page inside a selected bill.' },
        { value: 'SECTION', label: 'Existing section', detail: 'Copy this page into a selected section as a new page.' },
        { value: 'LIBRARY', label: 'Library', detail: 'Save this page as reusable standards content.' },
      ];
  }
}

function getDefaultDestination(sourceKind: CopySourceKind): CopyDestinationKind {
  switch (sourceKind) {
    case 'BILL':
      return 'PROJECT';
    case 'SECTION':
      return 'BILL';
    default:
      return 'SECTION';
  }
}

function getNameLabel(sourceKind: CopySourceKind, destination: CopyDestinationKind) {
  if (destination === 'NEW_PROJECT') return 'Project name';
  if (destination === 'PROJECT') return sourceKind === 'BILL' ? 'Copied bill name' : 'New bill name';
  if (destination === 'BILL') return sourceKind === 'SECTION' ? 'Copied section name' : 'New section name';
  if (destination === 'SECTION') return 'Copied page name';
  return 'Library section name';
}

function getDefaultName(sourceKind: CopySourceKind, sourceLabel: string, destination: CopyDestinationKind) {
  if (destination === 'NEW_PROJECT') {
    return sourceKind === 'BILL' ? `${sourceLabel} project` : `${sourceLabel} workspace`;
  }
  return sourceLabel;
}

export const CopyContentModal: React.FC<CopyContentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sourceKind,
  sourceLabel,
  projects,
  libraries,
  currentProjectId,
}) => {
  const app = useAppContextOptional();
  useHelpContext('COPY_CONTENT');
  const destinationOptions = React.useMemo(() => getDestinationOptions(sourceKind), [sourceKind]);
  const [destination, setDestination] = React.useState<CopyDestinationKind>(getDefaultDestination(sourceKind));
  const [targetProjectId, setTargetProjectId] = React.useState<string>(currentProjectId || projects[0]?.id || '');
  const [targetBillId, setTargetBillId] = React.useState<string>('');
  const [targetSectionId, setTargetSectionId] = React.useState<string>('');
  const [targetLibraryId, setTargetLibraryId] = React.useState<string>(libraries[0]?.id || '');
  const [targetFolderId, setTargetFolderId] = React.useState<string>('');
  const [newName, setNewName] = React.useState<string>(getDefaultName(sourceKind, sourceLabel, getDefaultDestination(sourceKind)));

  const activeProject = React.useMemo(
    () => projects.find((project) => project.id === targetProjectId) || null,
    [projects, targetProjectId]
  );
  const activeBill = React.useMemo(
    () => activeProject?.bills.find((bill) => bill.id === targetBillId) || null,
    [activeProject, targetBillId]
  );
  const activeLibrary = React.useMemo(
    () => libraries.find((library) => library.id === targetLibraryId) || null,
    [libraries, targetLibraryId]
  );

  React.useEffect(() => {
    if (!isOpen) return;
    const nextProjectId = currentProjectId || projects[0]?.id || '';
    const nextBillId = projects.find((project) => project.id === nextProjectId)?.bills[0]?.id || '';
    const nextSectionId = projects
      .find((project) => project.id === nextProjectId)
      ?.bills.find((bill) => bill.id === nextBillId)
      ?.sections[0]?.id || '';
    const nextLibraryId = libraries[0]?.id || '';
    const nextFolderId = libraries.find((library) => library.id === nextLibraryId)?.folders[0]?.id || '';
    const nextDestination = getDefaultDestination(sourceKind);

    setDestination(nextDestination);
    setTargetProjectId(nextProjectId);
    setTargetBillId(nextBillId);
    setTargetSectionId(nextSectionId);
    setTargetLibraryId(nextLibraryId);
    setTargetFolderId(nextFolderId);
    setNewName(getDefaultName(sourceKind, sourceLabel, nextDestination));
  }, [currentProjectId, isOpen, libraries, projects, sourceKind, sourceLabel]);

  React.useEffect(() => {
    if (!destinationOptions.some((option) => option.value === destination)) {
      setDestination(getDefaultDestination(sourceKind));
    }
  }, [destination, destinationOptions, sourceKind]);

  React.useEffect(() => {
    const nextBillId = activeProject?.bills[0]?.id || '';
    if (!targetBillId || !activeProject?.bills.some((bill) => bill.id === targetBillId)) {
      setTargetBillId(nextBillId);
    }
  }, [activeProject, targetBillId]);

  React.useEffect(() => {
    const nextSectionId = activeBill?.sections[0]?.id || '';
    if (!targetSectionId || !activeBill?.sections.some((section) => section.id === targetSectionId)) {
      setTargetSectionId(nextSectionId);
    }
  }, [activeBill, targetSectionId]);

  React.useEffect(() => {
    const nextFolderId = activeLibrary?.folders[0]?.id || '';
    if (!targetFolderId || !activeLibrary?.folders.some((folder) => folder.id === targetFolderId)) {
      setTargetFolderId(nextFolderId);
    }
  }, [activeLibrary, targetFolderId]);

  if (!isOpen) return null;

  const requiresProject = destination === 'PROJECT' || destination === 'BILL' || destination === 'SECTION';
  const requiresBill = destination === 'BILL' || destination === 'SECTION';
  const requiresSection = destination === 'SECTION';
  const requiresLibrary = destination === 'LIBRARY';
  const needsName = destination !== undefined;

  const canSubmit = destination === 'NEW_PROJECT'
    ? Boolean(newName.trim())
    : destination === 'PROJECT'
      ? Boolean(targetProjectId && newName.trim())
      : destination === 'BILL'
        ? Boolean(targetProjectId && targetBillId && newName.trim())
        : destination === 'SECTION'
          ? Boolean(targetProjectId && targetBillId && targetSectionId && newName.trim())
          : Boolean(targetLibraryId && targetFolderId && newName.trim());

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <div className="absolute inset-0" aria-hidden onClick={onClose} />
      <div data-help-id="help-copy-content" className="relative z-10 flex w-full max-w-2xl max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-app-xl border border-slate-200 bg-white shadow-app-lg dark:border-slate-700 dark:bg-surface-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              Copy content
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Copy {sourceKind.toLowerCase()} <span className="text-primary-600 dark:text-primary-400">{sourceLabel}</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Copy this {sourceKind.toLowerCase()} into the next natural level, or save it into the library.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HelpButton compact onClick={() => app?.openHelp('COPY_CONTENT')} />
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close copy dialog">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div className={`grid gap-3 ${destinationOptions.length > 3 ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'}`}>
              {destinationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDestination(option.value)}
                  className={`rounded-app-lg border px-4 py-3 text-left transition ${
                    destination === option.value
                      ? 'border-primary-300 bg-primary-50 text-primary-900 shadow-sm dark:border-primary-700 dark:bg-primary-950/30 dark:text-primary-100'
                      : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-surface-800/80 dark:text-slate-200 dark:hover:bg-surface-800'
                  }`}
                >
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{option.detail}</div>
                </button>
              ))}
            </div>

            {needsName && (
              <div className="rounded-app-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-surface-800/70">
                <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {getNameLabel(sourceKind, destination)}
                </label>
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
                />
              </div>
            )}

            {requiresProject && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Project
                  </label>
                  <select
                    value={targetProjectId}
                    onChange={(event) => setTargetProjectId(event.target.value)}
                    className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                {requiresBill && (
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Bill
                    </label>
                    <select
                      value={targetBillId}
                      onChange={(event) => setTargetBillId(event.target.value)}
                      className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
                    >
                      {(activeProject?.bills || []).map((bill) => (
                        <option key={bill.id} value={bill.id}>
                          {bill.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {requiresSection && (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Section
                </label>
                <select
                  value={targetSectionId}
                  onChange={(event) => setTargetSectionId(event.target.value)}
                  className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
                >
                  {(activeBill?.sections || []).map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {requiresLibrary && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Library
                  </label>
                  <select
                    value={targetLibraryId}
                    onChange={(event) => setTargetLibraryId(event.target.value)}
                    className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
                  >
                    {libraries.map((library) => (
                      <option key={library.id} value={library.id}>
                        {library.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Folder
                  </label>
                  <select
                    value={targetFolderId}
                    onChange={(event) => setTargetFolderId(event.target.value)}
                    className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
                  >
                    {(activeLibrary?.folders || []).map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="rounded-app-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                <Copy className="h-3.5 w-3.5" />
                Copy summary
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-surface-800">
                  {sourceKind.toLowerCase()}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-surface-800">
                  {destinationOptions.find((option) => option.value === destination)?.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Copies get fresh internal ids so the source and destination stay independent.
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-4 py-2 text-xs">
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => onSubmit({
                destination,
                targetProjectId,
                targetBillId,
                targetSectionId,
                targetLibraryId,
                targetFolderId,
                newName: newName.trim(),
              })}
              className="workspace-primary-btn px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy content
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
