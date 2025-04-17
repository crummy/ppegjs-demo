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

    eventHandlers: {
      mouseover: (e, view) => {
        const target = e.target as HTMLElement | null;
        const rule = target?.closest<HTMLElement>("[data-rule]")?.dataset.rule;
        if (rule) {
          document
            .querySelectorAll(
              `#grammar [data-rule='${rule}'], #output [data-rule='${rule}'], #input [data-rule='${rule}']`,
            )
            .forEach((el) => el.classList.add("highlighted"));
          return true;
        }
      },
      mouseout: (e, view) => {
        const target = e.target as HTMLElement | null;
        const rule = target?.closest<HTMLElement>("[data-rule]")?.dataset.rule;
        if (rule) {
          document
            .querySelectorAll(
              `#grammar [data-rule='${rule}'], #output [data-rule='${rule}'], #input [data-rule='${rule}']`,
            )
            .forEach((el) => el.classList.remove("highlighted"));
          return true;
        }
      },
    },
  },
);
