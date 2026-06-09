import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  joinMeeting,
  leaveMeeting,
  toggleMute,
  toggleCamera,
  toggleHandRaise,
  setMuted,
  setCameraOff,
  setHost,
} from '@/store/slices/meetingSlice';
import {
  setParticipants,
  addParticipant,
  removeParticipant,
  updateParticipant,
  transferHost,
  resetParticipants,
} from '@/store/slices/participantsSlice';
import { resetChat } from '@/store/slices/chatSlice';
import { meetingService } from '@/services/meeting.service';
import { SocketEvents } from '@/types';
import type { Participant } from '@/types';
import { useMedia } from '@/hooks/useMedia';
import { useSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useChat } from '@/hooks/useChat';
import { VideoGrid } from '@/components/meeting/VideoGrid';
import { Controls } from '@/components/meeting/Controls';
import { ParticipantsPanel } from '@/components/meeting/ParticipantsPanel';
import { ChatPanel } from '@/components/chat/ChatPanel';

interface SocketParticipant {
  userId: string;
  name: string;
  avatar?: string | null;
  socketId: string;
}

function toParticipant(
  sp: SocketParticipant,
  roomId: string,
  hostId: string,
): Participant {
  return {
    id: sp.userId,
    userId: sp.userId,
    roomId,
    role: sp.userId === hostId ? 'host' : 'guest',
    joinedAt: new Date().toISOString(),
    user: { id: sp.userId, name: sp.name, avatar: sp.avatar ?? undefined },
    socketId: sp.socketId,
    isAudioEnabled: true,
    isVideoEnabled: true,
    isHandRaised: false,
    isScreenSharing: false,
  };
}

