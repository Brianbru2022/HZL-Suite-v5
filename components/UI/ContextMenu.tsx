import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MenuActionList } from './MenuActionList';

export type ContextMenuItem = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger' | 'warning' | 'section' | 'page' | 'heading' | 'comment' | 'priced' | 'standards';
  disabled?: boolean;
  onSelect: () => void;
};

export type ContextMenuEntry =
  | ContextMenuItem
  | { id: string; type: 'separator' }
  | { id: string; type: 'label'; label: string };

export type ContextMenuState = {
  x: number;
  y: number;
  label?: string;
  items: ContextMenuEntry[];
} | null;

export function shouldUseNativeContextMenu(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('input, textarea, select, option, [contenteditable="true"], [data-native-context-menu="true"]')
  );
}

export function getContextMenuPosition({
  x,
  y,
  itemCount,
  viewportWidth,
  viewportHeight,
  width = 288,
  padding = 8,
}: {
  x: number;
  y: number;
  itemCount: number;
  viewportWidth: number;
  viewportHeight: number;
  width?: number;
  padding?: number;
}) {
  const estimatedHeight = Math.min(480, 44 + itemCount * 38);
  const left = Math.max(padding, Math.min(x, viewportWidth - width - padding));
  const top = Math.max(padding, Math.min(y, viewportHeight - estimatedHeight - padding));
  const maxHeight = Math.max(160, viewportHeight - top - padding);
  return { left, top, maxHeight };
}

function getFocusableMenuItems(menu: HTMLElement) {
  return Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)'))
    .filter((item) => item.offsetParent !== null || item === document.activeElement);
}

function focusMenuItem(menu: HTMLElement, direction: 1 | -1 | 'first' | 'last') {
  const items = getFocusableMenuItems(menu);
  if (!items.length) return;

  if (direction === 'first') {
    items[0].focus();
    return;
  }
  if (direction === 'last') {
    items[items.length - 1].focus();
    return;
  }

  const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement);
  const nextIndex = activeIndex === -1
    ? direction === 1 ? 0 : items.length - 1
    : (activeIndex + direction + items.length) % items.length;
  items[nextIndex].focus();
}

export function ContextMenu({
  state,
  onClose,
  width = 288,
}: {
  state: ContextMenuState;
  onClose: () => void;
  width?: number;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!state) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        previousFocusRef.current?.focus();
      }
    };

    const handleScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const handleWindowResize = () => onClose();

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('scroll', handleScroll, true);
      previousFocusRef.current = null;
    };
  }, [onClose, state]);

  useEffect(() => {
    if (!state) return undefined;
    const frame = window.requestAnimationFrame(() => {
      if (!menuRef.current) return;
      focusMenuItem(menuRef.current, 'first');
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state]);

  const position = useMemo(() => {
    if (!state || typeof window === 'undefined') return { left: 0, top: 0, maxHeight: 420 };
    return getContextMenuPosition({
      x: state.x,
      y: state.y,
      itemCount: state.items.length,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      width,
    });
  }, [state, width]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusMenuItem(event.currentTarget, 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusMenuItem(event.currentTarget, -1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focusMenuItem(event.currentTarget, 'first');
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focusMenuItem(event.currentTarget, 'last');
    }
  };

  if (!state) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      data-smoke="context-menu"
      aria-label={state.label || 'Context menu'}
      className="fixed z-[220] rounded-app border border-slate-200 bg-surface py-1 shadow-app-lg dark:border-slate-700 dark:bg-surface-800"
      style={{ left: position.left, top: position.top, width, maxHeight: position.maxHeight, overflowY: 'auto' }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={handleMenuKeyDown}
    >
      <MenuActionList items={state.items} close={onClose} />
    </div>,
    document.body
  );
}
