import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import { useTopic } from "../lib/ros";
import L from "leaflet";
import { defaultIcon } from "../leafletIcons";

/** origin Dresden Airport */
const DEFAULT_POS: [number, number] = [51.13121833895035, 13.7658776013342];

export default function MapView({
  topic = "/demo/fix",
}: {
  topic?: string;
}) {
  const mapRef = useRef<L.Map>(null);
  const [pos, setPos] = useState<[number, number]>(DEFAULT_POS);

  useTopic<any>(topic, "sensor_msgs/msg/NavSatFix", (msg) => {
    setPos([msg.latitude, msg.longitude]);
  });

  // centre map on new fix
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(pos);
    }
  }, [pos]);

  return (
    <MapContainer
      center={DEFAULT_POS}
      zoom={18}
      style={{ height: "60vh", minHeight: "400px", width: "100%" }}
      whenCreated={(m) => (mapRef.current = m)}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={pos} icon={defaultIcon}>
        <Popup>
          Lat&nbsp;{pos[0].toFixed(6)}<br />Lon&nbsp;{pos[1].toFixed(6)}
        </Popup>
      </Marker>
    </MapContainer>
  );
}

