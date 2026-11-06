import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquareMore, Sparkles, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { useModalFocus } from '../../hooks/useModalFocus';
import type { AiGenerationOptions, CostPlanDrawingBasis, PromptConfigContext, PromptSubmitMeta, PromptType } from '../../types';
import { UK_SITE_COUNTIES, UK_SITE_REGIONS, type UkSiteRegion } from '../../utils/siteLocation';

const DRAWING_BASIS_OPTIONS: Array<{ value: CostPlanDrawingBasis; label: string; hint: string }> = [
  { value: 'DETAILED_DRAWINGS', label: 'Detailed drawings', hint: 'Lower contingency and more developed scope assumptions.' },
  { value: 'OUTLINE_DRAWINGS', label: 'Outline drawings', hint: 'Balanced early-stage allowances from concept information.' },
  { value: 'NO_DRAWINGS', label: 'No drawings', hint: 'Higher-level concept allowances with more uncertainty.' },
];

function loadGeminiService() {
  return import('../../services/geminiService');
}

function deriveProjectNameFromBrief(brief: string): string {
  const clean = brief
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return '';
  const words = clean.split(' ').slice(0, 6);
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const PromptModal = ({
  config,
  onSubmit,
  onClose,
}: {
  config: {
    type: PromptType;
    title: string;
    placeholder: string;
    defaultValue: string;
    context?: PromptConfigContext;
    showStandardToggle?: boolean;
    defaultStandard?: 'SMM7' | 'NRM2';
  };
  onSubmit: (val: string, standard?: 'SMM7' | 'NRM2', aiOptions?: AiGenerationOptions, meta?: PromptSubmitMeta) => void;
  onClose: () => void;
}) => {
  type ProjectSetupStatus = 'idle' | 'question' | 'ready' | 'error';
  const [value, setValue] = useState(config.defaultValue || '');
  const [orderRef, setOrderRef] = useState(config.context?.orderRef || '');
  const [standard, setStandard] = useState<'SMM7' | 'NRM2'>(config.defaultStandard || 'SMM7');
  const [includeRates, setIncludeRates] = useState(config.context?.aiOptions?.includeRates ?? true);
  const [includeMeasurements, setIncludeMeasurements] = useState(config.context?.aiOptions?.includeMeasurements ?? false);
  const [useAiProjectSetup, setUseAiProjectSetup] = useState(config.context?.projectAiSetup?.enabled ?? false);
  const [projectBrief, setProjectBrief] = useState(config.context?.projectAiSetup?.brief ?? '');
  const [projectDrawingBasis, setProjectDrawingBasis] = useState<CostPlanDrawingBasis>(config.context?.projectAiSetup?.drawingBasis ?? 'OUTLINE_DRAWINGS');
  const [projectConversation, setProjectConversation] = useState<string[]>(config.context?.projectAiSetup?.conversation ?? []);
  const [projectReply, setProjectReply] = useState('');
  const [siteCountry, setSiteCountry] = useState(config.context?.siteLocation?.country || 'United Kingdom');
  const [siteRegion, setSiteRegion] = useState<string>(() => {
    const region = config.context?.siteLocation?.region;
    return region || 'Scotland';
  });
  const [siteCounty, setSiteCounty] = useState(config.context?.siteLocation?.county || '');
  const [projectCurrentQuestion, setProjectCurrentQuestion] = useState<string | null>(null);
  const [isReviewingProjectSetup, setIsReviewingProjectSetup] = useState(false);
  const [projectSetupStatus, setProjectSetupStatus] = useState<ProjectSetupStatus>('idle');
  const [hasReviewedProjectSetup, setHasReviewedProjectSetup] = useState(
    (config.context?.projectAiSetup?.conversation?.length ?? 0) > 0
  );
  const [projectSetupStep, setProjectSetupStep] = useState<'details' | 'conversation'>(
    config.context?.projectAiSetup?.conversation?.length ? 'conversation' : 'details'
  );
  const lastReviewedFingerprintRef = useRef<string | null>(null);
  const { contentRef, contentProps } = useModalFocus(true, onClose);
  const aiOptions = { includeRates, includeMeasurements };
  const isAiGeneration = config.type === 'AI_GENERATE_HIERARCHY';
  const isCreateProject = config.type === 'CREATE_PROJECT';
  const isSiteSetup = isCreateProject;
  const isLibraryOrderPrompt = [
    'CREATE_FOLDER',
    'RENAME_FOLDER',
    'CREATE_LIB_SECTION',
    'RENAME_LIB_SECTION',
    'CREATE_LIB_PAGE',
    'RENAME_LIB_PAGE',
  ].includes(config.type);
  const isAiProjectSetupLayout = isCreateProject && useAiProjectSetup;
  const derivedProjectName = value.trim() || deriveProjectNameFromBrief(projectBrief);
  const projectSetupFingerprint = JSON.stringify({
    name: derivedProjectName.trim(),
    brief: projectBrief.trim(),
    drawingBasis: projectDrawingBasis,
  });
  const canReviewProjectSetup = projectBrief.trim().length > 0;
  const canGenerateAiProject =
    canReviewProjectSetup &&
    projectSetupStep === 'conversation' &&
    hasReviewedProjectSetup &&
    projectSetupStatus === 'ready' &&
    !projectCurrentQuestion &&
    !isReviewingProjectSetup;
  const projectSetupMeta = useMemo<PromptSubmitMeta | undefined>(() => (
    isSiteSetup
      ? {
          siteLocation: { country: siteCountry, region: siteRegion, county: siteCounty },
          ...(useAiProjectSetup ? { projectAiSetup: {
            enabled: true,
            brief: projectBrief.trim(),
            drawingBasis: projectDrawingBasis,
            conversation: projectConversation,
          } } : {}),
        }
      : undefined
  ), [isSiteSetup, projectBrief, projectConversation, projectDrawingBasis, siteCountry, siteCounty, siteRegion, useAiProjectSetup]);

  useEffect(() => {
    setValue(config.defaultValue || '');
    setOrderRef(config.context?.orderRef || '');
  }, [config.defaultValue, config.context?.orderRef, config.type]);

  useEffect(() => {
    if (!useAiProjectSetup || projectSetupStep !== 'conversation') return;
    if (!hasReviewedProjectSetup) return;
    if (lastReviewedFingerprintRef.current === projectSetupFingerprint) return;

    setProjectSetupStatus('idle');
    setHasReviewedProjectSetup(false);
    setProjectCurrentQuestion(null);
  }, [hasReviewedProjectSetup, projectSetupFingerprint, projectSetupStep, useAiProjectSetup]);

  const appendProjectReply = async () => {
    const trimmed = projectReply.trim();
    if (!trimmed || !projectCurrentQuestion) return;
    const nextHistory = [...projectConversation, `AI: ${projectCurrentQuestion}`, `User: ${trimmed}`];
    setProjectConversation(nextHistory);
    setProjectReply('');
    setProjectCurrentQuestion(null);
    await handleProjectSetupReview({ historyOverride: nextHistory, skipReadyMessage: true });
  };

  const handlePrimaryAction = async () => {
    if (isCreateProject && useAiProjectSetup && projectSetupStep === 'details') {
      if (!canReviewProjectSetup) return;
      if (!value.trim() && derivedProjectName) {
        setValue(derivedProjectName);
      }
      setProjectSetupStep('conversation');
      await handleProjectSetupReview();
      return;
    }
    onSubmit(
      derivedProjectName || value,
      standard,
      aiOptions,
      isLibraryOrderPrompt
        ? { ...(projectSetupMeta || {}), orderRef: orderRef.trim() }
        : projectSetupMeta
    );
  };

  const handleProjectSetupReview = async ({
    skipReadyMessage = false,
    historyOverride,
  }: {
    skipReadyMessage?: boolean;
    historyOverride?: string[];
  } = {}) => {
    if (!projectBrief.trim()) return;
    setIsReviewingProjectSetup(true);
    setProjectSetupStatus('idle');
    try {
      const history = historyOverride ?? projectConversation;
      const { analyzeAiProjectSetupRequest } = await loadGeminiService();
      const analysis = await analyzeAiProjectSetupRequest((derivedProjectName || value || 'New project').trim(), projectBrief.trim(), projectDrawingBasis, history);
      if ('error' in analysis) {
        throw new Error(analysis.error);
      }
      lastReviewedFingerprintRef.current = projectSetupFingerprint;
      setHasReviewedProjectSetup(true);
      if (analysis.data.needsClarification && analysis.data.questions.length > 0) {
        setProjectCurrentQuestion(analysis.data.questions[0]);
        setProjectSetupStatus('question');
      } else if (!skipReadyMessage) {
        setProjectCurrentQuestion(null);
        setProjectConversation((prev) => [...prev, 'AI: I have enough information to generate the starter estimate when you are ready.']);
        setProjectSetupStatus('ready');
      } else {
        setProjectSetupStatus('ready');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI project setup review failed.';
      setProjectConversation((prev) => [...prev, `System: ${message}`]);
      setHasReviewedProjectSetup(false);
      setProjectSetupStatus('error');
    } finally {
      setIsReviewingProjectSetup(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/55 p-4 py-6 backdrop-blur-md">
      <div
        ref={contentRef}
        {...contentProps}
        aria-labelledby="prompt-modal-title"
        aria-describedby="prompt-modal-desc"
        className={`workspace-shell my-auto flex max-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden ${
          isAiProjectSetupLayout ? 'max-w-5xl' : isSiteSetup ? 'max-w-xl' : 'max-w-sm'
        }`}
      >
        <div className={`border-b border-slate-200/80 bg-white/92 dark:border-slate-700/80 dark:bg-surface-900/95 ${isAiProjectSetupLayout ? 'px-6 py-5' : 'px-4 py-3'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {isAiProjectSetupLayout && (
                <div className="workspace-chip mb-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  Quick action
                </div>
              )}
              <h3 id="prompt-modal-title" className={`${isAiProjectSetupLayout ? 'text-2xl' : 'text-base'} font-semibold tracking-tight text-slate-950 dark:text-slate-50`}>
                {config.title}
              </h3>
              <p id="prompt-modal-desc" className={`${isAiProjectSetupLayout ? 'mt-2 text-sm leading-6' : 'mt-1 text-xs leading-5'} text-slate-500 dark:text-slate-300`}>
                {isAiProjectSetupLayout ? 'Enter the details below to continue.' : config.placeholder}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close quick action dialog" className="workspace-icon-btn">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className={`overflow-y-auto bg-white/88 dark:bg-surface-900/92 ${isAiProjectSetupLayout ? 'px-6 py-6' : 'px-4 py-4'}`}>
          {config.showStandardToggle && (
            <div className="workspace-sidebar mb-6 flex items-center justify-between p-4">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Measurement standard</span>
              <button
                onClick={() => setStandard(current => current === 'SMM7' ? 'NRM2' : 'SMM7')}
                className="workspace-secondary-btn px-3 py-2 text-xs"
              >
                <span className={standard === 'SMM7' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}>SMM7</span>
                {standard === 'SMM7' ? <ToggleLeft className="h-6 w-6 text-slate-400" /> : <ToggleRight className="h-6 w-6 text-emerald-500" />}
                <span className={standard === 'NRM2' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>NRM2</span>
              </button>
            </div>
          )}

          {isAiGeneration && (
            <div className="workspace-sidebar mb-6 space-y-4 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI output options</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Choose whether the AI should build market rates and measurement take-off details into the generated items.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIncludeRates((current) => !current)}
                  aria-pressed={includeRates}
                  className="workspace-secondary-btn justify-between px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Get rates</span>
                    <span className="mt-1 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                      Include estimated direct UK rates in GBP for priced items, excluding main-contractor O&P and site-wide preliminaries.
                    </span>
                  </span>
                  {includeRates ? <ToggleRight className="h-6 w-6 text-emerald-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeMeasurements((current) => !current)}
                  aria-pressed={includeMeasurements}
                  className="workspace-secondary-btn justify-between px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Get measurements</span>
                    <span className="mt-1 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                      Ask for drawings or missing assumptions so the AI can build measured quantities more accurately.
                    </span>
                  </span>
                  {includeMeasurements ? <ToggleRight className="h-6 w-6 text-emerald-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}
                </button>
              </div>
              {includeMeasurements && (
                <p className="rounded-app-sm border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  Measurement mode works best with drawings, schedules, or marked-up dimensions. If those are missing, the AI will ask follow-up questions before generating.
                </p>
              )}
            </div>
          )}

          {!isAiProjectSetupLayout && !isLibraryOrderPrompt && (
            <input
              autoFocus
              aria-label={config.title}
              className="workspace-input mb-4 py-2.5 text-sm"
              placeholder={config.placeholder}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') onClose();
                if (e.key === 'Enter' && !(isCreateProject && useAiProjectSetup)) handlePrimaryAction();
              }}
            />
          )}

          {!isAiProjectSetupLayout && isLibraryOrderPrompt && (
            <div className="mb-4 grid gap-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Reference
                </label>
                <input
                  autoFocus
                  aria-label={`${config.title} reference`}
                  className="workspace-input py-2.5 text-sm"
                  placeholder="Optional order / reference (e.g. C, C10, 01)"
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') onClose();
                    if (e.key === 'Enter') void handlePrimaryAction();
                  }}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Title
                </label>
                <input
                  aria-label={config.title}
                  className="workspace-input py-2.5 text-sm"
                  placeholder={config.placeholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') onClose();
                    if (e.key === 'Enter') void handlePrimaryAction();
                  }}
                />
              </div>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                Enter the library reference and title separately so standards like SMM7 can stay in the correct order.
              </p>
            </div>
          )}

          {isSiteSetup && (
            <div className="workspace-sidebar mb-4 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Site location for rate research</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Country
                  <input aria-label="Site country" list="estimate-site-countries" className="workspace-input mt-1" value={siteCountry} onChange={(event) => { setSiteCountry(event.target.value); setSiteRegion(event.target.value === 'United Kingdom' ? 'Scotland' : ''); setSiteCounty(''); }} />
                  <datalist id="estimate-site-countries"><option value="United Kingdom" /><option value="Ireland" /></datalist>
                </label>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Region
                  {siteCountry === 'United Kingdom' ? <select aria-label="Site region" className="workspace-input mt-1" value={UK_SITE_REGIONS.includes(siteRegion as UkSiteRegion) ? siteRegion : 'Scotland'} onChange={(event) => { setSiteRegion(event.target.value); setSiteCounty(''); }}>
                    {UK_SITE_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                  </select> : <input aria-label="Site region" className="workspace-input mt-1" value={siteRegion} onChange={(event) => setSiteRegion(event.target.value)} />}
                </label>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">County / council area
                  {siteCountry === 'United Kingdom' ? <select aria-label="Site county or council area" className="workspace-input mt-1" value={siteCounty} onChange={(event) => setSiteCounty(event.target.value)}>
                    <option value="">Select area</option>
                    {(UK_SITE_COUNTIES[siteRegion as UkSiteRegion] || []).map((county) => <option key={county} value={county}>{county}</option>)}
                  </select> : <input aria-label="Site county or council area" className="workspace-input mt-1" value={siteCounty} onChange={(event) => setSiteCounty(event.target.value)} />}
                </label>
              </div>
            </div>
          )}

          {isCreateProject && (
            <div className="workspace-sidebar mb-6 space-y-4 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI-led project setup</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Start the project with an AI-built starter estimate, including the first bill, sections, and concept cost plan with pricing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUseAiProjectSetup((current) => {
                      const next = !current;
                      setProjectSetupStep(next ? 'details' : 'details');
                      return next;
                    });
                  }}
                  aria-pressed={useAiProjectSetup}
                  className="workspace-secondary-btn px-3 py-2 text-xs"
                >
                  {useAiProjectSetup ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                  {useAiProjectSetup ? 'Enabled' : 'Off'}
                </button>
              </div>

              {useAiProjectSetup && (
                <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-4">
                    <div className="workspace-chip">
                      Step 1 of 2
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        Project name
                      </label>
                      <input
                        autoFocus
                        aria-label="Project name"
                        className="workspace-input text-base"
                        placeholder={config.placeholder}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                      />
                      {!value.trim() && derivedProjectName && (
                        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          If left blank, AI will use <span className="font-semibold text-slate-700 dark:text-slate-200">{derivedProjectName}</span> as the project name.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        Project brief
                      </label>
                      <textarea
                        value={projectBrief}
                        onChange={(event) => setProjectBrief(event.target.value)}
                        rows={5}
                        placeholder="Describe the project scope, type, scale, quality level, and anything unusual..."
                        className="workspace-input text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        Drawing basis
                      </label>
                      <div className="grid gap-2">
                        {DRAWING_BASIS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setProjectDrawingBasis(option.value)}
                            className={`rounded-app border px-3 py-3 text-left transition ${
                              projectDrawingBasis === option.value
                                ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:border-slate-600'
                            }`}
                          >
                            <div className="text-sm font-semibold">{option.label}</div>
                            <div className={`mt-1 text-xs leading-5 ${projectDrawingBasis === option.value ? 'text-white/75 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
                              {option.hint}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-app border bg-white/92 p-4 transition-all dark:bg-surface-900/92 ${
                    isReviewingProjectSetup
                      ? 'border-primary-300 shadow-[0_0_0_3px_rgba(59,130,246,0.14)] animate-pulse dark:border-primary-700'
                      : 'border-slate-200/80 dark:border-slate-700'
                  }`}>
                    <div className="workspace-chip mb-3">
                      Step 2 of 2
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">AI conversation</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          Step 2. Let AI challenge the brief one question at a time. Generation unlocks only after the review is complete.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleProjectSetupReview}
                        disabled={!canReviewProjectSetup || isReviewingProjectSetup || projectSetupStep !== 'conversation'}
                        className={`workspace-secondary-btn px-3 py-2 text-xs transition-all ${
                          isReviewingProjectSetup
                            ? 'border-primary-300 bg-primary-50 text-primary-700 shadow-[0_0_0_3px_rgba(59,130,246,0.12)] dark:border-primary-700 dark:bg-primary-950/40 dark:text-primary-200'
                            : ''
                        }`}
                      >
                        <MessageSquareMore className="h-4 w-4" />
                        {isReviewingProjectSetup ? 'Reviewing...' : 'Ask AI what it still needs'}
                      </button>
                    </div>

                    {isReviewingProjectSetup && (
                      <div className="mt-3 rounded-app-sm border border-primary-200 bg-primary-50/80 px-3 py-2 text-xs font-medium leading-5 text-primary-700 dark:border-primary-700 dark:bg-primary-950/30 dark:text-primary-200">
                        AI is reviewing the brief and preparing the next best question.
                      </div>
                    )}

                    {!isReviewingProjectSetup && projectSetupStep === 'conversation' && (
                      <div className={`mt-3 rounded-app-sm border px-3 py-2 text-xs font-medium leading-5 ${
                        projectSetupStatus === 'ready'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200'
                          : projectSetupStatus === 'question'
                            ? 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-900/60 dark:bg-primary-950/25 dark:text-primary-200'
                            : projectSetupStatus === 'error'
                              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-200'
                              : 'border-slate-200 bg-surface-muted/70 text-slate-600 dark:border-slate-700 dark:bg-surface-800/70 dark:text-slate-300'
                      }`}>
                        {projectSetupStatus === 'ready'
                          ? 'AI review complete. The starter estimate is now unlocked.'
                          : projectSetupStatus === 'question'
                            ? 'AI still needs one more answer before it can generate the starter estimate.'
                            : projectSetupStatus === 'error'
                              ? 'AI review failed. Review the message below and try again.'
                              : 'Run the AI review to let it challenge the brief before generation.'}
                      </div>
                    )}

                    {projectSetupStep === 'details' ? (
                      <div className="mt-3 rounded-app-sm border border-slate-200 bg-surface-muted/70 px-3 py-3 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-surface-800/70 dark:text-slate-400">
                        Complete the project brief first, then continue to unlock the AI conversation. If you leave the project name blank, AI will suggest one from the brief.
                      </div>
                    ) : !canReviewProjectSetup ? (
                      <div className="mt-3 rounded-app-sm border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                        Add the project brief first, then the AI conversation will open at the right point.
                      </div>
                    ) : null}

                    {projectCurrentQuestion && projectSetupStep === 'conversation' && (
                      <div className="mt-3 rounded-app-sm border border-primary-200 bg-primary-50/80 px-3 py-3 dark:border-primary-900/60 dark:bg-primary-950/25">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-300">
                          Current AI question
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                          {projectCurrentQuestion}
                        </div>
                      </div>
                    )}

                    {projectSetupStep === 'conversation' && projectConversation.length > 0 ? (
                      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                        {projectConversation.map((entry, index) => (
                          <div
                            key={`${entry}-${index}`}
                            className="rounded-app-sm border border-slate-200 bg-surface px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200"
                          >
                            {entry}
                          </div>
                        ))}
                      </div>
                    ) : projectSetupStep === 'conversation' ? (
                      <div className="mt-3 rounded-app-sm border border-dashed border-slate-200 bg-surface-muted/70 px-3 py-4 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-surface-800/70 dark:text-slate-400">
                        No AI questions yet. After the first inputs are in place, use the review button and the AI will ask only for the most commercially important missing details.
                      </div>
                    ) : null}

                    <div className="mt-3 flex gap-3">
                      <textarea
                        value={projectReply}
                        onChange={(event) => setProjectReply(event.target.value)}
                        rows={3}
                        placeholder={projectCurrentQuestion ? 'Answer the current AI question...' : 'The next AI answer box will appear here.'}
                        className="workspace-input min-h-[84px] flex-1 text-sm"
                        disabled={projectSetupStep !== 'conversation' || !projectCurrentQuestion}
                      />
                      <button
                        type="button"
                        onClick={appendProjectReply}
                        disabled={projectSetupStep !== 'conversation' || !projectCurrentQuestion || !projectReply.trim()}
                        className="workspace-secondary-btn self-end px-3 py-2 text-xs"
                      >
                        Submit answer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={`${isAiProjectSetupLayout ? 'workspace-toolbar flex gap-3' : 'flex items-center justify-end gap-2 border-t border-slate-200/80 pt-4 dark:border-slate-700/80'}`}>
            <button
              type="button"
              onClick={() => { void handlePrimaryAction(); }}
              disabled={isCreateProject && useAiProjectSetup ? (projectSetupStep === 'details' ? !canReviewProjectSetup || isReviewingProjectSetup : !canGenerateAiProject) : false}
              className={`${isAiProjectSetupLayout ? 'workspace-primary-btn flex-1' : 'workspace-primary-btn order-2 px-4 py-2 text-xs'} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isCreateProject && useAiProjectSetup
                ? projectSetupStep === 'details'
                  ? isReviewingProjectSetup
                    ? 'Reviewing brief...'
                    : 'Continue to AI questions'
                  : 'Generate project with AI'
                : 'Confirm'}
            </button>
            <button type="button" onClick={onClose} className={`${isAiProjectSetupLayout ? 'workspace-secondary-btn' : 'workspace-secondary-btn order-1 px-4 py-2 text-xs'}`}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
