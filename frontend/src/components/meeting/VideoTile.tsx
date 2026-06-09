import { useEffect, useRef } from 'react';
import { BsMicMuteFill, BsPinAngleFill, BsPinAngle, BsHandIndexFill, BsDisplayFill } from 'react-icons/bs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { generateAvatarInitials } from '@/utils';
import { ReactionOverlay } from './ReactionOverlay';
import type { Reaction } from './ReactionOverlay';

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isHandRaised?: boolean;
  isScreenSharing?: boolean;
  reactions?: Reaction[];
  isPinned?: boolean;
  onTogglePin?: () => void;
  audioOutputId?: string;
}

export function VideoTile({
  stream,
  name,
  isLocal = false,
  isAudioEnabled = true,
  isVideoEnabled = true,
  isHandRaised = false,
  isScreenSharing = false,
  reactions = [],
  isPinned = false,
  onTogglePin,
  audioOutputId,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) video.play().catch((err: unknown) => console.error('[VideoTile] play() failed:', err));
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  // Apply audio output device when it changes (Chrome/Edge only; no-op elsewhere)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isLocal || !audioOutputId) return;
    if ('setSinkId' in video) {
      (video as HTMLVideoElement & { setSinkId: (id: string) => Promise<void> })
        .setSinkId(audioOutputId)
        .catch(() => {});
    }
  }, [audioOutputId, isLocal]);

  const showVideo = isVideoEnabled && stream !== null;

  return (
    <div className="group relative h-full w-full overflow-hidden rounded-xl bg-zinc-900">
      {/* React's `muted` JSX prop doesn't reach the DOM — set it via ref callback. */}
      <video
        ref={(el) => {
          videoRef.current = el;
          if (el) el.muted = isLocal;
        }}
        autoPlay
        playsInline
        className={`h-full w-full object-cover ${isLocal ? 'scale-x-[-1]' : ''} ${showVideo ? '' : 'hidden'}`}
      />

      {/* Camera-off fallback */}
      {!showVideo && (
        <div className="flex h-full w-full items-center justify-center">
          <Avatar className="h-10 w-10 sm:h-16 sm:w-16">
            <AvatarFallback className="text-base sm:text-xl">{generateAvatarInitials(name)}</AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Gradient + name label */}
      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 sm:px-3 sm:pb-2 sm:pt-6">
        <span className="text-xs font-medium text-white drop-shadow sm:text-sm">{name}</span>
      </div>

      {/* "You" badge */}
      {isLocal && (
        <div className="absolute left-2 top-2">
          <Badge variant="secondary" className="text-xs">You</Badge>
        </div>
      )}

      {/* Muted indicator */}
      {!isAudioEnabled && (
        <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive sm:right-2 sm:top-2 sm:h-7 sm:w-7">
          <BsMicMuteFill className="h-2.5 w-2.5 text-white sm:h-3.5 sm:w-3.5" />
        </div>
      )}

      {/* Raised hand indicator — stacked below muted icon */}
      {isHandRaised && (
        <div className={`absolute right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 sm:right-2 sm:h-7 sm:w-7 ${!isAudioEnabled ? 'top-7 sm:top-10' : 'top-1.5 sm:top-2'}`}>
          <BsHandIndexFill className="h-2.5 w-2.5 text-zinc-900 sm:h-3.5 sm:w-3.5" />
        </div>
      )}

      {/* Screen sharing indicator */}
      {isScreenSharing && (
        <div
          className={`absolute right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 sm:right-2 sm:h-7 sm:w-7 ${
            !isAudioEnabled && isHandRaised
              ? 'top-14 sm:top-18'
              : !isAudioEnabled || isHandRaised
                ? 'top-7 sm:top-10'
                : 'top-1.5 sm:top-2'
          }`}
        >
          <BsDisplayFill className="h-2.5 w-2.5 text-white sm:h-3.5 sm:w-3.5" />
        </div>
      )}

      <ReactionOverlay reactions={reactions} />

      {/* Pin button — visible on hover */}
      {onTogglePin && (
        <button
          onClick={onTogglePin}
          title={isPinned ? 'Unpin' : 'Pin'}
          aria-label={isPinned ? 'Unpin tile' : 'Pin tile'}
          className={`absolute bottom-7 left-1.5 hidden h-5 w-5 items-center justify-center rounded-full transition-colors group-hover:flex sm:bottom-8 sm:left-2 sm:h-7 sm:w-7 ${
            isPinned
              ? 'bg-primary text-primary-foreground'
              : 'bg-black/50 text-white hover:bg-black/70'
          }`}
        >
          {isPinned ? (
            <BsPinAngleFill className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
          ) : (
            <BsPinAngle className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
