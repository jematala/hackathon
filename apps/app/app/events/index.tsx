import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";

type EventSummary = {
  id: string;
  title: string;
  location: string;
  startsAt: string;
};

async function fetchEvents(): Promise<EventSummary[]> {
  const response = await fetch(`${apiBaseUrl}/api/events`);

  if (!response.ok) {
    throw new Error("Unable to load events");
  }

  const body = (await response.json()) as { events: EventSummary[] };
  return body.events;
}

export default function EventsScreen() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  return (
    <Screen>
      <Text style={styles.title}>Events</Text>
      {isLoading ? <ActivityIndicator /> : null}
      {error ? (
        <Text style={styles.error}>Start the API with bun run dev:api, then reload this page.</Text>
      ) : null}
      <View style={styles.list}>
        {(data ?? []).map((event) => (
          <Pressable key={event.id} onPress={() => router.push(`/events/${event.id}`)}>
            <Card>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventMeta}>{event.location}</Text>
              <Text style={styles.eventMeta}>{new Date(event.startsAt).toLocaleString()}</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
  },
  list: {
    gap: 12,
  },
  eventTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
  eventMeta: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: "#b91c1c",
    fontSize: 14,
    lineHeight: 20,
  },
});
