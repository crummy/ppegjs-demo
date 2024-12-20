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

import {defineCollection, z} from 'astro:content';
import fastGlob from "fast-glob";
import {promises as fs} from "node:fs";
import {ppeg} from "ppegjs";

const grammar = `
File = Fields _sep grammar _sep input
grammar = ~_sep+
input = ~_sep+
_sep = '---\\n'
Fields = (comment / field)+
field = key ':' _ value  '\\r'? '\\n'?
comment = '#' ~[\\r\\n]* '\\r'? '\\n'?
key = [a-zA-Z0-9_]+
value = ~[\\n]+
_ = [ \\t]*
`

type Field = [
    "field",
    ["key", string],
    ["value", string]
]

type PTree = [
    "File", [
        ["Fields", Field[]],
        ["grammar", string],
        ["input", string],
    ]
]

const parser = ppeg.compile(grammar);

export const examples = defineCollection({
    loader: async () => {
        // We shouldn't need fastGlob here, better to use import.meta.glob. But there's a bug:
        // https://github.com/withastro/astro/issues/12689
        const files = await fastGlob("src/examples/*.txt");
        const examples = files.map(async f => {
            const contents = await fs.readFile(f, "utf-8")
            const {ptree}: { ptree: PTree } = parser.parse(contents)
            const fields = Object.fromEntries(ptree[1][0][1].map(field => field[1]).map(([key, value]) => [key[1], value[1]]))
            const grammar = ptree[1][1][1]
            const input = ptree[1][2][1]
            return {
                ...fields,
                id: fields.title,
                highlighted: fields.highlighted == "true",
                grammar,
                input
            }
        });
        console.log("Parsing " + examples.length + " examples")
        return await Promise.all(examples);
    },
    // This schema ensures that the data read in the collection above is valid, by parsing it with Zod
    schema: z.object({
        title: z.string(),
        grammar: z.string(),
        input: z.string(),
        highlighted: z.boolean().optional()
    })
});

export const collections = {examples};