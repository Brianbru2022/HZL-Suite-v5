import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Calculator, FileDown, FileSpreadsheet, Layers3, MessageSquareMore, Percent, Plus, Send, Trash2, X } from 'lucide-react';
import type { CostPlan, CostPlanContingencyMode, CostPlanDrawingBasis, CostPlanLine, CostPlanSource, Project } from '../../types';
import { useModalFocus } from '../../hooks/useModalFocus';
import {
  calculateBaseSectionValue,
  compareCostPlanTotals,
  compileCostPlan,
  getCostPlanLineDelta,
  getContingencyModeLabel,
  getCostPlanSourceLabel,
  getDefaultContingencyForDrawingBasis,
  getDrawingBasisLabel,
  formatCostPlanRange,
  isContingencyLine,
  reapplyCostPlanContingency,
  summariseCostPlan,
} from '../../utils/costPlan';
import { calculateProjectTotal, safeAdd } from '../../utils/calculations';
import { feedbackError, feedbackSuccess } from '../../utils/feedback';
import { generateId } from '../../utils/generateId';
import { recordOperationLogEntry } from '../../utils/operationLog';

interface CostPlanModalProps {
  isOpen: boolean;
  project: Project;
  onClose: () => void;
  onSave: (plan: CostPlan) => void;
  showToast: (opts: { type: 'success' | 'error' | 'info'; message: string; duration?: number }) => void;
}

const SOURCE_OPTIONS: Array<{ value: CostPlanSource; label: string; description: string; icon: React.ReactNode }> = [
  {
    value: 'BILL_NAMES',
    label: 'Bill names',
    description: 'Create one cost plan line per bill using current bill totals.',
    icon: <Layers3 className="h-4 w-4" />,
  },
  {
    value: 'BILL_SECTIONS',
    label: 'Bill sections',
    description: 'Create a more detailed cost plan from section-level totals.',
    icon: <Calculator className="h-4 w-4" />,
  },
  {
    value: 'AI',
    label: 'AI regrouping',
    description: 'Use AI to regroup current priced scope into a higher-level cost plan.',
    icon: <Brain className="h-4 w-4" />,
  },
  {
    value: 'HYBRID',
    label: 'Hybrid',
    description: 'Use AI regrouping with the same review and contingency controls.',
    icon: <Percent className="h-4 w-4" />,
  },
  {
    value: 'AI_CONCEPT',
    label: 'AI concept build-up',
    description: 'Start from a project brief such as house type, size, and storeys, then let AI build the elemental plan with ranges.',
    icon: <MessageSquareMore className="h-4 w-4" />,
  },
];

const DRAWING_OPTIONS: Array<{ value: CostPlanDrawingBasis; hint: string }> = [
  { value: 'DETAILED_DRAWINGS', hint: 'Lower contingency default for developed information.' },
  { value: 'OUTLINE_DRAWINGS', hint: 'Balanced contingency for early-stage layout information.' },
  { value: 'NO_DRAWINGS', hint: 'Higher contingency default for brief-only planning.' },
];

const CONTINGENCY_OPTIONS: Array<{ value: CostPlanContingencyMode; hint: string }> = [
  { value: 'SEPARATE', hint: 'Show contingency as a separate cost plan allowance.' },
  { value: 'PRORATED', hint: 'Spread contingency proportionally across the cost plan lines.' },
];

function loadCostPlanExports() {
  return import('../../utils/costPlanExport');
}

function loadGeminiService() {
  return import('../../services/geminiService');
}

