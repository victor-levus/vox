import { useCallback, useEffect, useRef, useState } from 'react';
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
  setRecording,
} from '@/store/slices/meetingSlice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRecording } from '@/hooks/useRecording';
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
import type { Reaction } from '@/components/meeting/ReactionOverlay';
import { useMedia } from '@/hooks/useMedia';
import { useSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useChat } from '@/hooks/useChat';
import { VideoGrid } from '@/components/meeting/VideoGrid';
import { Controls } from '@/components/meeting/Controls';
import { ParticipantsPanel } from '@/components/meeting/ParticipantsPanel';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { SettingsModal } from '@/components/meeting/SettingsModal';

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
  const [reactionsByUserId, setReactionsByUserId] = useState<Map<string, Reaction[]>>(() => new Map());
  const [showRecordConfirm, setShowRecordConfirm] = useState(false);

  const isRecording = useAppSelector((s) => s.meeting.isRecording);
  const hostId = useAppSelector((s) => s.meeting.hostId);
  const isHost = hostId === user.id;

  const {
    localStream,
    cameraStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    devices,
    activeVideoId,
    activeAudioId,
    toggleAudio,
    toggleVideo,
    muteAudio,
    unmuteAudio,
    disableVideo,
    enableVideo,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    switchMicrophone,
  } = useMedia({ initialAudioEnabled, initialVideoEnabled });

  const socket = useSocket(code!);
  const { remoteStreams } = useWebRTC(socket, localStream);
  const { sendMessage, setTyping } = useChat(socket, roomId);
  const { startRecording, stopRecording } = useRecording(localStream, remoteStreams);

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
      update: { userId: string; isAudioEnabled?: boolean; isVideoEnabled?: boolean; isScreenSharing?: boolean },
    ) => {
      dispatch(updateParticipant(update));
    };

    const onReaction = ({ emoji, userId: reactUserId }: { emoji: string; userId: string }) => {
      const id = `${Date.now()}-${Math.random()}`;
      setReactionsByUserId((prev) => {
        const next = new Map(prev);
        next.set(reactUserId, [...(next.get(reactUserId) ?? []), { id, emoji }]);
        return next;
      });
      setTimeout(() => {
        setReactionsByUserId((prev) => {
          const next = new Map(prev);
          next.set(reactUserId, (next.get(reactUserId) ?? []).filter((r) => r.id !== id));
          return next;
        });
      }, 3000);
    };

    const onRecordingStarted = () => dispatch(setRecording(true));
    const onRecordingStopped = () => dispatch(setRecording(false));

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
    socket.on(SocketEvents.REACTION, onReaction);
    socket.on(SocketEvents.RECORDING_STARTED, onRecordingStarted);
    socket.on(SocketEvents.RECORDING_STOPPED, onRecordingStopped);

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
      socket.off(SocketEvents.REACTION, onReaction);
      socket.off(SocketEvents.RECORDING_STARTED, onRecordingStarted);
      socket.off(SocketEvents.RECORDING_STOPPED, onRecordingStopped);
    };
  }, [socket, dispatch, navigate, muteAudio, unmuteAudio, disableVideo, enableVideo]);

  // Emit screen share events on state change (covers both manual toggle and browser native "Stop sharing")
  const isScreenSharingRef = useRef(false);
  useEffect(() => {
    if (isScreenSharingRef.current === isScreenSharing) return;
    const wasSharing = isScreenSharingRef.current;
    isScreenSharingRef.current = isScreenSharing;
    if (!wasSharing && isScreenSharing) {
      socket?.emit(SocketEvents.SCREEN_SHARE_STARTED);
    } else if (wasSharing && !isScreenSharing) {
      socket?.emit(SocketEvents.SCREEN_SHARE_STOPPED);
    }
  }, [isScreenSharing, socket]);

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

  const handleReact = useCallback((emoji: string) => {
    socket?.emit(SocketEvents.REACTION, { emoji });
  }, [socket]);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
      socket?.emit(SocketEvents.RECORDING_STOPPED);
    } else {
      setShowRecordConfirm(true);
    }
  };

  const handleConfirmRecording = () => {
    setShowRecordConfirm(false);
    startRecording();
    socket?.emit(SocketEvents.RECORDING_STARTED);
  };

  const handleLeave = () => {
    if (isRecording) {
      stopRecording();
      socket?.emit(SocketEvents.RECORDING_STOPPED);
    }
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
            isLocalScreenSharing={isScreenSharing}
            remoteStreams={remoteStreams}
            participants={participants}
            reactionsByUserId={reactionsByUserId}
          />
        </div>
        <ParticipantsPanel socket={socket} roomId={roomId ?? ''} roomCode={code!} />
        <ChatPanel onSend={sendMessage} onTyping={setTyping} />
      </div>

      <SettingsModal
        cameraStream={cameraStream}
        devices={devices}
        activeVideoId={activeVideoId}
        activeAudioId={activeAudioId}
        onSwitchCamera={switchCamera}
        onSwitchMicrophone={switchMicrophone}
      />

      <Dialog open={showRecordConfirm} onOpenChange={setShowRecordConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Recording</DialogTitle>
            <DialogDescription>
              Recording will be visible to all participants. The file will download to your device when you stop.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRecordConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRecording}>Start Recording</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Controls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isRecording={isRecording}
        isHost={isHost}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleRaiseHand={handleToggleRaiseHand}
        onToggleRecording={handleToggleRecording}
        onReact={handleReact}
        onLeave={handleLeave}
      />
    </div>
  );
}
