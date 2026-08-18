export interface MarkerSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

const TOKEN_RE = /\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~/g;

/** Parses one line (no \n) into plain/bold/italic/underline segments. */
export function parseMarkerLine(line: string): MarkerSegment[] {
  const segments: MarkerSegment[] = [];
  let lastIndex = 0;
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(line))) {
    if (match.index > lastIndex) segments.push({ text: line.slice(lastIndex, match.index) });
    const [, bold, italic, underline] = match;
    if (bold !== undefined) segments.push({ text: bold, bold: true });
    else if (italic !== undefined) segments.push({ text: italic, italic: true });
    else if (underline !== undefined) segments.push({ text: underline, underline: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) segments.push({ text: line.slice(lastIndex) });
  return segments;
}

/** Splits on \n first so marker pairs never span across lines. */
export function parseMarkers(text: string): MarkerSegment[][] {
  return text.split("\n").map(parseMarkerLine);
}

export interface WrapResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Wraps [selectionStart, selectionEnd) of value in `marker` on both sides.
 *  Empty selection -> empty pair with cursor placed between them.
 *  Selection overlapping an existing marker pair wraps the raw substring
 *  regardless (may nest/break existing markup) — accepted edge case. */
export function wrapSelectionWithMarker(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  marker: "*" | "_" | "~"
): WrapResult {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  const selected = value.slice(start, end);
  const text = value.slice(0, start) + marker + selected + marker + value.slice(end);
  const cursorStart = start + 1;
  return { text, selectionStart: cursorStart, selectionEnd: cursorStart + selected.length };
}
