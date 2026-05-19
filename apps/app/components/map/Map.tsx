import { Platform } from 'react-native';
import { Map as MapNative } from './Map.native';
import { Map as MapWeb } from './Map.web';

interface MapProps {
  mapRef: React.RefObject<{
    invalidateSize: () => void;
  } | null>;
}

export default function Map({ mapRef }: MapProps) {
  if (Platform.OS !== 'web') {
    return <MapNative />;
  } else {
    return <MapWeb ref={mapRef} />;
  }
}
