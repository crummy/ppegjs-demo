type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const COMPACT_JSON_MAX_WIDTH = 80;
const COMPACT_JSON_INDENT = 2;

// We don't want all JSON on one line. But we don't want it to be one-node-per-
// line either. This finds a readable middle ground.
export function formatCompactJson(
  value: JsonValue,
  options: { maxWidth?: number; indent?: number } = {},
): string {
  const maxWidth = options.maxWidth ?? COMPACT_JSON_MAX_WIDTH;
  const indentSize = options.indent ?? COMPACT_JSON_INDENT;
  const indentUnit = " ".repeat(indentSize);

  function formatInline(node: JsonValue): string {
    if (Array.isArray(node)) {
      return `[${node.map(formatInline).join(", ")}]`;
    }

    if (node && typeof node === "object") {
      return `{${Object.entries(node)
        .map(([key, child]) => `${JSON.stringify(key)}: ${formatInline(child)}`)
        .join(", ")}}`;
    }

    return JSON.stringify(node);
  }

  function format(node: JsonValue, indent: string): string {
    const inline = formatInline(node);
    if (indent.length + inline.length <= maxWidth) {
      return inline;
    }

    if (Array.isArray(node)) {
      if (node.length === 0) {
        return "[]";
      }

      const childIndent = indent + indentUnit;
      const lines = node.map(
        (child) => `${childIndent}${format(child, childIndent)}`,
      );
      return `[\n${lines.join(",\n")}\n${indent}]`;
    }

    if (node && typeof node === "object") {
      const entries = Object.entries(node);
      if (entries.length === 0) {
        return "{}";
      }

      const childIndent = indent + indentUnit;
      const lines = entries.map(([key, child]) => {
        return `${childIndent}${JSON.stringify(key)}: ${format(child, childIndent)}`;
      });
      return `{\n${lines.join(",\n")}\n${indent}}`;
    }

    return inline;
  }

  return format(value, "");
}
