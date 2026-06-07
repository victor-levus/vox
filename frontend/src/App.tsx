import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setUser, setLoading } from '@/store/slices/authSlice';
import { authService } from '@/services/auth.service';
import LoginPage from '@/pages/Auth/LoginPage';
import RegisterPage from '@/pages/Auth/RegisterPage';
import DashboardPage from '@/pages/Dashboard/DashboardPage';
import LobbyPage from '@/pages/Lobby/LobbyPage';
import MeetingRoomPage from '@/pages/Meeting/MeetingRoomPage';
import InviteLandingPage from '@/pages/Invite/InviteLandingPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppSelector((s) => s.auth);
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    authService
      .getMe()
      .then(({ user }) => dispatch(setUser(user)))
      .catch(() => dispatch(setLoading(false)));
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InviteLandingPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/lobby/:code"
          element={
            <PrivateRoute>
              <LobbyPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/room/:code"
          element={
            <PrivateRoute>
              <MeetingRoomPage />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
