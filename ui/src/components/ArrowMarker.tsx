import { useEffect } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";

const arrowSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">
  <polygon points="15,0 25,30 15,24 5,30" fill="red"/>
</svg>`);

export default function ArrowMarker({
  lat,
  lon,
  yaw,
}: {
  lat: number;
  lon: number;
  yaw: number; // radians
}) {
  const icon = L.divIcon({
    className: "",
    html: `<img src="data:image/svg+xml,${arrowSvg}" style="transform:rotate(${yaw}rad);transform-origin:center"/>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  // Leaflet caches the divIcon; force recreate when yaw changes
  useEffect(() => {}, [yaw]);

  return <Marker position={[lat, lon]} icon={icon} />;
}

