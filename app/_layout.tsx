import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFontsLoaded } from "@/lib/hooks/useFontsLoaded";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFontsLoaded();

  useEffect(() => {
    // Hide splash after fonts load, on error, or after 3s fallback.
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      return;
    }
    const timeout = setTimeout(() => SplashScreen.hideAsync(), 3000);
    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="iglesia/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: "#111111" },
            headerTintColor: "#FFFFFF",
            headerTitle: "",
            headerBackTitle: "Volver",
          }}
        />
        <Stack.Screen
          name="lectura/[id]"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="libro/[id]"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
