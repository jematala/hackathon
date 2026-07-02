import { Platform } from "react-native";

const LEAF_COLORS = ["#6B9F77", "#4A7C59", "#A8852E", "#C5A14A", "#8B6914"];

type Bird = {
  top: string;
  duration: number;
  delay: number;
  scale: number;
};

type Leaf = {
  left: string;
  duration: number;
  delay: number;
  scale: number;
  color: string;
};

const BIRDS: Bird[] = [
  { top: "8%", duration: 26, delay: 0, scale: 1.0 },
  { top: "18%", duration: 34, delay: 12, scale: 0.85 },
  { top: "12%", duration: 30, delay: 22, scale: 0.7 },
];

const LEAVES: Leaf[] = [
  { left: "8%", duration: 14, delay: 0, scale: 1.0, color: LEAF_COLORS[0] },
  { left: "22%", duration: 18, delay: 4, scale: 0.85, color: LEAF_COLORS[1] },
  { left: "38%", duration: 12, delay: 9, scale: 0.7, color: LEAF_COLORS[2] },
  { left: "55%", duration: 17, delay: 2, scale: 0.95, color: LEAF_COLORS[3] },
  { left: "72%", duration: 15, delay: 6, scale: 0.75, color: LEAF_COLORS[4] },
  { left: "88%", duration: 19, delay: 11, scale: 0.9, color: LEAF_COLORS[1] },
];

const BIRD_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="12" viewBox="0 0 20 12">` +
  `<path d="M0 7 L4 2 L8 7 L12 2 L16 7 L18 5 L20 7" stroke="#3d2f1f" stroke-width="2" fill="none" stroke-linecap="square" stroke-linejoin="miter" shape-rendering="crispEdges"/>` +
  `</svg>`;
const BIRD_URI = `data:image/svg+xml,${encodeURIComponent(BIRD_SVG)}`;

function leafSvgUri(color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="18" viewBox="0 0 14 18">` +
    `<ellipse cx="7" cy="9" rx="4" ry="7" fill="${color}" stroke="#2D4F35" stroke-width="1"/>` +
    `<line x1="7" y1="2" x2="7" y2="16" stroke="#2D4F35" stroke-width="1"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function MapDecor() {
  if (Platform.OS !== "web") return null;
  return (
    <div className="map-decor-layer">
      {BIRDS.map((b, i) => (
        <div
          key={`b-${i}`}
          className="map-decor-bird"
          style={{
            top: b.top,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        >
          <img
            src={BIRD_URI}
            alt=""
            width={20 * b.scale}
            height={12 * b.scale}
            style={{ imageRendering: "pixelated", display: "block" }}
          />
        </div>
      ))}
      {LEAVES.map((l, i) => (
        <div
          key={`l-${i}`}
          className="map-decor-leaf"
          style={{
            left: l.left,
            animationDuration: `${l.duration}s`,
            animationDelay: `${l.delay}s`,
          }}
        >
          <img
            src={leafSvgUri(l.color)}
            alt=""
            width={14 * l.scale}
            height={18 * l.scale}
            style={{ imageRendering: "pixelated", display: "block" }}
          />
        </div>
      ))}
    </div>
  );
}
