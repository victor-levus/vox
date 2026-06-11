import { z } from 'zod';

export const RegisterSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const GuestJoinSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    organisation: z.string().max(100).optional(),
    inviteToken: z.string().optional(),
    roomCode: z.string().optional(),
  })
  .refine((d) => d.inviteToken || d.roomCode, {
    message: 'Either inviteToken or roomCode is required',
  });

export type GuestJoinInput = z.infer<typeof GuestJoinSchema>;
