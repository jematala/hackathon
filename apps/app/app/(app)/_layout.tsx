import { Stack } from "expo-router";

import { UNSW_CAMPUS_ID } from "@/constants/coordinates";
import { useCampusRealtime } from "@/lib/api/realtime";

export default function AppLayout() {
  useCampusRealtime(UNSW_CAMPUS_ID);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="map" />
      <Stack.Screen name="quests" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
