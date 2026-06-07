import { z } from 'zod';

export const GetMessagesSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type GetMessagesInput = z.infer<typeof GetMessagesSchema>;
