import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fonts } from "@/app/theme";
import { colors } from "@/lib/theme";

import { PawScatter } from "./PawScatter";

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen}>
      <PawScatter />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <View style={styles.column}>
          <View style={styles.wordmarkWrap}>
            <Text style={styles.wordmark}>jematala</Text>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.authCream,
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  column: {
    alignSelf: "center",
    flex: 1,
    justifyContent: "center",
    maxWidth: 380,
    paddingBottom: 96,
    paddingHorizontal: 24,
    width: "100%",
  },
  wordmarkWrap: {
    alignSelf: "center",
    borderBottomWidth: 4,
    borderColor: colors.authSage,
    marginBottom: 40,
    paddingBottom: 2,
  },
  wordmark: {
    color: colors.authSage,
    fontFamily: fonts.family,
    fontSize: 52,
    lineHeight: 52,
  },
});
