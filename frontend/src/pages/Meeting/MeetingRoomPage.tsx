import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { joinMeeting, leaveMeeting, toggleMute, toggleCamera } from '@/store/slices/meetingSlice';
import {
  setParticipants,
  addParticipant,
  removeParticipant,
  resetParticipants,
} from '@/store/slices/participantsSlice';
import { meetingService } from '@/services/meeting.service';
import { SocketEvents } from '@/types';
import type { Participant } from '@/types';
import { useMedia } from '@/hooks/useMedia';
import { useSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoGrid } from '@/components/meeting/VideoGrid';
import { Controls } from '@/components/meeting/Controls';
import { ParticipantsPanel } from '@/components/meeting/ParticipantsPanel';

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
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user)!;
  const participants = useAppSelector((s) => s.participants.participants);

  const roomRef = useRef<{ id: string; hostId: string } | null>(null);

  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useMedia();

  const socket = useSocket(code!);
  const { remoteStreams } = useWebRTC(socket, localStream);

  useEffect(() => {
    if (!code) return;
    meetingService
      .getRoomByCode(code)
      .then(({ room }) => {
        roomRef.current = { id: room.id, hostId: room.hostId };
        dispatch(joinMeeting({ roomCode: room.code, roomName: room.name, roomId: room.id }));
      })
      .catch(() => navigate('/dashboard', { replace: true }));

    return () => {
      dispatch(leaveMeeting());
      dispatch(resetParticipants());
    };
  }, [code, dispatch, navigate]);

  useEffect(() => {
    if (!socket) return;

    const onParticipantList = ({ participants: list }: { participants: SocketParticipant[] }) => {
      const room = roomRef.current;
      if (!room) return;
      dispatch(setParticipants(list.map((p) => toParticipant(p, room.id, room.hostId))));
    };

    const onUserJoined = (sp: SocketParticipant) => {
      const room = roomRef.current;
      if (!room) return;
      dispatch(addParticipant(toParticipant(sp, room.id, room.hostId)));
    };

    const onUserLeft = ({ userId }: { userId: string; socketId: string }) => {
      dispatch(removeParticipant(userId));
    };

    socket.on(SocketEvents.PARTICIPANT_LIST, onParticipantList);
    socket.on(SocketEvents.USER_JOINED, onUserJoined);
    socket.on(SocketEvents.USER_LEFT, onUserLeft);

    return () => {
      socket.off(SocketEvents.PARTICIPANT_LIST, onParticipantList);
      socket.off(SocketEvents.USER_JOINED, onUserJoined);
      socket.off(SocketEvents.USER_LEFT, onUserLeft);
    };
  }, [socket, dispatch]);

  const handleToggleAudio = () => {
    toggleAudio();
    dispatch(toggleMute());
  };

  const handleToggleVideo = () => {
    toggleVideo();
    dispatch(toggleCamera());
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      await startScreenShare();
    }
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
            remoteStreams={remoteStreams}
            participants={participants}
          />
        </div>
        <ParticipantsPanel />
      </div>

      <Controls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onLeave={handleLeave}
      />
    </div>
  );
}
