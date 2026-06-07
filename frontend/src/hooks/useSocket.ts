import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { socketService } from '@/services/socket.service';
import { SocketEvents } from '@/types';

export function useSocket(roomCode: string): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = socketService.connect();
    setSocket(s);

    const onConnect = () => {
      s.emit(SocketEvents.JOIN_ROOM, { roomCode });
    };

    if (s.connected) {
      onConnect();
    } else {
      s.once('connect', onConnect);
    }

    return () => {
      s.off('connect', onConnect);
      if (s.connected) {
        s.emit(SocketEvents.LEAVE_ROOM, { roomCode });
      }
      socketService.disconnect();
      setSocket(null);
    };
  }, [roomCode]);

  return socket;
}
