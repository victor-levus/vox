import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { BsX, BsLink45Deg, BsEnvelope } from 'react-icons/bs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { meetingService } from '@/services/meeting.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  roomCode: string;
  isHost: boolean;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function InviteDialog({ open, onClose, roomId, roomCode, isHost }: InviteDialogProps) {
  const [tab, setTab] = useState<'link' | 'email'>('link');
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);

  const addEmail = (raw: string) => {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      toast.error(`Invalid email: ${trimmed}`);
      return;
    }
    if (emails.includes(trimmed)) return;
    setEmails((prev) => [...prev, trimmed]);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      addEmail(inputValue);
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      setEmails((prev) => prev.slice(0, -1));
    }
  };

  const handleSendInvites = async () => {
    const pending = inputValue.trim().toLowerCase();
    const finalEmails =
      pending && isValidEmail(pending) ? [...emails, pending] : emails;
    if (finalEmails.length === 0) return;
    setSending(true);
    try {
      await meetingService.createInvitations(roomId, finalEmails, true);
      toast.success(
        `Invited ${finalEmails.length} ${finalEmails.length === 1 ? 'person' : 'people'}`,
      );
      setEmails([]);
      setInputValue('');
      handleClose();
    } catch {
      toast.error('Failed to send invitations');
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/lobby/${roomCode}`;
    navigator.clipboard.writeText(link).then(() => toast.success('Link copied to clipboard'));
  };

  const handleClose = () => {
    setEmails([]);
    setInputValue('');
    setTab('link');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b -mx-1 px-1">
          <button
            onClick={() => setTab('link')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
              tab === 'link'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <BsLink45Deg className="h-3.5 w-3.5" />
            Copy link
          </button>
          {isHost && (
            <button
              onClick={() => setTab('email')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                tab === 'email'
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <BsEnvelope className="h-3.5 w-3.5" />
              Email invite
            </button>
          )}
        </div>

        {tab === 'link' ? (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              Share this link with people you want to invite.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/lobby/${roomCode}`}
                className="font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <Button variant="secondary" onClick={handleCopyLink} className="shrink-0">
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              Enter email addresses. Press Enter or comma after each one.
            </p>
            <div
              className="flex min-h-10 cursor-text flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 focus-within:ring-1 focus-within:ring-ring"
              onClick={(e) => {
                const input = (e.currentTarget as HTMLDivElement).querySelector('input');
                input?.focus();
              }}
            >
              {emails.map((email) => (
                <span
                  key={email}
                  className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => setEmails((prev) => prev.filter((e) => e !== email))}
                    className="hover:text-destructive"
                  >
                    <BsX className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={() => {
                  addEmail(inputValue);
                  setInputValue('');
                }}
                placeholder={emails.length === 0 ? 'name@example.com' : ''}
                className="min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSendInvites}
                disabled={sending || (emails.length === 0 && !inputValue.trim())}
              >
                {sending ? 'Sending…' : 'Send invites'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
