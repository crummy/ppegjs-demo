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
