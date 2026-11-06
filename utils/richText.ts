type RichTextColorToken =
  | '#0f172a'
  | '#1d4ed8'
  | '#047857'
  | '#b45309'
  | '#b91c1c'
  | '#7c3aed';

const RICH_TEXT_COLOR_MAP: Record<RichTextColorToken, { className: string; argb: string }> = {
  '#0f172a': { className: 'rt-color-slate-900', argb: 'FF0F172A' },
  '#1d4ed8': { className: 'rt-color-blue-700', argb: 'FF1D4ED8' },
  '#047857': { className: 'rt-color-emerald-700', argb: 'FF047857' },
  '#b45309': { className: 'rt-color-amber-700', argb: 'FFB45309' },
  '#b91c1c': { className: 'rt-color-red-700', argb: 'FFB91C1C' },
  '#7c3aed': { className: 'rt-color-violet-700', argb: 'FF7C3AED' },
};

function normaliseRichTextColor(value: string | undefined | null): RichTextColorToken | '' {
  const normalised = (value || '').toLowerCase().replace(/\s+/g, '') as RichTextColorToken;
  return normalised in RICH_TEXT_COLOR_MAP ? normalised : '';
}

function getColorMetaFromClassName(value: string | undefined | null) {
  const className = (value || '').trim();
  return Object.values(RICH_TEXT_COLOR_MAP).find((entry) => entry.className === className);
}

export function stripRichText(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li)>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function looksLikeRichText(value: string | undefined | null): boolean {
  if (!value) return false;
  return /<\/?(strong|b|u|span|font|div|p|ul|ol|li|br)\b/i.test(value);
}

export function sanitizeRichTextHtml(value: string | undefined | null): string {
  if (!value) return '';

  const template = globalThis.document?.createElement('template');
  if (!template) {
    return stripRichText(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');
  }

  template.innerHTML = value;
  const allowedTags = new Set(['B', 'STRONG', 'U', 'SPAN', 'FONT', 'BR', 'DIV', 'P', 'UL', 'OL', 'LI']);
  const cleanNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (!(node instanceof HTMLElement)) {
      node.parentNode?.removeChild(node);
      return;
    }

    if (!allowedTags.has(node.tagName)) {
      const parent = node.parentNode;
      if (!parent) return;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
      return;
    }

    let normalizedColor: RichTextColorToken | '' = '';
    if (node.tagName === 'SPAN') {
      normalizedColor = normaliseRichTextColor(node.style.color);
    }
    if (node.tagName === 'FONT') {
      normalizedColor = normaliseRichTextColor(node.getAttribute('color'));
    }

    [...node.attributes].forEach((attr) => {
      node.removeAttribute(attr.name);
    });

    if (node.tagName === 'FONT') {
      const replacement = template.ownerDocument.createElement('span');
      if (normalizedColor) {
        replacement.className = RICH_TEXT_COLOR_MAP[normalizedColor].className;
      }
      while (node.firstChild) replacement.appendChild(node.firstChild);
      node.parentNode?.replaceChild(replacement, node);
      [...replacement.childNodes].forEach(cleanNode);
      return;
    }

    if (node.tagName === 'SPAN' && normalizedColor) {
      node.className = RICH_TEXT_COLOR_MAP[normalizedColor].className;
    } else {
      node.removeAttribute('class');
    }

    [...node.childNodes].forEach(cleanNode);
  };

  [...template.content.childNodes].forEach(cleanNode);
  return template.innerHTML;
}

export function richTextToExcelValue(value: string | undefined | null): string | { richText: Array<{ text: string; font?: { bold?: boolean; underline?: boolean; color?: { argb: string } } }> } {
  if (!value) return '';
  if (!looksLikeRichText(value)) return stripRichText(value);

  const template = globalThis.document?.createElement('template');
  if (!template) return stripRichText(value);

  template.innerHTML = sanitizeRichTextHtml(value);

  const runs: Array<{ text: string; font?: { bold?: boolean; underline?: boolean; color?: { argb: string } } }> = [];

  const pushText = (text: string, font?: { bold?: boolean; underline?: boolean; color?: { argb: string } }) => {
    if (!text) return;
    const previous = runs[runs.length - 1];
    const prevFont = JSON.stringify(previous?.font || {});
    const nextFont = JSON.stringify(font || {});
    if (previous && prevFont === nextFont) {
      previous.text += text;
      return;
    }
    runs.push(font && Object.keys(font).length > 0 ? { text, font } : { text });
  };

  const walk = (
    node: Node,
    state: { bold?: boolean; underline?: boolean; colorArgb?: string }
  ) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent || '', {
        ...(state.bold ? { bold: true } : {}),
        ...(state.underline ? { underline: true } : {}),
        ...(state.colorArgb ? { color: { argb: state.colorArgb } } : {}),
      });
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    let nextState = { ...state };
    if (node.tagName === 'B' || node.tagName === 'STRONG') nextState.bold = true;
    if (node.tagName === 'U') nextState.underline = true;
    if (node.tagName === 'SPAN') {
      const colorMeta = getColorMetaFromClassName(node.className);
      if (colorMeta) nextState.colorArgb = colorMeta.argb;
    }

    if (node.tagName === 'DIV' || node.tagName === 'P') {
      if (runs.length > 0) pushText('\n', undefined);
      [...node.childNodes].forEach((child) => walk(child, nextState));
      pushText('\n', undefined);
      return;
    }

    if (node.tagName === 'LI') {
      pushText(runs.length > 0 ? '\n- ' : '- ', undefined);
      [...node.childNodes].forEach((child) => walk(child, nextState));
      return;
    }

    if (node.tagName === 'BR') {
      pushText('\n', undefined);
      return;
    }

    [...node.childNodes].forEach((child) => walk(child, nextState));
  };

  [...template.content.childNodes].forEach((child) => walk(child, {}));
  const cleaned = runs.length === 0 ? stripRichText(value) : runs;
  return typeof cleaned === 'string' ? cleaned : { richText: cleaned };
}
