import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { store } from '@/store';
import { setUser, setLoading } from '@/store/slices/authSlice';
import { authService } from '@/services/auth.service';
import RootNavigator from '@/navigation/RootNavigator';

function AppInner() {
  useEffect(() => {
    authService
      .getMe()
      .then(({ user }) => store.dispatch(setUser(user)))
      .catch(() => store.dispatch(setLoading(false)));
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}
