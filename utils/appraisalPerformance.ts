export const APPRAISAL_PERFORMANCE_TARGETS = {
  typingCommit: 100,
  workflowStage: 500,
  finalReportInitialRender: 1500,
  persistenceCommit: 1000,
} as const;

export type AppraisalPerformanceMetric = keyof typeof APPRAISAL_PERFORMANCE_TARGETS;

export type AppraisalPerformanceSample = {
  metric: AppraisalPerformanceMetric;
  durationMs: number;
  targetMs: number;
  withinTarget: boolean;
};

export function recordAppraisalPerformance(
  metric: AppraisalPerformanceMetric,
  durationMs: number,
): AppraisalPerformanceSample {
  const sample = {
    metric,
    durationMs: Math.max(0, Math.round(durationMs)),
    targetMs: APPRAISAL_PERFORMANCE_TARGETS[metric],
    withinTarget: durationMs <= APPRAISAL_PERFORMANCE_TARGETS[metric],
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hzl:appraisal-performance', { detail: sample }));
  }

  return sample;
}

/** Starts a browser-safe duration sample. Complete it after the next paint for UI interactions. */
export function startAppraisalPerformance(metric: AppraisalPerformanceMetric) {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return () => {
    const completedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return recordAppraisalPerformance(metric, completedAt - startedAt);
  };
}

export function afterNextPaint(callback: () => void) {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    callback();
    return;
  }
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
}
