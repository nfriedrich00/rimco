import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
} from "react-leaflet";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { LatLngLiteral } from "leaflet";
import L from "leaflet";
import React from "react";

import ArrowMarker from "./ArrowMarker";
import { useRimco } from "../store/useRimcoStore";

/* ---------------- helpers ---------------- */
const Z = 18;
const mapbox_token = import.meta.env.VITE_MAPBOX_TOKEN;
const tiles_url = mapbox_token
  ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}?access_token=${mapbox_token}`
  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
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

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
        <div className="rounded bg-white p-3 space-y-2 shadow">
          {Object.entries(map.tracks).map(([name, t]) => (
            <label key={name} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={map.show[name]}
                onChange={e => setTrackShow(name, e.target.checked)}
              />
              <span style={{ color: t.color }}>{t.displayName}</span>
            </label>
          ))}
          <div className="flex gap-2 mt-2">
            <button
              onClick={clearTracks}
              className="flex-1 rounded bg-red-100 py-1 text-red-700 text-sm"
            >
              Clear
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex-1 rounded bg-gray-200 py-1 text-gray-800 text-sm"
            >
              Close
            </button>
          </div>
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
  fix: { lat: number; lon: number };
  children?: ReactNode;
}) {
  const { map, setTrackShow, clearTracks } = useRimco();
  const menu = (
    <div className="absolute bottom-2 left-2 bg-white p-2 rounded shadow">
      {(Object.entries(map.tracks) as [string,any][]).map(([name,t]) => (
        <label key={name} className="block">
          <input
            type="checkbox"
            checked={map.show[name]}
            onChange={e => setTrackShow(name,e.target.checked)}
          />{" "}
          <span style={{ color: t.color }}>{t.displayName}</span>
        </label>
      ))}
      <button onClick={clearTracks} className="mt-2 text-sm text-red-600">
        Clear all
      </button>
    </div>
  );

  return (
    <MapContainer
      center={[fix.lat, fix.lon]}
      zoom={18}
      maxZoom={22}
      style={{ height: "60vh", minHeight: "400px", width: "100%" }}
      className="h-[60vh] w-full"
    >
      <TileLayer url={tiles_url}
        tileSize={512}
        zoomOffset={-1}
        maxNativeZoom={18}  // actual tiles go to 18
        maxZoom={22}      
      />

      {Object.entries(map.tracks).map(([name, t]) =>
      map.show[name] ? (
        <React.Fragment key={name}>
        <Polyline positions={t.tail} pathOptions={{ color: t.color }} />
        {t.last && (
          (t.yaw != null ? (
          <ArrowMarker
            lat={t.last.lat}
            lon={t.last.lng}
            yaw={t.yaw}
            color={t.color}
          />
          ) : (
          <Marker
            position={[t.last.lat, t.last.lng]}
          />
          ))
          )}
        </React.Fragment>
      ) : null
      )}
      <Overlay />
      {children}
    </MapContainer>
  );
}