import { describe, expect, it } from 'vitest';
import { APPRAISAL_PERFORMANCE_TARGETS, recordAppraisalPerformance } from './appraisalPerformance';

describe('appraisal performance targets', () => {
  it('keeps the release performance thresholds explicit and testable', () => {
    expect(APPRAISAL_PERFORMANCE_TARGETS.typingCommit).toBeLessThanOrEqual(100);
    expect(APPRAISAL_PERFORMANCE_TARGETS.workflowStage).toBeLessThanOrEqual(500);
    expect(APPRAISAL_PERFORMANCE_TARGETS.finalReportInitialRender).toBeLessThanOrEqual(1500);
    expect(APPRAISAL_PERFORMANCE_TARGETS.persistenceCommit).toBeLessThanOrEqual(1000);
  });

  it('reports whether a measured UI action is within its target', () => {
    expect(recordAppraisalPerformance('workflowStage', 240)).toMatchObject({ withinTarget: true, targetMs: 500 });
    expect(recordAppraisalPerformance('typingCommit', 120)).toMatchObject({ withinTarget: false, targetMs: 100 });
  });
});
