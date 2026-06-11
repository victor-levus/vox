import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { GuestJoinSchema, LoginSchema, RegisterSchema } from './auth.schema';
import * as authService from './auth.service';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts, please try again later.' },
});

const router = Router();

router.post(
  '/register',
  registerLimiter,
  validate(RegisterSchema),
  asyncHandler(async (req, res) => {
    const user = await authService.register(req.body as Parameters<typeof authService.register>[0], req.session);
    res.status(201).json({ user });
  }),
);

router.post(
  '/login',
  loginLimiter,
  validate(LoginSchema),
  asyncHandler(async (req, res) => {
    const user = await authService.login(req.body as Parameters<typeof authService.login>[0], req.session);
    res.json({ user });
  }),
);

router.post(
  '/guest-join',
  validate(GuestJoinSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.guestJoin(
      req.body as Parameters<typeof authService.guestJoin>[0],
      req.session,
    );
    res.json(result);
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
