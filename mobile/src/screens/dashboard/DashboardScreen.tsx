import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { clearAuth } from '@/store/slices/authSlice';
import { authService } from '@/services/auth.service';

export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      dispatch(clearAuth());
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.logo}>Vōx</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.greeting}>Hi, {user?.name} 👋</Text>
        <Text style={styles.sub}>Dashboard coming in Step 31</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logo: { fontSize: 22, fontWeight: '800', color: '#6366f1' },
  logout: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 14, color: '#9ca3af' },
});
