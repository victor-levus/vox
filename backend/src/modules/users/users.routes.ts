import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ChangePasswordSchema, UpdateProfileSchema } from './users.schema';
import * as usersService from './users.service';

const router = Router();

router.get(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await usersService.getProfile(req.session.userId!);
    res.json({ user });
  }),
);

router.put(
  '/profile',
  requireAuth,
  validate(UpdateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await usersService.updateProfile(
      req.session.userId!,
      req.body as Parameters<typeof usersService.updateProfile>[1],
    );
    res.json({ user });
  }),
);

router.put(
  '/password',
  requireAuth,
  validate(ChangePasswordSchema),
  asyncHandler(async (req, res) => {
    await usersService.changePassword(
      req.session.userId!,
      req.body as Parameters<typeof usersService.changePassword>[1],
    );
    res.json({ message: 'Password updated' });
  }),
);

router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const users = await usersService.searchUsers(q);
    res.json({ users });
  }),
);

export default router;
