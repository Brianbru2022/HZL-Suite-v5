/**
 * Full-screen overlay when AI needs clarification questions from the user.
 */
import React, { useState, useEffect } from 'react';
import { HelpCircle, Send, Play, X, Paperclip } from 'lucide-react';
import type { AIClarification } from '../../types';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useSpellcheckPreference } from '../../hooks/useSpellcheckPreference';

export interface AiClarificationOverlayProps {
  visible: boolean;
  aiClarification: AIClarification | null;
  measurementModeEnabled?: boolean;
  aiAnswers: string;
  setAiAnswers: (v: string) => void;
  aiFiles: { name: string; mimeType: string; data: string }[];
  setAiFiles: React.Dispatch<React.SetStateAction<{ name: string; mimeType: string; data: string }[]>>;
  onFileUpload: (phase: 'items' | 'measurements', e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: (phase: 'items' | 'measurements', e: React.ClipboardEvent) => void;
  onCancel: () => void;
  onJustGenerate: () => void;
  onSubmit: (combinedAnswers?: string) => void;
}

export function AiClarificationOverlay({
  visible,
  aiClarification,
  measurementModeEnabled = false,
  aiAnswers,
  setAiAnswers,
  aiFiles,
  setAiFiles,
  onFileUpload,
  onPaste,
  onCancel,
  onJustGenerate,
  onSubmit,
}: AiClarificationOverlayProps) {
  const { contentRef, contentProps } = useModalFocus(visible, onCancel);
  const { preference: spellcheckPreference } = useSpellcheckPreference();
  const [questionAnswers, setQuestionAnswers] = useState<string[]>([]);
  const isMeasurementPhase = aiClarification?.phase === 'measurements' || measurementModeEnabled;
  const phaseNumber = isMeasurementPhase ? 2 : 1;
  const phaseLabel = isMeasurementPhase ? 'Dimensions' : 'Bill items';
  const scopeLabel = isMeasurementPhase ? 'Current measurement phase target' : 'Current bill generation target';
  const inputsLabel = isMeasurementPhase
    ? 'Phase 2 drawings, the exact dimension answers below, and the generated items from phase 1.'
    : 'The current bill/section/page request, phase 1 drawings or documents, and the answers below.';
  const changeLabel = isMeasurementPhase
    ? 'If you continue, AI will ask the next question or build measurements for the current target items.'
    : 'If you continue, AI will refine scope understanding before generating bill items.';
  const skipLabel = isMeasurementPhase
    ? 'Finish without AI measurements'
    : 'Generate from current answers';
  const skipDetail = isMeasurementPhase
    ? 'Leaves measurement take-off for manual review or later.'
    : 'Uses what you have already given and skips more clarification.';
  const submitLabel = isMeasurementPhase ? 'Continue with these answers' : 'Review with AI';

  useEffect(() => {
    if (visible && aiClarification?.questions?.length) {
      setQuestionAnswers(aiClarification.questions.map(() => ''));
    }
  }, [visible, aiClarification?.questions?.length]);

  const handleSubmit = () => {
    const parts: string[] = [];
    aiClarification?.questions.forEach((q, i) => {
      const a = questionAnswers[i]?.trim();
      if (a) parts.push(`Question: ${q}\nAnswer: ${a}`);
    });
    const general = aiAnswers.trim();
    if (general) parts.push(`Additional details: ${general}`);
    const combined = parts.join('\n\n') || general || '';
    onSubmit(combined);
  };

  if (!visible || !aiClarification) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
      onPaste={(event) => onPaste(isMeasurementPhase ? 'measurements' : 'items', event)}
    >
      <div
        ref={contentRef}
        {...contentProps}
        aria-labelledby="ai-clarification-title"
        aria-describedby="ai-clarification-desc"
        className="workspace-shell flex max-h-[90vh] w-full max-w-2xl animate-in slide-in-from-bottom-10 flex-col overflow-hidden"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-violet-50/85 px-5 py-4 dark:border-slate-700 dark:bg-violet-950/20">
          <div className="rounded-app-sm border border-violet-100 bg-white p-2 text-violet-700 shadow-sm dark:border-violet-900/50 dark:bg-surface-800 dark:text-violet-200">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:border-violet-500/30 dark:bg-surface-800 dark:text-violet-200">
                Phase {phaseNumber} of 2
              </span>
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                <span className={`h-2 w-8 rounded-full ${!isMeasurementPhase ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-700'}`} />
                <span className={`h-2 w-8 rounded-full ${isMeasurementPhase ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-700'}`} />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {phaseLabel}
              </span>
            </div>
            <h3 id="ai-clarification-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {aiClarification.title || 'AI needs a few details'}
            </h3>
            <p id="ai-clarification-desc" className="text-slate-500 dark:text-slate-400 text-xs">
              {aiClarification.description || 'Refining scope and details'}
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-white/88 p-5 dark:bg-surface-900/92">
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            {isMeasurementPhase
              ? 'Measurement mode is enabled, so the AI needs drawings or dimensional assumptions before it can generate reliable quantities.'
              : 'To generate accurate bill items, the AI needs a bit more information:'}
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-app border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-surface-800/70">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Scope</div>
              <div className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{scopeLabel}</div>
            </div>
            <div className="rounded-app border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-surface-800/70">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">AI will use</div>
              <div className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{inputsLabel}</div>
            </div>
            <div className="rounded-app border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-surface-800/70">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Next effect</div>
              <div className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{changeLabel}</div>
            </div>
          </div>
          {isMeasurementPhase && (
            <div className="rounded-app border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              Upload measurement drawings, schedules, or mark-ups if you have them. If not, answer the question below with the exact size or assumption requested.
            </div>
          )}
          <div className="space-y-2">
            {aiClarification.questions.map((q, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{q}</p>
                </div>
                <input
                  type="text"
                  aria-label={`Answer for question ${idx + 1}: ${q}`}
                  value={questionAnswers[idx] ?? ''}
                  onChange={(e) => {
                    setQuestionAnswers((prev) => {
                      const next = [...prev];
                      while (next.length <= idx) next.push('');
                      next[idx] = e.target.value;
                      return next;
                    });
                  }}
                  className="sm:w-48 w-full flex-shrink-0 rounded-app-sm border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="Your answer..."
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {isMeasurementPhase ? 'Phase 2 drawings (optional)' : 'Phase 1 drawings / documents (optional)'}
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg font-medium text-xs flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700">
                <Paperclip className="w-3.5 h-3.5" /> Upload
                <input type="file" multiple className="hidden" onChange={(event) => onFileUpload(isMeasurementPhase ? 'measurements' : 'items', event)} accept="image/*,.pdf,.txt,.csv,.json" aria-label="Upload clarification attachments" />
              </label>
              <span className="text-slate-400 dark:text-slate-500 text-[10px]">Ctrl+V to paste</span>
              {aiFiles.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {aiFiles.map((f, i) => (
                    <span key={i} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border border-blue-100 dark:border-blue-800">
                      {f.name}
                      <button type="button" aria-label={`Remove attachment ${f.name}`} onClick={() => setAiFiles((prev) => prev.filter((_, j) => j !== i))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {isMeasurementPhase ? 'Measurement notes or assumptions (optional)' : 'General response (optional)'}
            </label>
            <textarea
              autoFocus={aiClarification.questions.length === 0}
              aria-label="General clarification response"
              value={aiAnswers}
              onChange={(e) => setAiAnswers(e.target.value)}
              spellCheck={spellcheckPreference.enabled}
              lang={spellcheckPreference.language}
              className="min-h-[72px] w-full rounded-app-sm border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder={isMeasurementPhase ? 'e.g. external trench run 18m, average depth 1.2m, 600mm wide, 4 inspection pits...' : 'e.g. Concrete C35, 20mm aggregate...'}
            />
          </div>
        </div>
        <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-surface-800/50">
          <button type="button" onClick={onCancel} className="workspace-secondary-btn px-3 py-2 text-xs">Cancel</button>
          {aiClarification.canSkip !== false && (
            <button type="button" aria-label="Continue without extra clarification" onClick={onJustGenerate} className="workspace-secondary-btn px-3 py-2 text-xs">
              <Play className="w-3.5 h-3.5" /> {skipLabel}
            </button>
          )}
          <div className="flex-1">
            <button type="button" aria-label="Submit clarification answers to the AI assistant" onClick={handleSubmit} className="workspace-primary-btn w-full px-4 py-2 text-sm">
              <Send className="w-4 h-4" /> {submitLabel}
            </button>
            <div className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              {skipDetail} Nothing is final until you accept the AI result back in the working flow.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
