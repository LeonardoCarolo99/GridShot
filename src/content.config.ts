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
    // Decap may write list items as plain strings or {photo:...} objects — accept both.
    photos: z
      .array(
        z
          .union([
            z.string(),
            z.object({ photo: z.string() }),
            z.object({ image: z.string() }),
            z.object({ src: z.string() }),
          ])
          .transform((v) => (typeof v === 'string' ? v : (v.photo ?? v.image ?? v.src)))
      ),
  }),
});

export const collections = { events };
