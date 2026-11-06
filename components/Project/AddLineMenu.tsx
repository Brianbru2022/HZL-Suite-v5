import React, { useEffect, useMemo, useState } from 'react';
import { Check, Library, MapPin, Plus } from 'lucide-react';
import type { BoQBill, BoQItem, ItemType } from '../../types';
import { itemTypeOptions } from '../UI/ItemTypeDropdown';
import { PopoverMenu } from '../UI/PopoverMenu';
import { resolveHighlightedRow } from '../../utils/billPlacement';
import { getNextCommentItemType, getNextHeadingItemType, isCommentItemType, isHeadingItemType } from '../../utils/billStructure';

type AddLineDestination = {
  key: string;
  label: string;
  billId: string;
  sectionId: string;
  pageId?: string | null;
  items: BoQItem[];
};

type Placement = 'TOP' | 'BOTTOM' | 'BEFORE_SELECTED' | 'AFTER_SELECTED';

type AddLineMenuProps = {
  activeBill: BoQBill;
  selectedItemIds: Set<string>;
  activeItemId?: string | null;
  defaultSectionId?: string | null;
  defaultPageId?: string | null;
  compact?: boolean;
  label?: string;
  onOpenEditor: (billId: string, sectionId: string, item?: BoQItem, type?: ItemType, pageId?: string | null, insertAfterItemId?: string | null) => void;
  onOpenPrompt: (type: string, context?: Record<string, unknown>) => void;
  onOpenStandards?: () => void;
};

function getDestinationKey(sectionId: string, pageId?: string | null) {
  return `${sectionId || '__bill__'}::${pageId || '__direct__'}`;
}

