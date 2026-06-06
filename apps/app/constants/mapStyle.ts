const THUNDERFOREST_API_KEY = process.env.EXPO_PUBLIC_THUNDERFOREST_KEY ?? "YOUR_API_KEY_HERE";

export const MAP_STYLE: any = {
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
      paint: {
        "raster-brightness-min": 0.8,
        "raster-contrast": 1.5,
        "raster-saturation": 0.8,
      },
    },
  ],
};
