// record what the location of the cursor. probably just a single location but
// could in theory be a highlight.
export const getSelectionOffsets = (root: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const preRange = range.cloneRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.startContainer, range.startOffset);

  const start = preRange.toString().length;
  const length = range.toString().length;
  return { start, end: start + length };
};

// a lot of work just to restore the selection offsets from earlier
export const restoreSelectionOffsets = (
  root: HTMLElement,
  start: number,
  end: number
) => {
  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let current = 0;
  let startNode: Node | null = null;
  let endNode: Node | null = null;
  let startOffset = 0;
  let endOffset = 0;

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textLength = node.nodeValue?.length ?? 0;

    if (!startNode && current + textLength >= start) {
      startNode = node;
      startOffset = start - current;
    }

    if (current + textLength >= end) {
      endNode = node;
      endOffset = end - current;
      break;
    }

    current += textLength;
  }

  if (!startNode) {
    range.setStart(root, root.childNodes.length);
    range.setEnd(root, root.childNodes.length);
  } else {
    range.setStart(startNode, startOffset);
    range.setEnd(endNode ?? startNode, endNode ? endOffset : startOffset);
  }

  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
};
