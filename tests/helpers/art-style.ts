// The house style in tools/art/STYLE.md, as a check any creature can be held to.

/**
 * @param svg [string] one creature's SVG source
 * @return [string[]] how it breaks the house style; empty when it holds
 */
export function styleProblems(svg: string): string[] {
  const problems: string[] = [];
  if (!svg.includes('viewBox="0 0 256 256"')) problems.push("canvas is not 256x256");
  if (!/<title id="t">[^<]+<\/title>/.test(svg)) problems.push("no title");
  if (!/<rect x="8" y="8" width="240" height="240" rx="40" fill="#[0-9A-Fa-f]{6}"\/>/.test(svg)) problems.push("no tile");
  if (/<(image|text|script|foreignObject)\b|href=|<linearGradient|<radialGradient|<filter/.test(svg)) problems.push("forbidden element");
  if ((svg.match(/rx="9\.5" ry="11"/g) ?? []).length !== 2) problems.push("eyes are not the standard pair");
  if ((svg.match(/r="5\.2"/g) ?? []).length !== 2) problems.push("pupils are not the standard pair");
  if (Buffer.byteLength(svg) >= 4096) problems.push("4 KB or larger");
  return problems;
}
