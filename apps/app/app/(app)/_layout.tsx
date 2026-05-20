import { Stack } from "expo-router";

import { UNSW_CAMPUS_ID } from "@/constants/coordinates";
import { useCampusRealtime } from "@/lib/api/realtime";
import { colors } from "@/lib/theme";

export default function AppLayout() {
  useCampusRealtime(UNSW_CAMPUS_ID);

  return (
    <Stack
      screenOptions={{
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.pageBg },
        gestureEnabled: true,
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Screen name="map" options={{ animation: "fade" }} />
      <Stack.Screen name="quests" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="studio" options={{ animation: "slide_from_bottom" }} />
    </Stack>
  );
}
