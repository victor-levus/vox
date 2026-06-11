import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { BsCameraVideo } from 'react-icons/bs';
import { useAppDispatch, useAppSelector } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import { meetingService } from '@/services/meeting.service';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const authLoading = useAppSelector((s) => s.auth.loading);

  const [room, setRoom] = useState<{ name: string; host: { name: string } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);

  const [guestName, setGuestName] = useState('');
  const [guestOrg, setGuestOrg] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) return;
    meetingService
      .getRoomPreview(code)
      .then(({ room: r }) => setRoom(r))
      .catch((err: AxiosError<{ message: string }>) => {
        setError(err.response?.data?.message ?? 'Meeting not found');
      })
      .finally(() => setRoomLoading(false));
  }, [code]);

  // Authenticated user — skip the form and go straight to lobby
  useEffect(() => {
    if (!authLoading && user && code) {
      navigate(`/lobby/${code}`, { replace: true });
    }
  }, [authLoading, user, code, navigate]);

  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !guestName.trim()) return;
    setJoining(true);
    try {
      const { user: guestUser, roomCode } = await authService.guestJoin({
        name: guestName.trim(),
        organisation: guestOrg.trim() || undefined,
        roomCode: code,
      });
      dispatch(setUser(guestUser));
      navigate(`/lobby/${roomCode}`);
    } catch (err) {
      setError(
        (err as AxiosError<{ message: string }>).response?.data?.message ?? 'Failed to join',
      );
      setJoining(false);
    }
  };

  if (authLoading || roomLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <BsCameraVideo className="mx-auto mb-3 h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Vōx</h1>
        </div>

        {error ? (
          <div className="rounded-lg border bg-card p-6 space-y-3">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="secondary" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        ) : room ? (
          <div className="rounded-lg border bg-card p-6 space-y-5">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{room.host.name}</span> is hosting
              </p>
              <p className="text-xl font-semibold">{room.name}</p>
            </div>

            <form onSubmit={handleGuestJoin} className="space-y-3 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="guest-name">Your name</Label>
                <Input
                  id="guest-name"
                  placeholder="Enter your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guest-org">
                  Organisation{' '}
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="guest-org"
                  placeholder="Company or organisation"
                  value={guestOrg}
                  onChange={(e) => setGuestOrg(e.target.value)}
                />
              </div>
              <Button className="w-full" type="submit" disabled={joining || !guestName.trim()}>
                {joining ? 'Joining…' : 'Join meeting'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <Link to={`/login?redirect=/lobby/${code}`}>Sign in to join</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
