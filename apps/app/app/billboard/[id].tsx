import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

import { BillboardPanel } from "@/components/billboard/BillboardPanel";
import { Screen } from "@/components/Screen";
import { colors } from "@/lib/theme";

export default function BillboardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const renderBackButton = () => (
    <Pressable onPress={goBack} style={styles.backButton} hitSlop={8} accessibilityLabel="Go back">
      <ChevronLeft color={colors.sageDark} size={22} />
    </Pressable>
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: "Whiteboard", headerLeft: renderBackButton }} />
      <BillboardPanel id={id} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
});
