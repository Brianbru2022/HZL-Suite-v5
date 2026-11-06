
import React from 'react';
import { PlusCircle, Calculator, Folder, Type as TypeIcon, Building2, MessageSquare, Banknote, Coins } from 'lucide-react';
import { ItemType } from '../../types';
import { PopoverMenu } from './PopoverMenu';

export const itemTypeOptions: { label: string; type: ItemType; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { label: 'General Heading (H1)', type: 'GENERAL_HEADING', icon: Building2, color: 'text-slate-400 dark:text-slate-500' },
  { label: 'Major Heading (H2)', type: 'MAJOR_HEADING', icon: TypeIcon, color: 'text-slate-400 dark:text-slate-500' },
  { label: 'Sub Section (H3)', type: 'SUB_SECTION', icon: Folder, color: 'text-slate-400 dark:text-slate-500' },
  { label: 'Minor Heading (H4)', type: 'MINOR_HEADING', icon: Folder, color: 'text-slate-400 dark:text-slate-500' },
  { label: 'Comment / Note', type: 'COMMENT', icon: MessageSquare, color: 'text-slate-400 dark:text-slate-500' },
  { label: 'Sub-comment', type: 'SUB_COMMENT', icon: MessageSquare, color: 'text-slate-400 dark:text-slate-500' },
  { label: 'Priced Item', type: 'PRICED', icon: Calculator, color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Extra Over Item', type: 'EXTRA_OVER_ITEM', icon: Calculator, color: 'text-emerald-500 dark:text-emerald-300' },
  { label: 'Provisional Sum', type: 'PROVISIONAL_SUM', icon: Coins, color: 'text-amber-500 dark:text-amber-400' },
  { label: 'Prime Cost (PC) Sum', type: 'PC_SUM', icon: Banknote, color: 'text-purple-500 dark:text-purple-400' },
];

const triggerClass =
  'flex items-center gap-1.5 bg-primary-600 text-white px-2.5 py-1 rounded-app-sm text-[10px] font-medium hover:bg-primary-700 shadow-app transition-colors';

export const ItemTypeDropdown = ({ onSelect }: { onSelect: (type: ItemType) => void }) => {
  return (
    <PopoverMenu
      ariaLabel="Add item type"
      width={256}
      estimatedHeight={360}
      trigger={({ ref, isOpen, toggle }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          className={triggerClass}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <PlusCircle className="w-3 h-3 shrink-0" /> Add item
        </button>
      )}
    >
      {(close) => (
        <div>
          {itemTypeOptions.map((opt) => (
            <button
              key={opt.type}
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onSelect(opt.type);
              }}
              aria-label={`Add ${opt.label}`}
              className={`flex w-full items-center gap-3 rounded-app-sm px-3 py-2 text-left transition-colors hover:bg-surface-muted dark:hover:bg-surface-800 ${opt.type === 'EXTRA_OVER_ITEM' ? 'pl-8' : ''}`}
            >
              <opt.icon className={`w-4 h-4 shrink-0 ${opt.color}`} />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </PopoverMenu>
  );
};
