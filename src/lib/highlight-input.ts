import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { type Metadata } from "ppegjs";
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";

export const metadataChange = StateEffect.define<Metadata | null>();

export const metadataField = StateField.define<Metadata | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(metadataChange)) {
        return effect.value; // Replace with new metadata
      }
    }
    return value;
  },
});

export function updateMetadata(view: EditorView, metadata: Metadata) {
  view.dispatch({
    effects: metadataChange.of(metadata),
  });
}

export const inputHighlightsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();

      // Get the metadata from the state
      const metadata = view.state.field(metadataField);

      // Process all metadata items
      this.processMetadataItems(metadata, builder);

      return builder.finish();
    }

    // Recursive function to process metadata items and their children
    processMetadataItems(
      item: Metadata | null,
      builder: RangeSetBuilder<Decoration>,
    ) {
      if (!item) return;
      // Create a decoration for this metadata item
      builder.add(
        item.start,
        item.end,
        Decoration.mark({
          attributes: {
            "data-rule": item.rule,
            "data-matchid": String(item.id),
          },
        }),
      );

      // Process children recursively
      item.children
        .sort((a, b) => a.start - b.start)
        .forEach((child) => this.processMetadataItems(child, builder));
    }

    update(update: ViewUpdate) {
      // Check if metadata was updated
      const metadataUpdated = update.transactions.some((tr) =>
        tr.effects.some((e) => e.is(metadataChange))
      );

      if (metadataUpdated) {
        // Rebuild all decorations if metadata changed
        this.decorations = this.buildDecorations(update.view);
      } else if (update.docChanged) {
        // Map decorations through document changes
        this.decorations = this.decorations.map(update.changes);
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
export const setInputError = StateEffect.define<
  { from: number; to: number } | null
>();

// StateField to store error position
export const inputErrorField = StateField.define<
  { from: number; to: number } | null
>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setInputError)) return effect.value;
    }
    return value;
  },
});

// Plugin to highlight error position
export const inputErrorHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }
    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const error = view.state.field(inputErrorField, false);
      if (error) {
        builder.add(
          error.from,
          error.to,
          Decoration.mark({ class: "input-error-highlight" }),
        );
      }
      return builder.finish();
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(setInputError))
        )
      ) {
        this.decorations = this.buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
