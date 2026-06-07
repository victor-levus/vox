import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { CreateInvitationSchema } from './invitations.schema';
import * as invitationsService from './invitations.service';

const router = Router();

router.post(
  '/',
  requireAuth,
  validate(CreateInvitationSchema),
  asyncHandler(async (req, res) => {
    const invitations = await invitationsService.createInvitations(
      req.body as Parameters<typeof invitationsService.createInvitations>[0],
      req.session.userId!,
    );
    res.status(201).json({ invitations });
  }),
);

router.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const { token } = req.params as { token: string };
    const invitation = await invitationsService.resolveInvitation(token);
    res.json({ invitation });
  }),
);

router.post(
  '/:token/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { token } = req.params as { token: string };
    const result = await invitationsService.acceptInvitation(token, req.session.userId!);
    res.json(result);
  }),
);

export default router;
