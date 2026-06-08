import { BsXLg, BsMicFill, BsMicMuteFill, BsCameraVideoFill, BsCameraVideoOffFill } from 'react-icons/bs';
import { useAppDispatch, useAppSelector } from '@/store';
import { togglePanel } from '@/store/slices/participantsSlice';
import type { Participant } from '@/types';

export function ParticipantsPanel() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.participants.isOpen);
  const participants = useAppSelector((s) => s.participants.participants);

  if (!isOpen) return null;

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">
          Participants ({participants.length})
        </h2>
        <button
          onClick={() => dispatch(togglePanel())}
          className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <BsXLg className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {participants.map((p) => (
          <ParticipantRow key={p.id} participant={p} />
        ))}
      </div>
    </div>
  );
}

function ParticipantRow({ participant }: { participant: Participant }) {
  const initials = participant.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
      </div>
    </div>
  );
}
