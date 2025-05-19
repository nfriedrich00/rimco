import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
} from "react-leaflet";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LatLngLiteral } from "leaflet";
import L from "leaflet";

import ArrowMarker from "./ArrowMarker";
import { useTopic } from "../lib/ros";
import { useRimco } from "../store/useRimcoStore";

/* ---------------- helpers ---------------- */
const Z = 18;
const enuToLatLon = (map: L.Map, x: number, y: number): LatLngLiteral => {
  const c = map.getCenter();
  const p0 = map.project(c, Z);
  return map.unproject(L.point(p0.x + x * 100, p0.y - y * 100), Z);
};

export type Fix = { lat: number; lon: number };

/* ---------------- overlay ---------------- */
function Overlay() {
  const { map, setTrackShow, clearTracks } = useRimco();
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute bottom-2 left-2 z-[1000] text-sm">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded bg-white/80 px-2 py-1 shadow"
        >
          ▲ options
        </button>
      ) : (
        <div className="rounded bg-white/90 p-3 space-y-2 shadow">
          {(["global", "local", "gnss"] as const).map((k) => (
            <label key={k} className="block">
              <input
                type="checkbox"
                checked={map.show[k]}
                onChange={(e) => setTrackShow(k, e.target.checked)}
              />{" "}
              <span
                className={
                  k === "global"
                    ? "text-blue-600"
                    : k === "local"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {k === "global"
                  ? "Global odom"
                  : k === "local"
                  ? "Local odom"
                  : "GNSS fix"}
              </span>
            </label>
          ))}
          <button
            onClick={clearTracks}
            className="mt-1 w-full rounded bg-gray-200 py-1"
          >
            Clear
          </button>
          <button
            onClick={() => setOpen(false)}
            className="mt-1 w-full rounded bg-gray-50 py-1"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- main ---------------- */
export default function MapView({
  fix,
  children,
}: {
  fix: Fix;
  children?: ReactNode;
}) {
  const store = useRimco();
  const mapRef = useRef<L.Map>(null);

  /* ----- ROS subscriptions (always on) ----- */
  useTopic<any>("/demo/odom", "nav_msgs/msg/Odometry", (m) => {
    if (!mapRef.current) return;
    const p = m.pose.pose.position;
    const pos = enuToLatLon(mapRef.current, p.x, p.y);
    const { x, y, z, w } = m.pose.pose.orientation;
    const yaw = -Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) + Math.PI / 2;
    store.pushTrack("global", pos, yaw);
  });

  useTopic<any>("/demo/odom", "nav_msgs/msg/Odometry", (m) => {
    console.log("gnss:", g.gnss.last, "globalYaw:", g.global.yaw, "localYaw:", g.local.yaw);
    if (!mapRef.current) return;
    const p = m.pose.pose.position;
    const pos = enuToLatLon(mapRef.current, p.x, p.y);
    const { x, y, z, w } = m.pose.pose.orientation;
    const yaw = -Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) + Math.PI / 2;
    store.pushTrack("local", pos, yaw);
  });

  useTopic<any>("/demo/fix", "sensor_msgs/msg/NavSatFix", (m) => {
    store.pushTrack("gnss", { lat: m.latitude, lng: m.longitude });
  });

  /* ----- render ----- */
  const { map } = store;
  const g = map.tracks;

  return (
    <MapContainer
      center={[fix.lat, fix.lon]}
      zoom={18}
      style={{ height: "60vh", minHeight: "400px", width: "100%" }}
      whenCreated={(m) => (mapRef.current = m)}
      className="relative"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {map.show.global && (
        <>
          <Polyline positions={g.gnss.tail} pathOptions={{ color: "#1e90ff" }} />
          {g.gnss.last && (
            <ArrowMarker
              lat={g.gnss.last.lat}
              lon={g.gnss.last.lng}
              yaw={g.global.yaw ?? 0}
              color="blue"
            />
          )}
        </>
      )}

      {map.show.local && (
        <>
          <Polyline positions={g.gnss.tail} pathOptions={{ color: "#20c997" }} />
          {g.local.yaw != null && g.gnss.last && (
            <ArrowMarker
              lat={g.gnss.last.lat}
              lon={g.gnss.last.lng}
              yaw={g.local.yaw ?? 0}
              color="green"
            />
          )}
        </>
      )}

      {map.show.gnss && (
        <>
          <Polyline positions={g.gnss.tail} pathOptions={{ color: "#e11d48" }} />
          {g.gnss.last && <Marker position={g.gnss.last} />}
        </>
      )}

      <Overlay />
      {children}
    </MapContainer>
  );
}
