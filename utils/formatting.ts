
import { UnitType } from '../types';

export const formatCurrency = (val: number) => {
  return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const normalizeUnit = (unit?: string | null) => {
  const value = (unit || '').trim().toLowerCase();
  if (!value) return '';
  if (value === 'hr' || value === 'hour' || value === 'hours') return 'hrs';
  return value;
};

export const getEditableUnitOptions = (currentUnit?: string | null) => Array.from(new Set([
  ...Object.values(UnitType), 'item', 'week', 'day', 'visit', 'session', 'kwh', 'litre',
  normalizeUnit(currentUnit),
].filter(Boolean)));

export const getContractorStyle = (idx: number) => {
  const styles = [
    { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'bg-red-100', dot: 'bg-red-500' },
    { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'bg-orange-100', dot: 'bg-orange-500' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'bg-amber-100', dot: 'bg-amber-500' },
    { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'bg-green-100', dot: 'bg-green-500' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'bg-emerald-100', dot: 'bg-emerald-500' },
    { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: 'bg-teal-100', dot: 'bg-teal-500' },
    { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', icon: 'bg-cyan-100', dot: 'bg-cyan-500' },
    { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', icon: 'bg-sky-100', dot: 'bg-sky-500' },
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'bg-blue-100', dot: 'bg-blue-500' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: 'bg-indigo-100', dot: 'bg-indigo-500' },
    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: 'bg-violet-100', dot: 'bg-violet-500' },
    { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'bg-purple-100', dot: 'bg-purple-500' },
    { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', icon: 'bg-fuchsia-100', dot: 'bg-fuchsia-500' },
    { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: 'bg-pink-100', dot: 'bg-pink-500' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'bg-rose-100', dot: 'bg-rose-500' },
  ];
  return styles[idx % styles.length];
};

export const getTradeColor = (tradeId: string) => {
  // Simple hash to pick a consistent color
  let hash = 0;
  for (let i = 0; i < tradeId.length; i++) {
    hash = tradeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    'bg-red-50 text-red-700 border-red-100',
    'bg-orange-50 text-orange-700 border-orange-100',
    'bg-amber-50 text-amber-700 border-amber-100',
    'bg-green-50 text-green-700 border-green-100',
    'bg-emerald-50 text-emerald-700 border-emerald-100',
    'bg-teal-50 text-teal-700 border-teal-100',
    'bg-cyan-50 text-cyan-700 border-cyan-100',
    'bg-sky-50 text-sky-700 border-sky-100',
    'bg-blue-50 text-blue-700 border-blue-100',
    'bg-indigo-50 text-indigo-700 border-indigo-100',
    'bg-violet-50 text-violet-700 border-violet-100',
    'bg-purple-50 text-purple-700 border-purple-100',
    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
    'bg-pink-50 text-pink-700 border-pink-100',
    'bg-rose-50 text-rose-700 border-rose-100',
    'bg-slate-100 text-slate-700 border-slate-200'
  ];
  
  return colors[Math.abs(hash) % colors.length];
};
