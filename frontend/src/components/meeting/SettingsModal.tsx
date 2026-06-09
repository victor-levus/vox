import { useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { BsGrid, BsPinAngle, BsLayoutSidebar, BsCheckLg } from 'react-icons/bs';
import { useAppDispatch, useAppSelector } from '@/store';
import { setMeetingLayout, setAudioOutput, toggleSettings } from '@/store/slices/uiSlice';
import type { MeetingLayout } from '@/store/slices/uiSlice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  cameraStream: MediaStream | null;
  devices: MediaDeviceInfo[];
  activeVideoId: string;
  activeAudioId: string;
  onSwitchCamera: (deviceId: string) => Promise<void>;
  onSwitchMicrophone: (deviceId: string) => Promise<void>;
}

const sinkIdSupported =
  typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;

const layouts: { value: MeetingLayout; label: string; icon: ReactNode }[] = [
  { value: 'grid', label: 'Grid', icon: <BsGrid className="h-5 w-5" /> },
  { value: 'spotlight', label: 'Spotlight', icon: <BsPinAngle className="h-5 w-5" /> },
  { value: 'sidebar', label: 'Sidebar', icon: <BsLayoutSidebar className="h-5 w-5" /> },
];

export function SettingsModal({
  cameraStream,
  devices,
  activeVideoId,
  activeAudioId,
  onSwitchCamera,
  onSwitchMicrophone,
}: SettingsModalProps) {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.ui.isSettingsOpen);
  const meetingLayout = useAppSelector((s) => s.ui.meetingLayout);
  const audioOutputId = useAppSelector((s) => s.ui.audioOutputId);

  const previewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = previewRef.current;
    if (!video) return;
    video.srcObject = cameraStream;
    if (cameraStream) video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [cameraStream, isOpen]);

  const videoInputs = devices.filter((d) => d.kind === 'videoinput');
  const audioInputs = devices.filter((d) => d.kind === 'audioinput');
  const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) dispatch(toggleSettings()); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-1">
          {/* Camera */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Camera</h3>
            <select
              value={activeVideoId}
              onChange={(e) => { void onSwitchCamera(e.target.value); }}
              disabled={videoInputs.length === 0}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {videoInputs.length === 0 && <option value="">No camera found</option>}
              {videoInputs.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-900">
              <video
                ref={previewRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full scale-x-[-1] object-cover"
              />
            </div>
          </section>

          {/* Microphone */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Microphone</h3>
            <select
              value={activeAudioId}
              onChange={(e) => { void onSwitchMicrophone(e.target.value); }}
              disabled={audioInputs.length === 0}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {audioInputs.length === 0 && <option value="">No microphone found</option>}
              {audioInputs.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
          </section>

          {/* Speaker */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              Speaker
              {!sinkIdSupported && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (not supported in this browser)
                </span>
              )}
            </h3>
            <select
              value={audioOutputId}
              onChange={(e) => dispatch(setAudioOutput(e.target.value))}
              disabled={!sinkIdSupported || audioOutputs.length === 0}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {audioOutputs.length === 0 && <option value="">Default speaker</option>}
              {audioOutputs.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Speaker ${i + 1}`}
                </option>
              ))}
            </select>
          </section>

          {/* Layout */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Layout</h3>
            <div className="grid grid-cols-3 gap-2">
              {layouts.map(({ value, label, icon }) => {
                const isSidebar = value === 'sidebar';
                const isActive = meetingLayout === value;
                return (
                  <button
                    key={value}
                    onClick={() => !isSidebar && dispatch(setMeetingLayout(value))}
                    disabled={isSidebar}
                    title={isSidebar ? 'Coming soon' : undefined}
                    className={cn(
                      'relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      isActive && !isSidebar
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-muted-foreground',
                    )}
                  >
                    {icon}
                    {label}
                    {isActive && !isSidebar && (
                      <span className="absolute right-1.5 top-1.5">
                        <BsCheckLg className="h-3 w-3 text-primary" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
