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
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl">{generateAvatarInitials(name)}</AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Gradient + name label */}
      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
        <span className="text-sm font-medium text-white drop-shadow">{name}</span>
      </div>

      {/* "You" badge */}
      {isLocal && (
        <div className="absolute left-2 top-2">
          <Badge variant="secondary" className="text-xs">You</Badge>
        </div>
      )}

      {/* Muted indicator */}
      {!isAudioEnabled && (
        <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive">
          <BsMicMuteFill className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      {/* Raised hand indicator — stacked below muted icon */}
      {isHandRaised && (
        <div className={`absolute right-2 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 ${!isAudioEnabled ? 'top-10' : 'top-2'}`}>
          <BsHandIndexFill className="h-3.5 w-3.5 text-zinc-900" />
        </div>
      )}

      {/* Screen sharing indicator */}
      {isScreenSharing && (
        <div
          className={`absolute right-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 ${
            !isAudioEnabled && isHandRaised ? 'top-18' : !isAudioEnabled || isHandRaised ? 'top-10' : 'top-2'
          }`}
        >
          <BsDisplayFill className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      <ReactionOverlay reactions={reactions} />

      {/* Pin button — visible on hover */}
      {onTogglePin && (
        <button
          onClick={onTogglePin}
          title={isPinned ? 'Unpin' : 'Pin'}
          className={`absolute left-2 bottom-8 hidden h-7 w-7 items-center justify-center rounded-full transition-colors group-hover:flex ${
            isPinned
              ? 'bg-primary text-primary-foreground'
              : 'bg-black/50 text-white hover:bg-black/70'
          }`}
        >
          {isPinned ? (
            <BsPinAngleFill className="h-3.5 w-3.5" />
          ) : (
            <BsPinAngle className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
