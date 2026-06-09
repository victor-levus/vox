import { useAppSelector } from '@/store';
import { generateAvatarInitials } from '@/utils';
import type { Message } from '@/types';

export function MessageBubble({ message }: { message: Message }) {
  const currentUserId = useAppSelector((s) => s.auth.user?.id);
  const isOwn = message.sender.id === currentUserId;

  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(message.createdAt));

  if (isOwn) {
    return (
      <div className="ml-auto flex max-w-[85%] flex-col items-end gap-1 ">
        <div className="rounded-2xl rounded-tr-sm bg-blue-600 px-3 py-2 text-sm text-white whitespace-pre-wrap wrap-break-word">
          {message.content}
        </div>
        <span className="text-[10px] text-zinc-500">{time}</span>
      </div>
    );
  }

  return (
    <div className="flex w-full items-start gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full bg-zinc-700 text-[10px] font-medium text-white">
        {generateAvatarInitials(message.sender.name)}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[10px] text-zinc-400">{message.sender.name}</span>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-700 px-3 py-2 text-sm text-white whitespace-pre-wrap wrap-break-word">
          {message.content}
        </div>
        <span className="text-[10px] text-zinc-500">{time}</span>
      </div>
    </div>
  );
}
