import { createEventSchema } from "@repo/shared";
import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";

export default function HomeScreen() {
  const [title, setTitle] = useState("Campus meetup");
  const [location, setLocation] = useState("UNSW Library");
  const [startsAt, setStartsAt] = useState("2026-05-18T09:00:00.000Z");
  const [message, setMessage] = useState("Ready to validate a demo event.");

  const validateDraft = () => {
    const result = createEventSchema.safeParse({ title, location, startsAt });

    setMessage(
      result.success
        ? "Draft event matches the shared API contract."
        : (result.error.issues[0]?.message ?? "Invalid draft."),
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Hackathon scaffold</Text>
        <Text style={styles.title}>UNSW Connect</Text>
        <Text style={styles.subtitle}>
          Expo Router on web now, with the same route tree ready for native builds later.
        </Text>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Event draft</Text>
        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField label="Location" value={location} onChangeText={setLocation} />
        <TextField label="Starts at" value={startsAt} onChangeText={setStartsAt} />
        <Button label="Validate" onPress={validateDraft} />
        <Text style={styles.message}>{message}</Text>
      </Card>

      <View style={styles.links}>
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
  header: {
    gap: 8,
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: "#111827",
    fontSize: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: "#4b5563",
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "700",
  },
  message: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 20,
  },
  links: {
    gap: 12,
  },
  link: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "700",
  },
});
