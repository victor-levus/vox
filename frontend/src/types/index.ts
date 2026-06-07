export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  host: Pick<User, 'id' | 'name' | 'avatar'>;
  isActive: boolean;
  createdAt: string;
}

export interface Participant {
  id: string;
  userId: string;
  roomId: string;
  role: 'host' | 'guest';
  joinedAt: string;
  leftAt?: string;
  user: Pick<User, 'id' | 'name' | 'avatar'>;
  socketId?: string;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isHandRaised?: boolean;
  isScreenSharing?: boolean;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  sender: Pick<User, 'id' | 'name' | 'avatar'>;
  content: string;
  type: 'text' | 'file';
  createdAt: string;
}

export interface Invitation {
  id: string;
  roomId: string;
  room: Pick<Room, 'id' | 'code' | 'name'>;
  invitedEmail: string;
  token: string;
  expiresAt: string;
  accepted: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export const SocketEvents = {
  // Room
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  PARTICIPANT_LIST: 'participant-list',

  // WebRTC Signaling
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',

  // Chat
  SEND_MESSAGE: 'send-message',
  NEW_MESSAGE: 'new-message',
  TYPING: 'typing',
  STOP_TYPING: 'stop-typing',
  USER_TYPING: 'user-typing',
  USER_STOP_TYPING: 'user-stop-typing',

  // Reactions
  REACTION: 'reaction',
  RAISE_HAND: 'raise-hand',
  LOWER_HAND: 'lower-hand',

  // Host controls
  MUTE_PARTICIPANT: 'mute-participant',
  REMOVE_PARTICIPANT: 'remove-participant',
  TRANSFER_HOST: 'transfer-host',

  // Screen share
  SCREEN_SHARE_STARTED: 'screen-share-started',
  SCREEN_SHARE_STOPPED: 'screen-share-stopped',

  // Recording
  RECORDING_STARTED: 'recording-started',
  RECORDING_STOPPED: 'recording-stopped',
} as const;
