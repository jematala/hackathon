import { Asset } from "expo-asset";
import { forwardRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
// Import Marker alongside Map from the library
import { Camera, Map as MapLibre, Marker } from "@maplibre/maplibre-react-native";

import { UNSW_CENTER } from "@/constants/coordinates";
import { colors } from "@/lib/theme";

import type { MapPoi, MapProps } from "./Map";

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
    <Marker lngLat={[poi.lng, poi.lat]} anchor="bottom">
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
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
      </TouchableOpacity>
    </Marker>
  );
}

function BillboardMarker({
  lat,
  lng,
  onPress,
  title,
}: {
  lat: number;
  lng: number;
  onPress: () => void;
  title: string;
}) {
  return (
    <Marker lngLat={[lng, lat]} anchor="bottom">
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={billboardStyles.marker}>
          <Text style={billboardStyles.text} numberOfLines={1}>
            {title.slice(0, 2)}
          </Text>
        </View>
        <View style={billboardStyles.pin} />
      </TouchableOpacity>
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

export default forwardRef<{ invalidateSize: () => void }, MapProps>(function Map(
  { billboards, onBillboardPress, onPoiCheckIn, pois },
  _ref,
) {
  const [selectedPOIId, setSelectedPOIId] = useState<string | null>(null);
  const selectedPOI = pois.find((poi) => poi.id === selectedPOIId) ?? null;

  const userAvatarUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;

  return (
    <View style={styles.container}>
      <MapLibre style={styles.map} mapStyle={MAP_STYLE} onPress={() => setSelectedPOIId(null)}>
        <Camera
          initialViewState={{
            center: [UNSW_CENTER.lng, UNSW_CENTER.lat],
            zoom: 18,
          }}
        />
        {pois.map((poi) => (
          <POIMarker
            key={poi.id}
            poi={poi}
            isSelected={selectedPOIId === poi.id}
            onPress={() => setSelectedPOIId((prev) => (prev === poi.id ? null : poi.id))}
          />
        ))}

        {billboards.map((billboard) => (
          <BillboardMarker
            key={billboard.id}
            lat={billboard.lat}
            lng={billboard.lng}
            title={billboard.title}
            onPress={() => onBillboardPress?.(billboard.id)}
          />
        ))}

        <UserAvatarMarker
          coordinate={[UNSW_CENTER.lng, UNSW_CENTER.lat]}
          imageUrl={userAvatarUrl}
        />
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
                onPress={() => setSelectedPOIId(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.calloutDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.calloutDescription}>{selectedPOI.description ?? ""}</Text>
            <TouchableOpacity
              disabled={selectedPOI.visited}
              onPress={() => onPoiCheckIn?.(selectedPOI.id)}
              style={[styles.checkInButton, selectedPOI.visited ? styles.checkInButtonDone : null]}
              activeOpacity={0.8}
            >
              <Text style={styles.checkInText}>
                {selectedPOI.visited ? "Checked in" : "Check in"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});

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
    borderColor: "#5b7559",
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
    borderTopColor: "#5b7559",
    marginTop: -3,
  },
});

const billboardStyles = StyleSheet.create({
  marker: {
    width: 34,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7D978",
    borderColor: "#6A401A",
    borderRadius: 3,
    borderWidth: 2,
  },
  pin: {
    alignSelf: "center",
    backgroundColor: "#6A401A",
    height: 9,
    marginTop: -1,
    width: 4,
  },
  text: {
    color: "#6A401A",
    fontFamily: "Jersey10",
    fontSize: 14,
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
    backgroundColor: colors.pinYellow,
  },
  calloutTitle: {
    color: colors.ink,
    fontFamily: "Jersey10",
    fontSize: 22,
  },
  calloutDismiss: {
    color: colors.inkSofter,
    fontSize: 16,
  },
  calloutDescription: {
    color: colors.inkSoft,
    fontFamily: "Jersey10",
    fontSize: 18,
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
    fontFamily: "Jersey10",
    fontSize: 20,
  },
});
