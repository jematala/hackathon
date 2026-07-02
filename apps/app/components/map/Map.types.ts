export type MapHandle = { invalidateSize: () => void };

export type MapPoint = {
  id: string;
  title: string;
  lat: number;
  lng: number;
};

export type MapPoi = MapPoint & {
  description?: string | null;
  visited?: boolean;
};

export type MapLocation = {
  latitude: number;
  longitude: number;
};

export type MapProps = {
  location?: MapLocation | null;
  billboards: MapPoint[];
  onBillboardPress?: (id: string) => void;
  pois: MapPoi[];
  /** Called with the tapped coordinates when the map surface is pressed. */
  onMapPress?: (lat: number, lng: number) => void;
  /** A pending/draft pin to render (e.g. while placing a new POI). */
  draftPin?: { lat: number; lng: number } | null;
};
