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
  BsHandIndex,
  BsHandIndexFill,
  BsGear,
  BsRecord2,
  BsRecord2Fill,
} from 'react-icons/bs';
import { useAppDispatch, useAppSelector } from '@/store';
import { toggleChat } from '@/store/slices/chatSlice';
import { togglePanel } from '@/store/slices/participantsSlice';
import { toggleSettings } from '@/store/slices/uiSlice';
import { cn } from '@/lib/utils';
import { ReactionPicker } from './ReactionPicker';

interface ControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isRecording: boolean;
  isHost: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => Promise<void>;
  onToggleRaiseHand: () => void;
  onToggleRecording: () => void;
  onReact: (emoji: string) => void;
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
  isHandRaised,
  isRecording,
  isHost,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRaiseHand,
  onToggleRecording,
  onReact,
  onLeave,
}: ControlsProps) {
  const dispatch = useAppDispatch();
  const { isOpen: isChatOpen, unreadCount } = useAppSelector((s) => s.chat);
  const isParticipantsOpen = useAppSelector((s) => s.participants.isOpen);
  const isSettingsOpen = useAppSelector((s) => s.ui.isSettingsOpen);

  return (
    <div className="flex shrink-0 items-center bg-zinc-900 px-4 py-3">
      {/* Left — REC indicator */}
      <div className="flex flex-1 items-center">
        {isRecording && (
          <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-bold tracking-wider text-red-400">REC</span>
          </div>
        )}
      </div>

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

        <ControlButton
          onClick={onToggleRaiseHand}
          title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          variant={isHandRaised ? 'highlight' : 'neutral'}
        >
          {isHandRaised ? (
            <BsHandIndexFill className="h-5 w-5" />
          ) : (
            <BsHandIndex className="h-5 w-5" />
          )}
        </ControlButton>

        <ReactionPicker onReact={onReact} />

        <button
          onClick={onLeave}
          title="Leave meeting"
          className="flex h-12 w-28 items-center justify-center gap-2 rounded-full bg-destructive text-sm font-medium text-white transition-colors hover:bg-destructive/90"
        >
          <BsTelephoneXFill className="h-4 w-4" />
          Leave
        </button>
      </div>

      {/* Right — record (host only) + panel toggles */}
      <div className="flex flex-1 items-center justify-end gap-2">
        {isHost && (
          <ControlButton
            onClick={onToggleRecording}
            title={isRecording ? 'Stop recording' : 'Start recording'}
            variant={isRecording ? 'danger' : 'ghost'}
          >
            {isRecording ? (
              <BsRecord2Fill className="h-5 w-5" />
            ) : (
              <BsRecord2 className="h-5 w-5" />
            )}
          </ControlButton>
        )}
        <div className="relative">
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
          {!isChatOpen && unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

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

        <ControlButton
          onClick={() => dispatch(toggleSettings())}
          title="Settings"
          variant={isSettingsOpen ? 'neutral' : 'ghost'}
        >
          <BsGear className="h-5 w-5" />
        </ControlButton>
      </div>
    </div>
  );
}
