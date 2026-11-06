import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, ChevronRight, Command, Library, Search, Sparkles, Zap } from 'lucide-react';
import { ItemLibrary } from '../../types';
import { useModalFocus } from '../../hooks/useModalFocus';

export interface CommandPaletteAction {
  id: string;
  title: string;
  description: string;
  hint?: string;
  keywords?: string[];
  onSelect: () => void;
}

interface CommandPaletteProps {
  libraries: ItemLibrary[];
  quickActions?: CommandPaletteAction[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: any, libName: string, path: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ libraries, quickActions = [], isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { contentRef, contentProps } = useModalFocus(isOpen, onClose);

  const libraryItems = useMemo(() => {
    const items: { item: any; libName: string; path: string }[] = [];

    libraries.forEach(lib => {
      lib.folders.forEach(folder => {
        folder.sections.forEach(section => {
          section.items.forEach(item => {
            if (item.type === 'PRICED') {
              items.push({
                item,
                libName: lib.name,
                path: `${folder.name} > ${section.name}`,
              });
            }
          });
        });
      });
    });

    return items;
  }, [libraries]);

  const filteredEntries = useMemo(() => {
    const lower = query.toLowerCase();
    const actionEntries = quickActions
      .filter(action => {
        if (!query) return true;
        const haystack = [action.title, action.description, action.hint || '', ...(action.keywords || [])].join(' ').toLowerCase();
        return haystack.includes(lower);
      })
      .slice(0, query ? 12 : 6)
      .map(action => ({ kind: 'action' as const, action }));

    const itemEntries = libraryItems
      .filter(entry => {
        if (!query) return true;
        return entry.item.description.toLowerCase().includes(lower) || entry.path.toLowerCase().includes(lower) || entry.libName.toLowerCase().includes(lower);
      })
      .slice(0, query ? 40 : 10)
      .map(entry => ({ kind: 'item' as const, ...entry }));

    return [...actionEntries, ...itemEntries];
  }, [libraryItems, query, quickActions]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredEntries.length === 0) return;
        setSelectedIndex(prev => Math.min(prev + 1, filteredEntries.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredEntries.length === 0) return;
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedEntry = filteredEntries[selectedIndex];
        if (selectedEntry?.kind === 'action') {
          selectedEntry.action.onSelect();
          onClose();
        } else if (selectedEntry?.kind === 'item') {
          const { item, libName, path } = selectedEntry;
          onSelect(item, libName, path);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredEntries, isOpen, onClose, onSelect, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/50 pt-[10vh] backdrop-blur-md dark:bg-black/60" onClick={onClose}>
      <div
        ref={contentRef}
        {...contentProps}
        aria-labelledby="command-palette-title"
        aria-describedby="command-palette-desc"
        className="workspace-shell flex w-full max-w-3xl flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 bg-white/92 px-5 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="workspace-chip mb-3">
                <Command className="h-3.5 w-3.5" />
                Quick actions and inserts
              </div>
              <h2 id="command-palette-title" className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Command palette</h2>
              <p id="command-palette-desc" className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                Run common workflow actions or search standard libraries and insert priced items without leaving the keyboard.
              </p>
            </div>
            <div className="rounded-app-sm bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-surface-800 dark:text-slate-400">Esc</div>
          </div>

          <div className="workspace-toolbar flex items-center gap-3">
            <Search className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <input
              autoFocus
              aria-label="Search quick actions and standard libraries"
              aria-controls="command-palette-results"
              className="flex-1 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder="Search actions, standards, folders, or sections..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto bg-white/88 px-4 py-4 dark:bg-surface-900/92">
          <div id="command-palette-results" role="listbox" aria-label="Command palette results" className="space-y-2">
            {filteredEntries.map((entry, idx) => {
              if (entry.kind === 'action') {
                return (
                  <button
                    key={entry.action.id}
                    type="button"
                    role="option"
                    aria-selected={idx === selectedIndex}
                    aria-label={`${entry.action.title}. ${entry.action.description}`}
                    onClick={() => {
                      entry.action.onSelect();
                      onClose();
                    }}
                    className={`flex w-full items-center gap-4 rounded-app border p-4 text-left transition-all ${idx === selectedIndex ? 'border-slate-300 bg-slate-50 shadow-app dark:border-slate-600 dark:bg-slate-800/90' : 'border-slate-200 bg-surface hover:border-slate-300 hover:bg-surface-muted dark:border-slate-700 dark:bg-surface-800 dark:hover:border-slate-600 dark:hover:bg-surface-900'}`}
                  >
                    <div className={`rounded-app-sm p-2 ${idx === selectedIndex ? 'bg-white text-slate-800 dark:bg-surface-900 dark:text-slate-100' : 'bg-slate-100 text-slate-500 dark:bg-surface-900 dark:text-slate-300'}`}>
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.action.title}</div>
                      <div className={`mt-1 text-xs ${idx === selectedIndex ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                        {entry.action.description}
                      </div>
                    </div>
                    <div className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${idx === selectedIndex ? 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200' : 'border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500'}`}>
                      Action
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={`${entry.path}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={idx === selectedIndex}
                  aria-label={`Insert ${entry.item.description} from ${entry.libName}, ${entry.path}`}
                  onClick={() => {
                    onSelect(entry.item, entry.libName, entry.path);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-4 rounded-app border p-4 text-left transition-all ${idx === selectedIndex ? 'border-slate-300 bg-slate-50 shadow-app dark:border-slate-600 dark:bg-slate-800/90' : 'border-slate-200 bg-surface hover:border-slate-300 hover:bg-surface-muted dark:border-slate-700 dark:bg-surface-800 dark:hover:border-slate-600 dark:hover:bg-surface-900'}`}
                >
                  <div className={`rounded-app-sm p-2 ${idx === selectedIndex ? 'bg-white text-slate-800 dark:bg-surface-900 dark:text-slate-100' : 'bg-slate-100 text-slate-500 dark:bg-surface-900 dark:text-slate-300'}`}>
                    <Calculator className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.item.description}</div>
                    <div className={`mt-1 flex items-center gap-1 text-xs ${idx === selectedIndex ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                      <Library className="h-3 w-3" />
                      {entry.libName}
                      <ChevronRight className="h-3 w-3" />
                      {entry.path}
                    </div>
                  </div>
                  <div className={`text-xs font-medium ${idx === selectedIndex ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                    {entry.item.unit}
                  </div>
                </button>
              );
            })}

            {filteredEntries.length === 0 && (
              <div className="workspace-empty py-12">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-app bg-slate-100 text-slate-700 dark:bg-surface-800 dark:text-slate-200">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">No matches found</div>
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try a broader term or search by action, folder, section, or description.</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/92 px-4 py-3 dark:bg-surface-900/95">
          <div className="workspace-toolbar flex justify-between px-4 py-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Arrow keys to navigate</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Enter to run or insert</span>
          </div>
        </div>
      </div>
    </div>
  );
};
