import { createPoiInputSchema } from "@repo/shared";
import { useAuth } from "@clerk/expo";
import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { ThemedText } from "@/components/ThemedText";

const demoCampusId = "00000000-0000-4000-8000-000000000100";

export default function HomeScreen() {
  const { isLoaded, isSignedIn } = useAuth();

  const [title, setTitle] = useState("Main Library");
  const [lat, setLat] = useState("-33.9173");
  const [lng, setLng] = useState("151.2313");
  const [message, setMessage] = useState("Ready to validate a demo POI.");

  const validateDraft = () => {
    const result = createPoiInputSchema.safeParse({
      campusId: demoCampusId,
      title,
      lat: Number(lat),
      lng: Number(lng),
    });

    setMessage(
      result.success
        ? "Draft POI matches the shared API contract."
        : (result.error.issues[0]?.message ?? "Invalid draft."),
    );
  };

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText type="default">Loading...</ThemedText>
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.sectionTitle}>POI draft</Text>

        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField label="Latitude" value={lat} onChangeText={setLat} />
        <TextField label="Longitude" value={lng} onChangeText={setLng} />

        <Button label="Validate" onPress={validateDraft} />

        <Text style={styles.message}>{message}</Text>
      </Card>

      <View style={styles.links}>
        <Link href="/(tabs)/map" style={styles.link}>
          Open map
        </Link>

        <Link href="/events" style={styles.link}>
          Browse events
        </Link>

        <Link href="/events/demo-event" style={styles.link}>
          Open dynamic event
        </Link>

        <Link href="/profile/demo-user" style={styles.link}>
          Open profile
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },

  message: {
    marginTop: 12,
  },

  links: {
    marginTop: 24,
    gap: 12,
  },

  link: {
    fontSize: 16,
  },
});