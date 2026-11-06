import { useState } from 'react';
import { Paintbrush } from 'lucide-react';
import type { BillLineStyleConfig, BillLineStyleKey } from '../../types';
import { PopoverMenu } from '../UI/PopoverMenu';

const STYLE_LABELS: Array<[BillLineStyleKey, string]> = [
  ['GENERAL_HEADING', 'H1 heading'], ['MAJOR_HEADING', 'H2 heading'],
  ['SUB_SECTION', 'H3 heading'], ['MINOR_HEADING', 'H4 heading'],
  ['COMMENT', 'Comment'], ['SUB_COMMENT', 'Sub-comment'],
  ['PRICED', 'Priced item'], ['EXTRA_OVER_ITEM', 'Extra-over item'],
  ['PROVISIONAL_SUM', 'Provisional sum'], ['PC_SUM', 'PC sum'],
];

export function BillAppearanceMenu({ getStyle, onChange, onSaveDefault, open, onOpenChange }: {
  getStyle: (key: BillLineStyleKey) => BillLineStyleConfig;
  onChange: (key: BillLineStyleKey, style: BillLineStyleConfig) => void;
  onSaveDefault: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [key, setKey] = useState<BillLineStyleKey>('GENERAL_HEADING');
  const style = getStyle(key);
  const update = <K extends keyof BillLineStyleConfig>(field: K, value: BillLineStyleConfig[K]) => onChange(key, { ...style, [field]: value });
  return <PopoverMenu ariaLabel="Bill appearance" width={380} estimatedHeight={530} open={open} onOpenChange={onOpenChange}
    trigger={({ ref, isOpen, toggle }) => <button ref={ref} type="button" onClick={toggle} className="workspace-secondary-btn px-3 py-2 text-xs" aria-haspopup="menu" aria-expanded={isOpen}><Paintbrush className="h-4 w-4" /> Appearance</button>}
  >{() => <div className="space-y-3 p-1 text-xs">
    <label className="block font-medium">Line type
      <select className="workspace-input mt-1" value={key} onChange={(event) => setKey(event.target.value as BillLineStyleKey)}>
        {STYLE_LABELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <div className="rounded-app border border-slate-200 px-3 py-2 dark:border-slate-700" style={{ color: style.fontColor, backgroundColor: style.backgroundColor === 'transparent' ? undefined : style.backgroundColor, fontFamily: style.fontFamily === 'aptos-narrow' ? "'Aptos Narrow', Aptos, 'Arial Narrow', Arial, sans-serif" : style.fontFamily === 'serif' ? 'serif' : style.fontFamily === 'mono' ? 'monospace' : 'sans-serif', fontSize: { xs: 12, sm: 14, base: 16, lg: 18 }[style.fontSize], fontWeight: style.bold ? 700 : 400, fontStyle: style.italic ? 'italic' : 'normal', textDecoration: style.underline ? 'underline' : 'none', textTransform: style.uppercase ? 'uppercase' : 'none' }}>
      {STYLE_LABELS.find(([value]) => value === key)?.[1]} preview
    </div>
    <div className="grid grid-cols-2 gap-2">
      <label>Font<select className="workspace-input mt-1" value={style.fontFamily} onChange={(event) => update('fontFamily', event.target.value as BillLineStyleConfig['fontFamily'])}><option value="aptos-narrow">Aptos Narrow</option><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option></select></label>
      <label>Size<select className="workspace-input mt-1" value={style.fontSize} onChange={(event) => update('fontSize', event.target.value as BillLineStyleConfig['fontSize'])}><option value="xs">Extra small</option><option value="sm">Small</option><option value="base">Base</option><option value="lg">Large</option></select></label>
      <label>Text colour<input type="color" className="mt-1 h-9 w-full" value={style.fontColor} onChange={(event) => update('fontColor', event.target.value)} /></label>
      <label>Background<input type="color" className="mt-1 h-9 w-full" value={style.backgroundColor === 'transparent' ? '#ffffff' : style.backgroundColor} onChange={(event) => update('backgroundColor', event.target.value)} /></label>
    </div>
    <label className="flex items-center gap-2"><input type="checkbox" checked={style.backgroundColor === 'transparent'} onChange={(event) => update('backgroundColor', event.target.checked ? 'transparent' : '#ffffff')} /> Transparent background</label>
    <div className="grid grid-cols-2 gap-2">
      {(['bold', 'italic', 'underline', 'uppercase'] as const).map((field) => <label key={field} className="flex items-center gap-2 capitalize"><input type="checkbox" checked={style[field]} onChange={(event) => update(field, event.target.checked)} />{field}</label>)}
    </div>
    <p className="text-slate-500">Changes above apply to this project immediately.</p>
    <button type="button" onClick={onSaveDefault} className="workspace-secondary-btn w-full justify-center px-3 py-2 text-xs">Save as default for new projects</button>
  </div>}</PopoverMenu>;
}
