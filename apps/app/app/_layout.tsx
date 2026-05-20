import "@/lib/installGlobalFont";

import { ClerkProvider } from "@clerk/expo";
import { Jersey10_400Regular, useFonts } from "@expo-google-fonts/jersey-10";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SecureStore from "expo-secure-store";

import { colors } from "@/lib/theme";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

const MAP_STYLES = `
  html, body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
  }
  body {
    color: #6A401A;
    font-family: Jersey10, sans-serif;
  }
  .leaflet-container {
    height: 100%;
    width: 100%;
    image-rendering: pixelated;
  }
   .leaflet-tile {
    filter: sepia(0.3) saturate(0.8) brightness(0.8) contrast(150%);
  }
  .poi-marker { background: none; border: none; }
  .poi-marker-inner {
    filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
  }
  .user-avatar-marker { background: none; border: none; }
`;

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [loaded, error] = useFonts({ Jersey10_400Regular });

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = MAP_STYLES;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);

  if (error) {
    throw error;
  }

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.sageDark} />
      </View>
    );
  }

  const tokenCache = {
    async getToken(key: string) {
      return SecureStore.getItemAsync(key);
    },
    async saveToken(key: string, value: string) {
      return SecureStore.setItemAsync(key, value);
    },
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <ClerkProvider
        tokenCache={tokenCache}
        publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      >
        <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              animation: "fade",
              contentStyle: { backgroundColor: colors.pageBg },
              headerShown: false,
            }}
          >
            <Stack.Screen name="(auth)/sign-in" />
            <Stack.Screen name="(auth)/sign-up" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="avatar/create" options={{ animation: "slide_from_bottom" }} />
            <Stack.Screen name="billboard/[id]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="billboards/index" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="create" />
            <Stack.Screen name="index" />
            <Stack.Screen name="profile/[userId]" options={{ animation: "slide_from_right" }} />
          </Stack>
          <StatusBar style="dark" />
        </QueryClientProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.pageBg,
    flex: 1,
  },
  loading: {
    alignItems: "center",
    backgroundColor: colors.pageBg,
    flex: 1,
    justifyContent: "center",
  },
});
