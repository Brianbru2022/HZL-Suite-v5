import React from 'react';
import { Layers3, Plus, Trash2, X } from 'lucide-react';
import type { BoQBill, Project, SectionAssembly } from '../../types';
import { getSectionItems } from '../../utils/calculations';
import { useModalFocus } from '../../hooks/useModalFocus';

interface AssembliesModalProps {
  isOpen: boolean;
  project: Project;
  activeBill: BoQBill | null;
  onClose: () => void;
  onApplyAssembly: (assembly: SectionAssembly) => void;
  onDeleteAssembly: (assemblyId: string) => void;
}

function getAssemblySummary(assembly: SectionAssembly) {
  const itemCount = getSectionItems(assembly.section).length;
  const pageCount = assembly.section.pages?.length || 0;

  return {
    itemCount,
    pageCount,
  };
}

export const AssembliesModal: React.FC<AssembliesModalProps> = ({
  isOpen,
  project,
  activeBill,
  onClose,
  onApplyAssembly,
  onDeleteAssembly,
}) => {
  const { contentRef, contentProps } = useModalFocus(isOpen, onClose);

  if (!isOpen) return null;

  const assemblies = project.sectionAssemblies || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md dark:bg-black/60">
      <div
        ref={contentRef}
        {...contentProps}
        className="workspace-shell flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden"
      >
        <div className="border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="workspace-chip mb-3">
                <Layers3 className="h-3.5 w-3.5" />
                Section assemblies
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Reusable section templates</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                Save proven section structures once and drop them into other bills when you need a quick start.
              </p>
            </div>
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close assemblies">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white/88 px-6 py-6 dark:bg-surface-900/92">
          {assemblies.length === 0 ? (
            <div className="workspace-empty">
              Save a live section as an assembly from the bill workspace to start building a reusable template library.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {assemblies.map((assembly) => {
                const summary = getAssemblySummary(assembly);
                return (
                  <div key={assembly.id} className="workspace-sidebar p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                          {assembly.sourceBillName || 'Saved assembly'}
                        </div>
                        <h3 className="mt-2 truncate text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                          {assembly.name}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteAssembly(assembly.id)}
                        className="workspace-secondary-btn px-2.5 py-2 text-xs"
                        aria-label={`Delete ${assembly.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {assembly.description || 'Reusable section template'}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium">
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                        {summary.itemCount} item{summary.itemCount === 1 ? '' : 's'}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                        {summary.pageCount > 0 ? `${summary.pageCount} page${summary.pageCount === 1 ? '' : 's'}` : 'Direct items'}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                        Saved {new Date(assembly.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {activeBill ? `Apply to ${activeBill.name}` : 'Open a bill to apply this assembly'}
                      </div>
                      <button
                        type="button"
                        onClick={() => onApplyAssembly(assembly)}
                        disabled={!activeBill}
                        className="workspace-primary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Apply
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
