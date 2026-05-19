import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { View } from "react-native";

export default function HomeScreen() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ThemedText type="default">Loading...</ThemedText>
      </View>
    );
  }

  return <Redirect href={isSignedIn ? "/(tabs)/map" : "/sign-in"} />;
}
