import L from "leaflet";

export function createPOIIcon(title: string): L.DivIcon {
  return L.divIcon({
    className: "poi-marker",
    html: `<div class="poi-marker-inner" title="${title}">
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
        <rect x="2" y="8" width="28" height="20" rx="3" fill="#8B6914" stroke="#5C4A10" stroke-width="2"/>
        <rect x="0" y="28" width="32" height="4" rx="1" fill="#5C4A10"/>
        <line x1="16" y1="12" x2="16" y2="24" stroke="#5C4A10" stroke-width="2"/>
        <line x1="10" y1="18" x2="22" y2="18" stroke="#5C4A10" stroke-width="2"/>
        <circle cx="16" cy="5" r="4" fill="#FFD700" stroke="#B8860B" stroke-width="1.5"/>
      </svg>
    </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -44],
  });
}

export function createUserAvatarIcon(imageUrl: string): L.DivIcon {
  return L.divIcon({
    className: "user-avatar-marker",
    html: `<div style="display: flex; flex-direction: column; align-items: center;">
      <div style="border: 3px solid #5b7559; border-radius: 50%; width: 48px; height: 48px; overflow: hidden;">
        <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>
      <div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #5b7559; margin-top: -3px;"></div>
    </div>`,
    iconSize: [54, 61],
    iconAnchor: [27, 61],
  });
}
