
import React from 'react';
import { Calculator, ChevronLeft, ArrowLeft, Plus, BarChart3, Save, FileSpreadsheet, PieChart, Settings } from 'lucide-react';
import { calculateProjectProgress } from '../../utils/calculations';
import { APP_SHORT_NAME } from '../../utils/branding';

export const Sidebar = ({ 
  isOpen, 
  onToggle, 
  currentProject, 
  activeBillId, 
  setActiveBillId, 
  onOpenPrompt, 
  onOpenTenderView, 
  onDownloadProject,
  onOpenAnalytics,
  onOpenSettings,
  onExportExcel 
}: any) => {
  return (
    <aside className={`${isOpen ? 'w-80' : 'w-20'} bg-surface-100 dark:bg-surface-950 text-slate-900 dark:text-white flex flex-col transition-all duration-300 shadow-app-lg border-r border-slate-200/80 dark:border-slate-800 z-20`}>
      <div className="px-4 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 dark:bg-slate-100 p-2.5 rounded-app-sm shadow-app">
            <Calculator className="w-5 h-5 text-white dark:text-slate-900" />
          </div>
          {isOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold tracking-tight text-slate-800 dark:text-white">
                {APP_SHORT_NAME}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentProject.name}
              </span>
            </div>
          )}
        </div>
        {isOpen && (
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-surface-muted dark:hover:bg-surface-800 rounded-app-sm lg:hidden text-slate-600 dark:text-slate-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-6 space-y-6">
        {isOpen && (
          <div className="space-y-4">
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2 uppercase tracking-wider">
              Bills
            </h3>
            <div className="space-y-1">
              {currentProject.bills.map((bill: any) => (
                <button
                  key={bill.id}
                  onClick={() => setActiveBillId(bill.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-app-sm text-sm font-medium transition-colors ${
                    activeBillId === bill.id
                      ? 'bg-slate-900 text-white shadow-app dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-surface-muted dark:bg-surface-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <span className="truncate flex-1 text-left">{bill.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => onOpenPrompt('ADD_BILL')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-slate-300 dark:border-slate-600 rounded-app-sm text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              <Plus className="w-4 h-4" /> New bill
            </button>

            <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
               <div className="px-2">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span>Completion</span>
                    <span>{calculateProjectProgress(currentProject)}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-muted dark:bg-surface-800 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 dark:bg-slate-200 rounded-full transition-[width]" style={{ width: `${calculateProjectProgress(currentProject)}%` }} />
                  </div>
               </div>

               <button
                 onClick={onOpenSettings}
                 className="w-full flex items-center gap-3 px-3 py-2.5 bg-surface-muted dark:bg-surface-800 rounded-app-sm hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60"
               >
                 <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Project settings
               </button>
               <button
                 onClick={onOpenAnalytics}
                 className="w-full flex items-center gap-3 px-3 py-2.5 bg-surface-muted dark:bg-surface-800 rounded-app-sm hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60"
               >
                 <PieChart className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Analytics
               </button>
               <button
                 onClick={onOpenTenderView}
                 className="w-full flex items-center gap-3 px-3 py-2.5 bg-surface-muted dark:bg-surface-800 rounded-app-sm hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60"
               >
                 <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Tender analysis
               </button>

               <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={onDownloadProject}
                    className="flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 bg-surface-muted dark:bg-surface-800 rounded-app-sm hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <Save className="w-5 h-5 text-slate-500 dark:text-slate-400" /> Save JSON
                  </button>
                  <button
                    onClick={onExportExcel}
                    className="flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 bg-surface-muted dark:bg-surface-800 rounded-app-sm hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Export XLSX
                  </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
