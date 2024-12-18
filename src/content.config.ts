import {defineCollection, z} from 'astro:content';
import {glob} from "astro/loaders";

// TODO: convert to markdown, if astro is happy with multiple files in a single markdown file - easier to do titles too
export const examples = defineCollection({
    loader: glob({pattern: "src/examples/*.json"}),
    // This schema ensures that the data read in the collection above is valid, by parsing it with Zod
    schema: z.object({
        title: z.string(),
        grammar: z.string(),
        input: z.string(),
        highlighted: z.boolean().optional()
    })
});

export const collections = {examples};