import React, { useEffect, useState } from 'react';
import { formatCurrency, normalizeUnit } from '../../utils/formatting';
import { looksLikeRichText, sanitizeRichTextHtml, stripRichText } from '../../utils/richText';
import type { BoQItem, ItemType, TradePackage } from '../../types';

export function toggleSelectedBillItem(
  itemId: string,
  setSelectedItemIds: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  setSelectedItemIds((previous) => {
    const next = new Set(previous);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    return next;
  });
}

export function toggleSelectedBillItems(
  itemIds: string[],
  setSelectedItemIds: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  if (itemIds.length === 0) return;
  setSelectedItemIds((previous) => {
    const next = new Set(previous);
    const allSelected = itemIds.every((itemId) => next.has(itemId));
    itemIds.forEach((itemId) => {
      if (allSelected) next.delete(itemId);
      else next.add(itemId);
    });
    return next;
  });
}

export function getItemAccessibilityLabel(
  item: BoQItem,
  getDisplayRef: (item: BoQItem) => string
) {
  const reference = getDisplayRef(item);
  const description = stripRichText(item.description)?.trim() || 'item';

  return reference ? `${reference} ${description}` : description;
}

export function renderBillDescription(description: string | undefined, className: string, style?: React.CSSProperties, placeholderType?: ItemType) {
  const value = description || '';
  if (!value.trim() && placeholderType) {
    const label: Partial<Record<ItemType, string>> = {
      GENERAL_HEADING: 'Heading H1', MAJOR_HEADING: 'Heading H2', SUB_SECTION: 'Heading H3', MINOR_HEADING: 'Heading H4',
      COMMENT: 'Comment', SUB_COMMENT: 'Sub-comment', PRICED: 'Priced item',
    };
    return <div className={`${className} w-full italic text-slate-400 dark:text-slate-500`} style={style}>{label[placeholderType] || 'New line'}</div>;
  }
  if (!looksLikeRichText(value)) {
    return <div className={`${className} w-full whitespace-pre-wrap break-words`} style={style}>{value}</div>;
  }

  return (
    <div
      className={`${className} rich-text-content w-full`}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(value) }}
    />
  );
}

function getQuantityDecimals(item: BoQItem) {
  return Math.max(0, Math.min(6, Number(item.quantityDecimals) || 0));
}

function formatEditableQuantity(value: number, decimals = 0) {
  return Number.isFinite(value) ? value.toFixed(decimals) : (0).toFixed(decimals);
}

type InlineBillField = 'quantity' | 'unit' | 'rate';

function moveToNextBillCell(input: HTMLInputElement, field: InlineBillField, key: string, shiftKey: boolean, commit: () => boolean) {
  const workspace = input.closest<HTMLElement>('[data-smoke="bill-workspace"]');
  const row = input.closest<HTMLElement>('[data-bill-row-id]');
  if (!workspace || !row) return false;
  const rows = Array.from(workspace.querySelectorAll<HTMLElement>('[data-bill-row-id]'));
  const rowIndex = rows.indexOf(row);
  if (rowIndex < 0) return false;

  let target: { itemId: string; field: InlineBillField } | null = null;
  if (key === 'Tab') {
    const cells = Array.from(workspace.querySelectorAll<HTMLElement>('[data-bill-inline-field]'))
      .filter((cell) => cell.getClientRects().length > 0);
    const cellIndex = cells.indexOf(input);
    const next = cells[cellIndex + (shiftKey ? -1 : 1)];
    const nextRow = next?.closest<HTMLElement>('[data-bill-row-id]');
    if (next && nextRow?.dataset.billRowId) {
      target = { itemId: nextRow.dataset.billRowId, field: next.dataset.billInlineField as InlineBillField };
    }
  } else {
    const direction = key === 'ArrowUp' ? -1 : 1;
    for (let index = rowIndex + direction; index >= 0 && index < rows.length; index += direction) {
      const candidate = rows[index].querySelector<HTMLElement>(`[data-bill-inline-field="${field}"]`);
      if (candidate?.getClientRects().length && rows[index].dataset.billRowId) {
        target = { itemId: rows[index].dataset.billRowId!, field };
        break;
      }
    }
  }

  if (!commit()) return true;
  if (target) {
    window.requestAnimationFrame(() => {
      const nextRow = Array.from(workspace.querySelectorAll<HTMLElement>('[data-bill-row-id]'))
        .find((entry) => entry.dataset.billRowId === target.itemId);
      const nextButton = nextRow?.querySelector<HTMLButtonElement>(`button[data-bill-inline-field="${target.field}"]`);
      nextButton?.scrollIntoView({ block: 'nearest' });
      nextButton?.click();
    });
  }
  return true;
}

