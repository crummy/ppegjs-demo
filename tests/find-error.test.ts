import assert from "node:assert/strict";
import test from "node:test";

import peg from "ppegjs/pPEG.mjs";
import { findError } from "../src/lib/generate-output.ts";

const jsonGrammar = String.raw`
json   = _ value _
value  =  Str / Arr / Obj / num / lit
Obj    = '{'_ (memb (_','_ memb)*)? _'}'
memb   = Str _':'_ value
Arr    = '['_ (value (_','_ value)*)? _']'
Str    = '"' chars* '"'
chars  = ~[\u0000-\u001F"\]+ / '\' esc
esc    = ["\/bfnrt] / 'u' [0-9a-fA-F]*4
num    = _int _frac? _exp?
_int   = '-'? ([1-9] [0-9]* / '0')
_frac  = '.' [0-9]+
_exp   = [eE] [+-]? [0-9]+
lit    = 'true' / 'false' / 'null'
_      = [ \t\n\r]*
`;

test("findError highlights the inner array error for the malformed JSON example", () => {
  const input = `{
    "answer": 42,
    "mixed": [,
}`;

  const parser = peg.compile(jsonGrammar);
  assert.equal(parser.ok, true);

  const parsed = parser.parse(input);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.line, 3);
  assert.equal(parsed.error.column, 15);
  assert.equal(parsed.error.found.startsWith(","), true);

  const errorRange = findError(parsed.trace_history, input.length, input);
  const badComma = input.indexOf(",", input.indexOf("["));

  assert.deepEqual(errorRange, {
    start: badComma,
    end: badComma,
  });
  assert.equal(input.slice(errorRange.start, errorRange.end + 1), ",");
});

test("findError still highlights unconsumed suffixes after successful top-level parses", () => {
  const parser = peg.compile("start = 'a'");
  assert.equal(parser.ok, true);

  const input = "ab";
  const parsed = parser.parse(input);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.type, "incomplete_parse");

  assert.deepEqual(findError(parsed.trace_history, input.length, input), {
    start: 1,
    end: 1,
  });
});
