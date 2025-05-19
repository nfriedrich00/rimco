import { useState } from "react";
import MapView from "../components/MapView";
import type { Fix } from "../components/MapView";
import { useRimco } from "../store/useRimcoStore";
import { useTopic } from "../lib/ros";
import { useMapEvents, Marker } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";

import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
const defaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/* ---------- robot pose hook (as before) ---------- */
function useFix(): Fix {
  const { lastFix, setFix, pushTail } = useRimco();
  useTopic<any>("/demo/fix","sensor_msgs/msg/NavSatFix", m=>{
    setFix(m.latitude,m.longitude,lastFix?.yaw??0);
    pushTail([m.latitude,m.longitude],2000);
  });
  useTopic<any>("/demo/odom","nav_msgs/msg/Odometry", m=>{
    const {x,y,z,w}=m.pose.pose.orientation;
    const yaw=Math.atan2(2*(w*z+x*y),1-2*(y*y+z*z));
    if(lastFix) setFix(lastFix.lat,lastFix.lon,yaw);
  });
  return lastFix;
}

export default function Navigation() {
  const fix = useFix();
  const { tail } = useRimco();

  const [pickMode, setPick] = useState(false);
  const [target, setTarget] = useState<LatLngLiteral | null>(null);
  const [selectedFile, setFile] = useState<string | null>(null);

  /* Map click listener only active in pick-mode */
  function ClickCapture({ onPick }: { onPick: (p: LatLngLiteral) => void }) {
    useMapEvents({
      click(e) {
        onPick({ lat: e.latlng.lat, lon: e.latlng.lng });
      },
    });
    return null;
  }

  if(!fix) return <p className="p-6">Waiting for robot pose…</p>;

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">

      {/* ------------- MAP ------------- */}
      <MapView fix={fix}>
        {pickMode && <ClickCapture onPick={setTarget}/>}
        {target && (
          <Marker
            position={target}
            icon={defaultIcon} 
            // or omit "icon" if you have your Leaflet CSS set up to show a default marker
          />
        )}
      </MapView>

      {/* ------------- side tiles ------------- */}
      <div className="space-y-4 mt-4 lg:mt-0 w-64">
        {/* Pick-and-Go */}
        <div className="bg-white shadow rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">Pick-and-Go</h3>

          <button
            onClick={()=>setPick(v=>!v)}
            className={`w-full rounded-md py-2 ${pickMode?"bg-red-600":"bg-emerald-600"} text-white`}
          >
            {pickMode?"Cancel pick":"Select target"}
          </button>

          <button
            disabled={!target}
            className={`w-full rounded-md py-2 ${
              target?"bg-brand text-white":"bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
            /* onClick={sendNavigateGoal}  ← stubbed out */
          >
            Confirm
          </button>

          <p className="text-sm text-gray-500">
            {/* status placeholder */}
            Status: &nbsp;<span className="text-gray-400">—</span>
          </p>
        </div>

        {/* Waypoints */}
        <div className="bg-white shadow rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">Waypoints</h3>
          {/* stub dropdown */}
          <select
            className="w-full border rounded p-1"
            value={selectedFile??""}
            onChange={e=>setFile(e.target.value||null)}
          >
            <option value="">Choose YAML…</option>
            {/* TODO: populate via backend */}
            <option value="demo.yaml">demo.yaml</option>
          </select>

          <button
            disabled={!selectedFile}
            className={`w-full rounded-md py-2 ${
              selectedFile?"bg-brand text-white":"bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
            /* onClick={launchWaypoints} */
          >
            Launch
          </button>
        </div>
      </div>
    </div>
  );
}
