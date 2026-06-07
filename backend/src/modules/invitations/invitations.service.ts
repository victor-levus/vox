import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/env';
import prisma from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import type { CreateInvitationInput } from './invitations.schema';

const INVITATION_TTL_DAYS = 7;

function expiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + INVITATION_TTL_DAYS);
  return d;
}

function buildTransport() {
  if (!config.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT ?? 587,
    auth: config.SMTP_USER
      ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
      : undefined,
  });
}

async function sendInviteEmail(
  to: string,
  inviterName: string,
  roomName: string,
  token: string,
): Promise<void> {
  const transport = buildTransport();
  if (!transport) return;

  const link = `${config.CLIENT_URL}/invite/${token}`;
  await transport.sendMail({
    from: config.SMTP_FROM ?? 'VideoCall <noreply@videocall.app>',
    to,
    subject: `${inviterName} invited you to "${roomName}"`,
    text: `Join the meeting: ${link}`,
    html: `<p>${inviterName} invited you to join <strong>${roomName}</strong>.</p><p><a href="${link}">Join Meeting</a></p>`,
  });
}

export async function createInvitations(data: CreateInvitationInput, hostId: string) {
  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
    select: { id: true, name: true, hostId: true, host: { select: { name: true } } },
  });
  if (!room) throw new AppError(404, 'Room not found');
  if (room.hostId !== hostId) throw new AppError(403, 'Only the host can send invitations');

  const invitations = await Promise.all(
    data.emails.map(email =>
      prisma.invitation.create({
        data: {
          roomId: room.id,
          invitedEmail: email,
          inviterId: hostId,
          token: uuidv4(),
          expiresAt: expiresAt(),
        },
      }),
    ),
  );

  if (data.sendEmail) {
    await Promise.allSettled(
      invitations.map(inv =>
        sendInviteEmail(inv.invitedEmail, room.host.name, room.name, inv.token),
      ),
    );
  }

  return invitations;
}

export async function resolveInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      room: { select: { id: true, code: true, name: true } },
      inviter: { select: { id: true, name: true, avatar: true } },
    },
  });

  if (!invitation) throw new AppError(404, 'Invitation not found');
  if (invitation.accepted) throw new AppError(410, 'Invitation already accepted');
  if (invitation.expiresAt < new Date()) throw new AppError(410, 'Invitation has expired');

  return invitation;
}

export async function acceptInvitation(token: string, userId: string) {
  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) throw new AppError(404, 'Invitation not found');
  if (invitation.accepted) throw new AppError(410, 'Invitation already accepted');
  if (invitation.expiresAt < new Date()) throw new AppError(410, 'Invitation has expired');

  await prisma.invitation.update({ where: { token }, data: { accepted: true } });

  const room = await prisma.room.findUnique({
    where: { id: invitation.roomId },
    select: { code: true },
  });

  return { roomCode: room!.code };
}
