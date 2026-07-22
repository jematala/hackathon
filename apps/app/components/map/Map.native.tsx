import { Asset } from "expo-asset";
import { forwardRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
// Import Marker alongside Map from the library
import { Camera, Map as MapLibre, Marker } from "@maplibre/maplibre-react-native";

import { fonts } from "@/app/theme";
import { UNSW_CENTER } from "@/constants/coordinates";
import { useCurrentUser } from "@/lib/api/hooks";
import { colors } from "@/lib/theme";
import { avatarBase64ToUri, useUserProfile } from "@/lib/userProfile";

import type { MapPoi, MapProps } from "./Map.types";

const THUNDERFOREST_API_KEY = process.env.EXPO_PUBLIC_THUNDERFOREST_KEY ?? "YOUR_API_KEY_HERE";

const MAP_STYLE: any = JSON.stringify({
  version: 8,
  sources: {
    "thunderforest-neighbourhood": {
      type: "raster",
      tiles: [
        `https://api.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey=${THUNDERFOREST_API_KEY}`,
      ],
      tileSize: 256,
      maxzoom: 21,
      attribution:
        '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, ' +
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "thunderforest-tiles",
      type: "raster",
      source: "thunderforest-neighbourhood",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
});

interface POIMarkerProps {
  poi: MapPoi;
  isSelected: boolean;
  onPress: () => void;
}

function POIMarker({ poi, isSelected, onPress }: POIMarkerProps) {
  return (
    <Marker lngLat={[poi.lng, poi.lat]} anchor="bottom" onPress={onPress}>
      <View style={poiStyles.markerContainer}>
        <View style={poiStyles.topCircle} />

        <View style={[poiStyles.mainBox, isSelected && poiStyles.mainBoxSelected]}>
          {/* Embedded Cross Lines */}
          <View style={poiStyles.verticalLine} />
          <View style={poiStyles.horizontalLine} />
        </View>

        {/* Base Platform Bar (x=0, y=28, w=32, h=4) */}
        <View style={poiStyles.baseBar} />
      </View>
    </Marker>
  );
}

function BillboardMarker({ lat, lng, onPress }: { lat: number; lng: number; onPress: () => void }) {
  return (
    <Marker lngLat={[lng, lat]} anchor="bottom" onPress={onPress}>
      <View style={billboardStyles.container}>
        <View style={billboardStyles.marker}>
          <Text style={billboardStyles.text} numberOfLines={1}>
            ?
          </Text>
        </View>
        <View style={billboardStyles.pin} />
      </View>
    </Marker>
  );
}

interface UserAvatarMarkerProps {
  coordinate: [number, number];
  imageUrl: string;
}

function UserAvatarMarker({ coordinate, imageUrl }: UserAvatarMarkerProps) {
  return (
    <Marker lngLat={coordinate} anchor="bottom">
      <View style={avatarStyles.markerContainer}>
        {/* Rounded Avatar Frame */}
        <View style={avatarStyles.avatarFrame}>
          <Image source={{ uri: imageUrl }} style={avatarStyles.avatarImage} />
        </View>
        {/* Downward Triangle Pointer */}
        <View style={avatarStyles.trianglePointer} />
      </View>
    </Marker>
  );
}

export const Map = forwardRef<{ invalidateSize: () => void }, MapProps>(function Map(
  { billboards, isPoiCheckInPending, onBillboardPress, onPoiCheckIn, pois, location },
  _ref,
) {
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const currentUser = useCurrentUser();
  const localProfile = useUserProfile();
  const selectedPOI = pois.find((poi) => poi.id === selectedPoiId) ?? null;

  const userAvatarUrl =
    avatarBase64ToUri(currentUser.data?.avatarBase64) ??
    localProfile.avatarUri ??
    Asset.fromModule(require("@/assets/images/avatar.png")).uri;
  const userCoord: [number, number] = location
    ? [location.longitude, location.latitude]
    : [UNSW_CENTER.lng, UNSW_CENTER.lat];

  return (
    <View style={styles.container}>
      <MapLibre style={styles.map} mapStyle={MAP_STYLE} onPress={() => setSelectedPoiId(null)}>
        <Camera center={userCoord} zoom={18} duration={1000} easing="fly" />
        {pois.map((poi) => (
          <POIMarker
            key={poi.id}
            poi={poi}
            isSelected={selectedPoiId === poi.id}
            onPress={() => setSelectedPoiId((current) => (current === poi.id ? null : poi.id))}
          />
        ))}

        {billboards.map((billboard) => (
          <BillboardMarker
            key={billboard.id}
            lat={billboard.lat}
            lng={billboard.lng}
            onPress={() => onBillboardPress?.(billboard.id)}
          />
        ))}

        <UserAvatarMarker coordinate={userCoord} imageUrl={userAvatarUrl} />
      </MapLibre>

      {selectedPOI && (
        <View style={styles.callout} pointerEvents="box-none">
          <View style={styles.calloutContent}>
            <View style={styles.calloutHeader}>
              <View style={styles.calloutTitleRow}>
                <View style={styles.calloutDot} />
                <Text style={styles.calloutTitle}>{selectedPOI.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedPoiId(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.calloutDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.calloutDescription}>{selectedPOI.description ?? ""}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={selectedPOI.visited || isPoiCheckInPending}
              onPress={() => onPoiCheckIn?.(selectedPOI.id)}
              style={[styles.checkInButton, selectedPOI.visited ? styles.checkInButtonDone : null]}
            >
              <Text style={styles.checkInText}>
                {selectedPOI.visited
                  ? "Checked in"
                  : isPoiCheckInPending
                    ? "Checking in..."
                    : "Check in"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});

export default Map;

const poiStyles = StyleSheet.create({
  markerContainer: {
    width: 32,
    height: 40,
    alignItems: "center",
  },
  topCircle: {
    position: "absolute",
    top: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD700",
    borderWidth: 1.5,
    borderColor: "#B8860B",
    zIndex: 2,
  },
  mainBox: {
    position: "absolute",
    top: 8,
    width: 28,
    height: 20,
    borderRadius: 3,
    backgroundColor: "#8B6914",
    borderWidth: 2,
    borderColor: "#5C4A10",
    justifyContent: "center",
    alignItems: "center",
  },
  mainBoxSelected: {
    borderColor: "#4A90E2",
    borderWidth: 2.5,
  },
  verticalLine: {
    position: "absolute",
    width: 2,
    height: 12,
    backgroundColor: "#5C4A10",
  },
  horizontalLine: {
    position: "absolute",
    width: 12,
    height: 2,
    backgroundColor: "#5C4A10",
  },
  baseBar: {
    position: "absolute",
    top: 28,
    width: 32,
    height: 4,
    borderRadius: 1,
    backgroundColor: "#5C4A10",
  },
});

const avatarStyles = StyleSheet.create({
  markerContainer: {
    width: 54,
    height: 61,
    alignItems: "center",
  },
  avatarFrame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#5A7258",
    backgroundColor: "#ffffff",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  trianglePointer: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#5A7258",
    marginTop: -3,
  },
});

const billboardStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    height: 84,
    width: 94,
  },
  marker: {
    alignItems: "center",
    backgroundColor: "#F7E7CD",
    borderColor: "#5A7258",
    borderRadius: 16,
    borderWidth: 5,
    height: 60,
    justifyContent: "center",
    width: 88,
  },
  pin: {
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderLeftWidth: 15,
    borderRightColor: "transparent",
    borderRightWidth: 15,
    borderStyle: "solid",
    borderTopColor: "#5A7258",
    borderTopWidth: 24,
    height: 0,
    marginTop: -1,
    width: 0,
  },
  text: {
    color: "#5A7258",
    fontFamily: fonts.family,
    fontSize: 38,
    lineHeight: 38,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  map: {
    flex: 1,
  },
  callout: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  calloutContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  calloutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calloutTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calloutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  calloutDismiss: {
    fontSize: 16,
    color: "#999",
  },
  calloutDescription: {
    fontSize: 14,
    color: "#555",
    marginTop: 8,
    lineHeight: 20,
  },
  checkInButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDarker,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  checkInButtonDone: {
    backgroundColor: colors.sageLight,
    opacity: 0.72,
  },
  checkInText: {
    color: colors.creamText,
    fontFamily: fonts.family,
    fontSize: 20,
  },
});
