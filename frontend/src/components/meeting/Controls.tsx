import type { ReactNode } from 'react';
import {
  BsMicFill,
  BsMicMuteFill,
  BsCameraVideoFill,
  BsCameraVideoOffFill,
  BsTelephoneXFill,
  BsDisplay,
  BsDisplayFill,
  BsChatDots,
  BsChatDotsFill,
  BsPeople,
  BsPeopleFill,
} from 'react-icons/bs';
import { useAppDispatch, useAppSelector } from '@/store';
import { toggleChat } from '@/store/slices/uiSlice';
import { togglePanel } from '@/store/slices/participantsSlice';
import { cn } from '@/lib/utils';

interface ControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => Promise<void>;
  onLeave: () => void;
}

type ButtonVariant = 'neutral' | 'danger' | 'highlight' | 'ghost';

function ControlButton({
  onClick,
  title,
  variant = 'neutral',
  children,
  className,
}: {
  onClick: () => void;
  title: string;
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors',
        variant === 'neutral' && 'bg-zinc-700 hover:bg-zinc-600',
        variant === 'danger' && 'bg-destructive hover:bg-destructive/90',
        variant === 'highlight' && 'bg-blue-600 hover:bg-blue-700',
        variant === 'ghost' && 'bg-transparent hover:bg-zinc-700',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Controls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
}: ControlsProps) {
  const dispatch = useAppDispatch();
  const isChatOpen = useAppSelector((s) => s.ui.isChatOpen);
  const isParticipantsOpen = useAppSelector((s) => s.participants.isOpen);

  return (
    <div className="flex shrink-0 items-center bg-zinc-900 px-4 py-3">
      {/* Left — spacer */}
      <div className="flex flex-1" />

      {/* Center — primary controls */}
      <div className="flex items-center gap-3">
        <ControlButton
          onClick={onToggleAudio}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
          variant={isAudioEnabled ? 'neutral' : 'danger'}
        >
          {isAudioEnabled ? (
            <BsMicFill className="h-5 w-5" />
          ) : (
            <BsMicMuteFill className="h-5 w-5" />
          )}
        </ControlButton>

        <ControlButton
          onClick={onToggleVideo}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          variant={isVideoEnabled ? 'neutral' : 'danger'}
        >
          {isVideoEnabled ? (
            <BsCameraVideoFill className="h-5 w-5" />
          ) : (
            <BsCameraVideoOffFill className="h-5 w-5" />
          )}
        </ControlButton>

        <ControlButton
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          variant={isScreenSharing ? 'highlight' : 'neutral'}
        >
          {isScreenSharing ? (
            <BsDisplayFill className="h-5 w-5" />
          ) : (
            <BsDisplay className="h-5 w-5" />
          )}
        </ControlButton>

        <button
          onClick={onLeave}
          title="Leave meeting"
          className="flex h-12 w-28 items-center justify-center gap-2 rounded-full bg-destructive text-sm font-medium text-white transition-colors hover:bg-destructive/90"
        >
          <BsTelephoneXFill className="h-4 w-4" />
          Leave
        </button>
      </div>

      {/* Right — panel toggles */}
      <div className="flex flex-1 items-center justify-end gap-2">
        <ControlButton
          onClick={() => dispatch(toggleChat())}
          title={isChatOpen ? 'Close chat' : 'Open chat'}
          variant={isChatOpen ? 'neutral' : 'ghost'}
        >
          {isChatOpen ? (
            <BsChatDotsFill className="h-5 w-5" />
          ) : (
            <BsChatDots className="h-5 w-5" />
          )}
        </ControlButton>

        <ControlButton
          onClick={() => dispatch(togglePanel())}
          title={isParticipantsOpen ? 'Close participants' : 'Show participants'}
          variant={isParticipantsOpen ? 'neutral' : 'ghost'}
        >
          {isParticipantsOpen ? (
            <BsPeopleFill className="h-5 w-5" />
          ) : (
            <BsPeople className="h-5 w-5" />
          )}
        </ControlButton>
      </div>
    </div>
  );
}
