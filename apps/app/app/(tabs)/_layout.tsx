import { Tabs } from "expo-router";
import { Map, ScrollText, Palette, User } from "lucide-react-native";
import { colors, fonts } from "@/app/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderWidth: 2,
          borderRadius: 0,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.family,
          fontSize: fonts.sizes.xs,
        },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 2,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: {
          color: colors.text,
          fontFamily: fonts.family,
          fontSize: fonts.sizes.heading,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="map/index"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => <Map size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="quests/index"
        options={{
          title: "Quests",
          tabBarIcon: ({ color }) => <ScrollText size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="studio/index"
        options={{
          title: "Studio",
          tabBarIcon: ({ color }) => <Palette size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
