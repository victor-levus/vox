import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { BsCameraVideo, BsLink45Deg, BsMoon, BsPeople, BsSun, BsThreeDots, BsTrash } from 'react-icons/bs';
import { InviteDialog } from '@/components/meeting/InviteDialog';
import { VoxLogo } from '@/components/shared/VoxLogo';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearAuth } from '@/store/slices/authSlice';
import { authService } from '@/services/auth.service';
import { meetingService } from '@/services/meeting.service';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Room } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type RoomWithCount = Room & { _count?: { participants: number } };

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardPage() {
  useDocumentTitle('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user)!;
  const { resolvedTheme, setTheme } = useTheme();

  const [rooms, setRooms] = useState<RoomWithCount[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showNewMeetingDialog, setShowNewMeetingDialog] = useState(false);
  const [newMeetingName, setNewMeetingName] = useState('');
  const [inviteRoom, setInviteRoom] = useState<RoomWithCount | null>(null);

  useEffect(() => {
    meetingService
      .getMyRooms()
      .then(({ rooms: data }) => setRooms(data as RoomWithCount[]))
      .catch(() => toast.error('Failed to load meetings'))
      .finally(() => setRoomsLoading(false));
  }, []);

  const handleNewMeeting = async () => {
    const name = newMeetingName.trim() || undefined;
    setCreatingRoom(true);
    setShowNewMeetingDialog(false);
    try {
      const { room } = await meetingService.createRoom(name);
      navigate(`/lobby/${room.code}`);
    } catch {
      toast.error('Failed to create meeting');
      setCreatingRoom(false);
    }
  };

  const handleJoin = () => {
    const code = joinCode.trim();
    if (code) navigate(`/lobby/${code}`);
  };

  const handleCopyLink = (room: RoomWithCount) => {
    const link = `${window.location.origin}/lobby/${room.code}`;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success('Link copied to clipboard'));
  };

  const handleDeleteMeeting = async (room: RoomWithCount) => {
    try {
      await meetingService.endRoom(room.id);
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      toast.success('Meeting deleted');
    } catch {
      toast.error('Failed to delete meeting');
    }
  };

  const handleLogout = async () => {
    await authService.logout().catch(() => {});
    dispatch(clearAuth());
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <VoxLogo className="h-7 w-7" />
            <span className="bg-linear-to-r from-indigo-500 to-violet-500 bg-clip-text text-xl font-bold tracking-tight text-transparent">
              Vōx
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              {resolvedTheme === 'dark' ? (
                <BsSun className="h-4 w-4" />
              ) : (
                <BsMoon className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-1 flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Account menu"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-border">
                    <AvatarFallback className="bg-linear-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:block">{user.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Action cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-5">
            <p className="mb-1 font-medium">New meeting</p>
            <p className="mb-4 text-sm text-muted-foreground">Start an instant video call</p>
            <Button
              onClick={() => { setNewMeetingName(''); setShowNewMeetingDialog(true); }}
              disabled={creatingRoom}
            >
              <BsCameraVideo className="mr-2 h-4 w-4" />
              {creatingRoom ? 'Creating…' : 'Start meeting'}
            </Button>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <p className="mb-1 font-medium">Join a meeting</p>
            <p className="mb-4 text-sm text-muted-foreground">Enter a meeting code</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                className="max-w-40"
              />
              <Button variant="secondary" onClick={handleJoin} disabled={!joinCode.trim()}>
                Join
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* My Meetings */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-semibold">My Meetings</h2>
            {!roomsLoading && (
              <Badge variant="secondary" className="text-xs">
                {rooms.length}
              </Badge>
            )}
          </div>

          {roomsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-17 rounded-lg" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <BsCameraVideo className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No meetings yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a new meeting and it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{room.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(room.createdAt)}
                      {room._count?.participants
                        ? ` · ${room._count.participants} participants`
                        : ''}
                    </p>
                  </div>

                  <div className="ml-4 flex shrink-0 items-center gap-2">
                    {room.isActive && (
                      <Badge className="text-xs">Live</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/lobby/${room.code}`)}
                    >
                      Start
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <BsThreeDots className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopyLink(room)}>
                          <BsLink45Deg className="mr-2 h-4 w-4" />
                          Copy link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setInviteRoom(room)}>
                          <BsPeople className="mr-2 h-4 w-4" />
                          Invite people
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteMeeting(room)}
                        >
                          <BsTrash className="mr-2 h-4 w-4" />
                          Delete meeting
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {inviteRoom && (
        <InviteDialog
          open={!!inviteRoom}
          onClose={() => setInviteRoom(null)}
          roomId={inviteRoom.id}
          roomCode={inviteRoom.code}
          isHost={true}
        />
      )}

      <Dialog
        open={showNewMeetingDialog}
        onOpenChange={(open) => { if (!open) setShowNewMeetingDialog(false); }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New meeting</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Meeting name (optional)"
              value={newMeetingName}
              onChange={(e) => setNewMeetingName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNewMeeting()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewMeetingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleNewMeeting}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