export function InlineQuantityEditor({
  item,
  disabled,
  onSave,
}: {
  item: BoQItem;
  disabled?: boolean;
  onSave: (itemId: string, quantity: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isFinishingRef = React.useRef(false);
  const decimals = getQuantityDecimals(item);
  const step = decimals === 0 ? '1' : `0.${'0'.repeat(Math.max(0, decimals - 1))}1`;
  const [draft, setDraft] = useState(formatEditableQuantity(item.quantity, decimals));

  useEffect(() => {
    if (!isEditing) {
      setDraft(formatEditableQuantity(item.quantity, decimals));
    }
  }, [decimals, isEditing, item.quantity]);

  const commit = () => {
    if (isFinishingRef.current) return false;
    isFinishingRef.current = true;
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(formatEditableQuantity(item.quantity, decimals));
      setIsEditing(false);
      return false;
    }
    onSave(item.id, parsed);
    setDraft(formatEditableQuantity(parsed, decimals));
    setIsEditing(false);
    return true;
  };

  if (disabled) {
    return (
      <span className="inline-flex w-full justify-end pr-1 leading-6">
        {formatEditableQuantity(item.quantity, decimals)}
      </span>
    );
  }

  if (item.rateBuildUp?.mode === 'DERIVED') {
    return <div className="flex w-full justify-end"><button type="button" title="Derived rate: open the item editor to amend the build-up" className="inline-flex h-6 items-center gap-1 rounded-app-sm px-1.5 text-right text-xs font-medium text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-950/40"><span aria-hidden="true">=</span>{formatCurrency(item.rate)}</button></div>;
  }

  if (isEditing) {
    return (
      <div className="flex w-full justify-end">
        <input
          autoFocus
          data-bill-inline-field="quantity"
          type="number"
          step={step}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => {
            if (['Enter', 'Tab', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
              event.preventDefault();
              moveToNextBillCell(event.currentTarget, 'quantity', event.key, event.shiftKey, commit);
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              isFinishingRef.current = true;
              setDraft(formatEditableQuantity(item.quantity, decimals));
              setIsEditing(false);
            }
          }}
          className="h-7 w-20 rounded-app-sm border border-primary-300 bg-white px-2 py-0 text-right text-sm font-medium leading-6 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-surface-900 dark:text-slate-100"
        />
      </div>
    );
  }

  return (
    <div className="flex w-full justify-end">
      <button
        type="button"
        data-bill-inline-field="quantity"
        onClick={() => { isFinishingRef.current = false; setIsEditing(true); }}
        className="inline-flex h-6 min-w-[5rem] justify-end rounded-app-sm px-1 py-0 text-right leading-6 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-surface-800 dark:hover:text-slate-100"
        aria-label={`Edit quantity for ${stripRichText(item.description)?.trim() || 'item'}`}
      >
        {formatEditableQuantity(item.quantity, decimals)}
      </button>
    </div>
  );
}

export function InlineUnitEditor({
  item,
  disabled,
  onSave,
}: {
  item: BoQItem;
  disabled?: boolean;
  onSave: (itemId: string, unit: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isFinishingRef = React.useRef(false);
  const [draft, setDraft] = useState(normalizeUnit(item.unit));

  useEffect(() => {
    if (!isEditing) {
      setDraft(normalizeUnit(item.unit));
    }
  }, [isEditing, item.unit]);

  const commit = () => {
    if (isFinishingRef.current) return false;
    isFinishingRef.current = true;
    const normalized = normalizeUnit(draft).trim();
    onSave(item.id, normalized);
    setDraft(normalized);
    setIsEditing(false);
    return true;
  };

  if (disabled) {
    return (
      <span className="inline-flex w-full justify-center leading-6">
        {normalizeUnit(item.unit)}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="flex w-full justify-center">
        <input
          autoFocus
          data-bill-inline-field="unit"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => {
            if (['Enter', 'Tab', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
              event.preventDefault();
              moveToNextBillCell(event.currentTarget, 'unit', event.key, event.shiftKey, commit);
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              isFinishingRef.current = true;
              setDraft(normalizeUnit(item.unit));
              setIsEditing(false);
            }
          }}
          className="h-7 w-20 rounded-app-sm border border-primary-300 bg-white px-1.5 py-0 text-center text-xs font-medium text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-surface-900 dark:text-slate-100"
        />
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center">
      <button
        type="button"
        data-bill-inline-field="unit"
        onClick={() => { isFinishingRef.current = false; setIsEditing(true); }}
        className="inline-flex min-h-[1.5rem] min-w-[4.5rem] max-w-full items-center justify-center rounded-app-sm px-1.5 py-0 text-center text-xs font-medium leading-6 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-surface-800 dark:hover:text-slate-100"
        aria-label={`Edit unit for ${stripRichText(item.description)?.trim() || 'item'}`}
      >
        <span className="truncate">{normalizeUnit(item.unit)}</span>
      </button>
    </div>
  );
}

function formatEditableRate(value: number) {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function InlineRateEditor({
  item,
  disabled,
  onSave,
}: {
  item: BoQItem;
  disabled?: boolean;
  onSave: (itemId: string, rate: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isFinishingRef = React.useRef(false);
  const [draft, setDraft] = useState(formatEditableRate(item.rate));

  useEffect(() => {
    if (!isEditing) {
      setDraft(formatEditableRate(item.rate));
    }
  }, [isEditing, item.rate]);

  const commit = () => {
    if (isFinishingRef.current) return false;
    isFinishingRef.current = true;
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDraft(formatEditableRate(item.rate));
      setIsEditing(false);
      return false;
    }
    onSave(item.id, parsed);
    setDraft(formatEditableRate(parsed));
    setIsEditing(false);
    return true;
  };

  if (disabled) {
    return (
      <span className="inline-flex w-full justify-end pr-1 leading-6">
        {formatCurrency(item.rate)}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="flex w-full justify-end">
        <input
          autoFocus
          data-bill-inline-field="rate"
          type="number"
          step="0.01"
          min="0"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => {
            if (['Enter', 'Tab', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
              event.preventDefault();
              moveToNextBillCell(event.currentTarget, 'rate', event.key, event.shiftKey, commit);
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              isFinishingRef.current = true;
              setDraft(formatEditableRate(item.rate));
              setIsEditing(false);
            }
          }}
          className="h-7 w-24 rounded-app-sm border border-primary-300 bg-white px-2 py-0 text-right text-sm font-medium leading-6 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-surface-900 dark:text-slate-100"
        />
      </div>
    );
  }

  return (
    <div className="flex w-full justify-end">
      <button
        type="button"
        data-bill-inline-field="rate"
        onClick={() => { isFinishingRef.current = false; setIsEditing(true); }}
        className="inline-flex h-6 min-w-[5.75rem] justify-end rounded-app-sm px-1 py-0 text-right leading-6 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-surface-800 dark:hover:text-slate-100"
        aria-label={`Edit rate for ${stripRichText(item.description)?.trim() || 'item'}`}
      >
        {formatCurrency(item.rate)}
      </button>
    </div>
  );
}

export function getBillItemTypeLabel(type: string) {
  switch (type) {
    case 'GENERAL_HEADING':
      return 'General heading';
    case 'MAJOR_HEADING':
      return 'Major heading';
    case 'SUB_SECTION':
      return 'Sub heading';
    case 'MINOR_HEADING':
      return 'Minor heading';
    case 'COMMENT':
      return 'Comment';
    case 'SUB_COMMENT':
      return 'Sub-comment';
    case 'EXTRA_OVER_ITEM':
      return 'Extra over item';
    case 'PROVISIONAL_SUM':
      return 'Provisional sum';
    case 'PC_SUM':
      return 'Prime cost sum';
    default:
      return 'Priced item';
  }
}

export function getTradeAssignmentLabel(item: BoQItem, trade?: TradePackage | null) {
  if (!['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)) return 'No trade';
  return trade?.name || 'Unassigned';
}

export function getTradeAssignmentHelperText(item: BoQItem, trade?: TradePackage | null) {
  if (!['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)) {
    return 'Only priced lines are allocated to trade packages.';
  }
  return trade
    ? `Reassign "${item.description || 'this item'}" if it should move out of ${trade.name}.`
    : `Assign a trade package to "${item.description || 'this item'}" so tendering and exports follow the right commercial package.`;
}
