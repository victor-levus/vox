import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BsEmojiSmile } from 'react-icons/bs';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '👏', '🔥'];

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
}

export function ReactionPicker({ onReact }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ bottom: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setPos({ bottom: window.innerHeight - r.top + 8, left: r.left + r.width / 2 });
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popupRef.current && !popupRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <>
      {isOpen && createPortal(
        <div
          ref={popupRef}
          style={{ bottom: pos.bottom, left: pos.left }}
          className="fixed z-9999 -translate-x-1/2 rounded-xl bg-zinc-800 p-2 shadow-lg"
        >
          <div className="grid grid-cols-4 gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReact(emoji); setIsOpen(false); }}
                aria-label={`React with ${emoji}`}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl leading-none transition-colors hover:bg-zinc-700"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        title="React"
        aria-label="React"
        aria-expanded={isOpen}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors sm:h-12 sm:w-12 ${
          isOpen ? 'bg-zinc-600' : 'bg-zinc-700 hover:bg-zinc-600'
        }`}
      >
        <BsEmojiSmile className="h-5 w-5" />
      </button>
    </>
  );
}
