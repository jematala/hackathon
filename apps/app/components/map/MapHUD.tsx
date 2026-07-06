import { Menu, X } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/app/theme";
import { colors } from "@/lib/theme";
import { useUserProfile } from "@/lib/userProfile";

const PROFILE_SIZE = 128;
const AVATAR_SIZE = PROFILE_SIZE;
const MENU_BUTTON_SIZE = 54;
const COLOR_FG = colors.sageDark;
const COLOR_FG_DARK = colors.sageDarker;
const COLOR_BG = colors.pageBgSoft;
const COLOR_TEXT = colors.creamText;

function ProfileButton({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { avatarUri } = useUserProfile();
  const useDrawn = Boolean(avatarUri);
  const source = avatarUri ? { uri: avatarUri } : require("@/assets/images/avatar.png");

  return (
    <View style={styles.leftSection}>
      <Pressable
        onPress={onOpenProfile}
        accessibilityLabel="Open profile"
        style={({ pressed }) => [styles.profileButton, { opacity: pressed ? 0.78 : 1 }]}
      >
        <View style={styles.avatarFrame}>
          <Image
            source={source}
            style={[styles.profileImage, useDrawn && styles.profileImageDrawn]}
          />
        </View>
      </Pressable>
      <View style={styles.levelBadge}>
        <Text style={styles.levelLabel}>lv22</Text>
      </View>
    </View>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.78 : 1 }]}
    >
      <Text style={styles.menuItemLabel}>{label}</Text>
    </Pressable>
  );
}

function MenuToggle({ isOpen, onPress }: { isOpen: boolean; onPress: () => void }) {
  const Icon = isOpen ? X : Menu;

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={isOpen ? "Close map menu" : "Open map menu"}
      style={({ pressed }) => [styles.menuToggle, { opacity: pressed ? 0.78 : 1 }]}
    >
      <Icon color={COLOR_TEXT} size={34} strokeWidth={3.5} />
    </Pressable>
  );
}

type MapHUDProps = {
  onCreateBillboard: () => void;
  onOpenProfile: () => void;
  onOpenQuests: () => void;
  onOpenStudio: () => void;
  isPermissionDenied?: boolean;
  onEnableLocation?: () => void;
};

export function MapHUD({
  onCreateBillboard,
  onOpenProfile,
  onOpenQuests,
  onOpenStudio,
  isPermissionDenied,
  onEnableLocation,
}: MapHUDProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openFromMenu = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  const handleCreateBillboard = () => {
    setIsMenuOpen(false);
    onCreateBillboard();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {isPermissionDenied && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>Enable location to see nearby quests & POIs</Text>
          <Pressable
            onPress={onEnableLocation}
            style={({ pressed }) => [styles.permissionButton, { opacity: pressed ? 0.78 : 1 }]}
          >
            <Text style={styles.permissionButtonText}>Enable</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.bottomRow} pointerEvents="box-none">
        <ProfileButton onOpenProfile={onOpenProfile} />
        <View style={styles.menuStack}>
          {isMenuOpen && (
            <View style={styles.menuItems}>
              <MenuItem label="quests" onPress={() => openFromMenu(onOpenQuests)} />
              <MenuItem label="create" onPress={handleCreateBillboard} />
              <MenuItem label="studio" onPress={() => openFromMenu(onOpenStudio)} />
              <MenuItem label="profile" onPress={() => openFromMenu(onOpenProfile)} />
            </View>
          )}
          <MenuToggle isOpen={isMenuOpen} onPress={() => setIsMenuOpen((open) => !open)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 14,
    right: 12,
    bottom: 12,
  },
  bottomRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  permissionBanner: {
    alignItems: "center",
    backgroundColor: COLOR_FG,
    borderColor: COLOR_FG_DARK,
    borderRadius: 8,
    borderWidth: 3,
    flexDirection: "row",
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  permissionText: {
    color: COLOR_TEXT,
    flex: 1,
    fontFamily: fonts.family,
    fontSize: 16,
  },
  permissionButton: {
    backgroundColor: COLOR_BG,
    borderRadius: 8,
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  permissionButtonText: {
    color: COLOR_FG,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  leftSection: {
    alignItems: "center",
    height: PROFILE_SIZE + 14,
    justifyContent: "flex-end",
    marginBottom: 10,
    width: PROFILE_SIZE + 20,
  },
  profileButton: {
    alignItems: "center",
    backgroundColor: "rgba(250, 243, 223, 0.72)",
    borderRadius: 24,
    height: PROFILE_SIZE,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    width: PROFILE_SIZE,
  },
  avatarFrame: {
    alignItems: "center",
    backgroundColor: COLOR_FG,
    borderColor: COLOR_FG,
    borderRadius: 24,
    borderWidth: 6,
    height: AVATAR_SIZE,
    justifyContent: "center",
    overflow: "hidden",
    width: AVATAR_SIZE,
  },
  profileImage: {
    height: AVATAR_SIZE,
    width: AVATAR_SIZE,
  },
  profileImageDrawn: {
    backgroundColor: "#FAF7EF",
  },
  levelBadge: {
    alignItems: "center",
    backgroundColor: COLOR_FG,
    borderColor: COLOR_FG,
    borderRadius: 8,
    borderWidth: 3,
    bottom: -10,
    justifyContent: "center",
    minHeight: 50,
    minWidth: 78,
    paddingHorizontal: 10,
    position: "absolute",
    right: 0,
  },
  levelLabel: {
    color: COLOR_TEXT,
    fontFamily: fonts.family,
    fontSize: 30,
    lineHeight: 32,
  },
  menuStack: {
    alignItems: "flex-end",
    gap: 10,
  },
  menuItems: {
    alignItems: "flex-end",
    gap: 10,
  },
  menuItem: {
    alignItems: "center",
    backgroundColor: COLOR_FG,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 54,
    minWidth: 142,
    paddingHorizontal: 18,
  },
  menuItemLabel: {
    color: COLOR_TEXT,
    fontFamily: fonts.family,
    fontSize: 32,
    lineHeight: 34,
    textTransform: "lowercase",
  },
  menuToggle: {
    alignItems: "center",
    backgroundColor: COLOR_FG,
    borderRadius: 8,
    height: MENU_BUTTON_SIZE,
    justifyContent: "center",
    width: MENU_BUTTON_SIZE,
  },
});
