import { z } from 'zod';

export const CreateRoomSchema = z.object({
  name: z.string().min(1).default('My Meeting'),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
