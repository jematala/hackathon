import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";

type EventSummary = {
  id: string;
  title: string;
  location: string;
  startsAt: string;
};

const demoEvents: EventSummary[] = [
  {
    id: "demo-event",
    title: "Campus meetup",
    location: "UNSW Library",
    startsAt: "2026-05-18T09:00:00.000Z",
  },
];

export default function EventsScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Events</Text>
      <View style={styles.list}>
        {demoEvents.map((event) => (
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
});
