import "@/lib/installGlobalFont";

import { Jersey10_400Regular, useFonts } from "@expo-google-fonts/jersey-10";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { DevUserProvider } from "@/lib/devUser";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [fontsLoaded] = useFonts({ Jersey10_400Regular });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <QueryClientProvider client={queryClient}>
        <DevUserProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.pageBg },
              headerTitleStyle: { color: colors.ink, fontFamily: "Jersey10_400Regular" },
              headerTintColor: colors.sageDark,
              contentStyle: { backgroundColor: colors.pageBg },
            }}
          >
            <Stack.Screen name="index" options={{ title: "Campus Connect" }} />
            <Stack.Screen name="billboards/index" options={{ title: "Billboards" }} />
            <Stack.Screen name="billboard/[id]" options={{ title: "Billboard" }} />
            <Stack.Screen name="profile/[userId]" options={{ title: "Profile" }} />
          </Stack>
          <StatusBar style="auto" />
        </DevUserProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
