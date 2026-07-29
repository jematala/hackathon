// ponytail: temporary on-device diagnostic. Delete once the Safari/mobile
// fetch issue is understood. Renders raw auth + fetch state on screen so we
// don't need a Mac / remote inspector to see what's failing on the phone.
import { useAuth } from "@clerk/expo";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { API_BASE_URL } from "@/lib/api/client";
import { UNSW_CAMPUS_ID } from "@/constants/coordinates";
import { useBillboards } from "@/lib/api/hooks";

export function DebugOverlay() {
  const { isLoaded, isSignedIn, getToken } = useAuth({ treatPendingAsSignedOut: false });
  const [lines, setLines] = useState<string[]>([]);
  // Reuses the map's cached query instead of its own fetch — the overlay must
  // not cost a duplicate request on every load.
  const billboards = useBillboards({ campusId: UNSW_CAMPUS_ID });

  useEffect(() => {
    let cancelled = false;
    const log = (s: string) => {
      if (!cancelled) setLines((prev) => [...prev, s]);
    };

    log(`base=${API_BASE_URL}`);
    log(`isLoaded=${isLoaded} isSignedIn=${isSignedIn}`);
    if (!isLoaded || !isSignedIn) return;

    (async () => {
      try {
        const token = await getToken();
        log(`token=${token ? `ok(len ${token.length})` : "NULL"}`);
      } catch (e) {
        log(`getToken THREW: ${String((e as Error)?.message ?? e)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
    // NOT getToken: Clerk returns a new function identity every render, so
    // including it re-runs this effect -> setLines -> re-render -> forever.
  }, [isLoaded, isSignedIn]);

  return (
    <ScrollView style={styles.box} contentContainerStyle={styles.content}>
      {lines.map((l, i) => (
        <Text key={i} style={styles.text}>
          {l}
        </Text>
      ))}
      <Text style={styles.text}>
        {`billboards=${billboards.status} n=${billboards.data?.length ?? "-"}${
          billboards.error ? ` err=${billboards.error.message}` : ""
        }`}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    maxHeight: 220,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 8,
    zIndex: 9999,
  },
  content: { padding: 10, gap: 2 },
  text: { color: "#7CFC7C", fontFamily: "monospace", fontSize: 11 },
});
