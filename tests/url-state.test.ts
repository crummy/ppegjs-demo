import assert from "node:assert/strict";
import test from "node:test";

import { formatUrlHash, parseUrlState } from "../src/lib/url-state.ts";

test("parseUrlState reads selected example and scratch mode from hash", () => {
  assert.deepEqual(parseUrlState("#example=json&scratch=true&mode=trace"), {
    selectedExample: "json",
    scratchEnabled: true,
    outputMode: "trace",
  });
});

test("parseUrlState handles missing optional hash values", () => {
  assert.deepEqual(parseUrlState(""), {
    selectedExample: null,
    scratchEnabled: false,
    outputMode: "tree",
  });
});

test("parseUrlState falls back to tree for unknown output modes", () => {
  assert.deepEqual(parseUrlState("#example=url&mode=bad"), {
    selectedExample: "url",
    scratchEnabled: false,
    outputMode: "tree",
  });
});

test("formatUrlHash omits default values", () => {
  assert.equal(
    formatUrlHash({
      selectedExample: "url",
      scratchEnabled: false,
      outputMode: "tree",
    }),
    "#example=url",
  );
});

test("formatUrlHash includes non-default state", () => {
  assert.equal(
    formatUrlHash({
      selectedExample: "url",
      scratchEnabled: true,
      outputMode: "json",
    }),
    "#example=url&scratch=true&mode=json",
  );
});
