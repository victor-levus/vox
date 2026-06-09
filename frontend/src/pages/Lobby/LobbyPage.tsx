import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BsMicFill,
  BsMicMuteFill,
  BsCameraVideoFill,
  BsCameraVideoOffFill,
  BsArrowLeft,
} from 'react-icons/bs';
import { useAppSelector } from '@/store';
import { meetingService } from '@/services/meeting.service';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Room } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user)!;

  const [room, setRoom] = useState<Room | null>(null);
  useDocumentTitle(room ? `Lobby · ${room.name}` : 'Lobby');
  const [pageLoading, setPageLoading] = useState(true);
  const [displayName, setDisplayName] = useState(user.name);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mountedRef = useRef(true);

  // Fetch room info
  useEffect(() => {
    if (!code) return;
    meetingService
      .getRoomByCode(code)
      .then(({ room: data }) => setRoom(data))
      .catch(() => {
        toast.error('Meeting not found');
        navigate('/dashboard', { replace: true });
      })
      .finally(() => setPageLoading(false));
  }, [code, navigate]);

  // Start or restart the preview stream
  const startStream = async (videoId?: string, audioId?: string, muted = false) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMediaError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoId ? { deviceId: { exact: videoId } } : true,
        audio: audioId ? { deviceId: { exact: audioId } } : true,
      });
      if (!mountedRef.current) {
        // Component unmounted before getUserMedia resolved — release hardware.
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Device labels only become available after permission is granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (!mountedRef.current) return;
      const cams = devices.filter((d) => d.kind === 'videoinput');
      const micsDevs = devices.filter((d) => d.kind === 'audioinput');
      setCameras(cams);
      setMics(micsDevs);
      if (!videoId && cams[0]) setSelectedCamera(cams[0].deviceId);
      if (!audioId && micsDevs[0]) setSelectedMic(micsDevs[0].deviceId);
    } catch {
      if (mountedRef.current) {
        setMediaError(true);
        setIsCameraOff(true);
      }
    }
  };

  // Start preview on mount, stop all tracks on unmount
  useEffect(() => {
    mountedRef.current = true;
    startStream();
    return () => {
      mountedRef.current = false;
      if (videoRef.current) videoRef.current.srcObject = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = () => {
    const next = !isMuted;
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setIsMuted(next);
  };

  const toggleCamera = async () => {
    if (!isCameraOff) {
      streamRef.current?.getVideoTracks().forEach((t) => t.stop());
      setIsCameraOff(true);
    } else {
      await startStream(selectedCamera || undefined, selectedMic || undefined, isMuted);
      setIsCameraOff(false);
    }
  };

  const handleCameraChange = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    setIsCameraOff(false);
    await startStream(deviceId, selectedMic || undefined, isMuted);
  };

  const handleMicChange = async (deviceId: string) => {
    setSelectedMic(deviceId);
    await startStream(selectedCamera || undefined, deviceId, isMuted);
  };

  if (pageLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isHost = room?.hostId === user.id;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <BsArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-sm font-medium">{room?.name ?? 'Meeting'}</p>
            <p className="text-xs text-muted-foreground">Code: {code}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 md:flex-row md:items-center">
        {/* Camera preview */}
        <div className="flex flex-1 flex-col items-center gap-3">
          <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-2xl bg-zinc-900">
            {/* Video element — always mounted so ref works */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover scale-x-[-1] ${isCameraOff ? 'hidden' : ''}`}
            />

            {/* Camera-off overlay */}
            {isCameraOff && (
              <div className="flex h-full w-full items-center justify-center">
                {mediaError ? (
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <BsCameraVideoOffFill className="h-10 w-10" />
                    <span className="text-sm">Camera unavailable</span>
                  </div>
                ) : (
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-2xl">
                      {getInitials(displayName || user.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            )}

            {/* Toggle controls overlay */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3">
              <button
                onClick={toggleMic}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  isMuted
                    ? 'bg-destructive text-white'
                    : 'bg-white/20 text-white backdrop-blur-sm hover:bg-white/30'
                }`}
              >
                {isMuted ? (
                  <BsMicMuteFill className="h-4 w-4" />
                ) : (
                  <BsMicFill className="h-4 w-4" />
                )}
              </button>

              <button
                onClick={toggleCamera}
                title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  isCameraOff
                    ? 'bg-destructive text-white'
                    : 'bg-white/20 text-white backdrop-blur-sm hover:bg-white/30'
                }`}
              >
                {isCameraOff ? (
                  <BsCameraVideoOffFill className="h-4 w-4" />
                ) : (
                  <BsCameraVideoFill className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {isMuted ? 'Microphone off' : 'Microphone on'} ·{' '}
            {isCameraOff ? 'Camera off' : 'Camera on'}
          </p>
        </div>

        {/* Setup panel */}
        <div className="w-full space-y-5 md:max-w-72">
          <div>
            <h1 className="text-xl font-semibold">Ready to join?</h1>
            {!isHost && (
              <p className="mt-1 text-sm text-muted-foreground">
                Waiting for the host to start this meeting.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="displayName">Your name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
            />
          </div>

          {cameras.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="camera">Camera</Label>
              <select
                id="camera"
                value={selectedCamera}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {cameras.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mics.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="mic">Microphone</Label>
              <select
                id="mic"
                value={selectedMic}
                onChange={(e) => handleMicChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {mics.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => navigate(`/room/${code}`, { state: { isMuted, isCameraOff } })}
            disabled={!displayName.trim()}
          >
            Join now
          </Button>
        </div>
      </div>
    </div>
  );
}
