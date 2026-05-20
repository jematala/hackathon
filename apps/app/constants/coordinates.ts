export const UNSW_CAMPUS_ID = "00000000-0000-4000-8000-000000000100";

export const UNSW_CENTER = { lat: -33.917, lng: 151.231 } as const;

export const DEMO_BILLBOARD = {
  id: "00000000-0000-4000-8000-000000000b01",
  title: "Campus Whiteboard",
  lat: -33.9173,
  lng: 151.2313,
} as const;

export const DEMO_POIS = [
  {
    id: "poi-1",
    title: "Main Library",
    lat: -33.9175,
    lng: 151.2315,
    description: "UNSW's main library — 7 floors, 24h study spaces.",
  },
  {
    id: "poi-2",
    title: "Science Theatre",
    lat: -33.918,
    lng: 151.2305,
    description: "Large lecture hall used for science and engineering.",
  },
  {
    id: "poi-3",
    title: "The Quad",
    lat: -33.9165,
    lng: 151.231,
    description: "Central courtyard with grass lawns and food trucks.",
  },
  {
    id: "poi-4",
    title: "Roundhouse",
    lat: -33.9173,
    lng: 151.232,
    description: "Legendary live music venue and bar on campus.",
  },
  {
    id: "poi-5",
    title: "Mathews Building",
    lat: -33.9168,
    lng: 151.2302,
    description: "Home to the School of Computer Science and Engineering.",
  },
] as const;
