import React from 'react';
import { GripVertical, RotateCcw, X } from 'lucide-react';

type Bounds = { left: number; top: number; width: number; height: number };
type Gesture = { mode: 'move' | 'resize'; pointerId: number; x: number; y: number; bounds: Bounds };

function fitToViewport(bounds: Bounds): Bounds {
  const availableWidth = Math.max(1, window.innerWidth - 16);
  const availableHeight = Math.max(1, window.innerHeight - 16);
  const width = Math.min(availableWidth, Math.max(Math.min(480, availableWidth), bounds.width));
  const height = Math.min(availableHeight, Math.max(Math.min(260, availableHeight), bounds.height));
  return {
    width, height,
    left: Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8)),
    top: Math.max(8, Math.min(bounds.top, window.innerHeight - height - 8)),
  };
}

export function MovableDialog({ title, onClose, children, movable = false }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  movable?: boolean;
}) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const gestureRef = React.useRef<Gesture | null>(null);
  const [bounds, setBounds] = React.useState<Bounds | null>(null);
  const [gestureMode, setGestureMode] = React.useState<Gesture['mode'] | null>(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    if (movable) {
      const rect = dialog.getBoundingClientRect();
      setBounds(fitToViewport({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }));
    }
    return () => dialog.close();
  }, [movable]);

  React.useEffect(() => {
    if (!movable) return;
    const keepVisible = () => setBounds(current => current ? fitToViewport(current) : current);
    window.addEventListener('resize', keepVisible);
    return () => window.removeEventListener('resize', keepVisible);
  }, [movable]);

  const startGesture = (event: React.PointerEvent<HTMLElement>, mode: Gesture['mode']) => {
    if (!bounds || event.button !== 0) return;
    if (mode === 'move' && (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { mode, pointerId: event.pointerId, x: event.clientX, y: event.clientY, bounds };
    setGestureMode(mode);
  };
  const moveGesture = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    setBounds(fitToViewport(gesture.mode === 'move'
      ? { ...gesture.bounds, left: gesture.bounds.left + dx, top: gesture.bounds.top + dy }
      : { ...gesture.bounds, width: gesture.bounds.width + dx, height: gesture.bounds.height + dy }));
  };
  const endGesture = () => {
    gestureRef.current = null;
    setGestureMode(null);
  };
  const adjustWithKeyboard = (event: React.KeyboardEvent<HTMLElement>, mode: Gesture['mode']) => {
    if (!bounds || event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 32 : 8;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    setBounds(fitToViewport(mode === 'move'
      ? { ...bounds, left: bounds.left + dx, top: bounds.top + dy }
      : { ...bounds, width: bounds.width + dx, height: bounds.height + dy }));
  };

  return <dialog
    ref={dialogRef}
    aria-label={title}
    onCancel={event => { event.preventDefault(); onClose(); }}
    style={bounds ? { ...bounds, position: 'fixed', margin: 0, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 16px)', maxWidth: 'calc(100vw - 16px)' } : undefined}
    className={`m-auto max-h-[88vh] w-[min(70rem,95vw)] rounded-app-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100 ${movable ? 'overflow-hidden' : 'overflow-auto'}`}
  >
    <div
      role={movable ? 'group' : undefined}
      aria-label={movable ? `Move ${title} window` : undefined}
      title={movable ? 'Drag to move; use arrow keys when focused' : undefined}
      tabIndex={movable ? 0 : undefined}
      onPointerDown={movable ? event => startGesture(event, 'move') : undefined}
      onPointerMove={movable ? moveGesture : undefined}
      onPointerUp={movable ? endGesture : undefined}
      onPointerCancel={movable ? endGesture : undefined}
      onLostPointerCapture={movable ? endGesture : undefined}
      onKeyDown={movable ? event => adjustWithKeyboard(event, 'move') : undefined}
      className={`sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-surface-900 ${movable ? `touch-none select-none outline-offset-[-2px] ${gestureMode === 'move' ? 'cursor-grabbing' : 'cursor-move'}` : ''}`}
    >
      <h3 className="flex items-center gap-2 font-semibold">{movable && <GripVertical aria-hidden="true" className="h-4 w-4 text-slate-400" />}{title}</h3>
      <div className="flex gap-2">
        {movable && <button type="button" aria-label={`Centre ${title} window`} title="Centre window" className="workspace-icon-btn" onClick={() => setBounds(current => current ? fitToViewport({ ...current, left: (window.innerWidth - current.width) / 2, top: (window.innerHeight - current.height) / 2 }) : current)}><RotateCcw className="h-4 w-4" /></button>}
        <button type="button" onClick={onClose} className="workspace-icon-btn" aria-label={`Close ${title}`}><X className="h-4 w-4" /></button>
      </div>
    </div>
    <div className={movable ? 'min-h-0 flex-1 overflow-auto p-4' : 'p-4'}>{children}</div>
    {movable && <button
      type="button"
      aria-label={`Resize ${title} window`}
      title="Drag to resize; use arrow keys when focused"
      onPointerDown={event => startGesture(event, 'resize')}
      onPointerMove={moveGesture}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onLostPointerCapture={endGesture}
      onKeyDown={event => adjustWithKeyboard(event, 'resize')}
      className="absolute bottom-0 right-0 z-20 h-6 w-6 touch-none cursor-nwse-resize rounded-br-app-xl bg-white hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 dark:bg-surface-900 dark:hover:bg-surface-800"
    ><span aria-hidden="true" className="absolute bottom-1 right-1 h-3 w-3 border-b-2 border-r-2 border-slate-400" /></button>}
  </dialog>;
}
