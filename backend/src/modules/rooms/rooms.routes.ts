import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { CreateRoomSchema } from './rooms.schema';
import * as roomsService from './rooms.service';

const router = Router();

router.post(
  '/',
  requireAuth,
  validate(CreateRoomSchema),
  asyncHandler(async (req, res) => {
    const room = await roomsService.createRoom(
      req.session.userId!,
      req.body as Parameters<typeof roomsService.createRoom>[1],
    );
    res.status(201).json({ room });
  }),
);

router.get(
  '/my',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rooms = await roomsService.getMyRooms(req.session.userId!);
    res.json({ rooms });
  }),
);

router.get(
  '/:code/preview',
  asyncHandler(async (req, res) => {
    const { code } = req.params as { code: string };
    const room = await roomsService.getRoomPreview(code);
    res.json({ room });
  }),
);

router.get(
  '/:code',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { code } = req.params as { code: string };
    const room = await roomsService.getRoomByCode(code);
    res.json({ room });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const room = await roomsService.endRoom(id, req.session.userId!);
    res.json({ room });
  }),
);

export default router;
