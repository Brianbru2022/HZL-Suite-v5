import React, { useEffect } from 'react';
import { Command, Keyboard, Sparkles, X } from 'lucide-react';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useHelpContext } from '../../hooks/useHelpContext';
import { useAppContextOptional } from '../../contexts/AppContext';
import { HelpButton } from '../Help/HelpButton';

const SHORTCUT_GROUPS = [
  {
    title: 'Workspace',
    shortcuts: [
      { keys: ['Ctrl', 'N'], description: 'Create a new project' },
      { keys: ['Ctrl', 'Shift', 'N'], description: 'Create a new bill' },
      { keys: ['Ctrl', 'K'], description: 'Open the command palette' },
      { keys: ['Ctrl', 'S'], description: 'Save a JSON workspace backup' },
      { keys: ['Ctrl', 'Z'], description: 'Undo the last workspace change (outside a text field)' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo an undone workspace change (outside a text field)' },
      { keys: ['Ctrl', 'Y'], description: 'Redo an undone workspace change (outside a text field)' },
      { keys: ['Shift', '?'], description: 'Open keyboard shortcuts' },
      { keys: ['Ctrl', '!'], description: 'Open keyboard shortcuts' },
    ],
  },
  {
    title: 'Bill building',
    shortcuts: [
      { keys: ['Alt', 'N'], description: 'Add a priced item in the current bill' },
      { keys: ['Alt', 'S'], description: 'Add a section in the current bill' },
      { keys: ['Alt', 'P'], description: 'Add a page in the selected section' },
      { keys: ['Alt', 'L'], description: 'Open the standards library' },
      { keys: ['Ctrl', 'L'], description: 'Open or close the Standards panel in a bill' },
      { keys: ['Ctrl', 'Q'], description: 'Open or close the floating Quick add panel in a bill' },
      { keys: ['Ctrl', '1–7'], description: 'After selecting a bill row, insert a blank H1–H4, comment, sub-comment or priced item below it' },
      { keys: ['↑ / ↓'], description: 'Move the bill selection one row up or down' },
      { keys: ['Ctrl', '↑'], description: 'Move the selected bill row above the previous row' },
      { keys: ['Ctrl', '↓'], description: 'Move the selected bill row below the next row' },
      { keys: ['Type'], description: 'Start typing to name a selected blank bill row' },
      { keys: ['Enter'], description: 'Open the row fields for a focused bill description' },
      { keys: ['Ctrl', 'C'], description: 'Copy selected bill rows for duplication' },
      { keys: ['Ctrl', 'V'], description: 'Paste copied rows below one selected destination row' },
      { keys: ['Del'], description: 'Delete selected bill rows' },
    ],
  },
  {
    title: 'Tender workflow',
    shortcuts: [
      { keys: ['Alt', 'T'], description: 'Open tender analysis for the active project' },
      { keys: ['L'], description: 'In tender matrix: plug lowest live rate into a cell' },
      { keys: ['A'], description: 'In tender matrix: plug average live rate into a cell' },
      { keys: ['P'], description: 'In tender matrix: plug the QS estimate into a cell' },
    ],
  },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const app = useAppContextOptional();
  useHelpContext('KEYBOARD_SHORTCUTS', isOpen);
  const { contentRef, contentProps } = useModalFocus(isOpen, onClose);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? 'Cmd' : 'Ctrl';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        ref={contentRef}
        {...contentProps}
        aria-labelledby="shortcuts-modal-title"
        data-help-id="help-keyboard-shortcuts"
        className="workspace-shell w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="workspace-chip mb-3">
                <Keyboard className="h-3.5 w-3.5" />
                Navigation help
              </div>
              <h2 id="shortcuts-modal-title" className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                Keyboard shortcuts
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                Use these shortcuts to move faster through project creation, editing, and command search.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <HelpButton compact onClick={() => app?.openHelp('KEYBOARD_SHORTCUTS')} />
              <button
                type="button"
                onClick={onClose}
                className="workspace-secondary-btn px-3 py-2 text-xs"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white/88 px-6 py-6 dark:bg-surface-900/92">
          <div className="space-y-5">
            {SHORTCUT_GROUPS.map((group, groupIndex) => (
              <div key={group.title} className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {group.title}
                </div>
                {group.shortcuts.map((shortcut, index) => (
                  <div key={`${group.title}-${index}`} className="workspace-sidebar flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-app bg-primary-50 p-2 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                        {groupIndex === 0 && index === 2 ? <Command className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{shortcut.description}</span>
                    </div>
                    <kbd className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span
                          key={keyIndex}
                          className="rounded-app-sm border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-surface-800 dark:text-slate-300"
                        >
                          {key === 'Ctrl' ? mod : key}
                        </span>
                      ))}
                    </kbd>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
