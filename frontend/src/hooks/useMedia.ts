import { useState, useEffect, useRef, useCallback } from 'react';

export function useMedia() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        cameraStreamRef.current = stream;
        setLocalStream(stream);
      })
      .catch(() => {});

    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleAudio = useCallback(() => {
    setIsAudioEnabled((prev) => {
      const next = !prev;
      cameraStreamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = next;
      });
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled((prev) => {
      const next = !prev;
      cameraStreamRef.current?.getVideoTracks().forEach((t) => {
        t.enabled = next;
      });
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
      // Auto-revert when user clicks the browser's native "Stop sharing" button
      screen.getVideoTracks()[0].onended = () => stopScreenShare();
      setLocalStream(screen);
      setIsScreenSharing(true);
      return screen;
    } catch {
      return null;
    }
  }, [stopScreenShare]);

  return {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
}
