// The rules every creature in public/art/ingredients holds to: see tools/art/STYLE.md.
// These are the rules about the file, not the look. How a creature is drawn is the style
// spec's business and changes with it; what a file may contain does not.

const LIMIT = 16 * 1024;

/**
 * @param svg [string] one creature's SVG source
 * @return [string[]] how it breaks the rules; empty when it holds
 */
export function styleProblems(svg: string): string[] {
  const problems: string[] = [];
  if (!svg.includes('viewBox="0 0 256 256"')) problems.push("canvas is not 256x256");
  if (!/<title id="t">[^<]+<\/title>/.test(svg)) problems.push("no title");
  if (!/<rect x="8" y="8" width="240" height="240" rx="40" fill="#[0-9A-Fa-f]{6}"\/>/.test(svg)) problems.push("no tile");
  if (/<(image|text|script|foreignObject)\b/.test(svg)) problems.push("forbidden element");
  if (/(?:xlink:)?href="(?!#)/.test(svg)) problems.push("external reference");
  if (Buffer.byteLength(svg) >= LIMIT) problems.push("16 KB or larger");
  return problems;
}
