// Text helpers for the handwritten card: user-perceived character limits and
// line wrapping that works for Korean, English, Japanese and mixed text.
// Pure (measuring is injected), so Node can test it.

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/** User-perceived characters (emoji sequences and Hangul syllables count once). */
export function graphemes(s: string): string[] {
  return segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s);
}

export const CARD_LIMITS = { to: 20, from: 20, message: 150, messageLines: 8 } as const;

/** Trim to `max` graphemes and `maxLines` lines. Single-line fields pass maxLines = 1. */
export function clampText(s: string, max: number, maxLines = Infinity): string {
  let out = maxLines === 1 ? s.replace(/[\r\n]+/g, " ") : s.replace(/\r\n?/g, "\n");
  const lines = out.split("\n");
  if (lines.length > maxLines) out = lines.slice(0, maxLines).join("\n");
  const g = graphemes(out);
  return g.length > max ? g.slice(0, max).join("") : out;
}

/**
 * Wrap text into lines no wider than `maxWidth`. Explicit line breaks are kept,
 * lines break at spaces where possible (Korean words stay whole), and runs
 * without spaces (long words, Japanese) break between characters.
 */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const token of para.split(/(\s+)/)) {
      if (!token) continue;
      const next = line + token;
      if (measure(next.trimEnd()) <= maxWidth) {
        line = next;
        continue;
      }
      if (line.trim()) out.push(line.trimEnd());
      line = "";
      if (!token.trim()) continue;
      for (const g of graphemes(token)) {
        if (line && measure(line + g) > maxWidth) {
          out.push(line);
          line = g;
        } else line += g;
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}
