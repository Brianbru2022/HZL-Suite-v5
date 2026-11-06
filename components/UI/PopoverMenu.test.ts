import { describe, expect, it } from 'vitest';
import { getPopoverMenuPosition } from './PopoverMenu';

describe('getPopoverMenuPosition', () => {
  it('keeps right-aligned menus inside the viewport', () => {
    const position = getPopoverMenuPosition({
      triggerRect: { top: 100, right: 790, bottom: 132, left: 740 },
      viewportWidth: 800,
      viewportHeight: 600,
      width: 288,
      estimatedHeight: 260,
    });

    expect(position.left).toBeLessThanOrEqual(800 - position.width - 12);
    expect(position.left).toBeGreaterThanOrEqual(12);
  });

  it('opens upward when there is not enough room below', () => {
    const position = getPopoverMenuPosition({
      triggerRect: { top: 560, right: 420, bottom: 590, left: 360 },
      viewportWidth: 800,
      viewportHeight: 640,
      width: 256,
      estimatedHeight: 220,
    });

    expect(position.top).toBeLessThan(560);
    expect(position.top).toBeGreaterThanOrEqual(12);
  });

  it('shrinks wide menus to fit narrow viewports', () => {
    const position = getPopoverMenuPosition({
      triggerRect: { top: 50, right: 180, bottom: 82, left: 120 },
      viewportWidth: 220,
      viewportHeight: 500,
      width: 360,
      estimatedHeight: 220,
    });

    expect(position.width).toBe(196);
    expect(position.left).toBe(12);
  });

});
