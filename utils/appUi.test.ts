import { describe, expect, it } from 'vitest';
import {
  APP_DESIGN_TOKENS,
  PRIMARY_NAVIGATION_MODULES,
  ROADMAP_NAVIGATION_MODULES,
  WORKSPACE_VIEW_PRESETS,
} from './appUi';
import { WORKFLOW_MODULES } from './workflowModules';

describe('app UI contracts', () => {
  it('keeps coming-soon workflow modules out of primary navigation', () => {
    expect(PRIMARY_NAVIGATION_MODULES.map((module) => module.id)).toEqual([
      'HOME',
      'ESTIMATING',
      'LIBRARY_MAINTENANCE',
      'TENDER_ANALYSIS',
      'COST_REPORTS',
      'AUDITS',
    ]);
    expect(PRIMARY_NAVIGATION_MODULES.every((module) => module.status !== 'coming-soon')).toBe(true);
  });

  it('keeps every workflow module in the roadmap navigation contract', () => {
    const roadmapIds = ROADMAP_NAVIGATION_MODULES.map((module) => module.id);
    expect(roadmapIds).toEqual(WORKFLOW_MODULES.map((module) => module.id));
    expect(ROADMAP_NAVIGATION_MODULES.some((module) => module.status === 'available')).toBe(true);
    expect(ROADMAP_NAVIGATION_MODULES.some((module) => module.status === 'beta')).toBe(true);
    expect(ROADMAP_NAVIGATION_MODULES.some((module) => module.status === 'coming-soon')).toBe(true);
    expect(roadmapIds).toContain('APPRAISALS');
    expect(roadmapIds).toContain('TAKE_OFF');
    expect(roadmapIds).toContain('VALUATIONS');
    expect(roadmapIds).toContain('FINAL_ACCOUNTS');
  });

  it('defines the expected workspace presets and visual token roles', () => {
    expect(WORKSPACE_VIEW_PRESETS.map((preset) => preset.id)).toEqual([
      'clean-bill',
      'trade-allocation',
      'tender-prep',
      'review-audit',
    ]);
    expect(new Set(APP_DESIGN_TOKENS.map((token) => token.role))).toEqual(new Set(['brand', 'surface', 'status', 'ai']));
  });
});
