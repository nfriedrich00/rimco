import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import React from "react";
import { useEffect, useRef, useState } from "react";
import { useTopic } from "../lib/ros";
import L from "leaflet";
import ArrowMarker from "./ArrowMarker"

type Fix = { lat: number; lon: number };

const DEFAULT_POS: [number, number] = [50.92570234902536, 13.331672374817645];

const TAIL_LEN = 200;


export default function MapView({ fix }: { fix: Fix }) {
  const [path, setPath] = useState<[number, number][]>([]);
  const [latLon, setLL] = useState<[number, number]>(DEFAULT_POS);
  const [yaw, setYaw] = useState(0);
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    const last = path[path.length - 1];
    if (!last || last[0] !== fix.lat || last[1] !== fix.lon) {
      setPath((prev) => [...prev, [fix.lat, fix.lon]].slice(-TAIL_LEN));
    }
  }, [fix, path]);

  // NavSatFix
  useTopic<any>("/demo/fix", "sensor_msgs/msg/NavSatFix", (msg) => {
    setLL([msg.latitude, msg.longitude]);
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
      center={DEFAULT_POS}
      zoom={18}
      style={{ height: "60vh", minHeight: "400px", width: "100%" }}
      whenCreated={(m) => (mapRef.current = m)}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={path} pathOptions={{ color: "#1e90ff" }} />
      <ArrowMarker lat={latLon[0]} lon={latLon[1]} yaw={yaw} />
    </MapContainer>
  );
}
