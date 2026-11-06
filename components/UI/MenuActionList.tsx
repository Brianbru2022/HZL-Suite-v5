import type { ContextMenuEntry, ContextMenuItem } from './ContextMenu';

function isActionItem(item: ContextMenuEntry): item is ContextMenuItem {
  return !('type' in item);
}

function getLabelClass(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes('add')) {
    return 'mx-1 mt-1 rounded-app-sm bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200';
  }
  if (normalized.includes('edit')) {
    return 'mx-1 mt-1 rounded-app-sm bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800/80 dark:text-slate-200';
  }
  if (normalized.includes('standard')) {
    return 'mx-1 mt-1 rounded-app-sm bg-violet-50 px-2 py-1 text-violet-700 dark:bg-violet-950/30 dark:text-violet-200';
  }
  if (normalized.includes('move')) {
    return 'mx-1 mt-1 rounded-app-sm bg-sky-50 px-2 py-1 text-sky-700 dark:bg-sky-950/30 dark:text-sky-200';
  }
  if (normalized.includes('danger')) {
    return 'mx-1 mt-1 rounded-app-sm bg-red-50 px-2 py-1 text-red-700 dark:bg-red-950/30 dark:text-red-200';
  }
  return 'px-3 pb-1 pt-2 text-slate-400 dark:text-slate-500';
}

function getToneClass(item: ContextMenuItem) {
  switch (item.tone) {
    case 'danger':
      return 'text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/25';
    case 'warning':
      return 'text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/25';
    case 'section':
      return 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/25';
    case 'page':
      return 'text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/25';
    case 'heading':
      return 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/25';
    case 'comment':
      return 'text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/25';
    case 'priced':
      return 'text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700/70';
    case 'standards':
      return 'text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/25';
    default:
      return 'text-slate-700 hover:bg-surface-muted dark:text-slate-200 dark:hover:bg-slate-700/70';
  }
}

export function MenuActionList({
  items,
  close,
  itemTextSize = 'text-sm',
}: {
  items: ContextMenuEntry[];
  close: () => void;
  itemTextSize?: string;
}) {
  return (
    <>
      {items.map((item) => {
        if ('type' in item && item.type === 'separator') {
          return <div key={item.id} className="my-1 border-t border-slate-200 dark:border-slate-700" />;
        }
        if ('type' in item && item.type === 'label') {
          return (
            <div key={item.id} className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${getLabelClass(item.label)}`}>
              {item.label}
            </div>
          );
        }

        const toneClass = getToneClass(item);

        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (!isActionItem(item) || item.disabled) return;
              close();
              item.onSelect();
            }}
            className={`flex w-full items-start gap-3 rounded-app-sm px-3 py-2 text-left ${itemTextSize} font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
          >
            {item.icon && <span className="mt-0.5 shrink-0">{item.icon}</span>}
            <span>
              <span className="block">{item.label}</span>
              {item.description && (
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">{item.description}</span>
              )}
            </span>
          </button>
        );
      })}
    </>
  );
}
