import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  BsXLg,
  BsMicFill,
  BsMicMuteFill,
  BsCameraVideoFill,
  BsCameraVideoOffFill,
  BsHandIndexFill,
  BsThreeDotsVertical,
  BsPersonPlus,
} from 'react-icons/bs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppDispatch, useAppSelector } from '@/store';
import { togglePanel } from '@/store/slices/participantsSlice';
import { SocketEvents } from '@/types';
import type { Participant } from '@/types';
import { InviteDialog } from './InviteDialog';

interface ParticipantsPanelProps {
  socket: Socket | null;
  roomId: string;
  roomCode: string;
}

export function ParticipantsPanel({ socket, roomId, roomCode }: ParticipantsPanelProps) {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.participants.isOpen);
  const participants = useAppSelector((s) => s.participants.participants);
  const isLoading = useAppSelector((s) => s.participants.isLoading);
  const currentUserId = useAppSelector((s) => s.auth.user?.id);
  const hostId = useAppSelector((s) => s.meeting.hostId);
  const isCurrentUserHost = hostId === currentUserId;

  const [inviteOpen, setInviteOpen] = useState(false);

  if (!isOpen) return null;

  const sorted = [...participants].sort((a, b) => {
    if (a.isHandRaised && !b.isHandRaised) return -1;
    if (!a.isHandRaised && b.isHandRaised) return 1;
    return 0;
  });

  return (
    <>
      <div className="absolute inset-0 z-30 flex flex-col bg-zinc-900 sm:relative sm:inset-auto sm:h-full sm:w-72 sm:shrink-0 sm:border-l sm:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            Participants ({participants.length})
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setInviteOpen(true)}
              title="Invite people"
              aria-label="Invite people"
              className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <BsPersonPlus className="h-4 w-4" />
            </button>
            <button
              onClick={() => dispatch(togglePanel())}
              title="Close participants panel"
              aria-label="Close participants panel"
              className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <BsXLg className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full bg-zinc-700" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-28 bg-zinc-700" />
                    <Skeleton className="h-2.5 w-16 bg-zinc-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            sorted.map((p) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                isCurrentUserHost={isCurrentUserHost}
                isSelf={p.userId === currentUserId}
                socket={socket}
              />
            ))
          )}
        </div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        roomId={roomId}
        roomCode={roomCode}
        isHost={isCurrentUserHost}
      />
    </>
  );
}

interface ParticipantRowProps {
  participant: Participant;
  isCurrentUserHost: boolean;
  isSelf: boolean;
  socket: Socket | null;
}

function ParticipantRow({ participant, isCurrentUserHost, isSelf, socket }: ParticipantRowProps) {
  const initials = participant.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleToggleAudio = () => {
    const event = participant.isAudioEnabled !== false
      ? SocketEvents.MUTE_PARTICIPANT
      : SocketEvents.UNMUTE_PARTICIPANT;
    socket?.emit(event, { targetUserId: participant.userId });
  };

  const handleToggleVideo = () => {
    const event = participant.isVideoEnabled !== false
      ? SocketEvents.DISABLE_PARTICIPANT_VIDEO
      : SocketEvents.ENABLE_PARTICIPANT_VIDEO;
    socket?.emit(event, { targetUserId: participant.userId });
  };

  const handleRemove = () => {
    socket?.emit(SocketEvents.REMOVE_PARTICIPANT, { targetUserId: participant.userId });
  };

  const handleTransferHost = () => {
    socket?.emit(SocketEvents.TRANSFER_HOST, { targetUserId: participant.userId });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-800">
      <div className="shrink-0">
        {participant.user.avatar ? (
          <img
            src={participant.user.avatar}
            alt={participant.user.name}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-white">
            {initials}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">{participant.user.name}</p>
        {participant.role === 'host' && (
          <p className="text-xs text-zinc-400">Host</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {participant.isHandRaised && (
          <BsHandIndexFill className="h-3.5 w-3.5 text-yellow-400" />
        )}
        {participant.isAudioEnabled !== false ? (
          <BsMicFill className="h-3.5 w-3.5 text-zinc-400" />
        ) : (
          <BsMicMuteFill className="h-3.5 w-3.5 text-destructive" />
        )}
        {participant.isVideoEnabled !== false ? (
          <BsCameraVideoFill className="h-3.5 w-3.5 text-zinc-400" />
        ) : (
          <BsCameraVideoOffFill className="h-3.5 w-3.5 text-destructive" />
        )}

        {isCurrentUserHost && !isSelf && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 rounded p-0.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white">
                <BsThreeDotsVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleToggleAudio}>
                {participant.isAudioEnabled !== false ? 'Mute microphone' : 'Unmute microphone'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleVideo}>
                {participant.isVideoEnabled !== false ? 'Disable camera' : 'Enable camera'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleTransferHost}>
                Make host
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleRemove}
                className="text-destructive focus:text-destructive"
              >
                Remove from meeting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
