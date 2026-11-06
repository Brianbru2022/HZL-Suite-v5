import { Layers3, Plus, PlusCircle } from 'lucide-react';
import type { BoQBill } from '../../types';
import { PopoverMenu } from '../UI/PopoverMenu';

export function BillStructureMenu({ bill, sectionId, pageId, onOpenPrompt }: {
  bill: BoQBill;
  sectionId?: string | null;
  pageId?: string | null;
  onOpenPrompt: (type: string, context?: Record<string, unknown>) => void;
}) {
  const section = bill.sections.find((entry) => entry.id === sectionId) || bill.sections[0];
  const selectedPage = section?.pages?.find((entry) => entry.id === pageId);
  const actions = [
    { label: 'Bill', icon: PlusCircle, disabled: false, action: () => onOpenPrompt('ADD_BILL') },
    { label: 'Section', icon: Layers3, disabled: false, action: () => onOpenPrompt('ADD_SECTION', { billId: bill.id, afterSectionId: section?.id }) },
    { label: 'Page', icon: Layers3, disabled: !section, action: () => section && onOpenPrompt('ADD_PAGE', { billId: bill.id, sectionId: section.id, afterPageId: selectedPage?.id }) },
  ];
  return <PopoverMenu
    ariaLabel="Add bill structure"
    width={270}
    estimatedHeight={185}
    trigger={({ ref, isOpen, toggle }) => <button ref={ref} type="button" onClick={toggle} className="workspace-secondary-btn px-3 py-2 text-xs" aria-haspopup="menu" aria-expanded={isOpen}>
      <Plus className="h-4 w-4" /> Structure
    </button>}
  >{(close) => <div className="grid grid-cols-3 gap-2 p-1">
    {actions.map(({ label, icon: Icon, disabled, action }) => <button key={label} type="button" disabled={disabled} onClick={() => { close(); action(); }} className="flex flex-col items-center gap-1 rounded-app border border-slate-200 px-2 py-3 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-surface-800">
      <Icon className="h-5 w-5" />{label}
    </button>)}
  </div>}</PopoverMenu>;
}
