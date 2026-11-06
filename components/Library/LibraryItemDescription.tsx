import type { BoQItem } from '../../types';
import type { LibraryCommentMarker } from '../../utils/libraryCommentMarkers';

type LibraryItemDescriptionProps = {
  item: BoQItem;
  className: string;
  marker?: LibraryCommentMarker;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedText(text: string, chips: string[]) {
  const terms = chips.map((chip) => chip.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!terms.length) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const isMatch = terms.some((term) => term.localeCompare(part, undefined, { sensitivity: 'accent' }) === 0 || term.toLowerCase() === part.toLowerCase());
    if (!isMatch) return <span key={`${part}-${index}`}>{part}</span>;
    return (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-amber-100 px-0.5 font-semibold text-amber-950 ring-1 ring-amber-200 dark:bg-amber-300/20 dark:text-amber-100 dark:ring-amber-300/30"
      >
        {part}
      </mark>
    );
  });
}

export function LibraryItemDescription({ item, className, marker }: LibraryItemDescriptionProps) {
  const isCommentLike = item.type === 'COMMENT' || item.type === 'SUB_COMMENT';
  const chips = isCommentLike ? marker?.chips || [] : [];
  const highlightTerms = isCommentLike ? marker?.highlightTerms || chips : [];

  if (!isCommentLike || (chips.length === 0 && highlightTerms.length === 0)) {
    return <div className={className}>{item.description}</div>;
  }

  return (
    <div className={className}>
      <div className="mb-1.5 flex flex-wrap gap-1.5 not-italic">
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-800 dark:border-amber-500/30 dark:bg-amber-400/10 dark:text-amber-100"
          >
            {chip}
          </span>
        ))}
      </div>
      <div>{renderHighlightedText(item.description, highlightTerms)}</div>
    </div>
  );
}
