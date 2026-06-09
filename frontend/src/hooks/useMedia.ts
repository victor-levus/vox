import { useState, useEffect, useRef, useCallback } from 'react';

export function useMedia({
  initialAudioEnabled = true,
  initialVideoEnabled = true,
}: { initialAudioEnabled?: boolean; initialVideoEnabled?: boolean } = {}) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudioEnabled);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeVideoId, setActiveVideoId] = useState('');
  const [activeAudioId, setActiveAudioId] = useState('');

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (!initialAudioEnabled) stream.getAudioTracks().forEach((t) => { t.enabled = false; });
        if (!initialVideoEnabled) stream.getVideoTracks().forEach((t) => { t.enabled = false; });
        cameraStreamRef.current = stream;
        setLocalStream(stream);
        setCameraStream(stream);
        setActiveVideoId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? '');
        setActiveAudioId(stream.getAudioTracks()[0]?.getSettings().deviceId ?? '');
        navigator.mediaDevices.enumerateDevices().then(setDevices).catch(() => {});
      })
      .catch((err: unknown) => {
        if (!cancelled) console.error('[useMedia] getUserMedia failed:', err);
      });

    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      screenStreamRef.current = null;
    };
  }, []);

  const toggleAudio = useCallback(() => {
    setIsAudioEnabled((prev) => {
      const next = !prev;
      cameraStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = next; });
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled((prev) => {
      const next = !prev;
      cameraStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
      return next;
    });
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setLocalStream(cameraStreamRef.current);
    setIsScreenSharing(false);
  }, []);

  const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screen;
      screen.getVideoTracks()[0].onended = () => stopScreenShare();
      setLocalStream(screen);
      setIsScreenSharing(true);
      return screen;
    } catch {
      return null;
    }
  }, [stopScreenShare]);

  const muteAudio = useCallback(() => {
    cameraStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
    setIsAudioEnabled(false);
  }, []);

  const unmuteAudio = useCallback(() => {
    cameraStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = true; });
    setIsAudioEnabled(true);
  }, []);

  const disableVideo = useCallback(() => {
    cameraStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = false; });
    setIsVideoEnabled(false);
  }, []);

  const enableVideo = useCallback(() => {
    cameraStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = true; });
    setIsVideoEnabled(true);
  }, []);

  const switchCamera = useCallback(async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      // Preserve current video enabled state
      newVideoTrack.enabled = cameraStreamRef.current?.getVideoTracks()[0]?.enabled ?? true;

      const audioTracks = cameraStreamRef.current?.getAudioTracks() ?? [];
      cameraStreamRef.current?.getVideoTracks().forEach((t) => t.stop());

      const combined = new MediaStream([newVideoTrack, ...audioTracks]);
      cameraStreamRef.current = combined;
      setLocalStream(combined);
      setCameraStream(combined);
      setActiveVideoId(deviceId);
      navigator.mediaDevices.enumerateDevices().then(setDevices).catch(() => {});
    } catch (err) {
      console.error('[useMedia] switchCamera failed:', err);
    }
  }, []);

  const switchMicrophone = useCallback(async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { deviceId: { exact: deviceId } },
      });
      const newAudioTrack = newStream.getAudioTracks()[0];
      // Preserve current audio enabled state by reading the existing track
      newAudioTrack.enabled = cameraStreamRef.current?.getAudioTracks()[0]?.enabled ?? true;

      const videoTracks = cameraStreamRef.current?.getVideoTracks() ?? [];
      cameraStreamRef.current?.getAudioTracks().forEach((t) => t.stop());

      const combined = new MediaStream([...videoTracks, newAudioTrack]);
      cameraStreamRef.current = combined;
      setLocalStream(combined);
      setCameraStream(combined);
      setActiveAudioId(deviceId);
    } catch (err) {
      console.error('[useMedia] switchMicrophone failed:', err);
    }
  }, []);

  return {
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
  };
}