export function AddLineMenu({
  activeBill,
  selectedItemIds,
  activeItemId,
  defaultSectionId,
  defaultPageId,
  compact = false,
  label = 'Add',
  onOpenEditor,
  onOpenPrompt,
  onOpenStandards,
}: AddLineMenuProps) {
  const destinations = useMemo<AddLineDestination[]>(() => {
    const next: AddLineDestination[] = [];
    if (activeBill.sections.length === 0 || (activeBill.items || []).length > 0) {
      next.push({
        key: getDestinationKey(''),
        label: `${activeBill.name} - bill level`,
        billId: activeBill.id,
        sectionId: '',
        items: activeBill.items || [],
      });
    }
    activeBill.sections.forEach((section, sectionIndex) => {
      if (section.pages?.length) {
        section.pages.forEach((page, pageIndex) => {
          next.push({
            key: getDestinationKey(section.id, page.id),
            label: `Section ${sectionIndex + 1} / Page ${pageIndex + 1}: ${page.name || 'Unnamed page'}`,
            billId: activeBill.id,
            sectionId: section.id,
            pageId: page.id,
            items: page.items || [],
          });
        });
      } else {
        next.push({
          key: getDestinationKey(section.id),
          label: `Section ${sectionIndex + 1}: ${section.name}`,
          billId: activeBill.id,
          sectionId: section.id,
          items: section.items || [],
        });
      }
    });
    return next;
  }, [activeBill]);

  const selectedDestinationKey = useMemo(() => {
    const selectedDestination = destinations.find((entry) => entry.items.some((item) => selectedItemIds.has(item.id)));
    const activeDestination = selectedItemIds.size === 0 ? destinations.find((entry) => entry.items.some((item) => item.id === activeItemId)) : null;
    return selectedDestination?.key || activeDestination?.key || '';
  }, [activeItemId, destinations, selectedItemIds]);

  const defaultDestinationKey = useMemo(() => {
    if (selectedDestinationKey) return selectedDestinationKey;
    const exact = getDestinationKey(defaultSectionId || '', defaultPageId || undefined);
    if (destinations.some((entry) => entry.key === exact)) return exact;
    const sectionOnly = getDestinationKey(defaultSectionId || '');
    if (destinations.some((entry) => entry.key === sectionOnly)) return sectionOnly;
    return destinations[0]?.key || '';
  }, [defaultPageId, defaultSectionId, destinations, selectedDestinationKey]);

  const [destinationKey, setDestinationKey] = useState(defaultDestinationKey);
  const [itemType, setItemType] = useState<ItemType>('PRICED');
  const [placement, setPlacement] = useState<Placement>('BOTTOM');

  useEffect(() => {
    setDestinationKey((current) => {
      if (selectedDestinationKey) return selectedDestinationKey;
      return destinations.some((entry) => entry.key === current) ? current : defaultDestinationKey;
    });
  }, [defaultDestinationKey, destinations, selectedDestinationKey]);

  const destination = destinations.find((entry) => entry.key === destinationKey) || destinations[0];
  const selectedItem = resolveHighlightedRow(destination?.items || [], selectedItemIds, activeItemId);
  const canUseSelectedPlacement = Boolean(selectedItem);
  const defaultPlacement = canUseSelectedPlacement ? 'AFTER_SELECTED' : 'BOTTOM';

  useEffect(() => {
    setPlacement(defaultPlacement);
  }, [activeBill.id, defaultPlacement, destinationKey, selectedItem?.id]);

  const selectedItemLabel = selectedItem?.reference
    ? `${selectedItem.reference} selected`
    : selectedItem
      ? 'Selected row'
      : 'No single row selected';
  const selectedItemCount = destination?.items.length || 0;
  const itemTypeLabel = itemTypeOptions.find((option) => option.type === itemType)?.label || 'Line';
  const placementLabel = placement === 'TOP'
    ? 'Top of destination'
    : placement === 'BOTTOM'
      ? 'Bottom of destination'
      : placement === 'AFTER_SELECTED'
        ? `After ${selectedItemLabel}`
        : `Before ${selectedItemLabel}`;
  const destinationScope = destination?.pageId
    ? 'Page'
    : destination?.sectionId
      ? 'Section'
      : 'Bill';

  const resolveInsertAfterItemId = () => {
    if (!destination) return null;
    if (placement === 'TOP') return null;
    if (placement === 'BOTTOM') return destination.items[destination.items.length - 1]?.id ?? null;
    if (!selectedItem) return destination.items[destination.items.length - 1]?.id ?? null;
    if (placement === 'AFTER_SELECTED') return selectedItem.id;
    const selectedIndex = destination.items.findIndex((item) => item.id === selectedItem.id);
    return selectedIndex > 0 ? destination.items[selectedIndex - 1].id : null;
  };

  const resolveItemType = (): ItemType => {
    if (placement !== 'AFTER_SELECTED' || !selectedItem) return itemType;
    if (isHeadingItemType(itemType)) return getNextHeadingItemType(selectedItem.type);
    if (isCommentItemType(itemType)) return getNextCommentItemType(selectedItem.type);
    return itemType;
  };

  return (
    <PopoverMenu
      ariaLabel="Add to bill"
      width={360}
      estimatedHeight={520}
      trigger={({ ref, isOpen, toggle }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          className={compact
            ? 'inline-flex h-8 items-center justify-center gap-1.5 rounded-app-sm border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:bg-surface-800'
            : 'workspace-primary-btn px-3.5 py-2 text-xs'}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          title="Add a bill line"
        >
          <Plus className="h-4 w-4" />
          {label}
        </button>
      )}
    >
      {(close) => (
        <div className="space-y-3">
          <div className="px-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Add to workspace</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Choose destination, type, and placement</div>
          </div>
          <div className="rounded-app border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-semibold">{itemTypeLabel} to {destinationScope.toLowerCase()}</div>
                <div className="mt-1 leading-5 text-emerald-800/85 dark:text-emerald-100/75">
                  {destination?.label || 'No destination'} - {placementLabel}
                </div>
              </div>
            </div>
          </div>
          {onOpenStandards && (
            <button
              type="button"
              onClick={() => {
                close();
                onOpenStandards();
              }}
              className="flex w-full items-center justify-between gap-3 rounded-app border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:bg-surface-800"
            >
              <span className="flex items-center gap-2">
                <Library className="h-4 w-4" />
                From library
              </span>
              <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">Smart insert</span>
            </button>
          )}
          <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            1. Destination
            <select
              value={destinationKey}
              onChange={(event) => setDestinationKey(event.target.value)}
              className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
            >
              {destinations.map((entry) => (
                <option key={entry.key} value={entry.key}>{entry.label}</option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500">
              {selectedItemCount} existing row{selectedItemCount === 1 ? '' : 's'} in this destination.
            </span>
          </label>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            2. Line type
            <select
              value={itemType}
              onChange={(event) => setItemType(event.target.value as ItemType)}
              className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
            >
              {itemTypeOptions.map((option) => (
                <option key={option.type} value={option.type}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            3. Placement
            <select
              value={placement}
              onChange={(event) => setPlacement(event.target.value as Placement)}
              className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
            >
              <option value="BOTTOM">Bottom of destination</option>
              <option value="TOP">Top of destination</option>
              <option value="AFTER_SELECTED" disabled={!canUseSelectedPlacement}>After selected row</option>
              <option value="BEFORE_SELECTED" disabled={!canUseSelectedPlacement}>Before selected row</option>
            </select>
            {!canUseSelectedPlacement && (
              <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500">
                Select exactly one row in this destination to enable before/after placement.
              </span>
            )}
          </label>
          <button
            type="button"
            disabled={!destination}
            onClick={() => {
              if (!destination) return;
              onOpenEditor(destination.billId, destination.sectionId, undefined, resolveItemType(), destination.pageId, resolveInsertAfterItemId());
              close();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-app-sm bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <Check className="h-4 w-4" />
            Add {itemTypeLabel.toLowerCase()}
          </button>
        </div>
      )}
    </PopoverMenu>
  );
}
