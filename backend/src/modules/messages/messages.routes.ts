import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { GetMessagesSchema } from './messages.schema';
import type { GetMessagesInput } from './messages.schema';
import * as messagesService from './messages.service';

const router = Router();

router.get(
  '/rooms/:roomId/messages',
  requireAuth,
  validate(GetMessagesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { roomId } = req.params as { roomId: string };
    const { cursor, limit } = req.query as unknown as GetMessagesInput;
    const result = await messagesService.getRoomMessages(roomId, req.session.userId!, cursor, limit);
    res.json(result);
  }),
);

router.delete(
  '/messages/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    await messagesService.deleteMessage(id, req.session.userId!);
    res.status(204).end();
  }),
);

export default router;
