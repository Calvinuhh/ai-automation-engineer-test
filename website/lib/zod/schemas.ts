import { z } from 'zod';

export const listicleStatusSchema = z.enum(['pending', 'completed', 'failed']);

export const createListicleSchema = z.object({
  productUrl: z.url({ message: 'Invalid product URL' }).max(2048),
  referenceUrl: z.url({ message: 'Invalid reference URL' }).max(2048),
  sessionToken: z.string().min(1, 'Session token is required').max(255),
});

export const n8nOutputSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  sections: z.array(
    z.object({
      heading: z.string(),
      content: z.string(),
      imageUrl: z.url().optional(),
      videoUrl: z.url().optional(),
    })
  ),
  cta: z.object({
    text: z.string(),
    url: z.url(),
  }),
});

export const n8nCallbackSchema = z.object({
  listicleId: z.number(),
  html: z.string().min(1),
  status: z.enum(['completed', 'failed']),
  errorMessage: z.string().optional(),
});

export type CreateListicleInput = z.infer<typeof createListicleSchema>;
export type N8nOutput = z.infer<typeof n8nOutputSchema>;
export type N8nCallbackInput = z.infer<typeof n8nCallbackSchema>;
export type ListicleStatus = z.infer<typeof listicleStatusSchema>;
