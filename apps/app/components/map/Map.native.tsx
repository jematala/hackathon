import { Asset } from "expo-asset";
import { forwardRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
// Import Marker alongside Map from the library
import { Camera, Map as MapLibre, Marker } from "@maplibre/maplibre-react-native";

import { UNSW_CENTER, DEMO_POIS } from "@/constants/coordinates";

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

type POI = (typeof DEMO_POIS)[number];

interface POIMarkerProps {
  poi: POI & { coordinate?: [number, number]; lng?: number; lat?: number };
  isSelected: boolean;
  onPress: () => void;
}

function POIMarker({ poi, isSelected, onPress }: POIMarkerProps) {
  // Gracefully adapt to whatever coordinate layout DEMO_POIS uses
  const coordinate = poi.coordinate || [poi.lng ?? 0, poi.lat ?? 0];

  return (
    <Marker lngLat={coordinate} anchor="bottom">
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

export default forwardRef<{ invalidateSize: () => void }>(function Map(_props, _ref) {
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);

  const userAvatarUrl = Asset.fromModule(require("@/assets/images/avatar.png")).uri;

  return (
    <View style={styles.container}>
      <MapLibre style={styles.map} mapStyle={MAP_STYLE} onPress={() => setSelectedPOI(null)}>
        <Camera
          initialViewState={{
            center: [UNSW_CENTER.lng, UNSW_CENTER.lat],
            zoom: 18,
          }}
        />
        {DEMO_POIS.map((poi) => (
          <POIMarker
            key={poi.title}
            poi={poi}
            isSelected={selectedPOI?.title === poi.title}
            onPress={() => setSelectedPOI((prev) => (prev?.title === poi.title ? null : poi))}
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
                onPress={() => setSelectedPOI(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.calloutDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.calloutDescription}>{selectedPOI.description}</Text>
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
});
