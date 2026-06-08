import { useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { useAppDispatch } from '@/store';
import { addMessage, setMessages, addTypingUser, removeTypingUser } from '@/store/slices/chatSlice';
import { meetingService } from '@/services/meeting.service';
import { SocketEvents } from '@/types';
import type { Message } from '@/types';

export function useChat(socket: Socket | null, roomId: string | null) {
  const dispatch = useAppDispatch();
  const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Load message history once roomId is known
  useEffect(() => {
    if (!roomId) return;
    meetingService
      .getRoomMessages(roomId)
      .then(({ messages }) => dispatch(setMessages(messages)))
      .catch(() => {});
  }, [roomId, dispatch]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (message: Message) => dispatch(addMessage(message));

    const onUserTyping = (payload: { userId: string; name: string }) =>
      dispatch(addTypingUser(payload));

    const onUserStopTyping = ({ userId }: { userId: string }) =>
      dispatch(removeTypingUser(userId));

    socket.on(SocketEvents.NEW_MESSAGE, onNewMessage);
    socket.on(SocketEvents.USER_TYPING, onUserTyping);
    socket.on(SocketEvents.USER_STOP_TYPING, onUserStopTyping);

    return () => {
      socket.off(SocketEvents.NEW_MESSAGE, onNewMessage);
      socket.off(SocketEvents.USER_TYPING, onUserTyping);
      socket.off(SocketEvents.USER_STOP_TYPING, onUserStopTyping);
    };
  }, [socket, dispatch]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!socket || !content.trim()) return;
      socket.emit(SocketEvents.SEND_MESSAGE, { content: content.trim(), type: 'text' });
      if (isTypingRef.current) {
        socket.emit(SocketEvents.STOP_TYPING);
        isTypingRef.current = false;
      }
      if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    },
    [socket],
  );

  const setTyping = useCallback(
    (typing: boolean) => {
      if (!socket) return;
      if (typing) {
        if (!isTypingRef.current) {
          isTypingRef.current = true;
          socket.emit(SocketEvents.TYPING);
        }
        // Reset 2s auto-stop timer on each keystroke
        if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
        stopTypingTimer.current = setTimeout(() => {
          socket.emit(SocketEvents.STOP_TYPING);
          isTypingRef.current = false;
        }, 2000);
      } else {
        if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
        if (isTypingRef.current) {
          socket.emit(SocketEvents.STOP_TYPING);
          isTypingRef.current = false;
        }
      }
    },
    [socket],
  );

  return { sendMessage, setTyping };
}
