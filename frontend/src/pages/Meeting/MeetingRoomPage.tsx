import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BsMicFill,
  BsMicMuteFill,
  BsCameraVideoFill,
  BsCameraVideoOffFill,
  BsTelephoneXFill,
} from 'react-icons/bs';
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
  const { isMuted, isCameraOff } = useAppSelector((s) => s.meeting);
  const participants = useAppSelector((s) => s.participants.participants);

  // Room metadata needed for participant role resolution in socket events
  const roomRef = useRef<{ id: string; hostId: string } | null>(null);

  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
  } = useMedia();

  const socket = useSocket(code!);
  const { remoteStreams } = useWebRTC(socket, localStream);

  // Fetch room and initialise meeting Redux state
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

  // Sync participant socket events → Redux participantsSlice
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

  const handleLeave = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* Video area */}
      <div className="min-h-0 flex-1">
        <VideoGrid
          localStream={localStream}
          localUser={user}
          isLocalAudioEnabled={isAudioEnabled}
          isLocalVideoEnabled={isVideoEnabled}
          remoteStreams={remoteStreams}
          participants={participants}
        />
      </div>

      {/* Minimal toolbar — full toolbar added in Step 19 */}
      <div className="flex shrink-0 items-center justify-center gap-3 bg-zinc-900 px-4 py-3">
        <button
          onClick={handleToggleAudio}
          title={isMuted ? 'Unmute' : 'Mute'}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
            isMuted
              ? 'bg-destructive text-white hover:bg-destructive/90'
              : 'bg-zinc-700 text-white hover:bg-zinc-600'
          }`}
        >
          {isMuted ? (
            <BsMicMuteFill className="h-5 w-5" />
          ) : (
            <BsMicFill className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={handleToggleVideo}
          title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
            isCameraOff
              ? 'bg-destructive text-white hover:bg-destructive/90'
              : 'bg-zinc-700 text-white hover:bg-zinc-600'
          }`}
        >
          {isCameraOff ? (
            <BsCameraVideoOffFill className="h-5 w-5" />
          ) : (
            <BsCameraVideoFill className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={handleLeave}
          title="Leave meeting"
          className="flex h-12 w-28 items-center justify-center gap-2 rounded-full bg-destructive text-white transition-colors hover:bg-destructive/90"
        >
          <BsTelephoneXFill className="h-4 w-4" />
          <span className="text-sm font-medium">Leave</span>
        </button>
      </div>
    </div>
  );
}
