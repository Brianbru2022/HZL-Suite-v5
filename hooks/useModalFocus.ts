import type React from 'react';
import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Hook for modal accessibility: focus trap, Escape to close, return focus on close.
 * Use with a wrapper that has role="dialog" and aria-modal="true".
 */
export function useModalFocus(
  isOpen: boolean,
  onClose: () => void,
  options?: { closeOnEscape?: boolean }
) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const closeOnEscape = options?.closeOnEscape !== false;

  // Save focus when opening; restore when closing or on unmount
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      // Move focus into modal after paint
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = contentRef.current;
          if (el) {
            const first = el.querySelector<HTMLElement>(FOCUSABLE);
            if (first) first.focus();
            else el.setAttribute('tabindex', '-1');
          }
        });
      });
      return () => {
        cancelAnimationFrame(t);
        const prev = previousActiveElement.current;
        if (prev && typeof prev.focus === 'function') {
          prev.focus();
        }
        previousActiveElement.current = null;
      };
    } else {
      const prev = previousActiveElement.current;
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, closeOnEscape, onClose]);

  // Focus trap: keep Tab/Shift+Tab within modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Tab' || !contentRef.current) return;
      const el = contentRef.current;
      const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0] as HTMLElement | undefined;
      const last = focusable[focusable.length - 1] as HTMLElement | undefined;
      if (e.shiftKey) {
        if (first && last && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (first && last && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  return {
    contentRef,
    contentProps: {
      role: 'dialog' as const,
      'aria-modal': true as const,
      onKeyDown: handleKeyDown,
    },
  };
}
