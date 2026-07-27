import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeScratchPayload,
  encodeScratchPayload,
} from "../src/lib/scratch-url.ts";

test("scratch payload encoding round-trips multiline grammar and input", async () => {
  const payload = {
    grammarText: "# relaxed json\nvalue = object / array / string\n",
    inputText: '{\n  "ok": true\n}\n',
  };

  const encoded = await encodeScratchPayload(payload);

  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(await decodeScratchPayload(encoded), payload);
});

test("scratch payload decoding returns null for invalid data", async () => {
  assert.equal(await decodeScratchPayload("not valid!"), null);
  assert.equal(await decodeScratchPayload("bm90LWd6aXA"), null);
  assert.equal(await decodeScratchPayload(null), null);
});
