import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { BsCameraVideo } from 'react-icons/bs';
import { useAppSelector } from '@/store';
import { meetingService } from '@/services/meeting.service';
import type { Invitation } from '@/types';
import { Button } from '@/components/ui/button';

export default function InviteLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const authLoading = useAppSelector((s) => s.auth.loading);

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invLoading, setInvLoading] = useState(true);
  const [joining, setJoining] = useState(false);

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

  const handleJoin = async () => {
    if (!user) {
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }
    if (!token) return;
    setJoining(true);
    try {
      const { roomCode } = await meetingService.acceptInvitation(token);
      navigate(`/lobby/${roomCode}`);
    } catch (err) {
      const msg =
        (err as AxiosError<{ message: string }>).response?.data?.message ??
        'Failed to accept invitation';
      setError(msg);
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
          <h1 className="text-2xl font-bold tracking-tight">VideoCall</h1>
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
          <div className="rounded-lg border bg-card p-6 space-y-4">
            {invitation.inviter && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{invitation.inviter.name}</span>{' '}
                invited you to join
              </p>
            )}
            <p className="text-xl font-semibold">{invitation.room.name}</p>
            {!user ? (
              <div className="space-y-2">
                <Button className="w-full" asChild>
                  <Link to={`/login?redirect=/invite/${token}`}>Sign in to join</Link>
                </Button>
                <Button className="w-full" variant="secondary" asChild>
                  <Link to={`/register?redirect=/invite/${token}`}>Create an account</Link>
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={handleJoin} disabled={joining}>
                {joining ? 'Joining…' : 'Join meeting'}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
