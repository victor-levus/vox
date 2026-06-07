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
