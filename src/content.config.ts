/**
 * This file parses our examples from the filesystem and provides them to Astro.
 *
 * As a dogfooding exercise, the examples are parsed using our pPEG parser.
 * Examples are expected to be in src/examples, in this format:
 *
 * title: Example Title
 * ---
 * (grammar)
 * ---
 * (input)
 */

import { defineCollection, z } from "astro:content";
import fastGlob from "fast-glob";
import { promises as fs } from "node:fs";
import { ppeg } from "ppegjs";

const grammar = `
File    = Fields _sep grammar _sep input
grammar = _line*
input   = _ln*
Fields  = (field / comment)*
comment = '#' _ln
field   = key ':' _ value _
key     = [a-zA-Z0-9_]+
value   = ~[\\n\\r]*
_sep    = '---' _ln
_line   = !'---' _ln
_ln     = ~[\\n\\r]* _
_       = [ \\t\\n\\r]*
`;

type Field = ["field", ["key", string], ["value", string]];

type PTree = [
	"File",
	[["Fields", Field[]], ["grammar", string], ["input", string]],
];

const parser = ppeg.compile(grammar);

export const examples = defineCollection({
	loader: async () => {
		// We shouldn't need fastGlob here, better to use import.meta.glob. But there's a bug:
		// https://github.com/withastro/astro/issues/12689
		const files = await fastGlob("src/examples/*.txt");
		const examples = files.map(async (f) => {
			const contents = await fs.readFile(f, "utf-8");
			const { ptree }: { ptree: PTree } = parser.parse(contents);
			const transform = {
				File: obj,
				Fields: obj,
			};
			const { grammar, input, Fields } = translate(ptree, transform)[1];
			return {
				grammar,
				input,
				...Fields,
				id: Fields.title,
				highlighted: Fields.highlighted === "true",
			};
		});
		console.log(`Parsing ${examples.length} examples`);
		return await Promise.all(examples);
	},
	// This schema ensures that the data read in the collection above is valid, by parsing it with Zod
	schema: z.object({
		title: z.string(),
		grammar: z.string(),
		input: z.string(),
		highlighted: z.boolean().optional(),
	}),
});

// TODO add types to these functions
function translate(tree, transform) {
	const [id, val] = tree;
	const fn = transform[id];
	if (fn) return fn(tree, transform);
	if (typeof val === "string") return tree;
	const result = [];
	for (let i = 0; i < val.length; i += 1) {
		result.push(translate(val[i], transform));
	}
	return [id, result];
}

function obj(tree, transform) {
	// expect child arr
	const [id, val] = tree;
	if (typeof val === "string") return { id: val };
	const result = {};
	for (let i = 0; i < val.length; i += 1) {
		const [k, w] = translate(val[i], transform);
		if (typeof w === "string") {
			result[k] = w;
		} else if (Array.isArray(w) && w.length == 2) {
			const [[_key, key], [_val, val]] = w;
			result[key] = val;
		} else {
			// err
			result[k] = w;
		}
	}
	return [id, result];
}

export const collections = { examples };
