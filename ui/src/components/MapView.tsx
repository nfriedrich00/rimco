import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import { useTopic } from "../lib/ros";
import L from "leaflet";
import ArrowMarker from "./ArrowMarker"
import { useRimco } from "../store/useRimcoStore";

type Fix = { lat: number; lon: number };


export default function MapView({ fix }: { fix: Fix }) {
  const { lastFix, tail, pushTail, setFix } = useRimco();
  if (!lastFix) return <p className="text-sm">Waiting for fix…</p>;

  const [latLon, setLL] = useState<[number, number]>([lastFix.lat, lastFix.lon]);
  const [yaw, setYaw] = useState(0);
  const mapRef = useRef<L.Map>(null);

  const TAIL_LEN = 3600;


  // NavSatFix
  useTopic<any>("/demo/fix", "sensor_msgs/msg/NavSatFix", (msg) => {
    setFix(msg.latitude, msg.longitude, lastFix?.yaw ?? 0);
    pushTail([msg.latitude,msg.longitude], TAIL_LEN);
  });

  // Odometry yaw
  useTopic<any>("/demo/odom", "nav_msgs/msg/Odometry", (msg) => {
    const { x, y, z, w } = msg.pose.pose.orientation;
    const t3 = 2 * (w * z + x * y);
    const t4 = 1 - 2 * (y * y + z * z);
    // ROS2 uses ENU while leaflet expects NED.
    const rosYaw = Math.atan2(t3, t4);
    const leafletHeading = -rosYaw + Math.PI / 2;
    setYaw(leafletHeading);
  });

  // auto-centre
  useEffect(() => {
    mapRef.current?.setView(latLon);
  }, [latLon]);

  return (
    <MapContainer
      center={[lastFix.lat,lastFix.lon]}
      zoom={18}
      style={{ height: "60vh", minHeight: "400px", width: "100%" }}
      whenCreated={(m) => (mapRef.current = m)}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={tail} pathOptions={{ color: "#1e90ff" }} />
      <ArrowMarker lat={lastFix.lat} lon={lastFix.lon} yaw={yaw} />
    </MapContainer>
  );
}
