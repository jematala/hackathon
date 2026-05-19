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
        },
        tabBarLabelStyle: {
          fontFamily: fonts.family,
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTitleStyle: {
          color: colors.text,
          fontFamily: fonts.family,
          fontSize: 20,
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
