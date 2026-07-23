import { z } from 'zod';

export const listicleStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export const createListicleSchema = z.object({
  productUrl: z.string().url('Invalid product URL'),
});

export const n8nOutputSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  sections: z.array(
    z.object({
      heading: z.string(),
      content: z.string(),
      imageUrl: z.string().url().optional(),
      videoUrl: z.string().url().optional(),
    })
  ),
  cta: z.object({
    text: z.string(),
    url: z.string().url(),
  }),
});

export type CreateListicleInput = z.infer<typeof createListicleSchema>;
export type N8nOutput = z.infer<typeof n8nOutputSchema>;
