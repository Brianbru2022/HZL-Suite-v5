import React from 'react';
import { HelpCircle } from 'lucide-react';

export function HelpButton({
  onClick,
  label = 'Help',
  compact = false,
}: {
  onClick: () => void;
  label?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={compact ? 'workspace-secondary-btn px-2.5 py-2 text-xs' : 'workspace-secondary-btn px-3 py-2 text-xs'}
      aria-label={label}
      title={label}
    >
      <HelpCircle className="h-4 w-4" />
      {!compact && label}
    </button>
  );
}
