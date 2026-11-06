// Lexend is a wide font: about 0.62 em per character for bold text (regular is a little narrower).
// shortcut: character count, not measured glyphs; upgrade to onTextLayout if a split word still shows on a device.
const EM_PER_CHAR = 0.62;

// Width of the longest word, in points, at the user's system font size.
export function longestWordWidth(texts: string[], fontSize: number, fontScale: number): number {
  const longest = Math.max(0, ...texts.flatMap((text) => text.split(/\s+/)).map((w) => w.length));
  return longest * fontSize * fontScale * EM_PER_CHAR;
}

export interface ColumnsFitOptions {
  width: number; // width of the whole row, in points
  columns: number;
  gap: number; // between columns
  cellPadding: number; // horizontal padding + border inside each column, both sides together
  fontSize: number;
  fontScale: number;
}

// True when every word of `texts` fits on one line of a column, so side-by-side columns never split a
// word. When it is false, the caller stacks the columns instead (never a smaller font).
export function columnsFit(texts: string[], o: ColumnsFitOptions): boolean {
  const column = (o.width - o.gap * (o.columns - 1)) / o.columns - o.cellPadding;
  return longestWordWidth(texts, o.fontSize, o.fontScale) <= column;
}
