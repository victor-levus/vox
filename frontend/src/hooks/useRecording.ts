import { useCallback, useRef, useState } from 'react';

export function useRecording(
  localStream: MediaStream | null,
  remoteStreams: Map<string, MediaStream>,
) {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const startRecording = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    const streams = [localStream, ...Array.from(remoteStreams.values())].filter(
      (s): s is MediaStream => s !== null,
    );

    const videos = streams.map((stream) => {
      const v = document.createElement('video');
      v.srcObject = stream;
      v.muted = true;
      v.play().catch(() => {});
      return v;
    });

    const drawFrame = () => {
      const count = videos.length;
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (count > 0) {
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        const tw = Math.floor(canvas.width / cols);
        const th = Math.floor(canvas.height / rows);
        videos.forEach((v, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          try {
            ctx.drawImage(v, col * tw, row * th, tw, th);
          } catch {
            // video not yet playing
          }
        });
      }
      rafRef.current = requestAnimationFrame(drawFrame);
    };
    rafRef.current = requestAnimationFrame(drawFrame);

    // Mix all audio streams
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const dest = audioCtx.createMediaStreamDestination();
    for (const stream of streams) {
      if (stream.getAudioTracks().length > 0) {
        try {
          audioCtx.createMediaStreamSource(stream).connect(dest);
        } catch {
          // stream may have no audio
        }
      }
    }

    const finalStream = new MediaStream([
      ...canvas.captureStream(30).getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(finalStream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      cancelAnimationFrame(rafRef.current);
      videos.forEach((v) => {
        v.srcObject = null;
      });
      void audioCtxRef.current?.close();
      audioCtxRef.current = null;
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setIsRecording(true);
  }, [localStream, remoteStreams]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }, []);

  return { isRecording, startRecording, stopRecording };
}
