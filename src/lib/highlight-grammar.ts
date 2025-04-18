import {
  EditorView,
  Decoration,
  type DecorationSet,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { MatchDecorator } from "@codemirror/view";

const grammarMatcher = new MatchDecorator({
  // Matches rule declaration pattern
  regexp: /^\s*(\w+)\s*=/gm,
  // Custom function to create decorations
  decorate: (add, from, to, match, view) => {
    // Calculate positions of just the variable name
    const startPos = match.index + match[0].indexOf(match[1]);
    const endPos = startPos + match[1].length;

    // Add decoration only around the variable name
    add(
      from + startPos,
      from + endPos,
      Decoration.mark({
        attributes: {
          "data-rule": match[1],
        },
      }),
    );
  },
});

export const grammarHighlightsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = grammarMatcher.createDeco(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        syntaxTree(update.startState) != syntaxTree(update.state)
      )
        this.decorations = grammarMatcher.updateDeco(update, this.decorations);
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
