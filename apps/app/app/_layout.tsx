import { ClerkProvider } from '@clerk/expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useFonts, Jersey10_400Regular } from '@expo-google-fonts/jersey-10';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  const [loaded, error] = useFonts({
    Jersey10_400Regular,
  });

  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    >
      <QueryClientProvider client={queryClient}>
        <Stack>
          <Stack.Screen
            name="(auth)/sign-in"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="(auth)/sign-up"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="index" options={{ title: 'UNSW Connect' }} />
          <Stack.Screen
            name="profile/[userId]"
            options={{ title: 'Profile' }}
          />
        </Stack>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
