import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { SocketEvents } from '@/types';

interface SocketParticipant {
  socketId: string;
  userId: string;
  name: string;
  avatar?: string | null;
}

// Build ICE server list from env vars once at module load
const iceServers: RTCIceServer[] = [
  { urls: import.meta.env.VITE_STUN_URL || 'stun:stun.l.google.com:19302' },
];
if (import.meta.env.VITE_TURN_URL) {
  iceServers.push({
    urls: import.meta.env.VITE_TURN_URL,
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  });
}

export function useWebRTC(socket: Socket | null, localStream: MediaStream | null) {
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(localStream);
  // Queue ICE candidates that arrive before remote description is set
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  const removePeer = useCallback((socketId: string) => {
    peersRef.current.get(socketId)?.close();
    peersRef.current.delete(socketId);
    pendingCandidates.current.delete(socketId);
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(socketId);
      return next;
    });
  }, []);

  const createPeerConnection = useCallback(
    (remoteSocketId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers });

      // Add local media tracks to the connection
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      // Surface the remote participant's stream
      pc.ontrack = (event) => {
        setRemoteStreams((prev) => new Map(prev).set(remoteSocketId, event.streams[0]));
      };

      // Forward local ICE candidates to the remote peer via signaling server
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit(SocketEvents.ICE_CANDIDATE, {
            targetSocketId: remoteSocketId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          removePeer(remoteSocketId);
        }
      };

      peersRef.current.set(remoteSocketId, pc);
      return pc;
    },
    [socket, removePeer],
  );

  const flushPendingCandidates = useCallback(async (socketId: string) => {
    const pc = peersRef.current.get(socketId);
    const queue = pendingCandidates.current.get(socketId) ?? [];
    for (const c of queue) {
      await pc?.addIceCandidate(c).catch(() => {});
    }
    pendingCandidates.current.delete(socketId);
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Joiner receives list of existing participants → initiate an offer to each
    const onParticipantList = async ({ participants }: { participants: SocketParticipant[] }) => {
      for (const p of participants) {
        const pc = createPeerConnection(p.socketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit(SocketEvents.OFFER, {
          targetSocketId: p.socketId,
          sdp: pc.localDescription,
        });
      }
    };

    // Existing participant receives offer from new joiner → answer it
    const onOffer = async ({
      sdp,
      fromSocketId,
    }: {
      sdp: RTCSessionDescriptionInit;
      fromSocketId: string;
    }) => {
      let pc = peersRef.current.get(fromSocketId);
      if (!pc) pc = createPeerConnection(fromSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await flushPendingCandidates(fromSocketId);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit(SocketEvents.ANSWER, {
        targetSocketId: fromSocketId,
        sdp: pc.localDescription,
      });
    };

    // Joiner receives answer from existing participant → complete the handshake
    const onAnswer = async ({
      sdp,
      fromSocketId,
    }: {
      sdp: RTCSessionDescriptionInit;
      fromSocketId: string;
    }) => {
      const pc = peersRef.current.get(fromSocketId);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await flushPendingCandidates(fromSocketId);
    };

    // Both sides receive trickled ICE candidates
    const onIceCandidate = async ({
      candidate,
      fromSocketId,
    }: {
      candidate: RTCIceCandidateInit;
      fromSocketId: string;
    }) => {
      const pc = peersRef.current.get(fromSocketId);
      if (pc?.remoteDescription) {
        await pc.addIceCandidate(candidate).catch(() => {});
      } else {
        // Queue until remote description is set
        const queue = pendingCandidates.current.get(fromSocketId) ?? [];
        queue.push(candidate);
        pendingCandidates.current.set(fromSocketId, queue);
      }
    };

    // Peer left the room → tear down their connection and remove their stream
    const onUserLeft = ({ socketId }: { socketId: string }) => {
      removePeer(socketId);
    };

    socket.on(SocketEvents.PARTICIPANT_LIST, onParticipantList);
    socket.on(SocketEvents.OFFER, onOffer);
    socket.on(SocketEvents.ANSWER, onAnswer);
    socket.on(SocketEvents.ICE_CANDIDATE, onIceCandidate);
    socket.on(SocketEvents.USER_LEFT, onUserLeft);

    return () => {
      socket.off(SocketEvents.PARTICIPANT_LIST, onParticipantList);
      socket.off(SocketEvents.OFFER, onOffer);
      socket.off(SocketEvents.ANSWER, onAnswer);
      socket.off(SocketEvents.ICE_CANDIDATE, onIceCandidate);
      socket.off(SocketEvents.USER_LEFT, onUserLeft);
    };
  }, [socket, createPeerConnection, flushPendingCandidates, removePeer]);

  // When localStream changes (e.g. screen share starts/stops), replace the video
  // track on every active peer connection so remote participants see the new feed.
  useEffect(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    peersRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      sender?.replaceTrack(videoTrack).catch(() => {});
    });
  }, [localStream]);

  // Close all peer connections on unmount
  useEffect(() => {
    const peers = peersRef.current;
    return () => {
      peers.forEach((pc) => pc.close());
      peers.clear();
    };
  }, []);

  return {
    remoteStreams,
    peers: peersRef.current,
  };
}
