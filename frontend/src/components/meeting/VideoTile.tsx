import { useEffect, useRef } from 'react';
import { BsMicMuteFill, BsPinAngleFill, BsPinAngle } from 'react-icons/bs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { generateAvatarInitials } from '@/utils';

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export function VideoTile({
  stream,
  name,
  isLocal = false,
  isAudioEnabled = true,
  isVideoEnabled = true,
  isPinned = false,
  onTogglePin,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // React's `muted` prop has a known bug and doesn't reliably update the DOM
  // attribute, which blocks autoplay. Set it directly via the DOM property.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isLocal;
  }, [isLocal]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) video.play().catch(() => {});
  }, [stream]);

  const showVideo = isVideoEnabled && stream !== null;

  return (
    <div className="group relative h-full w-full overflow-hidden rounded-xl bg-zinc-900">
      {/* Video element — always mounted so ref is stable; muted set via DOM */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`h-full w-full object-cover ${isLocal ? 'transform-[scaleX(-1)]' : ''} ${showVideo ? '' : 'hidden'}`}
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
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
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
