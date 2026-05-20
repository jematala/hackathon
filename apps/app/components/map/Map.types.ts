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
  onPoiCheckIn?: (id: string) => void;
  pois: MapPoi[];
};
