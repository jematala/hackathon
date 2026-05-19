import { ClerkProvider } from "@clerk/expo";
import { Jersey10_400Regular, useFonts } from "@expo-google-fonts/jersey-10";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

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

  const [loaded, error] = useFonts({
    Jersey10_400Regular,
  });

  if (error) {
    throw error;
  }

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5b7559" />
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <QueryClientProvider client={queryClient}>
        <link rel="stylesheet" href={LEAFLET_CSS} />
        <style>{MAP_STYLES}</style>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)/sign-in" />
          <Stack.Screen name="(auth)/sign-up" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="avatar/create" />
          <Stack.Screen name="billboard/[id]" />
          <Stack.Screen name="events/index" />
          <Stack.Screen name="events/[id]" />
          <Stack.Screen name="index" />
          <Stack.Screen name="profile/[userId]" />
        </Stack>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#FEEED5",
    flex: 1,
    justifyContent: "center",
  },
});
