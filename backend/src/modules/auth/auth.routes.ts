import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { LoginSchema, RegisterSchema } from './auth.schema';
import * as authService from './auth.service';

const router = Router();

router.post(
  '/register',
  validate(RegisterSchema),
  asyncHandler(async (req, res) => {
    const user = await authService.register(req.body as Parameters<typeof authService.register>[0], req.session);
    res.status(201).json({ user });
  }),
);

router.post(
  '/login',
  validate(LoginSchema),
  asyncHandler(async (req, res) => {
    const user = await authService.login(req.body as Parameters<typeof authService.login>[0], req.session);
    res.json({ user });
  }),
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await authService.logout(req.session);
    res.clearCookie('connect.sid').json({ message: 'Logged out' });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.session.userId!);
    res.json({ user });
  }),
);

export default router;
