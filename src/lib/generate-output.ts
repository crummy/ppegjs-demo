import type { Exp, TraceHistory } from "ppegjs/pPEG.mjs";

type GrammarCompileError = {
  type?: string;
  message?: string;
  line?: number;
  column?: number;
  fault_rule?: string;
  expected?: unknown;
  found?: unknown;
  location?: string;
  rule?: string;
};

type GrammarCompileFailure = {
  ok: false;
  error?: GrammarCompileError;
  rules?: string[];
  trace_history?: TraceHistory;
};

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

export function generateGrammarCompileErrorOutput(
  grammarText: string,
  compiled: GrammarCompileFailure,
): {
  text: string;
  highlights: { start: number; end: number }[];
} {
  const error = compiled.error ?? {};
  const message = error.message ?? "Unknown grammar compile error.";
  const lines: string[] = [
    "Grammar compile error",
    `${error.type}: ${message}`,
  ];
  const highlights: { start: number; end: number }[] = [];

  if (error.fault_rule) lines.push(`Fault rule: ${error.fault_rule}`);
  if (typeof error.rule === "string" && error.rule.length > 0) {
    lines.push(`In rule: ${error.rule}`);
    const ruleRange = findRuleDefinitionRange(grammarText, error.rule);
    if (ruleRange) {
      highlights.push(ruleRange);
    }
  }

  if (error.column && error.line) {
    lines.push(`Location: Line ${error.line}, col ${error.column}`);
    const offset = extractOffsetFromLineColumn(
      grammarText,
      error.line,
      error.column,
    );
    highlights.push({ start: offset, end: offset });
  }

  const text = lines.join("\n");

  return { text, highlights };
}

/**
 * Find the error in a TraceHistory most likely to be at fault for bad input
 * Returns { start, end } or null if none.
 */
export function findError(
  trace: TraceHistory,
  inputLength: number,
  inputText: string,
): { end: number; start: number } | null {
  // In incomplete parses, the top-level rule succeeds but leaves trailing
  // input. Highlight the remaining suffix directly.
  const trailing = findTrailingInput(trace, inputLength);
  if (trailing) return trailing;

  let best: {
    start: number;
    end: number;
    depth: number;
  } | null = null;

  for (const e of splitTraces(trace)) {
    if (e.ok) continue;
    if (!best) {
      best = e;
      continue;
    }
    // prefer further end
    if (e.end > best.end) {
      best = e;
      continue;
    }
    // on a tie, prefer deeper
    if (e.end === best.end && e.depth > best.depth) {
      best = e;
    }
  }

  if (!best) return null;
  const pos = best.end;
  return expandTokenFromPos(inputText, pos);
}

function findTrailingInput(
  trace: TraceHistory,
  inputLength: number,
): { start: number; end: number } | null {
  let topLevelEnd = -1;
  for (let i = 0; i < trace.length; i += 4) {
    const ruleId = trace[i];
    const depth = trace[i + 1];
    const end = trace[i + 3];
    if (ruleId >= 0 && depth === 0 && end > topLevelEnd) {
      topLevelEnd = end;
    }
  }

  if (topLevelEnd < 0 || topLevelEnd >= inputLength) return null;
  return { start: topLevelEnd, end: inputLength - 1 };
}

function splitTraces(
  trace: TraceHistory,
): { ok: boolean; depth: number; start: number; end: number }[] {
  const result: {
    ok: boolean;
    depth: number;
    start: number;
    end: number;
  }[] = [];
  for (let i = 0; i < trace.length; i += 4) {
    result.push({
      ok: trace[i] >= 0,
      depth: trace[i + 1],
      start: trace[i + 2],
      end: trace[i + 3],
    });
  }
  return result;
}

function extractOffsetFromLineColumn(
  inputText: string,
  line: number,
  column: number,
): number {
  const targetLine = Math.max(1, line);
  const targetColumn = Math.max(1, column);

  let currentLine = 1;
  let i = 0;
  while (i < inputText.length && currentLine < targetLine) {
    if (inputText[i] === "\n") {
      currentLine += 1;
    }
    i += 1;
  }
  return Math.max(0, Math.min(i + targetColumn - 1, inputText.length));
}

function findRuleDefinitionRange(
  grammarText: string,
  ruleName: string,
): { start: number; end: number } | null {
  if (!ruleName) return null;

  const escapedRuleName = escapeRegExp(ruleName);
  const pattern = new RegExp(
    `(^|\\r?\\n)([ \\t]*)(${escapedRuleName})([ \\t]*)=`,
    "m",
  );
  const match = pattern.exec(grammarText);
  if (!match) {
    return null;
  }

  const prefix = match[1] ?? "";
  const indentation = match[2] ?? "";
  const name = match[3] ?? ruleName;
  const start = match.index + prefix.length + indentation.length;
  const end = start + Math.max(0, name.length - 1);
  return { start, end };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Do the best we can to try to guess the length of the "bad" token.
// This is hackish... but I think the experience is OK.
// An alternative would be not expanding, and just highlighting the first bad
// token.
function expandTokenFromPos(
  inputText: string,
  pos: number,
): { start: number; end: number } {
  if (pos < 0 || pos >= inputText.length) return { start: pos, end: pos };
  if (inputText[pos] == "\n" || inputText[pos] == "\r") {
    // newline? try to highlight char before to after
    return {
      start: Math.max(0, pos - 1),
      end: Math.min(inputText.length, pos + 1),
    };
  }
  if (!isTokenChar(inputText[pos])) return { start: pos, end: pos };

  let end = pos;
  while (end + 1 < inputText.length && isTokenChar(inputText[end + 1])) {
    end += 1;
  }
  return { start: pos, end };
}

function isTokenChar(ch: string): boolean {
  return /[A-Za-z0-9_$]/.test(ch);
}

export function highlightErrors(
  element: HTMLElement,
  error: { start: number; end: number } | null,
) {
  const text = element.textContent ?? "";
  const highlightName = `${element.id || "input"}-error`;

  const highlightRegistry = CSS.highlights;

  element.textContent = text;
  if (!highlightRegistry) {
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
    highlightRegistry.set(highlightName, new Highlight(domRange));
  }
}
