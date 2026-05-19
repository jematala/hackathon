import L from "leaflet";

export type MarkerSpec = {
  html: string;
  className?: string;
  size: [number, number];
  anchor: [number, number];
};

export function createPOIMarker(title: string): MarkerSpec {
  return {
    className: "poi-marker",
    size: [32, 40],
    anchor: [16, 40],
    html: `
      <div class="poi-marker-inner" title="${title}">
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
          <rect x="2" y="8" width="28" height="20" rx="3"
                fill="#8B6914" stroke="#5C4A10" stroke-width="2"/>
          <rect x="0" y="28" width="32" height="4" rx="1" fill="#5C4A10"/>
          <line x1="16" y1="12" x2="16" y2="24" stroke="#5C4A10" stroke-width="2"/>
          <line x1="10" y1="18" x2="22" y2="18" stroke="#5C4A10" stroke-width="2"/>
          <circle cx="16" cy="5" r="4"
                  fill="#FFD700" stroke="#B8860B" stroke-width="1.5"/>
        </svg>
      </div>
    `,
  };
}

export function createUserAvatarMarker(imageUrl: string): MarkerSpec {
  return {
    className: "user-avatar-marker",
    size: [54, 61],
    anchor: [27, 61],
    html: `
      <div style="display:flex; flex-direction:column; align-items:center;">
        <div style="
          width:48px;
          height:48px;
          border-radius:50%;
          overflow:hidden;
          border:3px solid #5b7559;
        ">
          <img src="${imageUrl}"
               style="width:100%; height:100%; object-fit:cover;" />
        </div>
        <div style="
          width:0;height:0;
          border-left:8px solid transparent;
          border-right:8px solid transparent;
          border-top:10px solid #5b7559;
          margin-top:-3px;
        " />
      </div>
    `,
  };
}

export function toLeafletIcon(spec: MarkerSpec): L.DivIcon {
  return L.divIcon({
    className: spec.className,
    html: spec.html,
    iconSize: spec.size,
    iconAnchor: spec.anchor,
    popupAnchor: [0, -spec.anchor[1]],
  });
}
