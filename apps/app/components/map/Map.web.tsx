import { Asset } from 'expo-asset';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { UNSW_CENTER, DEMO_POIS } from '@/constants/coordinates';
import { createPOIIcon, createUserAvatarIcon } from './markers';

const TILE_URL =
  'https://api.thunderforest.com/neighbourhood/{z}/{x}/{y}{r}.png?apikey=0f64302472524b558aa92ebe1c088f04';
const TILE_ATTR =
  '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type MapHandle = { invalidateSize: () => void };

export const Map = forwardRef<MapHandle>(function Map(_props, ref) {
  const containerRef = useRef<View | null>(null);
  const mapRef = useRef<{
    invalidateSize: () => void;
    remove: () => void;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    invalidateSize: () => {
      mapRef.current?.invalidateSize();
    },
  }));

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;

    const container = containerRef.current as unknown as HTMLElement;
    if (!container) return;

    let map: { invalidateSize: () => void; remove: () => void } | null = null;

    import('leaflet').then((L) => {
      map = L.map(container, {
        center: [UNSW_CENTER.lat, UNSW_CENTER.lng],
        zoom: 19,
        minZoom: 18,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTR,
        maxZoom: 22,
        maxNativeZoom: 21,
      }).addTo(map);

      for (const poi of DEMO_POIS) {
        L.marker([poi.lat, poi.lng], {
          icon: createPOIIcon(poi.title),
        })
          .addTo(map)
          .bindPopup(`<strong>${poi.title}</strong><br/>${poi.description}`);
      }

      const avatarUrl = Asset.fromModule(
        require('@/assets/images/avatar.png'),
      ).uri;
      L.marker([UNSW_CENTER.lat, UNSW_CENTER.lng], {
        icon: createUserAvatarIcon(avatarUrl),
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  return <View ref={containerRef} style={styles.container} />;
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});
