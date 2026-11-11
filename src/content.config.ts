import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    location: z.string(),
    series: z.string().optional(),
    cover: z.string(),
    description: z.string(),
    // Allow events saved without a gallery — default to an empty list.
    photos: z.array(z.string()).default([]),
  }),
});

export const collections = { events };
