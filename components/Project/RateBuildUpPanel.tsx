import React, { useState } from 'react';
import { Calculator, Plus, Trash2, X } from 'lucide-react';
import type { EditFormState, RateBuildUpCategory } from '../../types';
import { RATE_BUILD_UP_CATEGORIES, createRateBuildUpComponent, derivedRate } from '../../utils/rateBuildUp';
import { formatCurrency } from '../../utils/formatting';
import { useModalFocus } from '../../hooks/useModalFocus';

export function RateBuildUpPanel({ formData, setFormData }: { formData: EditFormState; setFormData: React.Dispatch<React.SetStateAction<EditFormState>> }) {
  const [choosingCategory, setChoosingCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const { contentRef: categoryRef, contentProps: categoryProps } = useModalFocus(choosingCategory, () => setChoosingCategory(false), { closeOnEscape: false });
  const buildUp = formData.rateBuildUp || { mode: 'SINGLE_RATE' as const, components: [] };
  const rate = derivedRate(buildUp);
  const setMode = (mode: 'SINGLE_RATE' | 'DERIVED') => setFormData((previous) => ({
    ...previous,
    rate: mode === 'DERIVED' ? rate : previous.rate,
    rateBuildUp: { ...buildUp, mode, updatedAt: new Date().toISOString() },
  }));
  const updateComponent = (index: number, field: string, value: string | number | boolean) => setFormData((previous) => {
    const current = previous.rateBuildUp || buildUp;
    const components = current.components.map((component, componentIndex) => componentIndex === index ? { ...component, [field]: value } : component);
    const next = { ...current, mode: 'DERIVED' as const, components, updatedAt: new Date().toISOString() };
    return { ...previous, rateBuildUp: next, rate: derivedRate(next) };
  });
  const addRow = (category: RateBuildUpCategory, categoryLabel?: string) => {
    setFormData((previous) => {
      const current = previous.rateBuildUp || buildUp;
      const component = { ...createRateBuildUpComponent(current.components.length, category), categoryLabel };
      const next = { ...current, mode: 'DERIVED' as const, components: [...current.components, component], updatedAt: new Date().toISOString() };
      return { ...previous, rateBuildUp: next, rate: derivedRate(next) };
    });
    setChoosingCategory(false);
    setCustomCategory('');
  };
  const removeRow = (index: number) => setFormData((previous) => {
    const current = previous.rateBuildUp || buildUp;
    const next = { ...current, components: current.components.filter((_, rowIndex) => rowIndex !== index), updatedAt: new Date().toISOString() };
    return { ...previous, rateBuildUp: next, rate: derivedRate(next) };
  });

  return <section className="mt-4 min-w-0 rounded-app border border-primary-100 bg-primary-50/40 p-4 dark:border-primary-900/60 dark:bg-primary-950/20">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><Calculator className="h-4 w-4 text-primary-600" />Rate build-up</div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Derived rates are internal estimating data and are not included in tender returns.</p></div>
      <div className="inline-flex rounded-app border border-slate-200 bg-white p-0.5 text-xs dark:border-slate-700 dark:bg-surface-900">
        <button type="button" onClick={() => setMode('SINGLE_RATE')} className={`rounded-app-sm px-3 py-1.5 font-medium ${buildUp.mode !== 'DERIVED' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'}`}>Single rate</button>
        <button type="button" onClick={() => setMode('DERIVED')} className={`rounded-app-sm px-3 py-1.5 font-medium ${buildUp.mode === 'DERIVED' ? 'bg-primary-700 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Derived</button>
      </div>
    </div>
    {buildUp.mode === 'DERIVED' && <>
      <div className="mt-3 max-w-full overflow-x-auto rounded-app border border-slate-200 dark:border-slate-700"><table className="w-full min-w-[720px] text-xs"><thead className="bg-slate-100 text-left uppercase tracking-[0.12em] text-slate-500 dark:bg-surface-800 dark:text-slate-400"><tr><th className="px-2 py-2">Category</th><th className="px-2 py-2">Description</th><th className="px-2 py-2">Qty</th><th className="px-2 py-2">Unit</th><th className="px-2 py-2">Rate</th><th className="px-2 py-2 text-right">Total</th><th /></tr></thead><tbody>{buildUp.components.map((component, index) => <tr key={component.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-1.5 font-medium text-slate-700 dark:text-slate-200"><span className="inline-block rounded bg-slate-100 px-2 py-1.5 dark:bg-surface-800">{component.category === 'CUSTOM' ? component.categoryLabel || 'Custom' : RATE_BUILD_UP_CATEGORIES.find((entry) => entry.value === component.category)?.label || component.category}</span></td><td className="p-1.5"><input value={component.description} onChange={(event) => updateComponent(index, 'description', event.target.value)} className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-surface-900" /></td><td className="p-1.5"><input type="number" step="0.001" value={component.quantity} onChange={(event) => updateComponent(index, 'quantity', Number(event.target.value))} className="w-20 rounded border border-slate-200 bg-white px-2 py-1.5 text-right dark:border-slate-700 dark:bg-surface-900" /></td><td className="p-1.5"><input value={component.unit} onChange={(event) => updateComponent(index, 'unit', event.target.value)} className="w-20 rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-surface-900" /></td><td className="p-1.5"><input type="number" step="0.01" value={component.rate} onChange={(event) => updateComponent(index, 'rate', Number(event.target.value))} className="w-24 rounded border border-slate-200 bg-white px-2 py-1.5 text-right dark:border-slate-700 dark:bg-surface-900" /></td><td className="p-1.5 text-right font-medium">{formatCurrency((component.included === false ? 0 : component.quantity * component.rate) || 0)}</td><td className="p-1.5"><button type="button" onClick={() => removeRow(index)} className="rounded p-1 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div>
      <div className="mt-3 flex items-center justify-between"><button type="button" onClick={() => setChoosingCategory(true)} className="workspace-secondary-btn px-3 py-2 text-xs"><Plus className="h-3.5 w-3.5" />Add component</button><div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Derived rate: {formatCurrency(rate)}</div></div>
    </>}
    {choosingCategory && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4">
      <div ref={categoryRef} {...categoryProps} aria-label="Choose component category" onKeyDown={(event) => { categoryProps.onKeyDown(event); if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setChoosingCategory(false); } }} className="w-full max-w-sm rounded-app-lg border border-slate-200 bg-white p-4 shadow-app-lg dark:border-slate-700 dark:bg-surface-900">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add a component</h3><button type="button" aria-label="Close category picker" onClick={() => setChoosingCategory(false)} className="workspace-icon-btn"><X className="h-4 w-4" /></button></div>
        <p className="mb-3 text-xs text-slate-500">Choose its category before entering the quantity and rate.</p>
        <div className="grid grid-cols-2 gap-2">{RATE_BUILD_UP_CATEGORIES.filter((entry) => entry.value !== 'CUSTOM').map((entry) => <button key={entry.value} type="button" onClick={() => addRow(entry.value)} className="workspace-secondary-btn justify-start px-3 py-2 text-xs">{entry.label}</button>)}</div>
        <div className="mt-3 flex gap-2"><input aria-label="Custom category name" value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && customCategory.trim()) addRow('CUSTOM', customCategory.trim()); }} placeholder="Other category name" className="workspace-input min-w-0 flex-1 text-xs" /><button type="button" disabled={!customCategory.trim()} onClick={() => addRow('CUSTOM', customCategory.trim())} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-40">Add custom</button></div>
      </div>
    </div>}
  </section>;
}
