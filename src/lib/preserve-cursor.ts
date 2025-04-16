/**
 * When we enter grammar or input, we immediately overwrite the contents to apply highlighting.
 * But this causes us to lose cursor position. This function will restore it.
 */
export function preserveCursorPosition(
  element: HTMLElement,
  callback: () => void,
) {
  // Save current selection and cursor position
  const selection = window.getSelection();
  if (!selection?.rangeCount) {
    callback();
    return;
  }

  const range = selection.getRangeAt(0);
  const isInElement = element.contains(range.startContainer);

  // If the cursor is not in the element, just run the callback
  if (!isInElement) {
    callback();
    return;
  }

  // Store text offset information before modification
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = preCaretRange.toString().length;

  if (range.collapsed) {
    // Single cursor position
    callback();

    // Find the position to place the caret
    const newTextNode = findTextNodeAtOffset(element, startOffset);
    if (newTextNode) {
      const newRange = document.createRange();
      newRange.setStart(newTextNode.node, newTextNode.offset);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  } else {
    // Text selection
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const endOffset = preCaretRange.toString().length;

    callback();

    // Find positions to place the selection
    const newStartNode = findTextNodeAtOffset(element, startOffset);
    const newEndNode = findTextNodeAtOffset(element, endOffset);

    if (newStartNode && newEndNode) {
      const newRange = document.createRange();
      newRange.setStart(newStartNode.node, newStartNode.offset);
      newRange.setEnd(newEndNode.node, newEndNode.offset);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }
}

// Helper function to find text node at a specific character offset
function findTextNodeAtOffset(rootNode: HTMLElement, targetOffset: number) {
  let currentOffset = 0;
  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    null,
  );

  let node;
  while ((node = walker.nextNode())) {
    if (!node.nodeValue) return null;
    const nodeLength = node.nodeValue.length;

    if (
      currentOffset <= targetOffset &&
      targetOffset <= currentOffset + nodeLength
    ) {
      return {
        node: node,
        offset: targetOffset - currentOffset,
      };
    }

    currentOffset += nodeLength;
  }

  return null;
}
