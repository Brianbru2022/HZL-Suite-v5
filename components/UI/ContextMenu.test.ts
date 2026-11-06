import { describe, expect, it } from 'vitest';
import { getContextMenuPosition } from './ContextMenu';

describe('getContextMenuPosition', () => {
  it('keeps the context menu inside the right edge of the viewport', () => {
    const position = getContextMenuPosition({
      x: 790,
      y: 120,
      itemCount: 5,
      viewportWidth: 800,
      viewportHeight: 600,
      width: 288,
    });

    expect(position.left).toBe(504);
    expect(position.left + 288).toBeLessThanOrEqual(800 - 8);
  });

  it('moves tall menus upward and still leaves a usable scroll area', () => {
    const position = getContextMenuPosition({
      x: 220,
      y: 560,
      itemCount: 14,
      viewportWidth: 900,
      viewportHeight: 640,
      width: 288,
    });

    expect(position.top).toBeLessThan(560);
    expect(position.top).toBeGreaterThanOrEqual(8);
    expect(position.maxHeight).toBeGreaterThanOrEqual(160);
  });
});
