import { useState, useRef } from 'react';
import { BsSendFill } from 'react-icons/bs';

interface ChatInputProps {
  onSend: (content: string) => void;
  onTyping: (typing: boolean) => void;
}

export function ChatInput({ onSend, onTyping }: ChatInputProps) {
  const [value, setValue] = useState('');
  const wasTyping = useRef(false);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    if (wasTyping.current) {
      onTyping(false);
      wasTyping.current = false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const nowTyping = e.target.value.length > 0;
    if (nowTyping !== wasTyping.current) {
      wasTyping.current = nowTyping;
      onTyping(nowTyping);
    } else if (nowTyping) {
      onTyping(true); // refresh the debounce timer
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-zinc-800 p-3">
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Send a message…"
        rows={1}
        className="flex-1 resize-none rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        title="Send"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <BsSendFill className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
