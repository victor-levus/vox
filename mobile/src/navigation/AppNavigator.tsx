import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';

export type AppStackParamList = {
  Dashboard: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
    </Stack.Navigator>
  );
}
