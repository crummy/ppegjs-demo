import {defineCollection, z} from 'astro:content';


// Examples should be like this:
// examples/foo/grammar.txt
// examples/foo/input.txt
// TODO: convert to markdown, if astro is happy with multiple files in a single markdown file - easier to do titles too
export const examples = defineCollection({
    loader: async () => {
        // Would prefer to get a list of folders in the examples directory but Vite only seems to want to
        // grab files. So we get both and match them up, a little awkwardly.
        const grammars = import.meta.glob('./examples/**/grammar.txt', { query: "?raw", import: "default"})
        const inputs = import.meta.glob('./examples/**/input.txt', { query: "?raw", import: "default"})
        if (Object.keys(grammars).length !== Object.keys(inputs).length) {
            throw new Error('Mismatch between grammars and inputs')
        }
        const examples: { id: string, title: string, grammar: string, input: string }[] = []
        for (const [path, grammarFile] of Object.entries(grammars)) {
            const folder = path.split('/').slice(-2, -1)[0]
            const grammar = await grammarFile() as string
            // yuck...
            const input = await inputs[`./examples/${folder}/input.txt`]() as string
            examples.push({
                id: folder,
                title: folder,
                grammar,
                input,
            })
        }
        return examples;
    },
    // This schema ensures that the data read in the collection above is valid, by parsing it with Zod
    schema: z.object({
        title: z.string(),
        grammar: z.string(),
        input: z.string(),
    })
});

export const collections = {examples};