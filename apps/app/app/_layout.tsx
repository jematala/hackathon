import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
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

function AuthGate({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const [signedIn] = useState(true);

  useEffect(() => {
    const inAuthGroup = segments[0] === ("auth" as string);
    if (!signedIn && !inAuthGroup) {
      router.replace("/auth" as any);
    } else if (signedIn && inAuthGroup) {
      router.replace("/map" as any);
    }
  }, [signedIn, segments, router]);

  return children;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [fontsLoaded] = useFonts({
    Jersey10: require("@/assets/fonts/Jersey10-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5b7559" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <link rel="stylesheet" href={LEAFLET_CSS} />
      <style>{MAP_STYLES}</style>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="avatar/create" />
          <Stack.Screen name="billboard/[id]" />
        </Stack>
      </AuthGate>
      <StatusBar style="dark" />
    </QueryClientProvider>
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
