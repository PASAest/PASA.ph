import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/nunito";
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { IosEdgeClearance } from "@/components/IosEdgeClearance";
import { PhoneFrame } from "@/components/PhoneFrame";
import { SetupNeeded } from "@/components/SetupNeeded";
import { AuthProvider } from "@/lib/auth";
import { SettingsProvider } from "@/lib/settings";
import { ThemeProvider, ThemeRemount } from "@/lib/themeMode";
import { ToastHost } from "@/lib/toast";
import { isConfigured } from "@/lib/supabase";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <IosEdgeClearance>
        <ThemeProvider>
          {(scheme) => (
            <>
              <StatusBar style={scheme === "dark" ? "light" : "dark"} />
              {isConfigured ? (
                <SettingsProvider>
                  <AuthProvider>
                    <ThemeRemount>
                      <PhoneFrame>
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: colors.bg },
                            animation: "slide_from_right",
                          }}
                        />
                        <ToastHost />
                      </PhoneFrame>
                    </ThemeRemount>
                  </AuthProvider>
                </SettingsProvider>
              ) : (
                <SetupNeeded />
              )}
            </>
          )}
        </ThemeProvider>
      </IosEdgeClearance>
    </SafeAreaProvider>
  );
}
