import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { colors, fonts } from "@/app/theme";

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
          <Pressable key={event.id} onPress={() => router.push(`/events/${event.id}` as any)}>
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
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    fontFamily: fonts.family,
  },
  list: {
    gap: 12,
  },
  eventTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: fonts.family,
  },
  eventMeta: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.family,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
