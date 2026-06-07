import api from './api';
import type { Room, Message, Invitation } from '@/types';

export const meetingService = {
  createRoom: (name?: string) =>
    api.post<{ room: Room }>('/rooms', { name }).then((r) => r.data),

  getRoomByCode: (code: string) =>
    api.get<{ room: Room }>(`/rooms/${code}`).then((r) => r.data),

  getMyRooms: () =>
    api.get<{ rooms: Room[] }>('/rooms/my').then((r) => r.data),

  endRoom: (id: string) =>
    api.delete(`/rooms/${id}`).then((r) => r.data),

  getRoomMessages: (roomId: string, cursor?: string) =>
    api
      .get<{ messages: Message[] }>(`/rooms/${roomId}/messages`, {
        params: { cursor },
      })
      .then((r) => r.data),

  createInvitations: (roomId: string, emails: string[], sendEmail: boolean) =>
    api
      .post<{ invitations: Invitation[] }>('/invitations', { roomId, emails, sendEmail })
      .then((r) => r.data),

  resolveInvitation: (token: string) =>
    api.get<{ invitation: Invitation }>(`/invitations/${token}`).then((r) => r.data),

  acceptInvitation: (token: string) =>
    api
      .post<{ roomCode: string }>(`/invitations/${token}/accept`)
      .then((r) => r.data),
};
