import { useEffect, useRef } from 'react';
import { BsXLg } from 'react-icons/bs';
import { useAppDispatch, useAppSelector } from '@/store';
import { toggleChat, clearUnread } from '@/store/slices/chatSlice';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  onSend: (content: string) => void;
  onTyping: (typing: boolean) => void;
}

export function ChatPanel({ onSend, onTyping }: ChatPanelProps) {
  const dispatch = useAppDispatch();
  const { isOpen, messages, typingUsers } = useAppSelector((s) => s.chat);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) dispatch(clearUnread());
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const typingLabel =
    typingUsers.length === 1
      ? `${typingUsers[0].name} is typing…`
      : typingUsers.length > 1
        ? `${typingUsers.length} people are typing…`
        : null;

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Chat</h2>
        <button
          onClick={() => dispatch(toggleChat())}
          className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <BsXLg className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-xs text-zinc-500">No messages yet. Say hello!</p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {typingLabel && (
        <p className="px-3 py-1 text-xs italic text-zinc-400">{typingLabel}</p>
      )}

      <ChatInput onSend={onSend} onTyping={onTyping} />
    </div>
  );
}
