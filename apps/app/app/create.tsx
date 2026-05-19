import { StyleSheet, View } from "react-native";
import { CreateStickerPanel } from "@/components/CreateStickerPanel";
import { Screen } from "@/components/Screen";

export default function CreateScreen() {
  return (
    <Screen>
      <View style={styles.wrap}>
        <CreateStickerPanel />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    maxWidth: 430,
    width: "100%",
  },
});
