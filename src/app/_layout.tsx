import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PhoneFrame } from '@/components/PhoneFrame';
import { SetupNeeded } from '@/components/SetupNeeded';
import { AuthProvider } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {isConfigured ? (
        <AuthProvider>
          <PhoneFrame>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
          </PhoneFrame>
        </AuthProvider>
      ) : (
        <SetupNeeded />
      )}
    </SafeAreaProvider>
  );
}
