import { Stack } from "expo-router";

export default function MapaLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="iglesia/[id]" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
