import type { Exp, TraceHistory } from "ppegjs/pPEG.mjs";

// TODO ideally we would be returning DOM elements, not a string
export function generateSuccessfulOutput(
  tree: Exp | string,
  indent = 0,
): string {
  const prefix = "│ ".repeat(indent);
  const [label, value] = tree;

  // Leaf node
  if (typeof value === "string") {
    return `${prefix}${label} "${value}"`;
  }

  // Internal node
  let result = `${prefix}${label}`;

  for (const child of value) {
    result += "\n" + generateSuccessfulOutput(child, indent + 1);
  }

  return result;
}

export function generateErrorOutput(
  input: string,
  rules: string[],
  trace: TraceHistory,
): { text: string; highlights: { start: number; end: number }[] } {
  let text = "";
  const highlights: { start: number; end: number }[] = [];

  for (let offset = 0; offset < trace.length; offset += 4) {
    const ruleIdx = trace[offset];
    const depth = trace[offset + 1];
    const start = trace[offset + 2];
    const end = trace[offset + 3];

    const prefix = "│ ".repeat(depth);
    const escapedInput = input
      .substring(start, end)
      .replace(/\r?\n/g, "\\n")
      .replace(/\t/g, "\\t");
    const ruleName = ruleIdx < 0 ? rules[-ruleIdx - 1] : rules[ruleIdx];
    const line = `${prefix}${ruleName} "${escapedInput}"`;

    const lineStart = text.length;
    text += line;

    if (ruleIdx < 0 && line.length > 0) {
      highlights.push({ start: lineStart, end: lineStart + line.length - 1 });
    }

    text += "\n";
  }

  return { text, highlights };
}

/**
 * Find the furthest error in a TraceHistory
 * Returns { start, end } or null if none.
 */
export function findError(
  trace: TraceHistory,
): { end: number; start: number } | null {
  let maxStart = -1;
  let error: { end: number; start: number } | null = null;
  for (let e of splitTraces(trace)) {
    if (!e.ok && e.start >= maxStart) {
      maxStart = e.start;
      error = e;
    }
  }
  return error;
}

function splitTraces(trace: TraceHistory): { ok: boolean, start: number, end: number}[] {
  const result: { ok: boolean, start: number, end: number}[] = [];
  for (let i = 0; i < trace.length; i += 4) {
    result.push({ ok: trace[i] >= 0, start: trace[i + 2], end: trace[i + 3] });
  }
  return result;
}


export function highlightErrors(
  element: HTMLElement,
  error: { start: number; end: number } | null,
) {
  const text = element.innerText;
  const highlightName = `${element.id || "input"}-error`;

  const highlightRegistry = (CSS as unknown as { highlights?: any }).highlights;
  const HighlightCtor = (globalThis as unknown as { Highlight?: any })
    .Highlight;

  element.textContent = text;
  if (!highlightRegistry || !HighlightCtor) {
    return;
  }
  highlightRegistry.delete(highlightName);

  if (!error) {
    return;
  }

  const range = {
    start: Math.max(0, error.start),
    end: Math.max(0, error.end),
  };
  if (range.end < range.start) {
    return;
  }

  const textNode = element.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const start = Math.min(range.start, text.length);
  const endExclusive = Math.min(range.end + 1, text.length);

  if (start < text.length && endExclusive > start) {
    const domRange = document.createRange();
    domRange.setStart(textNode, start);
    domRange.setEnd(textNode, endExclusive);
    highlightRegistry.set(highlightName, new HighlightCtor(domRange));
  }
}

export function highlightRanges(
  element: HTMLElement,
  ranges: { start: number; end: number }[],
  highlightName: string,
) {
  const text = element.innerText;
  const highlightRegistry = (CSS as unknown as { highlights?: any }).highlights;
  const HighlightCtor = (globalThis as unknown as { Highlight?: any })
    .Highlight;

  element.textContent = text;
  if (!highlightRegistry || !HighlightCtor) {
    return;
  }
  highlightRegistry.delete(highlightName);

  if (!ranges.length) return;

  const textNode = element.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

  const domRanges: Range[] = [];
  for (const range of ranges) {
    const start = Math.min(Math.max(0, range.start), text.length);
    const endExclusive = Math.min(Math.max(0, range.end + 1), text.length);
    if (endExclusive <= start) continue;
    const domRange = document.createRange();
    domRange.setStart(textNode, start);
    domRange.setEnd(textNode, endExclusive);
    domRanges.push(domRange);
  }

  if (domRanges.length) {
    highlightRegistry.set(highlightName, new HighlightCtor(...domRanges));
  }
}