function formatMoney(value: number): string {
  return `GBP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getLineSourceTone(source: CostPlanLine['source']) {
  switch (source) {
    case 'AI':
      return 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900/60 dark:bg-primary-950/30 dark:text-primary-300';
    case 'SECTION':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300';
    case 'BILL':
      return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300';
  }
}

export const CostPlanModal: React.FC<CostPlanModalProps> = ({ isOpen, project, onClose, onSave, showToast }) => {
  const { contentRef, contentProps } = useModalFocus(isOpen, onClose);
  const [source, setSource] = useState<CostPlanSource>(project.costPlan?.source || 'BILL_SECTIONS');
  const [drawingBasis, setDrawingBasis] = useState<CostPlanDrawingBasis>(project.costPlan?.drawingBasis || 'OUTLINE_DRAWINGS');
  const [contingencyMode, setContingencyMode] = useState<CostPlanContingencyMode>(project.costPlan?.contingencyMode || 'SEPARATE');
  const [contingencyPercentage, setContingencyPercentage] = useState(project.costPlan?.contingencyPercentage || getDefaultContingencyForDrawingBasis('OUTLINE_DRAWINGS'));
  const [plan, setPlan] = useState<CostPlan | null>(project.costPlan || null);
  const [editableLines, setEditableLines] = useState<CostPlanLine[]>(
    () => (project.costPlan?.lines || []).filter((line) => !isContingencyLine(line))
  );
  const [isCompiling, setIsCompiling] = useState(false);
  const [conceptPrompt, setConceptPrompt] = useState('');
  const [conceptReply, setConceptReply] = useState('');
  const [conceptConversation, setConceptConversation] = useState<string[]>([]);
  const [conceptQuestions, setConceptQuestions] = useState<string[]>([]);
  const [isConceptReviewing, setIsConceptReviewing] = useState(false);

  const previewSummary = useMemo(() => (plan ? summariseCostPlan(plan) : null), [plan]);
  const previousPlan = project.costPlanHistory?.[0] || null;
  const revisionComparison = useMemo(() => compareCostPlanTotals(plan, previousPlan), [plan, previousPlan]);
  const liveBillTotal = useMemo(() => calculateProjectTotal(project), [project]);
  const liveBillDelta = previewSummary ? safeAdd(previewSummary.baseTotal, -liveBillTotal) : null;
  const planRange = useMemo(() => formatCostPlanRange(plan), [plan]);
  const compileWorkflowSteps = [
    {
      id: 'source',
      label: 'Choose source',
      detail: getCostPlanSourceLabel(source),
    },
    {
      id: 'basis',
      label: 'Set basis',
      detail: getDrawingBasisLabel(drawingBasis),
    },
    {
      id: 'review',
      label: 'Review provenance',
      detail: plan ? `${editableLines.length} editable line${editableLines.length === 1 ? '' : 's'}` : 'Compile first',
    },
    {
      id: 'export',
      label: 'Export',
      detail: plan ? getContingencyModeLabel(contingencyMode) : 'Export after review',
    },
  ];

  useEffect(() => {
    setEditableLines((plan?.lines || []).filter((line) => !isContingencyLine(line)));
  }, [plan]);

  if (!isOpen) return null;

  const handleDrawingBasisChange = (nextBasis: CostPlanDrawingBasis) => {
    setDrawingBasis(nextBasis);
    if (!project.costPlan || contingencyPercentage === getDefaultContingencyForDrawingBasis(drawingBasis)) {
      setContingencyPercentage(getDefaultContingencyForDrawingBasis(nextBasis));
    }
  };

  const buildAiRows = async () => {
    const sourceRows = project.bills.flatMap((bill) =>
      bill.sections.map((section) => ({
        billName: bill.name,
        sectionName: section.name,
        value: calculateBaseSectionValue(project, bill.id, section.id),
      }))
    ).filter((row) => row.value > 0);

    const { compileAiCostPlan } = await loadGeminiService();
    const aiResult = await compileAiCostPlan(project.name, drawingBasis, sourceRows);
    if ('error' in aiResult) {
      throw new Error(aiResult.error);
    }
    return aiResult.data;
  };

  const appendConceptReply = () => {
    const trimmed = conceptReply.trim();
    if (!trimmed) return;
    setConceptConversation((prev) => [...prev, `User: ${trimmed}`]);
    setConceptReply('');
  };

  const handleConceptReview = async () => {
    if (!conceptPrompt.trim()) {
      showToast({ type: 'info', message: 'Add the project brief first so the AI has something to review.' });
      return;
    }
    setIsConceptReviewing(true);
    try {
      const { analyzeAiConceptCostPlanRequest } = await loadGeminiService();
      const analysis = await analyzeAiConceptCostPlanRequest(conceptPrompt.trim(), drawingBasis, conceptConversation);
      if ('error' in analysis) {
        throw new Error(analysis.error);
      }
      setConceptQuestions(analysis.data.questions || []);
      if (analysis.data.needsClarification && (analysis.data.questions || []).length > 0) {
        setConceptConversation((prev) => [
          ...prev,
          ...(analysis.data.questions || []).map((question) => `AI: ${question}`),
        ]);
        showToast({ type: 'info', message: 'AI has asked a few clarifying questions before generating the concept plan.' });
      } else {
        showToast({ type: 'success', message: 'AI has enough information. Generate whenever you are ready.' });
      }
    } catch (error) {
      showToast({ type: 'error', message: feedbackError('AI concept review', error, 'Please try again.') });
    } finally {
      setIsConceptReviewing(false);
    }
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    try {
      let aiLines: Array<{ title: string; notes?: string; baseValue: number; provenance?: string[]; lowValue?: number; highValue?: number; confidenceLabel?: 'LOW' | 'MEDIUM' | 'HIGH'; confidenceNote?: string }> | undefined;
      let conceptMeta: { assumptions?: string[]; confidenceSummary?: string } | undefined;

      if (source === 'AI' || source === 'HYBRID') {
        aiLines = await buildAiRows();
      } else if (source === 'AI_CONCEPT') {
        if (!conceptPrompt.trim()) {
          throw new Error('Add the project brief first. For example: 3-bedroom house, villa, 2 storeys.');
        }
        const { generateAiConceptCostPlan } = await loadGeminiService();
        const conceptResult = await generateAiConceptCostPlan(project.name, conceptPrompt.trim(), drawingBasis, conceptConversation);
        if ('error' in conceptResult) {
          throw new Error(conceptResult.error);
        }
        aiLines = conceptResult.data.lines;
        conceptMeta = {
          assumptions: conceptResult.data.assumptions,
          confidenceSummary: conceptResult.data.confidenceSummary,
        };
      }

      const nextPlan = compileCostPlan(project, source, drawingBasis, contingencyPercentage, contingencyMode, aiLines, conceptMeta);
      setPlan(nextPlan);
      setEditableLines(nextPlan.lines.filter((line) => !isContingencyLine(line)));
      onSave(nextPlan);
      showToast({ type: 'success', message: feedbackSuccess('Cost plan', 'compiled and saved') });
    } catch (error) {
      showToast({ type: 'error', message: feedbackError('Cost plan compilation', error, 'Please try again.') });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleLineChange = (lineId: string, field: 'title' | 'notes' | 'baseValue', value: string) => {
    setEditableLines((prev) => prev.map((line) => (
      line.id === lineId
        ? {
            ...line,
            [field]: field === 'baseValue' ? Number(value) || 0 : value,
          }
        : line
    )));
  };

  const handleAddLine = () => {
    setEditableLines((prev) => [
      ...prev,
      {
        id: generateId(),
        title: 'New cost plan line',
        source: 'MANUAL',
        notes: '',
        baseValue: 0,
        contingencyValue: 0,
        totalValue: 0,
      },
    ]);
  };

  const handleRemoveLine = (lineId: string) => {
    setEditableLines((prev) => prev.filter((line) => line.id !== lineId));
  };

  const handleSaveReview = () => {
    if (!plan) return;
    const draftPlan = {
      ...plan,
      source,
      drawingBasis,
      contingencyMode,
      contingencyPercentage,
    };
    const nextPlan = reapplyCostPlanContingency(draftPlan, editableLines);
    setPlan(nextPlan);
    onSave(nextPlan);
    showToast({ type: 'success', message: feedbackSuccess('Cost plan review', 'saved') });
  };

  const handleExportExcel = async () => {
    if (!plan) return;
    try {
      const { exportCostPlanToExcel } = await loadCostPlanExports();
      await exportCostPlanToExcel(project, plan);
      showToast({ type: 'success', message: 'Cost plan workbook exported.' });
    } catch (error) {
      recordOperationLogEntry({
        kind: 'export',
        status: 'error',
        subject: 'Cost plan Excel export',
        message: 'Cost plan workbook export failed.',
        error: error instanceof Error ? error.message : String(error),
        nextStep: 'Try the export again. If it repeats, copy diagnostics from the Diagnostics panel.',
      });
      showToast({ type: 'error', message: feedbackError('Cost plan Excel export', error, 'Please try again.') });
    }
  };

  const handleExportPdf = async () => {
    if (!plan) return;
    try {
      const { exportCostPlanToPdf } = await loadCostPlanExports();
      const { blob, filename } = await exportCostPlanToPdf(project, plan);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      window.URL.revokeObjectURL(url);
      recordOperationLogEntry({
        kind: 'export',
        status: 'success',
        subject: 'Cost plan PDF export',
        message: `Downloaded ${filename}.`,
        path: filename,
        counts: { files: 1 },
      });
      showToast({ type: 'success', message: 'Cost plan PDF exported.' });
    } catch (error) {
      recordOperationLogEntry({
        kind: 'export',
        status: 'error',
        subject: 'Cost plan PDF export',
        message: 'Cost plan PDF export failed.',
        error: error instanceof Error ? error.message : String(error),
        nextStep: 'Try the export again. If it repeats, copy diagnostics from the Diagnostics panel.',
      });
      showToast({ type: 'error', message: feedbackError('Cost plan PDF export', error, 'Please try again.') });
    }
  };

  const getLineProvenance = (line: CostPlanLine) => {
    if (line.provenance && line.provenance.length > 0) return line.provenance;

    if (line.sourceSectionId) {
      const bill = project.bills.find((entry) => entry.id === line.sourceBillId);
      const section = bill?.sections.find((entry) => entry.id === line.sourceSectionId);
      if (bill && section) return [`${bill.name} / ${section.name}`];
    }

    if (line.sourceBillId) {
      const bill = project.bills.find((entry) => entry.id === line.sourceBillId);
      if (bill) return [bill.name];
    }

    return [];
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md dark:bg-black/60">
      <div
        ref={contentRef}
        {...contentProps}
        className="workspace-shell flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden"
      >
        <div className="border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="workspace-chip mb-3">
                <Calculator className="h-3.5 w-3.5" />
                Cost planning
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Compile cost plan</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                Build a project cost plan from bill names, bill sections, or AI regrouping. Drawing basis controls the suggested contingency allowance, and exports can show that contingency separately or pro-rated across the plan.
              </p>
            </div>
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close cost plan">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden xl:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-y-auto border-r border-slate-200/80 bg-white/88 px-6 py-6 dark:border-slate-700/80 dark:bg-surface-900/92">
            <div className="space-y-6">
              <div className="workspace-sidebar p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Compile from</div>
                <div className="mt-4 grid gap-3">
                  {SOURCE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSource(option.value)}
                      className={`rounded-app border px-4 py-4 text-left transition ${
                        source === option.value
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {option.icon}
                        {option.label}
                      </div>
                      <div className={`mt-2 text-xs leading-5 ${source === option.value ? 'text-white/80 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {source === 'AI_CONCEPT' && (
                <div className="workspace-sidebar p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">AI concept brief</div>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Describe the project and let AI challenge the brief</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Start with something like <span className="font-medium text-slate-700 dark:text-slate-200">3-bedroom house, villa, 2 storeys</span>. The AI will ask for the most useful missing commercial details until you decide to generate.
                  </p>
                  <textarea
                    value={conceptPrompt}
                    onChange={(event) => setConceptPrompt(event.target.value)}
                    rows={4}
                    placeholder="Describe the concept scope, size, quality level, and anything unusual..."
                    className="workspace-input mt-4"
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={handleConceptReview} className="workspace-secondary-btn px-3 py-2 text-xs" disabled={isConceptReviewing}>
                      <MessageSquareMore className="h-4 w-4" />
                      {isConceptReviewing ? 'Reviewing...' : 'Ask AI what it still needs'}
                    </button>
                  </div>

                  {(conceptConversation.length > 0 || conceptQuestions.length > 0) && (
                    <div className="mt-5 space-y-3">
                      <div className="rounded-app border border-slate-200/80 bg-surface-muted/70 p-3 dark:border-slate-700 dark:bg-surface-800/70">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Conversation</div>
                        <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                          {conceptConversation.map((entry, index) => (
                            <div key={`${entry}-${index}`} className="rounded-app-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200">
                              {entry}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-app border border-slate-200/80 bg-white/90 p-3 dark:border-slate-700 dark:bg-surface-900/92">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Your reply</div>
                        <textarea
                          value={conceptReply}
                          onChange={(event) => setConceptReply(event.target.value)}
                          rows={3}
                          placeholder="Answer the latest AI questions here, then add your reply back into the briefing context."
                          className="workspace-input mt-3"
                        />
                        <div className="mt-3 flex flex-wrap gap-3">
                          <button type="button" onClick={appendConceptReply} className="workspace-secondary-btn px-3 py-2 text-xs">
                            <Send className="h-4 w-4" />
                            Add reply to briefing
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="workspace-sidebar p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Drawing basis</div>
                <div className="mt-4 grid gap-3">
                  {DRAWING_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleDrawingBasisChange(option.value)}
                      className={`rounded-app border px-4 py-4 text-left transition ${
                        drawingBasis === option.value
                          ? 'border-slate-900 bg-slate-50 text-slate-900 dark:border-slate-100 dark:bg-surface-800 dark:text-slate-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="text-sm font-semibold">{getDrawingBasisLabel(option.value)}</div>
                      <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{option.hint}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-app border border-amber-200/80 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  Suggested contingency for this basis is <strong>{getDefaultContingencyForDrawingBasis(drawingBasis).toFixed(1)}%</strong>, but you can edit it below.
                </div>
              </div>

              <div className="workspace-sidebar p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Contingency</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Percentage
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={contingencyPercentage}
                      onChange={(event) => setContingencyPercentage(Number(event.target.value) || 0)}
                      className="workspace-input mt-2"
                    />
                  </label>
                  <div className="space-y-3">
                    {CONTINGENCY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setContingencyMode(option.value)}
                        className={`w-full rounded-app border px-4 py-3 text-left transition ${
                          contingencyMode === option.value
                            ? 'border-slate-900 bg-slate-50 text-slate-900 dark:border-slate-100 dark:bg-surface-800 dark:text-slate-100'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="text-sm font-semibold">{getContingencyModeLabel(option.value)}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{option.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="workspace-toolbar flex flex-wrap gap-3">
                <button type="button" onClick={handleCompile} className="workspace-primary-btn" disabled={isCompiling}>
                  <Calculator className="h-4 w-4" />
                  {isCompiling ? 'Compiling...' : 'Compile cost plan'}
                </button>
                <button type="button" onClick={handleExportExcel} className="workspace-secondary-btn" disabled={!plan}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel
                </button>
                <button type="button" onClick={handleExportPdf} className="workspace-secondary-btn" disabled={!plan}>
                  <FileDown className="h-4 w-4" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(71,100,118,0.08),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2f5_100%)] px-6 py-6 dark:bg-surface-950">
            <div className="space-y-6">
              <div className="rounded-app-lg border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Workflow position</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {compileWorkflowSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${
                        (step.id === 'review' || step.id === 'export') && !plan
                          ? 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-500'
                          : step.id === 'review' && plan
                            ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
                      }`}
                    >
                      <span className="mr-2 text-[10px] uppercase tracking-[0.16em] opacity-70">{index + 1}</span>
                      {step.label}: {step.detail}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-app border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Source</div>
                  <div className="mt-3 text-lg font-semibold text-slate-950 dark:text-slate-50">{getCostPlanSourceLabel(source)}</div>
                </div>
                <div className="rounded-app border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Drawing basis</div>
                  <div className="mt-3 text-lg font-semibold text-slate-950 dark:text-slate-50">{getDrawingBasisLabel(drawingBasis)}</div>
                </div>
                <div className="rounded-app border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Contingency</div>
                  <div className="mt-3 text-lg font-semibold text-slate-950 dark:text-slate-50">{contingencyPercentage.toFixed(1)}%</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{getContingencyModeLabel(contingencyMode)}</div>
                </div>
              </div>

              {plan && previewSummary ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-app border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Base total</div>
                      <div className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">{formatMoney(previewSummary.baseTotal)}</div>
                    </div>
                    <div className="rounded-app border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Contingency</div>
                      <div className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">{formatMoney(previewSummary.contingencyTotal)}</div>
                    </div>
                    <div className="rounded-app border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Total</div>
                      <div className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">{formatMoney(previewSummary.total)}</div>
                    </div>
                  </div>

                  {planRange && (planRange.low !== null || planRange.high !== null) && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-app border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Lower range</div>
                        <div className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">{formatMoney(planRange.low || 0)}</div>
                      </div>
                      <div className="rounded-app border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Higher range</div>
                        <div className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">{formatMoney(planRange.high || 0)}</div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 xl:grid-cols-3">
                    <div className="rounded-app border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Live bill total</div>
                      <div className="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-50">{formatMoney(liveBillTotal)}</div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Current project total from the live bill structure.
                      </div>
                    </div>
                    <div className="rounded-app border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Delta vs live bill</div>
                      <div className="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-50">{formatMoney(liveBillDelta || 0)}</div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Positive means the cost plan base is above the current live bill total.
                      </div>
                    </div>
                    <div className="rounded-app border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Previous revision</div>
                      <div className="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-50">
                        {revisionComparison.previousSummary ? formatMoney(revisionComparison.previousSummary.total) : 'No previous plan'}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {revisionComparison.totalDelta !== null
                          ? `Change vs previous revision: ${formatMoney(revisionComparison.totalDelta)}`
                          : 'Save another cost plan revision to start comparing changes.'}
                      </div>
                    </div>
                  </div>

                  {(plan.assumptions?.length || plan.confidenceSummary) && (
                    <div className="rounded-app-lg border border-slate-200/80 bg-white/92 p-5 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">AI assumptions and confidence</div>
                      {plan.confidenceSummary && (
                        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.confidenceSummary}</p>
                      )}
                      {plan.assumptions?.length ? (
                        <ul className="mt-4 space-y-2">
                          {plan.assumptions.map((assumption) => (
                            <li key={assumption} className="flex items-start gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                              <span className="mt-2 h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                              <span>{assumption}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  )}

                  <div className="rounded-app-xl border border-slate-200/80 bg-white/92 p-5 shadow-card dark:border-slate-700 dark:bg-surface-900/95">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Review and edit</div>
                        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Compiled cost plan</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Updated {new Date(plan.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        <button type="button" onClick={handleAddLine} className="workspace-secondary-btn px-3 py-2 text-xs">
                          <Plus className="h-4 w-4" />
                          Add line
                        </button>
                        <button type="button" onClick={handleSaveReview} className="workspace-primary-btn px-3 py-2 text-xs">
                          Save review changes
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Review the generated structure, rename headings, adjust values, add manual lines, and then save to reapply contingency with the current export setting.
                    </div>
                    <div className="mt-5 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200/80 dark:border-slate-700/80">
                            <th className="pb-3 text-left font-semibold text-slate-500 dark:text-slate-400">Line</th>
                            <th className="pb-3 text-left font-semibold text-slate-500 dark:text-slate-400">Origin</th>
                            <th className="pb-3 text-left font-semibold text-slate-500 dark:text-slate-400">Notes</th>
                            <th className="pb-3 text-right font-semibold text-slate-500 dark:text-slate-400">Base</th>
                            <th className="pb-3 text-right font-semibold text-slate-500 dark:text-slate-400">Low</th>
                            <th className="pb-3 text-right font-semibold text-slate-500 dark:text-slate-400">High</th>
                            <th className="pb-3 text-right font-semibold text-slate-500 dark:text-slate-400">Contingency</th>
                            <th className="pb-3 text-right font-semibold text-slate-500 dark:text-slate-400">Total</th>
                            <th className="pb-3 text-left font-semibold text-slate-500 dark:text-slate-400">Confidence</th>
                            <th className="pb-3 text-right font-semibold text-slate-500 dark:text-slate-400">Vs previous</th>
                            <th className="pb-3 text-right font-semibold text-slate-500 dark:text-slate-400"> </th>
                          </tr>
                        </thead>
                        <tbody>
                          {editableLines.map((line) => {
                            const previewLine = plan.lines.find((entry) => entry.id === line.id) || line;
                            const provenance = getLineProvenance(line);
                            const revisionDelta = getCostPlanLineDelta(previewLine, previousPlan);
                            return (
                              <tr key={line.id} className="border-b border-slate-100 dark:border-slate-800">
                                <td className="py-3 pr-4 align-top">
                                  <input
                                    value={line.title}
                                    onChange={(event) => handleLineChange(line.id, 'title', event.target.value)}
                                    className="workspace-input min-w-[220px]"
                                  />
                                </td>
                                <td className="py-3 pr-4 align-top">
                                  <div className="space-y-2">
                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getLineSourceTone(line.source)}`}>
                                      {line.source}
                                    </span>
                                    {provenance.length > 0 ? (
                                      <div className="flex max-w-[260px] flex-wrap gap-1.5">
                                        {provenance.slice(0, 3).map((entry) => (
                                          <span key={entry} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                                            {entry}
                                          </span>
                                        ))}
                                        {provenance.length > 3 && (
                                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400">
                                            +{provenance.length - 3} more
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-[11px] text-slate-400 dark:text-slate-500">No linked origin recorded.</div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 pr-4 align-top">
                                  <input
                                    value={line.notes || ''}
                                    onChange={(event) => handleLineChange(line.id, 'notes', event.target.value)}
                                    className="workspace-input min-w-[240px]"
                                  />
                                </td>
                                <td className="py-3 align-top">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.baseValue}
                                    onChange={(event) => handleLineChange(line.id, 'baseValue', event.target.value)}
                                    className="workspace-input min-w-[140px] text-right tabular-nums"
                                  />
                                </td>
                                <td className="py-3 text-right align-top tabular-nums text-slate-600 dark:text-slate-300">{line.lowValue ? formatMoney(line.lowValue) : '-'}</td>
                                <td className="py-3 text-right align-top tabular-nums text-slate-600 dark:text-slate-300">{line.highValue ? formatMoney(line.highValue) : '-'}</td>
                                <td className="py-3 text-right align-top tabular-nums text-slate-900 dark:text-slate-100">{formatMoney(previewLine.contingencyValue)}</td>
                                <td className="py-3 text-right align-top tabular-nums font-semibold text-slate-950 dark:text-slate-50">{formatMoney(previewLine.totalValue)}</td>
                                <td className="py-3 align-top text-xs text-slate-500 dark:text-slate-400">
                                  {line.confidenceLabel ? (
                                    <div className="space-y-1">
                                      <div className="font-semibold text-slate-700 dark:text-slate-200">{line.confidenceLabel}</div>
                                      {line.confidenceNote && <div>{line.confidenceNote}</div>}
                                    </div>
                                  ) : '-'}
                                </td>
                                <td className="py-3 text-right align-top tabular-nums text-slate-600 dark:text-slate-300">
                                  {revisionDelta === null ? 'New' : formatMoney(revisionDelta)}
                                </td>
                                <td className="py-3 text-right align-top">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLine(line.id)}
                                    className="workspace-secondary-btn px-2.5 py-2 text-xs"
                                    aria-label={`Remove ${line.title}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {plan.lines.filter((line) => isContingencyLine(line)).map((line) => (
                            <tr key={line.id} className="border-b border-slate-100 bg-amber-50/60 dark:border-slate-800 dark:bg-amber-500/10">
                              <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">{line.title}</td>
                              <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">Allowance generated from the current contingency setting</td>
                              <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{line.notes || 'Automatically maintained from the contingency setting.'}</td>
                              <td className="py-3 text-right tabular-nums text-slate-900 dark:text-slate-100">{formatMoney(line.baseValue)}</td>
                              <td className="py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">-</td>
                              <td className="py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">-</td>
                              <td className="py-3 text-right tabular-nums text-slate-900 dark:text-slate-100">{formatMoney(line.contingencyValue)}</td>
                              <td className="py-3 text-right tabular-nums font-semibold text-slate-950 dark:text-slate-50">{formatMoney(line.totalValue)}</td>
                              <td className="py-3 text-slate-500 dark:text-slate-400">-</td>
                              <td className="py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">-</td>
                              <td className="py-3" />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="workspace-empty">
                  Compile the cost plan to preview the lines, contingency handling, and export-ready totals.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
