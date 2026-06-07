import { z } from 'zod';

export const CreateInvitationSchema = z.object({
  roomId: z.string().min(1),
  emails: z.array(z.string().email()).min(1),
  sendEmail: z.boolean().default(false),
});

export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;
