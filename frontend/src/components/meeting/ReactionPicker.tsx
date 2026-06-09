import { useState, useRef, useEffect } from 'react';
import { BsEmojiSmile } from 'react-icons/bs';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '👏', '🔥'];

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
}

export function ReactionPicker({ onReact }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      {isOpen && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-max -translate-x-1/2 rounded-xl bg-zinc-800 p-2 shadow-lg">
          <div className="grid grid-cols-4 gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  setIsOpen(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl leading-none transition-colors hover:bg-zinc-700"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title="React"
        className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors ${
          isOpen ? 'bg-zinc-600' : 'bg-zinc-700 hover:bg-zinc-600'
        }`}
      >
        <BsEmojiSmile className="h-5 w-5" />
      </button>
    </div>
  );
}
