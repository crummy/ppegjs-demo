// Local alias for parse tree metadata
type Metadata = any;

// TODO ideally we would be returning DOM elements, not a string
export function generateOutput(
  tree: Metadata,
  prefix = "",
  isLastChild = true,
  indent = 0,
): string {
  // Characters for drawing the tree
  const linePrefix = indent === 0 ? "" : prefix;

  // Root element doesn't need a prefix
  const nodeChar = indent === 0 ? "" : isLastChild ? "└─" : "├─";

  // Child indentation - vertical line with space for non-last items, just spaces for last items
  const childPrefix = isLastChild ? "  " : "│ ";

  // Node content - the rule name and value if available
  let nodeContent = "";
  if (!tree.error) {
    nodeContent = tree.rule;
    if (tree.match) {
      nodeContent += ` "${tree.match}"`;
    }
  } else {
    nodeContent = `🛑 ${tree.error.type}: ${tree.error.message}`;
  }

  // Add data attributes for highlighting via dataset
  const dataAttributes = ` data-rule="${tree.rule}"${
    tree.id ? ` data-matchid="${tree.id}"` : ""
  }`;

  // Create the node with its attributes
  let result = `${linePrefix}${nodeChar}<span class="node-label"${dataAttributes}>${nodeContent}</span>\n`;

  // Add children if they exist
  if (tree.children && tree.children.length > 0) {
    const newPrefix = prefix + childPrefix;

    // Process each child
    tree.children.forEach((child: any, index: number) => {
      const isLast = index === tree.children.length - 1;
      result += generateOutput(child, newPrefix, isLast, indent + 1);
    });
  }

  return result;
}

/**
 * Recursively find the first error location in a Metadata tree.
 * Returns { error, start, end, node } or null if none.
 */
export function findError(
  tree: Metadata,
): { error: any; end: number; start: number; node: Metadata } | null {
  let found: { error: any; end: number; start: number; node: Metadata } | null =
    null;
  function recurse(node: any) {
    if (found) return;
    if (node.error) {
      found = {
        error: node.error,
        end: node.end,
        start: node.start,
        node,
      };
      return;
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => recurse(child));
    }
  }
  recurse(tree);
  return found;
}
