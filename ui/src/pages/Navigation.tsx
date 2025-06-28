import { useEffect, useState } from "react";
import MapView from "../components/MapView";
import { useRimco } from "../store/useRimcoStore";
import { useMapEvents, Marker } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";

import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { toast } from "react-toastify";
import LoadingOverlay from "react-loading-overlay-ts";

const defaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function useFix(): { lat: number, lon: number, yaw?: number } | null {
  const track = useRimco(s => s.map.tracks["gnss"]);
  if (!track?.last) return null;
  return {
    lat:  track.last.lat,
    lon:  track.last.lng,
    yaw:  track.yaw ?? 0
  };
}

export default function Navigation() {
  const fix = useFix();
  const api_url = import.meta.env.VITE_API_URL || '';


  // pickMode = true => user is picking a target
  const [pickMode, setPick] = useState(false);
  const [target, setTarget] = useState<LatLngLiteral | null>(null);
  const [selectedFile, setFile] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [notif, setNotif] = useState<{ msg:string; type:"success"|"error" }|null>(null);


  // Esc key is the same as clicking cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Helper: Cancel pick
  // return from pick mode to default
  // and clear the marker
  const handleCancel = () => {
    setPick(false);
    setTarget(null);
  };

  // Helper: Confirm pick
  // return from pick mode to default
  // after sending the navigate-to-pose action request (todo)
  const handleConfirm = () => {
    if (!target || busy) return;
    setBusy(true);

    const cmd = 
      `action send_goal /follow_gps_waypoints ` +
      `nav2_msgs/action/FollowGPSWaypoints ` +
      `'{gps_poses: [{position: {latitude: ${target.lat}, longitude: ${target.lng}}}]}'`;

    const url = `${api_url}/api/ros2-stream?cmd=${encodeURIComponent(cmd)}`;
    const es = new EventSource(url);

    // ESC to cancel the SSE
    let accepted = false;
    const onEsc = (e: KeyboardEvent) => {
      if (!accepted && e.key === "Escape") {
        cleanup("Command cancelled", "error");
      }
    };
    window.addEventListener("keydown", onEsc);

    const cleanup = (msg?:string, type?:"success"|"error") => {
      setBusy(false);
      if (msg) toast[type!](msg);
      es.close();
      window.removeEventListener("keydown", onEsc);
    };

    es.addEventListener("start", () => toast.info("Navigation: Request sent"));
    //es.addEventListener("waiting", (e) => toast.info(`Navigation: ${JSON.parse(e.data).msg}`));
    es.addEventListener("accepted", () => {
      accepted = true;
      toast.success("Navigation: Goal accepted");
      setBusy(false);
      window.removeEventListener("keydown", onEsc);
      es.close();
    });
    es.addEventListener("finished", () => toast.info("Navigation: Goal finished"));
    es.addEventListener("error", (e) => {
      toast.error(JSON.parse((e as MessageEvent).data).msg || "Navigation: Error");
      cleanup();
    });
    es.addEventListener("end", () => cleanup());

    es.addEventListener("close", () => window.removeEventListener("keydown", onEsc));
  };

  // Map click listener
  function ClickCapture({ onPick }: { onPick: (p: LatLngLiteral) => void }) {
    useMapEvents({
      click(e) {
        onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return null;
  }



  {/* -------------------------------- PAGE -------------------------------- */}
  if (!fix) return <p className="p-6">Waiting for robot pose…</p>;
  return (
    <LoadingOverlay
      active={busy}
      spinner
      text="Waiting for action server…"
      styles={{
        overlay: base => ({
          ...base,
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 9999,
        }),
        content: base => ({
          ...base,
          color: "white",
          textAlign: "center",
        }),
      }}
    >
      <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">

        {/* ------------------------------- MAP ------------------------------ */}
        <MapView fix={fix}>
          {pickMode && <ClickCapture onPick={setTarget} />}
          {/* Only show marker if user is picking AND target is set */}
          {pickMode && target && (
            <Marker position={target} icon={defaultIcon} />
          )}
        </MapView>

        {/* --------------------------- SIDE TILES --------------------------- */}
        <div className="space-y-4 mt-4 lg:mt-0 w-64">

          {/* -------------------------- PICK AND GO ------------------------- */}
          <div className="bg-white shadow rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Pick-and-Go</h3>

            <button
              onClick={() => {
                // toggle pickMode on
                setPick(true);
                setTarget(null);
              }}
              disabled={pickMode}
              className={`w-full rounded-md py-2 ${
                pickMode ? "bg-gray-300 cursor-not-allowed" : "bg-emerald-600"
              } text-white`}
            >
              Select goal
            </button>

            {pickMode && (
              <>
                <button
                  onClick={handleCancel}
                  className="w-full rounded-md py-2 bg-red-600 text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!target}
                  className={`w-full rounded-md py-2 ${
                    target
                      ? "bg-brand text-white"
                      : "bg-gray-300 text-gray-600 cursor-not-allowed"
                  }`}
                >
                  Confirm
                </button>
              </>
            )}

            <p className="text-sm text-gray-500">
              Status: &nbsp;<span className="text-gray-400">—</span>
            </p>
          </div>

          {/* --------------------------- WAYPOINTS -------------------------- */}
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
    </LoadingOverlay>
  );
}
