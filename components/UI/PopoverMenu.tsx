import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type PopoverMenuProps = {
  trigger: (props: {
    ref: React.RefObject<HTMLButtonElement | null>;
    isOpen: boolean;
    toggle: () => void;
  }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  width?: number;
  estimatedHeight?: number;
  align?: 'left' | 'right';
  ariaLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  menuClassName?: string;
};

type PopoverTriggerRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export function getPopoverMenuPosition({
  triggerRect,
  viewportWidth,
  viewportHeight,
  width,
  estimatedHeight,
  align = 'right',
  padding = 12,
}: {
  triggerRect: PopoverTriggerRect;
  viewportWidth: number;
  viewportHeight: number;
  width: number;
  estimatedHeight: number;
  align?: 'left' | 'right';
  padding?: number;
}) {
  const usableWidth = Math.max(120, viewportWidth - padding * 2);
  const menuWidth = Math.min(width, usableWidth);
  const usableHeight = Math.max(80, viewportHeight - padding * 2);
  const menuHeight = Math.min(estimatedHeight, usableHeight);
  const spaceBelow = viewportHeight - triggerRect.bottom - padding;
  const openUpward = spaceBelow < Math.min(estimatedHeight, 280) && triggerRect.top > spaceBelow;
  const top = openUpward
    ? Math.max(padding, triggerRect.top - menuHeight - 6)
    : Math.min(triggerRect.bottom + 6, Math.max(padding, viewportHeight - menuHeight - padding));
  const preferredLeft = align === 'right' ? triggerRect.right - menuWidth : triggerRect.left;
  const left = Math.min(Math.max(padding, preferredLeft), viewportWidth - menuWidth - padding);
  const maxHeight = Math.max(80, viewportHeight - top - padding);

  return { top, left, width: menuWidth, maxHeight };
}

export function PopoverMenu({
  trigger,
  children,
  width = 288,
  estimatedHeight = 360,
  align = 'right',
  ariaLabel,
  open,
  onOpenChange,
  menuClassName,
}: PopoverMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const setOpen = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    if (open === undefined) setUncontrolledOpen(nextOpen);
  };
  const [position, setPosition] = useState({ top: 0, left: 0, width, maxHeight: estimatedHeight });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition(getPopoverMenuPosition({
        triggerRect: rect,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        width,
        estimatedHeight,
        align,
      }));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [align, estimatedHeight, isOpen, width]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const close = () => setOpen(false);
  const closeFromBackdrop = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    close();
  };
  const stopPortalEvent = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };
  const focusMenuItem = (currentTarget: HTMLDivElement, direction: 1 | -1 | 'first' | 'last') => {
    const items = Array.from(
      currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((item) => item.offsetParent !== null || item === document.activeElement);
    if (!items.length) return;

    if (direction === 'first') {
      items[0].focus();
      return;
    }
    if (direction === 'last') {
      items[items.length - 1].focus();
      return;
    }

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = currentIndex === -1
      ? direction === 1 ? 0 : items.length - 1
      : (currentIndex + direction + items.length) % items.length;
    items[nextIndex].focus();
  };
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

  return (
    <>
      {trigger({ ref: triggerRef, isOpen, toggle: () => setOpen(!isOpen) })}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9990]"
            aria-hidden
            onMouseDown={stopPortalEvent}
            onClick={closeFromBackdrop}
          />
          <div
            ref={menuRef}
            role="menu"
            aria-label={ariaLabel}
            className={menuClassName || 'workspace-popover-menu p-2'}
            style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
            onMouseDown={stopPortalEvent}
            onClick={stopPortalEvent}
            onKeyDown={handleMenuKeyDown}
          >
            {children(close)}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
