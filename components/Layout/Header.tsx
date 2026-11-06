import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, LayoutGrid, Library as LibraryIcon, Briefcase, FileDown, Clock, ChevronDown, Keyboard } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { APP_NAME } from '../../utils/branding';
import { APP_RELEASE_LABEL } from '../../utils/appMetadata';
import { AppMark } from './AppMark';

export const Header = ({
  projects = [],
  currentProject,
  activeBill,
  isSidebarOpen,
  setIsSidebarOpen,
  onBackToProjects,
  onSelectProject,
  onOpenLibrary,
  onOpenTrades,
  onExportPdf,
  isExporting,
  onOpenVersionHistory,
  onOpenShortcuts,
}: any) => {
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!projectDropdownOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setProjectDropdownOpen(false);
        dropdownButtonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectDropdownOpen]);

  const handleSelectProject = (id: string) => {
    onSelectProject?.(id);
    setProjectDropdownOpen(false);
  };

  return (
    <header className="h-14 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between px-6 shrink-0 bg-surface shadow-app z-10 dark:bg-surface-900/95 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-surface-muted dark:hover:bg-surface-800 rounded-app-sm transition-colors text-slate-500 dark:text-slate-400"
          aria-label={isSidebarOpen ? 'Hide navigation' : 'Show navigation'}
        >
          {isSidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
        <AppMark size="md" className="hidden sm:inline-flex" />
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-tight">
            {APP_NAME}
          </span>
          {projects.length > 1 ? (
            <div className="relative" ref={dropdownRef}>
              <button
                ref={dropdownButtonRef}
                type="button"
                onClick={() => setProjectDropdownOpen((o) => !o)}
                className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight truncate max-w-[200px] hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none"
                aria-haspopup="listbox"
                aria-expanded={projectDropdownOpen}
                aria-controls="header-project-menu"
              >
                <span className="truncate">{currentProject?.name ?? 'Project'}</span>
                <ChevronDown className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
              </button>
              {projectDropdownOpen && (
                <div id="header-project-menu" role="listbox" aria-label="Select project" className="absolute top-full left-0 mt-1 w-56 bg-surface dark:bg-surface-800 rounded-app border border-slate-200 dark:border-slate-700 shadow-app-lg py-1 z-50 max-h-64 overflow-y-auto">
                  {projects.map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProject(p.id)}
                      aria-selected={p.id === currentProject?.id}
                      className={`w-full text-left px-3 py-2 text-sm font-medium truncate rounded-app-sm ${
                        p.id === currentProject?.id ? 'bg-slate-100 text-slate-800 dark:bg-slate-800/90 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300 hover:bg-surface-muted dark:hover:bg-slate-700/70'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight truncate max-w-xs hidden md:block">
              {currentProject?.name ?? 'Project'}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {onOpenShortcuts && (
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="p-2 rounded-app-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-surface-muted dark:hover:bg-surface-800"
            title="Keyboard shortcuts"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenVersionHistory}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-surface-muted dark:hover:bg-surface-800"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{APP_RELEASE_LABEL}</span>
        </button>
        {activeBill && (
          <button
            type="button"
            onClick={onExportPdf}
            disabled={isExporting}
            className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50"
          >
            {isExporting ? (
              <span className="animate-pulse">Generating...</span>
            ) : (
              <>
                <FileDown className="w-4 h-4" /> <span>Export PDF</span>
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onBackToProjects}
          className="flex items-center gap-2 bg-surface-muted dark:bg-surface-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-app-sm text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200/60 dark:border-slate-700"
        >
          <LayoutGrid className="w-4 h-4" /> <span>Projects</span>
        </button>
        <button
          type="button"
          onClick={onOpenLibrary}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-2 py-1 text-xs font-medium hidden md:flex items-center"
        >
          <LibraryIcon className="w-4 h-4 inline mr-1" /> <span>Library</span>
        </button>
        <button
          type="button"
          onClick={onOpenTrades}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-2 py-1 text-xs font-medium hidden md:flex items-center"
        >
          <Briefcase className="w-4 h-4 inline mr-1" /> <span>Trades</span>
        </button>
      </div>
    </header>
  );
};
