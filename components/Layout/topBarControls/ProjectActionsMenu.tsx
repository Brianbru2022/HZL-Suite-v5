import { useState } from 'react';
import {
  Activity,
  BarChart3,
  Edit2,
  FileDown,
  FileSpreadsheet,
  Layers3,
  Menu,
  PieChart,
  Plus,
  Save,
  Settings,
} from 'lucide-react';
import { APP_NAME } from '../../../utils/branding';
import type { ContextMenuEntry } from '../../UI/ContextMenu';
import { MenuActionList } from '../../UI/MenuActionList';
import { PopoverMenu } from '../../UI/PopoverMenu';
import type { PromptHandler } from './types';

export function ProjectActionsMenu({
  currentProject,
  activeBill,
  completion,
  isExporting,
  onOpenPrompt,
  onOpenBillSettings,
  onOpenVersionHistory,
  onOpenDiagnostics,
  onOpenSettings,
  onOpenAnalytics,
  onOpenCostPlan,
  onOpenProjectSummary,
  onOpenAssemblies,
  onOpenFutureModules,
  onOpenTenderView,
  onDownloadProject,
  onExportPdf,
  onExportExcel,
  onExportExcelCurrentBill,
}: {
  currentProject?: any;
  activeBill?: any;
  completion: number;
  isExporting?: boolean;
  onOpenPrompt?: PromptHandler;
  onOpenBillSettings?: () => void;
  onOpenVersionHistory?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenSettings?: () => void;
  onOpenAnalytics?: () => void;
  onOpenCostPlan?: () => void;
  onOpenProjectSummary?: () => void;
  onOpenAssemblies?: () => void;
  onOpenFutureModules?: () => void;
  onOpenTenderView?: () => void;
  onDownloadProject?: () => void;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  onExportExcelCurrentBill?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const items: ContextMenuEntry[] = [];

  if (onOpenPrompt) {
    items.push(
      { id: 'project-actions-add-label', type: 'label', label: 'Add/edit' },
      {
        id: 'project-actions-new-bill',
        label: 'New bill',
        icon: <Plus className="h-4 w-4" />,
        onSelect: () => onOpenPrompt('ADD_BILL'),
      }
    );
    if (currentProject) {
      items.push({
        id: 'project-actions-rename-project',
        label: 'Rename project',
        icon: <Edit2 className="h-4 w-4" />,
        onSelect: () => onOpenPrompt('RENAME_PROJECT', { id: currentProject.id, name: currentProject.name }),
      });
    }
    if (activeBill) {
      items.push({
        id: 'project-actions-rename-bill',
        label: 'Rename current bill',
        icon: <Edit2 className="h-4 w-4" />,
        onSelect: () => onOpenPrompt('RENAME_BILL', { id: activeBill.id, name: activeBill.name }),
      });
    }
  }
  if (activeBill && onOpenBillSettings) {
    items.push({
      id: 'project-actions-bill-settings',
      label: 'Bill type and settings',
      icon: <Settings className="h-4 w-4" />,
      onSelect: onOpenBillSettings,
    });
  }

  items.push({ id: 'project-actions-review-label', type: 'label', label: 'Review' });
  if (onOpenVersionHistory) {
    items.push({
      id: 'project-actions-restore-points',
      label: 'Restore points',
      icon: <Save className="h-4 w-4" />,
      onSelect: onOpenVersionHistory,
    });
  }
  if (onOpenDiagnostics) {
    items.push({
      id: 'project-actions-diagnostics',
      label: 'App diagnostics',
      icon: <Activity className="h-4 w-4" />,
      onSelect: onOpenDiagnostics,
    });
  }
  if (onOpenSettings) {
    items.push({
      id: 'project-actions-project-settings',
      label: 'Project settings',
      icon: <Settings className="h-4 w-4" />,
      onSelect: onOpenSettings,
    });
  }
  if (onOpenAnalytics) {
    items.push({
      id: 'project-actions-analytics',
      label: 'Analytics',
      icon: <PieChart className="h-4 w-4" />,
      onSelect: onOpenAnalytics,
    });
  }
  if (onOpenCostPlan) {
    items.push({
      id: 'project-actions-cost-plan',
      label: 'Cost plan',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      onSelect: onOpenCostPlan,
    });
  }
  if (onOpenProjectSummary) {
    items.push({
      id: 'project-actions-project-summary',
      label: 'Project summary',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      onSelect: onOpenProjectSummary,
    });
  }
  if (onOpenAssemblies) {
    items.push({
      id: 'project-actions-assemblies',
      label: 'Section assemblies',
      icon: <Layers3 className="h-4 w-4" />,
      onSelect: onOpenAssemblies,
    });
  }
  if (onOpenFutureModules) {
    items.push({
      id: 'project-actions-modules',
      label: 'Workflow modules',
      description: 'Preview take-off, appointments, valuations, variations, final account, and audit trail.',
      icon: <Layers3 className="h-4 w-4" />,
      onSelect: onOpenFutureModules,
    });
  }
  if (onOpenTenderView) {
    items.push({
      id: 'project-actions-tender-analysis',
      label: 'Tender analysis',
      icon: <BarChart3 className="h-4 w-4" />,
      onSelect: onOpenTenderView,
    });
  }

  items.push({ id: 'project-actions-export-label', type: 'label', label: 'Export' });
  if (onDownloadProject) {
    items.push({
      id: 'project-actions-workspace-backup',
      label: `Workspace backup${isExporting ? ' (exporting...)' : ' (Ctrl+S)'}`,
      description: `Save the full project as ${APP_NAME} JSON for backup or restore.`,
      icon: <Save className="h-4 w-4" />,
      disabled: isExporting,
      onSelect: onDownloadProject,
    });
  }
  if (activeBill && onExportPdf) {
    items.push({
      id: 'project-actions-bill-pdf',
      label: 'Bill PDF',
      description: 'Export the active bill as a presentation-ready PDF.',
      icon: <FileDown className="h-4 w-4" />,
      disabled: isExporting,
      onSelect: onExportPdf,
    });
  }
  if (onExportExcel) {
    items.push({
      id: 'project-actions-project-workbook',
      label: 'Project workbook',
      description: 'Export every bill in this project to one Excel workbook.',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      disabled: isExporting,
      onSelect: onExportExcel,
    });
  }
  if (activeBill && onExportExcelCurrentBill) {
    items.push({
      id: 'project-actions-current-bill-workbook',
      label: 'Current bill workbook',
      description: 'Export only the active bill to Excel.',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      disabled: isExporting,
      onSelect: onExportExcelCurrentBill,
    });
  }

  return (
    <PopoverMenu
      ariaLabel="Project actions"
      width={288}
      estimatedHeight={560}
      open={open}
      onOpenChange={setOpen}
      menuClassName="workspace-popover-menu rounded-app py-1"
      trigger={({ ref, isOpen, toggle }) => (
        <button
          ref={ref}
          onClick={toggle}
          className="rounded-app-sm border border-slate-200/70 bg-white/75 p-2 text-slate-500 hover:bg-surface-muted hover:text-slate-700 dark:border-slate-700 dark:bg-[rgb(27_36_44_/_0.9)] dark:text-slate-400 dark:hover:bg-surface-800 dark:hover:text-slate-200"
          title="Project menu"
          aria-label="Project menu"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls="project-action-menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    >
      {(close) => (
        <div id="project-action-menu">
          {currentProject && (
            <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
              <div className="mb-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Completion</span>
                <span>{completion}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted dark:bg-surface-800">
                <div
                  className="h-full rounded-full bg-slate-800 transition-[width] dark:bg-slate-200"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          )}
          <MenuActionList items={items} close={close} />
        </div>
      )}
    </PopoverMenu>
  );
}