export default function MeetingRoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const lobbyState = location.state as { isMuted?: boolean; isCameraOff?: boolean } | null;
  const initialAudioEnabled = !(lobbyState?.isMuted ?? false);
  const initialVideoEnabled = !(lobbyState?.isCameraOff ?? false);
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user)!;
  const participants = useAppSelector((s) => s.participants.participants);
  const isHandRaised = useAppSelector((s) => s.meeting.isHandRaised);

  const roomRef = useRef<{ id: string; hostId: string } | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    muteAudio,
    unmuteAudio,
    disableVideo,
    enableVideo,
    startScreenShare,
    stopScreenShare,
  } = useMedia({ initialAudioEnabled, initialVideoEnabled });

  const socket = useSocket(code!);
  const { remoteStreams } = useWebRTC(socket, localStream);
  const { sendMessage, setTyping } = useChat(socket, roomId);

  useEffect(() => {
    if (!code) return;
    meetingService
      .getRoomByCode(code)
      .then(({ room }) => {
        roomRef.current = { id: room.id, hostId: room.hostId };
        setRoomId(room.id);
        dispatch(joinMeeting({ roomCode: room.code, roomName: room.name, roomId: room.id, hostId: room.hostId }));
        if (!initialAudioEnabled) dispatch(setMuted(true));
        if (!initialVideoEnabled) dispatch(setCameraOff(true));
      })
      .catch(() => navigate('/dashboard', { replace: true }));

    return () => {
      dispatch(leaveMeeting());
      dispatch(resetParticipants());
      dispatch(resetChat());
    };
  }, [code, dispatch, navigate]);

  useEffect(() => {
    if (!socket) return;

    const onParticipantList = ({ participants: list }: { participants: SocketParticipant[] }) => {
      const room = roomRef.current;
      if (!room) return;
      dispatch(setParticipants(list.map((p) => toParticipant(p, room.id, room.hostId))));
      // Tell the room about our initial media state if different from defaults so
      // other participants' tiles and the host panel show the correct icons.
      if (!initialAudioEnabled || !initialVideoEnabled) {
        socket.emit(SocketEvents.MEDIA_STATE_CHANGED, {
          isAudioEnabled: initialAudioEnabled,
          isVideoEnabled: initialVideoEnabled,
        });
      }
    };

    const onUserJoined = (sp: SocketParticipant) => {
      const room = roomRef.current;
      if (!room) return;
      dispatch(addParticipant(toParticipant(sp, room.id, room.hostId)));
    };

    const onUserLeft = ({ userId }: { userId: string; socketId: string }) => {
      dispatch(removeParticipant(userId));
    };

    const onHandRaised = ({ userId }: { userId: string }) => {
      dispatch(updateParticipant({ userId, isHandRaised: true }));
    };

    const onHandLowered = ({ userId }: { userId: string }) => {
      dispatch(updateParticipant({ userId, isHandRaised: false }));
    };

    const onYouWereMuted = () => {
      muteAudio();
      dispatch(setMuted(true));
      toast.info('You were muted by the host');
    };

    const onYouWereUnmuted = () => {
      unmuteAudio();
      dispatch(setMuted(false));
      toast.info('You were unmuted by the host');
    };

    const onYourVideoWasDisabled = () => {
      disableVideo();
      dispatch(setCameraOff(true));
      toast.info('Your camera was turned off by the host');
    };

    const onYourVideoWasEnabled = () => {
      enableVideo();
      dispatch(setCameraOff(false));
      toast.info('Your camera was turned on by the host');
    };

    const onYouWereRemoved = () => {
      toast.error('You were removed from the meeting');
      navigate('/dashboard', { replace: true });
    };

    const onHostChanged = ({ newHostUserId }: { newHostUserId: string }) => {
      dispatch(transferHost({ newHostUserId }));
      dispatch(setHost(newHostUserId));
    };

    const onParticipantStateUpdated = (
      update: { userId: string; isAudioEnabled?: boolean; isVideoEnabled?: boolean },
    ) => {
      dispatch(updateParticipant(update));
    };

    socket.on(SocketEvents.PARTICIPANT_LIST, onParticipantList);
    socket.on(SocketEvents.USER_JOINED, onUserJoined);
    socket.on(SocketEvents.USER_LEFT, onUserLeft);
    socket.on(SocketEvents.HAND_RAISED, onHandRaised);
    socket.on(SocketEvents.HAND_LOWERED, onHandLowered);
    socket.on(SocketEvents.YOU_WERE_MUTED, onYouWereMuted);
    socket.on(SocketEvents.YOU_WERE_UNMUTED, onYouWereUnmuted);
    socket.on(SocketEvents.YOUR_VIDEO_WAS_DISABLED, onYourVideoWasDisabled);
    socket.on(SocketEvents.YOUR_VIDEO_WAS_ENABLED, onYourVideoWasEnabled);
    socket.on(SocketEvents.YOU_WERE_REMOVED, onYouWereRemoved);
    socket.on(SocketEvents.HOST_CHANGED, onHostChanged);
    socket.on(SocketEvents.PARTICIPANT_STATE_UPDATED, onParticipantStateUpdated);

    return () => {
      socket.off(SocketEvents.PARTICIPANT_LIST, onParticipantList);
      socket.off(SocketEvents.USER_JOINED, onUserJoined);
      socket.off(SocketEvents.USER_LEFT, onUserLeft);
      socket.off(SocketEvents.HAND_RAISED, onHandRaised);
      socket.off(SocketEvents.HAND_LOWERED, onHandLowered);
      socket.off(SocketEvents.YOU_WERE_MUTED, onYouWereMuted);
      socket.off(SocketEvents.YOU_WERE_UNMUTED, onYouWereUnmuted);
      socket.off(SocketEvents.YOUR_VIDEO_WAS_DISABLED, onYourVideoWasDisabled);
      socket.off(SocketEvents.YOUR_VIDEO_WAS_ENABLED, onYourVideoWasEnabled);
      socket.off(SocketEvents.YOU_WERE_REMOVED, onYouWereRemoved);
      socket.off(SocketEvents.HOST_CHANGED, onHostChanged);
      socket.off(SocketEvents.PARTICIPANT_STATE_UPDATED, onParticipantStateUpdated);
    };
  }, [socket, dispatch, navigate, muteAudio, unmuteAudio, disableVideo, enableVideo]);

  const handleToggleAudio = () => {
    toggleAudio();
    dispatch(toggleMute());
    socket?.emit(SocketEvents.MEDIA_STATE_CHANGED, { isAudioEnabled: !isAudioEnabled });
  };

  const handleToggleVideo = () => {
    toggleVideo();
    dispatch(toggleCamera());
    socket?.emit(SocketEvents.MEDIA_STATE_CHANGED, { isVideoEnabled: !isVideoEnabled });
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  const handleToggleRaiseHand = () => {
    if (!socket) return;
    if (isHandRaised) {
      socket.emit(SocketEvents.LOWER_HAND);
    } else {
      socket.emit(SocketEvents.RAISE_HAND);
    }
    dispatch(toggleHandRaise());
  };

  const handleLeave = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <VideoGrid
            localStream={localStream}
            localUser={user}
            isLocalAudioEnabled={isAudioEnabled}
            isLocalVideoEnabled={isVideoEnabled}
            isLocalHandRaised={isHandRaised}
            remoteStreams={remoteStreams}
            participants={participants}
          />
        </div>
        <ParticipantsPanel socket={socket} />
        <ChatPanel onSend={sendMessage} onTyping={setTyping} />
      </div>

      <Controls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleRaiseHand={handleToggleRaiseHand}
        onLeave={handleLeave}
      />
    </div>
  );
}
