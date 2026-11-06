
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Archive, BarChart3, Calculator, Library as LibraryIcon, Briefcase, PlusCircle, FileUp, FolderOpen, Building2, ChevronRight, FileDown, Trash2, X, CheckCircle2, Table, Search, Keyboard, ChevronDown, Sparkles, ClipboardCheck, FileCheck2, FileClock, FileText, History, RotateCcw, MoreHorizontal, Ruler } from 'lucide-react';
import { formatCurrency } from '../../utils/formatting';
import { calculateProjectTotal, getSectionItems, safeAdd } from '../../utils/calculations';
import { parseCiteFile, parseCiteLine, ColumnMapping, type ParseCiteResult } from '../../utils/citeParser';
import type { Project, WorkflowModule, WorkflowModuleId, WorkspaceFolder } from '../../types';
import { ThemeToggle } from '../Layout/ThemeToggle';
import { ProjectLocationBadge } from './ProjectLocationBadge';
import { useToast } from '../../contexts/ToastContext';
import { feedbackError, feedbackSuccess } from '../../utils/feedback';
import { withAutoSnapshot } from '../../utils/projectSnapshots';
import { ContextMenu, shouldUseNativeContextMenu } from '../UI/ContextMenu';
import type { ContextMenuEntry, ContextMenuState } from '../UI/ContextMenu';
import { MenuActionList } from '../UI/MenuActionList';
import { PopoverMenu } from '../UI/PopoverMenu';
import { APP_NAME, APP_SHORT_NAME } from '../../utils/branding';
import { ESTIMATE_ONLY } from '../../utils/buildEdition';
import {
  WORKFLOW_MODULES,
  getWorkflowModuleStatusLabel,
  resolveWorkflowModuleLaunch,
} from '../../utils/workflowModules';
import { buildProjectWorkflowSummary, type ProjectWorkflowSummary } from '../../utils/projectWorkflowSummary';
import { buildEstimateLibraryDropdownView } from '../../utils/estimateLibrary';
import { buildEstimateReferenceUpdates, isEstimateReferencePlaceholder } from '../../utils/estimateReferences';
import {
  ALL_WORKSPACE_FOLDERS_ID,
  ALL_WORKSPACE_YEARS_ID,
  createWorkspaceFolder,
  folderYearFromRevision,
  normalizeWorkspaceFolders,
} from '../../utils/workspaceFolders';


type ProjectImportSummary = {
  added: number;
  skipped: number;
};

/** Collect up to max items from project (all bills/sections) for preview. */
function getPreviewItems(project: Project, max: number): { ref: string; desc: string; unit: string; qty: number; rate: number; total: number; type: string }[] {
  const out: { ref: string; desc: string; unit: string; qty: number; rate: number; total: number; type: string }[] = [];
  for (const bill of project.bills) {
    for (const section of bill.sections) {
      for (const item of getSectionItems(section)) {
        if (out.length >= max) return out;
        out.push({
          ref: item.reference || '',
          desc: item.description || '',
          unit: item.unit || '',
          qty: item.quantity ?? 0,
          rate: item.rate ?? 0,
          total: item.total ?? 0,
          type: item.type || ''
        });
      }
    }
  }
  return out;
}

function getImportAuditRows(project: Project) {
  return project.bills.map((bill) => {
    const sectionCount = bill.sections.length;
    const pageCount = bill.sections.reduce((count, section) => count + (section.pages?.length || 0), 0);
    const items = bill.sections.flatMap((section) => getSectionItems(section));
    const pricedItems = items.filter((item) => ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type));
    const headingCount = items.length - pricedItems.length;
    const total = pricedItems.reduce((sum, item) => safeAdd(sum, item.total || 0), 0);

    return {
      id: bill.id,
      name: bill.name,
      sectionCount,
      pageCount,
      pricedItemCount: pricedItems.length,
      headingCount,
      total,
    };
  });
}

function buildProjectActionItems({
  project,
  onSelectProject,
  onOpenWorkflowModule,
  onDownloadProject,
  onDeleteProject,
}: {
  project: Project;
  onSelectProject: (id: string) => void;
  onOpenWorkflowModule?: (moduleId: WorkflowModuleId, projectId?: string) => void;
  onDownloadProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}): ContextMenuEntry[] {
  return [
    { id: 'project-open-label', type: 'label', label: 'Open' },
    {
      id: 'project-open',
      label: 'Open workspace',
      icon: <FolderOpen className="h-4 w-4" />,
      onSelect: () => onSelectProject(project.id),
    },
    {
      id: 'project-tender',
      label: ESTIMATE_ONLY ? 'Tender analysis (not enabled)' : 'Open tender analysis',
      icon: <Briefcase className="h-4 w-4" />,
      disabled: ESTIMATE_ONLY,
      onSelect: () => onOpenWorkflowModule?.('TENDER_ANALYSIS', project.id),
    },
    {
      id: 'project-reports',
      label: ESTIMATE_ONLY ? 'Cost reports (not enabled)' : 'Open cost reports',
      icon: <BarChart3 className="h-4 w-4" />,
      disabled: ESTIMATE_ONLY,
      onSelect: () => onOpenWorkflowModule?.('COST_REPORTS', project.id),
    },
    { id: 'project-export-label', type: 'label', label: 'Import/export' },
    {
      id: 'project-download',
      label: 'Download JSON backup',
      icon: <FileDown className="h-4 w-4" />,
      onSelect: () => onDownloadProject(project),
    },
    { id: 'project-danger-label', type: 'label', label: 'Danger' },
    {
      id: 'project-delete',
      label: 'Delete project',
      icon: <Trash2 className="h-4 w-4" />,
      tone: 'danger',
      onSelect: () => onDeleteProject(project.id),
    },
  ];
}

const MODULE_ICONS: Record<WorkflowModuleId, React.ReactNode> = {
  APPRAISALS: <Calculator className="h-5 w-5" />,
  TAKE_OFF: <Ruler className="h-5 w-5" />,
  ESTIMATING: <Building2 className="h-5 w-5" />,
  LIBRARY_MAINTENANCE: <LibraryIcon className="h-5 w-5" />,
  TENDER_ANALYSIS: <Briefcase className="h-5 w-5" />,
  SUBCONTRACT_APPOINTMENT: <ClipboardCheck className="h-5 w-5" />,
  CONTRACTS: <ClipboardCheck className="h-5 w-5" />,
  VALUATIONS: <FileClock className="h-5 w-5" />,
  VARIATIONS: <FileText className="h-5 w-5" />,
  FINAL_ACCOUNTS: <FileCheck2 className="h-5 w-5" />,
  AUDITS: <History className="h-5 w-5" />,
  COST_REPORTS: <BarChart3 className="h-5 w-5" />,
};

function ModuleDetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {title}
      </div>
      <div className="mt-3 space-y-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
        {items.map((item) => (
          <div key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ProjectList = ({ 
  projects, 
  onSelectProject, 
  onImportProject, 
  onUpdateProject,
  onDeleteProject, 
  onDownloadProject, 
  onNewProject,
  onCreateSampleProject,
  isCreatingSampleProject = false,
  onOpenLibrary,
  onOpenAppraisalLibraries,
  onOpenTrades,
  onOpenShortcuts,
  onOpenDiagnostics,
  onOpenAuditTrail,
  onOpenWorkflowModule,
  workspaceFolders = [],
  setWorkspaceFolders,
  requestedModuleHub,
  onConsumeRequestedModuleHub,
  closeModuleHubSignal = 0,
  resetSignal = 0,
  embedInShell = false,
  onCloseEstimateRegister,
}: {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onImportProject: (data: Project | Project[]) => ProjectImportSummary;
  onUpdateProject?: (id: string, updates: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onDownloadProject: (p: Project) => void;
  onNewProject: () => void;
  onCreateSampleProject?: () => void | Promise<void>;
  isCreatingSampleProject?: boolean;
  onOpenLibrary: () => void;
  onOpenAppraisalLibraries?: () => void;
  onOpenTrades: () => void;
  onOpenShortcuts?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenAuditTrail?: () => void;
  onOpenWorkflowModule?: (moduleId: WorkflowModuleId, projectId?: string) => void;
  workspaceFolders?: WorkspaceFolder[];
  setWorkspaceFolders?: React.Dispatch<React.SetStateAction<WorkspaceFolder[]>>;
  requestedModuleHub?: WorkflowModuleId | null;
  onConsumeRequestedModuleHub?: () => void;
  closeModuleHubSignal?: number;
  resetSignal?: number;
  embedInShell?: boolean;
  onCloseEstimateRegister?: () => void;
}) => {
  const { showToast } = useToast();
  const [importMode, setImportMode] = useState<'cite' | 'csv'>('cite');
  const [isCiteModalOpen, setIsCiteModalOpen] = useState(false);
  const [ebqFile, setEbqFile] = useState<File | null>(null);
  const [ebcFile, setEbcFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingProjectModule, setPendingProjectModule] = useState<WorkflowModule | null>(null);
  const [previewModule, setPreviewModule] = useState<WorkflowModule | null>(null);
  const [activeModuleHub, setActiveModuleHub] = useState<WorkflowModuleId | null>(null);
  const [selectedEstimateFolderId, setSelectedEstimateFolderId] = useState(ALL_WORKSPACE_FOLDERS_ID);
  const [selectedEstimateYear, setSelectedEstimateYear] = useState(ALL_WORKSPACE_YEARS_ID);
  const [estimateLibrarySearch, setEstimateLibrarySearch] = useState('');
  const [showArchivedEstimates, setShowArchivedEstimates] = useState(false);
  const [isEstimateFolderDialogOpen, setIsEstimateFolderDialogOpen] = useState(false);
  const [newEstimateFolderName, setNewEstimateFolderName] = useState('');
  const previousEstimateProjectIdsRef = useRef<Set<string>>(new Set(projects.map((project) => project.id)));

  useEffect(() => {
    const previousIds = previousEstimateProjectIdsRef.current;
    const currentIds = new Set(projects.map((project) => project.id));
    const hasNewActiveEstimate = projects.some((project) => !previousIds.has(project.id) && !project.archivedAt);
    previousEstimateProjectIdsRef.current = currentIds;
    if (!hasNewActiveEstimate || activeModuleHub !== 'ESTIMATING') return;
    setSelectedEstimateFolderId(ALL_WORKSPACE_FOLDERS_ID);
    setSelectedEstimateYear(ALL_WORKSPACE_YEARS_ID);
    setEstimateLibrarySearch('');
    setShowArchivedEstimates(false);
  }, [activeModuleHub, projects]);

  const openProjectContextMenu = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    if (shouldUseNativeContextMenu(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    const items = buildProjectActionItems({ project, onSelectProject, onOpenWorkflowModule, onDownloadProject, onDeleteProject });
    setContextMenu({ x: event.clientX, y: event.clientY, label: `${project.name} actions`, items });
  };

  useEffect(() => {
    if (closeModuleHubSignal <= 0) return;
    setPreviewModule(null);
    setPendingProjectModule(null);
    setActiveModuleHub(null);
    setContextMenu(null);
    setSelectedEstimateFolderId(ALL_WORKSPACE_FOLDERS_ID);
    setSelectedEstimateYear(ALL_WORKSPACE_YEARS_ID);
    setEstimateLibrarySearch('');
    setShowArchivedEstimates(false);
    setIsEstimateFolderDialogOpen(false);
  }, [closeModuleHubSignal]);

  useEffect(() => {
    if (resetSignal <= 0) return;
    setPreviewModule(null);
    setPendingProjectModule(null);
    setActiveModuleHub('ESTIMATING');
    setContextMenu(null);
    setSelectedEstimateFolderId(ALL_WORKSPACE_FOLDERS_ID);
    setSelectedEstimateYear(ALL_WORKSPACE_YEARS_ID);
    setEstimateLibrarySearch('');
    setShowArchivedEstimates(false);
    setIsEstimateFolderDialogOpen(false);
  }, [resetSignal]);

  const openModuleForProject = (module: WorkflowModule, projectId: string) => {
    const project = projects.find((entry) => entry.id === projectId);
    setPreviewModule(null);
    onOpenWorkflowModule?.(module.id, projectId);
    setPendingProjectModule(null);
    if (project) {
      showToast({
        type: 'info',
        message: `Opened ${module.name} for ${project.name}.`,
        duration: 2500,
      });
    }
  };

  useEffect(() => {
    if (!requestedModuleHub) return;
    const requestedModule = WORKFLOW_MODULES.find((module) => module.id === requestedModuleHub);
    setPreviewModule(null);
    setPendingProjectModule(null);
    if (requestedModule?.status === 'COMING_SOON') {
      setActiveModuleHub(null);
      setPreviewModule(requestedModule);
    } else {
      setActiveModuleHub(requestedModuleHub);
    }
    onConsumeRequestedModuleHub?.();
  }, [onConsumeRequestedModuleHub, requestedModuleHub]);

  useEffect(() => {
    if (activeModuleHub !== 'ESTIMATING' || !onUpdateProject) return;
    buildEstimateReferenceUpdates(projects).forEach((update) => {
      onUpdateProject(update.id, { reference: update.reference });
    });
  }, [activeModuleHub, onUpdateProject, projects]);

  const handleModuleOpen = (module: WorkflowModule) => {
    setPreviewModule(null);
    setPendingProjectModule(null);

    const target = resolveWorkflowModuleLaunch(module.id, {
      projectCount: projects.length,
      preferHub: true,
    });

    if (!target) return;
    if (target.type === 'MODULE_HUB') {
      setActiveModuleHub(target.module.id);
      return;
    }
    if (target.type === 'PREVIEW' || target.type === 'PROJECT_REQUIRED') {
      setPreviewModule(module);
      return;
    }
    if (target.type === 'PROJECT_PICKER') {
      if (projects.length === 1) {
        openModuleForProject(target.module, projects[0].id);
        return;
      }
      setPendingProjectModule(target.module);
      return;
    }
    if (target.type === 'OPEN_GLOBAL_MODULE') {
      onOpenWorkflowModule?.(target.module.id);
      showToast({ type: 'info', message: `Opened ${target.module.name}.`, duration: 2500 });
    }
  };

  const filteredProjects = useMemo(() => {
    let list = [...projects];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p: Project) =>
        p.name.toLowerCase().includes(q) ||
        (p.client || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    return list;
  }, [projects, searchQuery]);
  const projectWorkflowSummaries = useMemo(() => {
    const map = new Map<string, ProjectWorkflowSummary>();
    projects.forEach((project) => map.set(project.id, buildProjectWorkflowSummary(project)));
    return map;
  }, [projects]);
  const estimateWorkspaceFolders = useMemo(
    () => normalizeWorkspaceFolders(workspaceFolders).filter((folder) => folder.module === 'ESTIMATING'),
    [workspaceFolders]
  );
  const activeEstimateProjects = useMemo(() => projects.filter((project) => !project.archivedAt), [projects]);
  const estimateRegisterProjects = useMemo(
    () => showArchivedEstimates ? projects : activeEstimateProjects,
    [activeEstimateProjects, projects, showArchivedEstimates]
  );
  const archivedEstimateCount = projects.length - activeEstimateProjects.length;
  const estimateLibraryView = useMemo(
    () => buildEstimateLibraryDropdownView(estimateRegisterProjects, estimateWorkspaceFolders, {
      folderId: selectedEstimateFolderId,
      year: selectedEstimateYear,
      search: estimateLibrarySearch,
    }),
    [estimateLibrarySearch, estimateRegisterProjects, estimateWorkspaceFolders, selectedEstimateFolderId, selectedEstimateYear]
  );
  const activeCommandProject = useMemo(() => (
    filteredProjects[0]
      || projects[0]
      || null
  ), [filteredProjects, projects]);

  // Mapping State
  const [isMappingMode, setIsMappingMode] = useState(false);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [skipHeader, setSkipHeader] = useState(true);
  const [mapping, setMapping] = useState({
     reference: -1,
     description: -1,
     unit: -1,
     quantity: -1,
     rate: -1,
     type: -1
  });
  const [previewParseResult, setPreviewParseResult] = useState<ParseCiteResult | null>(null);
  const [importProjectName, setImportProjectName] = useState('');

  const resetImportState = () => {
     setIsCiteModalOpen(false);
     setImportMode('cite');
     setEbqFile(null);
     setEbcFile(null);
     setIsMappingMode(false);
     setPreviewRows([]);
     setPreviewParseResult(null);
     setImportProjectName('');
     setMapping({ reference: -1, description: -1, unit: -1, quantity: -1, rate: -1, type: -1 });
  };

  const getImportSummaryMessage = (label: string, summary: ProjectImportSummary) => {
    if (summary.added === 0 && summary.skipped > 0) {
      return `${label} skipped. ${summary.skipped} duplicate project${summary.skipped === 1 ? ' was' : 's were'} already in the workspace.`;
    }
    if (summary.skipped > 0) {
      return `${label} complete. ${summary.added} added, ${summary.skipped} skipped as duplicate${summary.skipped === 1 ? '' : 's'}.`;
    }
    return `${label} complete. ${summary.added} project${summary.added === 1 ? '' : 's'} added.`;
  };

  const prepareImportedProject = (project: Project) => withAutoSnapshot(
    project,
    `Imported project ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
    'Automatic baseline restore point created when this project was imported.'
  );

  const openImportModal = (mode: 'cite' | 'csv') => {
    setImportMode(mode);
    window.setTimeout(() => {
      setIsCiteModalOpen(true);
    }, 0);
  };

  const isAllowedImportFile = async (file: File, mode: 'cite' | 'csv') => {
    const lowerName = file.name.toLowerCase();
    if (mode === 'csv') {
      if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt') || lowerName.endsWith('.tsv')) {
        return true;
      }
      const sample = (await file.slice(0, 2048).text()).trim().toLowerCase();
      return sample.startsWith('"bill","page","item","section","description"')
        || sample.startsWith('bill,page,item,section,description')
        || sample.includes('"bill","page","item"')
        || sample.includes('bill,page,item');
    }
    return lowerName.endsWith('.ebq') || lowerName.endsWith('.txt');
  };

  const getSuggestedImportProjectName = (file: File | null) => {
    if (!file) return '';
    return file.name.replace(/\.[^/.]+$/, '').trim();
  };

  const applyImportProjectName = (project: Project): Project => {
    const trimmed = importProjectName.trim();
    if (!trimmed) return project;
    return { ...project, name: trimmed };
  };

  const handlePreview = async () => {
      if (!ebqFile) return;
      if (!(await isAllowedImportFile(ebqFile, importMode))) {
          showToast({ type: 'error', message: importMode === 'csv' ? 'Select a CSV, TXT, or TSV schedule file for CSV import.' : 'Select an EBQ or TXT structure file for CITE import.' });
          return;
      }
      try {
          const text = await ebqFile.text();
          const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0).slice(0, 8);
          const parsed = lines.map(parseCiteLine);
          setPreviewRows(parsed);
          setIsMappingMode(true);
      } catch (e) {
          showToast({ type: 'error', message: feedbackError('Import preview', e, 'The file preview could not be read.') });
      }
  };

  const handleCiteSubmit = async (useMapping = false) => {
    if (!ebqFile && !ebcFile) {
        showToast({ type: 'error', message: importMode === 'csv' ? 'Select a CSV file before starting the import.' : 'Select at least one EBQ or EBC file before starting the import.' });
        return;
    }
    if (ebqFile && !(await isAllowedImportFile(ebqFile, importMode))) {
        showToast({ type: 'error', message: importMode === 'csv' ? 'CSV import only supports .csv, .txt, or .tsv schedule files.' : 'CITE import only supports .ebq or .txt structure files.' });
        return;
    }
    
    setIsImporting(true);
    try {
        const files: File[] = [];
        if (ebqFile) files.push(ebqFile);
        if (importMode === 'cite' && ebcFile) files.push(ebcFile);
        
        let mapConfig: ColumnMapping | undefined = undefined;
        if (useMapping && isMappingMode) {
            mapConfig = {
                hasHeader: skipHeader,
                map: mapping
            };
        }
        
        // Pass files to parser which handles encoding (Windows-1252) internally
        const result = await parseCiteFile(files, mapConfig);
        
        if (result) {
          const importedProject = prepareImportedProject(applyImportProjectName(result.project));
          if (useMapping && isMappingMode) {
            const summary = onImportProject(importedProject);
            resetImportState();
            showToast({ type: summary.added > 0 ? 'success' : 'info', message: getImportSummaryMessage('Mapped CITE import', summary) });
          } else if (result.strategy === 'cite' || result.strategy === 'structured' || result.strategy === 'heuristic') {
            setPreviewParseResult({ ...result, project: importedProject });
            setImportProjectName((current) => current.trim() || importedProject.name || getSuggestedImportProjectName(ebqFile));
          } else {
            const summary = onImportProject(importedProject);
            resetImportState();
            showToast({ type: summary.added > 0 ? 'success' : 'info', message: getImportSummaryMessage('Project import', summary) });
          }
        } else {
          showToast({ type: 'error', message: feedbackError('CITE import', undefined, 'No valid bill data was found. Try column mapping or check the source file.') });
        }
    } catch (err) {
        console.error("Import Error:", err);
        showToast({ type: 'error', message: feedbackError('CITE import', err, 'Please check the source files and try again.') });
    } finally {
        setIsImporting(false);
    }
  };

  const handleJsonImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsImporting(true);
        try {
          const text = await file.text();
          const data = JSON.parse(text) as Project | Project[];
          const prepared = Array.isArray(data)
            ? data.map((project) => prepareImportedProject(project))
            : prepareImportedProject(data);
          const summary = onImportProject(prepared);
          showToast({ type: summary.added > 0 ? 'success' : 'info', message: getImportSummaryMessage('JSON project import', summary) });
        } catch(err) {
            showToast({ type: 'error', message: feedbackError('JSON project import', err, 'The selected JSON file is invalid.') });
        } finally {
          setIsImporting(false);
        }
    };
    input.click();
  };

  const importProjectActionItems: ContextMenuEntry[] = [
    {
      id: 'project-import-cite',
      label: 'Import CITE / EBQ schedule',
      description: 'Bring in legacy CITE or EBQ schedules with optional definitions support.',
      icon: <FileUp className="h-4 w-4" />,
      onSelect: () => openImportModal('cite'),
    },
    {
      id: 'project-import-csv',
      label: 'Import CSV schedule',
      description: 'Bring in structured CSV bill exports as a separate workflow.',
      icon: <FileUp className="h-4 w-4" />,
      onSelect: () => openImportModal('csv'),
    },
    {
      id: 'project-import-json',
      label: `Import ${APP_NAME} JSON backup`,
      description: 'Restore an existing workspace export. Duplicate project ids are skipped.',
      icon: <FileUp className="h-4 w-4" />,
      onSelect: handleJsonImport,
    },
  ];

  const renderImportProjectMenu = ({
    label,
    className,
    width = 304,
  }: {
    label: string;
    className: string;
    width?: number;
  }) => (
    <PopoverMenu
      ariaLabel="Import project"
      width={width}
      estimatedHeight={260}
      align="left"
      trigger={({ ref, isOpen, toggle }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          className={className}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <FileUp className="w-4 h-4" />
          {label}
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    >
      {(close) => <MenuActionList items={importProjectActionItems} close={close} itemTextSize="text-sm" />}
    </PopoverMenu>
  );

  const renderEstimateImportMenu = () => {
    const estimateImportItems: ContextMenuEntry[] = [
      {
        id: 'estimate-import-cite',
        label: 'Import EBQ / CITE',
        description: 'Import a CITE .ebq or text export as a new estimate.',
        icon: <FileUp className="h-4 w-4" />,
        onSelect: () => {
          closeModuleHub();
          openImportModal('cite');
        },
      },
      {
        id: 'estimate-import-csv',
        label: 'Import CSV schedule',
        description: 'Bring in structured CSV bill exports.',
        icon: <FileUp className="h-4 w-4" />,
        onSelect: () => {
          closeModuleHub();
          openImportModal('csv');
        },
      },
      {
        id: 'estimate-import-json',
        label: `Import ${APP_NAME} JSON backup`,
        description: 'Restore an existing workspace export.',
        icon: <FileUp className="h-4 w-4" />,
        onSelect: () => {
          closeModuleHub();
          handleJsonImport();
        },
      },
    ];
    return (
      <PopoverMenu
        ariaLabel="Import estimate"
        width={304}
        estimatedHeight={260}
        align="left"
        trigger={({ ref, isOpen, toggle }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            className="workspace-secondary-btn px-3 py-2 text-xs"
            aria-haspopup="menu"
            aria-expanded={isOpen}
          >
            <FileUp className="w-4 h-4" />
            Import
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      >
        {(close) => <MenuActionList items={estimateImportItems} close={close} itemTextSize="text-sm" />}
      </PopoverMenu>
    );
  };

  const closeModuleHub = () => {
    setActiveModuleHub(null);
    if (activeModuleHub === 'ESTIMATING') onCloseEstimateRegister?.();
  };

  const openProjectModuleFromHub = (moduleId: WorkflowModuleId, projectId: string) => {
    const module = WORKFLOW_MODULES.find((entry) => entry.id === moduleId);
    if (!module) return;
    closeModuleHub();
    openModuleForProject(module, projectId);
  };

  const renderEstimateRegisterContent = () => (
    <div data-smoke="estimate-register-window" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Estimate register</div>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">Register</h2>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Open estimates, filter by folder or year, and start new work from one tidy register.
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" data-smoke="estimate-new-estimate" onClick={() => { closeModuleHub(); onNewProject(); }} className="workspace-primary-btn px-3 py-2 text-xs">
            <PlusCircle className="h-4 w-4" />
            New estimate
          </button>
          {renderEstimateImportMenu()}
          {onCreateSampleProject && (
            <button type="button" onClick={() => { closeModuleHub(); void onCreateSampleProject(); }} disabled={isCreatingSampleProject} className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60">
              <Sparkles className="h-4 w-4" />
              {isCreatingSampleProject ? 'Creating...' : 'Sample bill'}
            </button>
          )}
          <button type="button" disabled={ESTIMATE_ONLY} title={ESTIMATE_ONLY ? 'Library maintenance is not enabled in this edition' : undefined} onClick={() => { closeModuleHub(); onOpenLibrary(); }} className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">
            <LibraryIcon className="h-4 w-4" />
            Libraries
          </button>
          {onOpenAppraisalLibraries && (
            <button type="button" disabled={ESTIMATE_ONLY} onClick={() => { closeModuleHub(); onOpenAppraisalLibraries(); }} className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">
              <Calculator className="h-4 w-4" />
              Appraisal libraries
            </button>
          )}
        </div>
      </div>
      {renderEstimateLibrary()}
    </div>
  );

  const renderEstimateRegisterWorkspace = () => (
    <main data-smoke="estimate-register-workspace" className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-[118rem] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-app-sm border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:bg-surface-900 dark:text-slate-400">
            <Building2 className="h-3.5 w-3.5" />
            Estimating
          </div>
          <button type="button" onClick={closeModuleHub} className="workspace-secondary-btn px-3 py-2 text-xs">
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
        <section className="workspace-sidebar p-4">
          {renderEstimateRegisterContent()}
        </section>
      </div>
    </main>
  );

  const handleCreateEstimateFolder = (folderName: string) => {
    const name = folderName.trim();
    if (!name || !setWorkspaceFolders) return;
    const next = createWorkspaceFolder('ESTIMATING', name);
    setWorkspaceFolders((current) => normalizeWorkspaceFolders([next, ...current]));
    setSelectedEstimateFolderId(next.id);
    setSelectedEstimateYear(ALL_WORKSPACE_YEARS_ID);
    setNewEstimateFolderName('');
    setIsEstimateFolderDialogOpen(false);
    showToast({ type: 'success', message: `${next.name} folder created.` });
  };
  const openEstimateFolderDialog = () => {
    setNewEstimateFolderName('');
    setIsEstimateFolderDialogOpen(true);
  };

  const handleAssignEstimateFolder = (projectId: string, folderId: string) => {
    onUpdateProject?.(projectId, { estimateFolderId: folderId || undefined });
  };
  const handleArchiveEstimate = (project: Project) => {
    if (!onUpdateProject) return;
    const confirmed = window.confirm(`Archive "${project.name}"? It will be hidden from the active estimate register.`);
    if (!confirmed) return;
    const timestamp = new Date().toISOString();
    onUpdateProject(project.id, { archivedAt: timestamp, updatedAt: timestamp });
    showToast({ type: 'info', message: `${project.name} archived.` });
  };
  const handleRestoreEstimate = (project: Project) => {
    if (!onUpdateProject) return;
    const timestamp = new Date().toISOString();
    onUpdateProject(project.id, { archivedAt: undefined, updatedAt: timestamp });
    showToast({ type: 'success', message: `${project.name} restored to active estimates.` });
  };
  const handleDeleteEstimate = (project: Project) => {
    const confirmed = window.confirm(`Permanently delete "${project.name}"? This cannot be undone.`);
    if (!confirmed) return;
    onDeleteProject(project.id);
    showToast({ type: 'info', message: `${project.name} deleted.` });
  };

  const selectedEstimateFolder = estimateWorkspaceFolders.find((folder) => folder.id === estimateLibraryView.selectedFolderId) || null;
  const renameSelectedEstimateFolder = () => {
    if (!selectedEstimateFolder || !setWorkspaceFolders) return;
    const nextName = window.prompt('Rename estimate folder', selectedEstimateFolder.name)?.trim();
    if (!nextName || nextName === selectedEstimateFolder.name) return;
    setWorkspaceFolders((current) => normalizeWorkspaceFolders(current.map((folder) => (
      folder.id === selectedEstimateFolder.id ? { ...folder, name: nextName, updatedAt: new Date().toISOString() } : folder
    ))));
    showToast({ type: 'success', message: `Folder renamed to ${nextName}.` });
  };
  const deleteSelectedEstimateFolder = () => {
    if (!selectedEstimateFolder || !setWorkspaceFolders) return;
    const confirmed = window.confirm(`Delete "${selectedEstimateFolder.name}"? Estimates in this folder will move to Unfiled estimates.`);
    if (!confirmed) return;
    projects
      .filter((project) => project.estimateFolderId === selectedEstimateFolder.id)
      .forEach((project) => handleAssignEstimateFolder(project.id, ''));
    setWorkspaceFolders((current) => normalizeWorkspaceFolders(current.filter((folder) => folder.id !== selectedEstimateFolder.id)));
    setSelectedEstimateFolderId(ALL_WORKSPACE_FOLDERS_ID);
    setSelectedEstimateYear(ALL_WORKSPACE_YEARS_ID);
    showToast({ type: 'info', message: `${selectedEstimateFolder.name} deleted. Estimates moved to Unfiled.` });
  };
  const selectedEstimateFolderActionItems: ContextMenuEntry[] = selectedEstimateFolder ? [
    { id: 'estimate-folder-actions-label', type: 'label', label: selectedEstimateFolder.name },
    {
      id: 'estimate-folder-rename',
      label: 'Rename folder',
      icon: <MoreHorizontal className="h-4 w-4" />,
      onSelect: renameSelectedEstimateFolder,
    },
    {
      id: 'estimate-folder-delete',
      label: 'Delete folder',
      icon: <Trash2 className="h-4 w-4" />,
      tone: 'danger',
      onSelect: deleteSelectedEstimateFolder,
    },
  ] : [];

  const renderProjectHubRows = (moduleId: WorkflowModuleId) => (
    <div className="space-y-2">
      {projects.map((project) => {
        const summary = projectWorkflowSummaries.get(project.id) || buildProjectWorkflowSummary(project);
        return (
          <button
            key={project.id}
            type="button"
            onClick={() => openProjectModuleFromHub(moduleId, project.id)}
            className="flex w-full items-center justify-between gap-4 rounded-app border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/45 dark:border-slate-700 dark:bg-surface-900 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
          >
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{project.name}</span><ProjectLocationBadge project={project} className="shrink-0" /></span>
              <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                {[project.client, project.location].filter(Boolean).join(' | ') || `${summary.billCount} bill${summary.billCount === 1 ? '' : 's'}`}
              </span>
              <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-surface-800">{summary.billCount} bills</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-surface-800">{summary.pricedItemCount.toLocaleString()} priced</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-surface-800">{summary.assignedTradeCount} trades</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-surface-800">{summary.tenderAwardCount} awards</span>
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {formatCurrency(calculateProjectTotal(project))}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderEstimateLibrary = () => {
    if (projects.length === 0) {
      return (
        <div className="rounded-app border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Create, import, or open the sample bill to start your estimates library.
        </div>
      );
    }

    return (
      <div data-smoke="estimate-library" className="overflow-hidden rounded-app border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900">
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50/85 p-3 dark:border-slate-800 dark:bg-surface-800/70 md:grid-cols-[minmax(170px,1fr)_minmax(120px,0.55fr)_minmax(180px,1.1fr)_auto_auto_auto]">
          <label className="min-w-0">
            <span className="sr-only">Folder</span>
            <select
              data-smoke="estimate-folder-filter"
              value={estimateLibraryView.selectedFolderId}
              onChange={(event) => {
                setSelectedEstimateFolderId(event.target.value);
                setSelectedEstimateYear(ALL_WORKSPACE_YEARS_ID);
              }}
              className="workspace-input w-full px-3 py-2 text-xs"
            >
              {estimateLibraryView.folderOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Year</span>
            <select
              data-smoke="estimate-year-filter"
              value={estimateLibraryView.selectedYear}
              onChange={(event) => setSelectedEstimateYear(event.target.value)}
              className="workspace-input w-full px-3 py-2 text-xs"
            >
              <option value={ALL_WORKSPACE_YEARS_ID}>All years</option>
              {estimateLibraryView.yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Search</span>
            <input
              data-smoke="estimate-search"
              value={estimateLibrarySearch}
              onChange={(event) => setEstimateLibrarySearch(event.target.value)}
              placeholder="Search"
              className="workspace-input w-full px-3 py-2 text-xs"
            />
          </label>
          <button
            type="button"
            data-smoke="estimate-add-folder"
            onClick={openEstimateFolderDialog}
            disabled={!setWorkspaceFolders}
            aria-label="Create estimate folder"
            title="Create estimate folder"
            className="workspace-primary-btn h-9 w-9 justify-center p-0 disabled:opacity-50"
          >
            <PlusCircle className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowArchivedEstimates((value) => !value)}
            className={`workspace-secondary-btn h-9 px-3 text-xs ${showArchivedEstimates ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200' : ''}`}
          >
            <Archive className="h-4 w-4" />
            Archived
            {archivedEstimateCount > 0 && <span className="tabular-nums">({archivedEstimateCount})</span>}
          </button>
          <PopoverMenu
            ariaLabel="Estimate folder actions"
            width={240}
            estimatedHeight={150}
            trigger={({ ref, isOpen, toggle }) => (
              <button
                ref={ref}
                type="button"
                onClick={toggle}
                disabled={!selectedEstimateFolder}
                className="workspace-secondary-btn h-9 w-9 justify-center p-0 disabled:opacity-50"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                title="Folder actions"
                aria-label="Folder actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          >
            {(close) => <MenuActionList items={selectedEstimateFolderActionItems} close={close} itemTextSize="text-xs" />}
          </PopoverMenu>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>
            {estimateLibraryView.projects.length} of {estimateRegisterProjects.length} {showArchivedEstimates ? 'visible ' : ''}
            estimate{estimateRegisterProjects.length === 1 ? '' : 's'}
            {!showArchivedEstimates && archivedEstimateCount > 0 ? ` (${archivedEstimateCount} archived)` : ''}
          </span>
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {formatCurrency(estimateLibraryView.projects.reduce((sum, project) => safeAdd(sum, calculateProjectTotal(project)), 0))}
          </span>
        </div>

        <div data-smoke="estimate-library-results" className="divide-y divide-slate-100 dark:divide-slate-800">
          {estimateLibraryView.projects.length > 0 ? (
            estimateLibraryView.projects.map((project) => {
              const summary = projectWorkflowSummaries.get(project.id) || buildProjectWorkflowSummary(project);
              const referenceLabel = isEstimateReferencePlaceholder(project.reference) ? '' : project.reference;
              return (
                <div
                  key={project.id}
                  data-smoke="estimate-library-row"
                  className={`grid w-full grid-cols-1 gap-3 bg-white px-4 py-3 text-left transition hover:bg-emerald-50/55 dark:bg-surface-900 dark:hover:bg-emerald-950/20 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,17rem)_minmax(9rem,12rem)_minmax(8rem,10rem)_auto] lg:items-center ${project.archivedAt ? 'opacity-75' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{project.name}</span>
                      <ProjectLocationBadge project={project} className="shrink-0" />
                      {project.archivedAt && (
                        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200">
                          Archived
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-surface-800">{folderYearFromRevision(project.updatedAt)}</span>
                      {referenceLabel && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold tabular-nums dark:bg-surface-800">{referenceLabel}</span>}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-surface-800">{summary.billCount} bill{summary.billCount === 1 ? '' : 's'}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-surface-800">{summary.pricedItemCount.toLocaleString()} priced</span>
                      {project.client && <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-surface-800">{project.client}</span>}
                    </span>
                  </span>
                  <label className="min-w-0">
                    <span className="sr-only">Estimate folder</span>
                    <select
                      value={project.estimateFolderId || ''}
                      onChange={(event) => handleAssignEstimateFolder(project.id, event.target.value)}
                      className="workspace-input w-full px-2.5 py-1.5 text-xs"
                      disabled={!onUpdateProject}
                    >
                      <option value="">Unfiled estimates</option>
                      {estimateWorkspaceFolders.map((folder) => (
                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                      ))}
                    </select>
                  </label>
                  <span className="text-left lg:text-right">
                    <span className="block text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(calculateProjectTotal(project))}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 lg:text-right">
                    Updated {new Date(project.updatedAt || Date.now()).toLocaleDateString()}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <button type="button" onClick={() => openProjectModuleFromHub('ESTIMATING', project.id)} className="workspace-secondary-btn px-2.5 py-1 text-[11px]">
                      Open
                    </button>
                    {project.archivedAt ? (
                      <button
                        type="button"
                        onClick={() => handleRestoreEstimate(project)}
                        disabled={!onUpdateProject}
                        className="workspace-icon-btn h-8 w-8 disabled:opacity-50"
                        aria-label={`Restore ${project.name}`}
                        title="Restore estimate"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleArchiveEstimate(project)}
                        disabled={!onUpdateProject}
                        className="workspace-icon-btn h-8 w-8 disabled:opacity-50"
                        aria-label={`Archive ${project.name}`}
                        title="Archive estimate"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteEstimate(project)}
                      className="workspace-icon-btn h-8 w-8 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-300 dark:hover:border-rose-900/70 dark:hover:bg-rose-950/30 dark:hover:text-rose-200"
                      aria-label={`Delete ${project.name}`}
                      title="Delete estimate"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No estimates match the selected folder, year, and search filters.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderModuleHub = () => {
    if (!activeModuleHub) return null;
    const module = WORKFLOW_MODULES.find((entry) => entry.id === activeModuleHub);
    if (!module) return null;

    const isProjectModule = activeModuleHub === 'ESTIMATING' || activeModuleHub === 'TENDER_ANALYSIS' || activeModuleHub === 'COST_REPORTS';
    const isLibraryMaintenanceHub = activeModuleHub === 'LIBRARY_MAINTENANCE';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-black/60" onClick={closeModuleHub}>
        <div className={`flex max-h-[88vh] w-full flex-col overflow-hidden rounded-app-lg border border-slate-200 bg-white shadow-app-lg dark:border-slate-700 dark:bg-surface-900 ${isLibraryMaintenanceHub ? 'max-w-3xl' : 'max-w-5xl'}`} onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300">
                {MODULE_ICONS[module.id]}
                Module hub
              </div>
              <h2 className="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-50">{module.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">{module.description}</p>
            </div>
            <button type="button" onClick={closeModuleHub} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close module hub">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto p-6">
            {activeModuleHub === 'LIBRARY_MAINTENANCE' && (
              <div className="overflow-hidden rounded-app border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900">
                {onOpenAppraisalLibraries && (
                  <button
                    type="button"
                    data-smoke="hub-open-appraisal-libraries"
                    onClick={() => { closeModuleHub(); onOpenAppraisalLibraries(); }}
                    className="grid w-full grid-cols-[5.75rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-200 px-4 py-3 text-left transition hover:bg-emerald-50/55 dark:border-slate-800 dark:hover:bg-emerald-950/20"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Appraisal</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-app-sm border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                      <Calculator className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-950 dark:text-slate-50">Appraisal libraries</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">House type index, GIFA costs, and infrastructure rate index.</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => { closeModuleHub(); onOpenLibrary(); }}
                  className="grid w-full grid-cols-[5.75rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-200 px-4 py-3 text-left transition hover:bg-emerald-50/55 dark:border-slate-800 dark:hover:bg-emerald-950/20"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Estimating</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-app-sm border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <LibraryIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-950 dark:text-slate-50">Bill / Standards libraries</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">SMM7, QSP, protected packs, sections, headings, and reusable bill items.</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => { closeModuleHub(); onOpenTrades(); }}
                  className="grid w-full grid-cols-[5.75rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-emerald-50/55 dark:hover:bg-emerald-950/20"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Tender</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-app-sm border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <Briefcase className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-950 dark:text-slate-50">Trade & Contractor Library</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">Trade packages and contractor shortlists for tender issue and returns.</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            )}

            {activeModuleHub === 'AUDITS' && (
              <div className="grid gap-4 md:grid-cols-[1fr_280px]">
                <div className="rounded-app border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-surface-800/65">
                  <History className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                  <div className="mt-3 text-sm font-semibold text-slate-950 dark:text-slate-50">Operation audit trail</div>
                  <div className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Review local import, export, save, backup, AI, library, and system events. This is the first audit layer; future versions can add project-aware value-change history.
                  </div>
                </div>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      closeModuleHub();
                      onOpenAuditTrail?.();
                    }}
                    className="workspace-primary-btn w-full justify-center px-4 py-2.5 text-sm"
                  >
                    <History className="h-4 w-4" />
                    Open audit trail
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeModuleHub();
                      onOpenDiagnostics?.();
                    }}
                    className="workspace-secondary-btn w-full justify-center px-4 py-2.5 text-sm"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Open diagnostics
                  </button>
                </div>
              </div>
            )}

            {activeModuleHub === 'ESTIMATING' && (
              renderEstimateRegisterContent()
            )}

            {isProjectModule && activeModuleHub !== 'ESTIMATING' && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Choose project</div>
                <div className="mt-3">{projects.length > 0 ? renderProjectHubRows(activeModuleHub) : <div className="rounded-app border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Create or import a project before opening this module.</div>}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMappingSelect = (colIndex: number) => {
      const activeField = Object.entries(mapping).find(([key, val]) => val === colIndex)?.[0];
      
      return (
         <select 
            className={`w-full text-[10px] font-medium p-2 rounded-app-sm border-2 outline-none ${activeField ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:border-primary-500 text-primary-700 dark:text-primary-200' : 'border-slate-200 dark:border-slate-600 bg-surface dark:bg-surface-800 text-slate-400 dark:text-slate-500'}`}
            value={activeField || ''}
            onChange={(e) => {
                const field = e.target.value;
                const newMap = { ...mapping };
                // Clear previous assignment of this field
                Object.keys(newMap).forEach(k => {
                   if ((newMap as any)[k] === colIndex) (newMap as any)[k] = -1;
                });
                
                if (field) {
                   // Clear previous assignment of this index to other fields (optional, but good for 1-to-1)
                   (newMap as any)[field] = colIndex;
                }
                setMapping(newMap);
            }}
         >
             <option value="">Ignore</option>
             <option value="reference">Reference</option>
             <option value="description">Description</option>
             <option value="unit">Unit</option>
             <option value="quantity">Quantity</option>
             <option value="rate">Rate</option>
             <option value="type">Row Type</option>
         </select>
      );
  };

  const isEmbeddedEstimateRegister = embedInShell && activeModuleHub === 'ESTIMATING';

  return (
    <div data-smoke="home-workspace" className={embedInShell ? 'h-full min-h-0 flex-1 overflow-y-auto bg-surface-50 dark:bg-surface-950 font-sans' : 'min-h-screen bg-surface-50 dark:bg-surface-950 font-sans'}>
      {!embedInShell && (
      <nav className="h-12 bg-surface dark:bg-surface-900 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between px-4 sticky top-0 z-40 shadow-app">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-800 p-1.5 rounded-app-sm shadow-app dark:bg-emerald-700">
            <Calculator className="w-5 h-5 text-white dark:text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">{APP_SHORT_NAME}</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Projects</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={ESTIMATE_ONLY}
            onClick={() => setActiveModuleHub('LIBRARY_MAINTENANCE')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LibraryIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Library
          </button>
          <ThemeToggle />
          {onOpenShortcuts && (
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title="Keyboard shortcuts"
              aria-label="Keyboard shortcuts"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onNewProject}
            className="workspace-primary-btn px-3 py-1.5 text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" /> New project
          </button>
        </div>
      </nav>
      )}
      {isEmbeddedEstimateRegister ? renderEstimateRegisterWorkspace() : (
      <div className="mx-auto max-w-7xl p-5 space-y-5">
        <section className="relative overflow-hidden rounded-app-lg border border-emerald-900/20 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-800 px-5 py-4 text-white shadow-card">
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rotate-12 rounded-[38px] border-[18px] border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute right-24 -bottom-20 h-40 w-40 -rotate-12 rounded-[32px] border-[14px] border-white/10" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 shadow-sm">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100/80">{APP_NAME}</div>
                <h1 className="mt-0.5 text-xl font-semibold tracking-tight">Recent projects</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeCommandProject && (
                <button type="button" data-smoke="open-active-project" onClick={() => onSelectProject(activeCommandProject.id)} className="rounded-app border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20">
                  <FolderOpen className="mr-1.5 inline h-4 w-4" /> Continue
                </button>
              )}
              <button type="button" onClick={onNewProject} data-help-id="home-new-project" data-smoke="new-project" className="rounded-app bg-white px-3 py-2 text-xs font-semibold text-emerald-950 shadow-sm hover:bg-emerald-50">
                <PlusCircle className="mr-1.5 inline h-4 w-4" /> New project
              </button>
              <div data-help-id="home-import" className="shrink-0">{renderImportProjectMenu({ label: 'Import', className: 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-app border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20', width: 304 })}</div>
              {onCreateSampleProject && (
                <button type="button" data-smoke="sample-bill" onClick={onCreateSampleProject} disabled={isCreatingSampleProject} className="rounded-app border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50">
                  {isCreatingSampleProject ? 'Creating…' : 'Sample bill'}
                </button>
              )}
            </div>
          </div>
        </section>
        <section data-help-id="home-project-list" className="overflow-hidden rounded-app-lg border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-surface-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Projects</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{filteredProjects.length} project{filteredProjects.length === 1 ? '' : 's'} · latest first</p>
            </div>
            <label className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Search projects"
                placeholder="Search projects"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="workspace-input w-full py-2 pl-9 pr-3 text-sm"
              />
            </label>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onContextMenu={(event) => openProjectContextMenu(event, project)}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-app bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Building2 className="h-4 w-4" />
                </div>
                <button type="button" onClick={() => onSelectProject(project.id)} className="min-w-0 flex-1 text-left">
                  <span className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{project.name}</span><ProjectLocationBadge project={project} className="shrink-0" /></span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {[project.client, project.location].filter(Boolean).join(' · ') || 'Estimate'}
                  </span>
                </button>
                <span className="hidden shrink-0 text-xs text-slate-500 dark:text-slate-400 sm:block">{new Date(project.updatedAt || Date.now()).toLocaleDateString()}</span>
                <PopoverMenu
                  ariaLabel={project.name + ' project actions'}
                  width={260}
                  estimatedHeight={260}
                  trigger={({ ref, isOpen, toggle }) => (
                    <button ref={ref} type="button" onClick={toggle} className="workspace-icon-btn h-8 w-8" aria-haspopup="menu" aria-expanded={isOpen}>
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  )}
                >
                  {(close) => <MenuActionList items={buildProjectActionItems({ project, onSelectProject, onOpenWorkflowModule, onDownloadProject, onDeleteProject })} close={close} itemTextSize="text-sm" />}
                </PopoverMenu>
              </div>
            ))}
            {filteredProjects.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                {projects.length === 0 ? 'No projects yet. Create or import one to get started.' : 'No projects match your search.'}
              </div>
            )}
          </div>
        </section>
      </div>
      )}
      {!isEmbeddedEstimateRegister && renderModuleHub()}

      {isEstimateFolderDialogOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm dark:bg-black/65"
          onClick={() => setIsEstimateFolderDialogOpen(false)}
        >
          <form
            data-smoke="estimate-folder-dialog"
            className="w-full max-w-md overflow-hidden rounded-app-lg border border-slate-200 bg-white shadow-app-lg dark:border-slate-700 dark:bg-surface-900"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateEstimateFolder(newEstimateFolderName);
            }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Estimate register</div>
                <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">New folder</h2>
              </div>
              <button type="button" onClick={() => setIsEstimateFolderDialogOpen(false)} className="workspace-icon-btn" aria-label="Close new estimate folder dialog">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Folder name</span>
                <input
                  autoFocus
                  data-smoke="estimate-folder-name"
                  value={newEstimateFolderName}
                  onChange={(event) => setNewEstimateFolderName(event.target.value)}
                  className="workspace-input mt-1 w-full px-3 py-2 text-sm"
                  placeholder="e.g. 2026 tenders"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-surface-800/70">
              <button type="button" onClick={() => setIsEstimateFolderDialogOpen(false)} className="workspace-secondary-btn px-3 py-2 text-xs">
                Cancel
              </button>
              <button type="submit" disabled={!newEstimateFolderName.trim()} className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50">
                Create folder
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingProjectModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-black/60" onClick={() => setPendingProjectModule(null)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-app-lg border border-slate-200 bg-white shadow-app-lg dark:border-slate-700 dark:bg-surface-900" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {MODULE_ICONS[pendingProjectModule.id]}
                  Choose project
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-slate-50">{pendingProjectModule.name}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  Select the project to open in this module.
                </p>
              </div>
              <button type="button" onClick={() => setPendingProjectModule(null)} className="workspace-icon-btn" aria-label="Close project picker">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <div className="space-y-2">
                {projects.map((project) => {
                  const summary = projectWorkflowSummaries.get(project.id) || buildProjectWorkflowSummary(project);
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => openModuleForProject(pendingProjectModule, project.id)}
                      className="flex w-full items-center justify-between gap-4 rounded-app border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/45 dark:border-slate-700 dark:bg-surface-900 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{project.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                          {[project.client, project.location].filter(Boolean).join(' | ') || `${summary.billCount} bill${summary.billCount === 1 ? '' : 's'}`}
                        </span>
                        <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-surface-800">{summary.pricedItemCount.toLocaleString()} priced</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-surface-800">{summary.assignedTradeCount} trades</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-surface-800">{summary.tenderAwardCount} awards</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-surface-800">{summary.hasCostPlan ? 'Cost plan' : 'No cost plan'}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                        {formatCurrency(calculateProjectTotal(project))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-black/60" onClick={() => setPreviewModule(null)}>
          <div className="w-full max-w-4xl overflow-hidden rounded-app-lg border border-slate-200 bg-white shadow-app-lg dark:border-slate-700 dark:bg-surface-900" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300">
                  {MODULE_ICONS[previewModule.id]}
                  {getWorkflowModuleStatusLabel(previewModule.status)}
                </div>
                <h2 className="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-50">{previewModule.name}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">{previewModule.description}</p>
              </div>
              <button type="button" onClick={() => setPreviewModule(null)} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close module preview">
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <ModuleDetailList title="Planned inputs" items={previewModule.plannedInputs} />
              <ModuleDetailList title="Planned outputs" items={previewModule.plannedOutputs} />
              {previewModule.requiresProject && projects.length === 0 && (
                <div className="rounded-app border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 md:col-span-2">
                  This module needs a project. Create, import, or open a sample bill first.
                </div>
              )}
              <div className="rounded-app border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-surface-900/65 dark:text-slate-400 md:col-span-2">
                Placeholder only. This module does not create, change, import, export, or calculate commercial data yet.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CITE Import Modal */}
      {isCiteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm p-4 sm:p-6">
          <div className={`bg-surface dark:bg-surface-800 my-auto flex max-h-[calc(100vh-2rem)] w-full flex-col ${previewParseResult || isMappingMode ? 'max-w-4xl' : 'max-w-lg'} rounded-app-lg shadow-app-lg border border-slate-200 dark:border-slate-700 overflow-hidden sm:max-h-[calc(100vh-3rem)]`}>
            <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{importMode === 'csv' ? 'Import CSV schedule' : 'Import CITE / EBQ'}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  {previewParseResult ? 'Confirm import or map columns manually' : isMappingMode ? 'Map columns manually' : importMode === 'csv' ? 'Automatic CSV import or column mapping' : 'Automatic CITE / EBQ import or mapping'}
                </p>
              </div>
              <button onClick={resetImportState} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400 dark:text-slate-500" /></button>
            </div>
            {isImporting && (
                <div className="h-1 bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full w-1/3 bg-slate-800 dark:bg-slate-200 progress-indeterminate" />
              </div>
            )}
            
            <div className="min-h-0 overflow-y-auto p-8 space-y-6">
               {previewParseResult ? (
                 /* Preview & confirm (CITE or heuristic import) */
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Imported project name</label>
                     <input
                       type="text"
                       value={importProjectName}
                       onChange={(e) => {
                         const nextName = e.target.value;
                         setImportProjectName(nextName);
                         setPreviewParseResult((current) => current ? {
                           ...current,
                           project: {
                             ...current.project,
                             name: nextName.trim() || getSuggestedImportProjectName(ebqFile) || current.project.name,
                           },
                         } : current);
                       }}
                       placeholder={getSuggestedImportProjectName(ebqFile) || 'Enter project name'}
                       className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
                     />
                   </div>
                  <div className="flex items-center gap-2">
                     <span className={`inline-flex px-2.5 py-1 rounded-app-sm text-xs font-medium ${
                       previewParseResult.strategy === 'cite'
                         ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                         : previewParseResult.strategy === 'structured'
                           ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                           : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                     }`}>
                       {previewParseResult.strategy === 'cite'
                         ? 'CITE format detected'
                         : previewParseResult.strategy === 'structured'
                           ? 'Structured legacy CSV detected'
                           : 'Automatic column detection'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {previewParseResult.project.bills.reduce((n, b) => n + b.sections.reduce((m, s) => m + getSectionItems(s).length, 0), 0)} items - check below then confirm or map manually.
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-app border border-slate-200/80 bg-surface-muted/60 px-4 py-3 dark:border-slate-700 dark:bg-surface-800/70">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Bills imported</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{previewParseResult.summary.billsImported}</div>
                    </div>
                    <div className="rounded-app border border-slate-200/80 bg-surface-muted/60 px-4 py-3 dark:border-slate-700 dark:bg-surface-800/70">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Sections inferred</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{previewParseResult.summary.sectionsInferred}</div>
                    </div>
                    <div className="rounded-app border border-slate-200/80 bg-surface-muted/60 px-4 py-3 dark:border-slate-700 dark:bg-surface-800/70">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Rows skipped</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{previewParseResult.summary.rowsSkipped}</div>
                    </div>
                    <div className="rounded-app border border-slate-200/80 bg-surface-muted/60 px-4 py-3 dark:border-slate-700 dark:bg-surface-800/70">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Headings promoted</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{previewParseResult.summary.headingsPromoted}</div>
                    </div>
                  </div>
                  <div className="rounded-app border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-xs leading-5 text-sky-800 dark:border-sky-900/70 dark:bg-sky-900/20 dark:text-sky-200">
                    Import QA summary: bills imported shows the number of live bills created, sections inferred highlights where structure was reconstructed, rows skipped catches blank or unusable records, and headings promoted shows non-priced heading rows kept for context.
                  </div>
                  <div className="rounded-app border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          Import reconciliation
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Check the imported bill structure before you commit it
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {previewParseResult.project.bills.length} bill{previewParseResult.project.bills.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200/80 dark:border-slate-700/80">
                            <th className="pb-3 text-left font-semibold text-slate-500 dark:text-slate-400">Bill</th>
                            <th className="pb-3 text-center font-semibold text-slate-500 dark:text-slate-400">Sections</th>
                            <th className="pb-3 text-center font-semibold text-slate-500 dark:text-slate-400">Pages</th>
                            <th className="pb-3 text-center font-semibold text-slate-500 dark:text-slate-400">Priced items</th>
                            <th className="pb-3 text-center font-semibold text-slate-500 dark:text-slate-400">Headings</th>
                            <th className="pb-3 text-right font-semibold text-slate-500 dark:text-slate-400">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getImportAuditRows(previewParseResult.project).map((row) => (
                            <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                              <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">{row.name}</td>
                              <td className="py-3 text-center text-slate-600 dark:text-slate-300">{row.sectionCount}</td>
                              <td className="py-3 text-center text-slate-600 dark:text-slate-300">{row.pageCount}</td>
                              <td className="py-3 text-center text-slate-600 dark:text-slate-300">{row.pricedItemCount}</td>
                              <td className="py-3 text-center text-slate-600 dark:text-slate-300">{row.headingCount}</td>
                              <td className="py-3 text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(row.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-600 rounded-app max-h-[40vh] overflow-y-auto">
                     <table className="w-full text-left text-sm">
                       <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600">
                         <tr>
                           <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Ref</th>
                           <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Description</th>
                           <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Unit</th>
                           <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Qty</th>
                           <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Rate</th>
                           <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Total</th>
                         </tr>
                       </thead>
                       <tbody>
                         {getPreviewItems(previewParseResult.project, 15).map((row, idx) => (
                           <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/70">
                             <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{row.ref}</td>
                             <td className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={row.desc}>{row.desc}</td>
                             <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400">{row.unit}</td>
                             <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">{row.qty}</td>
                             <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">{formatCurrency(row.rate)}</td>
                             <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100">{formatCurrency(row.total)}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   <div className="flex gap-3 pt-2">
                     <button
                         onClick={() => {
                           if (!previewParseResult) return;
                           const summary = onImportProject(previewParseResult.project);
                           const msg = previewParseResult.strategy === 'cite'
                             ? getImportSummaryMessage('CITE import', summary)
                             : previewParseResult.strategy === 'structured'
                               ? getImportSummaryMessage('CSV import', summary)
                               : getImportSummaryMessage('Automatic import', summary);
                           showToast({ type: summary.added > 0 ? 'success' : 'info', message: msg });
                           resetImportState();
                         }}
                       className="workspace-primary-btn px-6 py-3"
                     >
                       Use this import
                     </button>
                     <button
                       onClick={async () => {
                         setPreviewParseResult(null);
                         setIsMappingMode(true);
                         if (ebqFile) await handlePreview();
                       }}
                       className="bg-surface dark:bg-surface-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-app font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                     >
                       Map columns manually
                     </button>
                   </div>
                 </div>
               ) : !isMappingMode ? (
                 <>
                   {/* File Inputs */}
                   <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {importMode === 'csv' ? '1. CSV schedule file (.CSV / .TXT / .TSV)' : '1. Structure file (.EBQ / .TXT)'}
                    </label>
                    <div className="relative">
                        <input 
                          type="file" 
                          accept={importMode === 'csv' ? '.csv,.txt,.tsv,text/csv,text/plain' : '.ebq,.txt,text/plain'}
                          onChange={(e) => {
                            const nextFile = e.target.files?.[0] || null;
                            setEbqFile(nextFile);
                            setImportProjectName((current) => current.trim() || getSuggestedImportProjectName(nextFile));
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className={`w-full border-2 border-dashed rounded-xl p-4 flex items-center gap-3 transition-colors ${ebqFile ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-600' : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                           <div className={`p-2 rounded-lg ${ebqFile ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-white dark:bg-slate-700 border dark:border-slate-600'}`}>
                              {ebqFile ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <FileUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />}
                           </div>
                           <div className="flex-1 truncate font-bold text-sm text-slate-700 dark:text-slate-200">
                              {ebqFile ? ebqFile.name : 'Click to select file'}
                           </div>
                        </div>
                     </div>
                   </div>

                   <div className="space-y-2">
                     <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                       {importMode === 'cite' ? '2. Imported project name' : '2. Imported project name'}
                     </label>
                     <input
                       type="text"
                       value={importProjectName}
                       onChange={(e) => setImportProjectName(e.target.value)}
                       placeholder={getSuggestedImportProjectName(ebqFile) || 'Enter project name'}
                       className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
                     />
                   </div>

                   {importMode === 'cite' && (
                     <div className="space-y-2">
                       <label className="text-xs font-medium text-slate-700 dark:text-slate-300">3. Definitions file (.EBC) <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span></label>
                       <div className="relative">
                          <input 
                            type="file" 
                            accept=".ebc,.txt,*/*"
                            onChange={(e) => setEbcFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className={`w-full border-2 border-dashed rounded-xl p-4 flex items-center gap-3 transition-colors ${ebcFile ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-600' : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                             <div className={`p-2 rounded-lg ${ebcFile ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-white dark:bg-slate-700 border dark:border-slate-600'}`}>
                                {ebcFile ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <FileUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />}
                             </div>
                             <div className="flex-1 truncate font-bold text-sm text-slate-700 dark:text-slate-200">
                                {ebcFile ? ebcFile.name : 'Click to select file'}
                             </div>
                          </div>
                       </div>
                     </div>
                   )}
                 </>
               ) : (
                 <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Imported project name</label>
                        <input
                          type="text"
                          value={importProjectName}
                          onChange={(e) => {
                            const nextName = e.target.value;
                            setImportProjectName(nextName);
                            setPreviewParseResult((current) => current ? {
                              ...current,
                              project: {
                                ...current.project,
                                name: nextName.trim() || getSuggestedImportProjectName(ebqFile) || current.project.name,
                              },
                            } : current);
                          }}
                          placeholder={getSuggestedImportProjectName(ebqFile) || 'Enter project name'}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
                        />
                     </div>
                     <div className="flex items-center gap-4 bg-yellow-50 dark:bg-amber-900/30 p-4 rounded-xl border border-yellow-100 dark:border-amber-800">
                         <input type="checkbox" checked={skipHeader} onChange={(e) => setSkipHeader(e.target.checked)} className="w-5 h-5 rounded-app-sm text-primary-600 focus:ring-primary-500" />
                         <span className="text-sm font-bold text-yellow-800 dark:text-amber-200">Skip First Row (Headers)</span>
                     </div>
                     <div className="overflow-x-auto border border-slate-200 dark:border-slate-600 rounded-xl">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                                    {previewRows.length > 0 && previewRows[0].map((_, i) => (
                                        <th key={i} className="p-2 min-w-[120px]">
                                            {renderMappingSelect(i)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewRows.map((row, rIdx) => (
                                    <tr key={rIdx} className={`border-b border-slate-200 dark:border-slate-600 last:border-0 ${skipHeader && rIdx === 0 ? 'bg-slate-200/50 dark:bg-slate-700/50 opacity-50' : ''}`}>
                                        {row.map((cell, cIdx) => (
                                            <td key={cIdx} className="p-3 border-r border-slate-200 dark:border-slate-600 last:border-0 truncate max-w-[200px] text-slate-600 dark:text-slate-400 font-mono text-xs">{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                 </div>
               )}
            </div>

            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-3">
               {previewParseResult ? (
                   <div className="flex-1" />
               ) : !isMappingMode ? (
                   <>
                      <button onClick={resetImportState} className="px-6 py-3 font-medium text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">Cancel</button>
                      <div className="flex gap-3">
                        <button 
                             onClick={handlePreview} 
                             disabled={!ebqFile}
                             className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-xl font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Table className="w-4 h-4" /> Preview & map
                        </button>
                        <button 
                            onClick={() => handleCiteSubmit(false)} 
                            disabled={isImporting || (!ebqFile && !ebcFile)}
                            className="workspace-primary-btn px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isImporting ? 'Parsing...' : 'Import'}
                        </button>
                      </div>
                   </>
               ) : (
                   <>
                      <button onClick={() => setIsMappingMode(false)} className="px-6 py-3 font-medium text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">Back</button>
                      <button 
                            onClick={() => handleCiteSubmit(true)} 
                            disabled={isImporting}
                            className="workspace-primary-btn px-8 py-3"
                        >
                            {isImporting ? 'Processing...' : 'Confirm mapping & import'}
                        </button>
                   </>
               )}
            </div>
          </div>
        </div>
      )}
      <ContextMenu state={contextMenu} onClose={() => setContextMenu(null)} />
    </div>
  );
};
