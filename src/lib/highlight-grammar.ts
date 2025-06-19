import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { MatchDecorator } from "@codemirror/view";
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";

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
      ) {
        this.decorations = grammarMatcher.updateDeco(update, this.decorations);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

// Utility to convert line/column to offset in a CodeMirror document
export function getOffsetFromLineCol(
  doc: string,
  line: number,
  column: number,
): number {
  const lines = doc.split(/\r?\n/);
  let offset = 0;
  for (let i = 0; i < line - 1; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  offset += column - 1;
  return offset;
}

// StateEffect to set error position
export const setGrammarError = StateEffect.define<
  { from: number; to: number } | null
>();

// StateField to store error position
export const grammarErrorField = StateField.define<
  { from: number; to: number } | null
>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setGrammarError)) return effect.value;
    }
    return value;
  },
});

// Plugin to highlight error position
export const grammarErrorHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }
    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const error = view.state.field(grammarErrorField, false);
      if (error) {
        builder.add(
          error.from,
          error.to,
          Decoration.mark({ class: "grammar-error-highlight" }),
        );
      }
      return builder.finish();
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged || update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(setGrammarError))
        )
      ) {
        this.decorations = this.buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
