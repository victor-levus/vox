import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { BsCameraVideo } from 'react-icons/bs';
import { useAppDispatch, useAppSelector } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import { meetingService } from '@/services/meeting.service';
import { authService } from '@/services/auth.service';
import type { Invitation } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function InviteLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const authLoading = useAppSelector((s) => s.auth.loading);

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invLoading, setInvLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  // Guest form state
  const [guestName, setGuestName] = useState('');
  const [guestOrg, setGuestOrg] = useState('');

  useEffect(() => {
    if (!token) return;
    meetingService
      .resolveInvitation(token)
      .then(({ invitation: inv }) => setInvitation(inv))
      .catch((err: AxiosError<{ message: string }>) => {
        setError(err.response?.data?.message ?? 'Invalid invitation');
      })
      .finally(() => setInvLoading(false));
  }, [token]);

  const handleAuthenticatedJoin = async () => {
    if (!token) return;
    setJoining(true);
    try {
      const { roomCode } = await meetingService.acceptInvitation(token);
      navigate(`/lobby/${roomCode}`);
    } catch (err) {
      setError(
        (err as AxiosError<{ message: string }>).response?.data?.message ?? 'Failed to join',
      );
      setJoining(false);
    }
  };

  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !guestName.trim()) return;
    setJoining(true);
    try {
      const { user: guestUser, roomCode } = await authService.guestJoin({
        name: guestName.trim(),
        organisation: guestOrg.trim() || undefined,
        inviteToken: token,
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

  if (authLoading || invLoading) {
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
            <p className="text-xs text-muted-foreground">
              This invitation may have expired or already been used.
            </p>
            <Button variant="secondary" asChild>
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        ) : invitation ? (
          <div className="rounded-lg border bg-card p-6 space-y-5">
            <div className="space-y-1">
              {invitation.inviter && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{invitation.inviter.name}</span>{' '}
                  invited you to join
                </p>
              )}
              <p className="text-xl font-semibold">{invitation.room.name}</p>
            </div>

            {user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Joining as <span className="font-medium text-foreground">{user.name}</span>
                </p>
                <Button className="w-full" onClick={handleAuthenticatedJoin} disabled={joining}>
                  {joining ? 'Joining…' : 'Join meeting'}
                </Button>
              </div>
            ) : (
              <>
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
                  <Link to={`/login?redirect=/invite/${token}`}>Sign in to join</Link>
                </Button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
