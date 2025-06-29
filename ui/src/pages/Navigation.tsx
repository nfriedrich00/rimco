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

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"Ready" | "Request sent" | "Action running">("Ready");

  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [selectedFile, setFile] = useState<string | null>(null);
  const [forceFullRouteParameter, setForceFullRouteParameter] = useState(false);
  const [reverseRouteParameter, setReverseRouteParameter] = useState(false);

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

  // load YAML list on mount
  useEffect(() => {
    fetch(`${api_url}/api/waypoints`)
      .then(r => r.json())
      .then(setWaypoints)
      .catch(() => toast.error("Navigation: Failed to load waypoints"));
  }, []);

  // Helper: Cancel pick
  // return from pick mode to default
  // and clear the marker
  const handleCancel = () => {
    setPick(false);
    setTarget(null);
  };

  const handleStop = async () => {
    if (status !== "Action running") return;
    setBusy(false);
    setStatus("Ready");
    try {
      const res = await fetch(`${api_url}/api/navigation/action-cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server: "/follow_gps_waypoints" }),
      });
      if (res.ok) toast.warn("Navigation: Stopped");
      else toast.error("Failed to stop navigation");
    } catch {
      toast.error("Failed to stop navigation");
    }
  };

  // Helper: Confirm pick
  // return from pick mode to default
  const handleConfirm = () => {
    if (!target || busy) return;
    setBusy(true);
    setStatus("Request sent");

    const cmd = 
      `action send_goal /follow_gps_waypoints ` +
      `nav2_msgs/action/FollowGPSWaypoints ` +
      `'{gps_poses: [{position: {latitude: ${target.lat}, longitude: ${target.lng}}}]}'`;

    const url = `${api_url}/api/ros2-action?cmd=${encodeURIComponent(cmd)}`;
    const es = new EventSource(url);

    // 5 s timeout for waiting on action server
    // add settings for this todo
    let accepted = false;
    const timeoutId = setTimeout(() => {
      if (!accepted) {
        cleanup("Navigation: Request timed out", "error");
      }
    }, 10000);

    // ESC to cancel the request (not the actual action)
    const onEsc = (e: KeyboardEvent) => {
      if (!accepted && e.key === "Escape") {
        cleanup("Navigation: Request cancelled", "error");
      }
    };
    window.addEventListener("keydown", onEsc);

    // pointer (click or tap) to cancel the request (not the actual action)
    const onPointer = () => {
      if (!accepted) {
        cleanup("Navigation: Request cancelled", "error");
      }
    };
    window.addEventListener("pointerdown", onPointer);

    const cleanup = (msg?:string, type?:"success"|"error") => {
      clearTimeout(timeoutId);
      setBusy(false);
      setStatus("Ready");
      if (msg) toast[type!](msg);
      es.close();
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("pointerdown", onPointer);
      setPick(false);
      setTarget(null);
    };

    es.addEventListener("start", () => {
      setStatus("Request sent");
      toast.info("Navigation: Request sent");
    });

    es.addEventListener("accepted", () => {
      accepted = true;
      clearTimeout(timeoutId);
      setStatus("Action running");
      toast.info("Navigation: Goal accepted");
      setPick(false);
      setBusy(false);
      window.removeEventListener("keydown", onEsc);
    });
    es.addEventListener("success", () => {
      setStatus("Ready");
      toast.success("Navigation: Goal finished");
    });

    es.addEventListener("failure", (e) => {
      setStatus("Ready");
      toast.error(JSON.parse((e as MessageEvent).data).msg || "Navigation: Error");
      cleanup();
    });

    es.addEventListener("error", (e) => {
      setStatus("Ready");
      toast.error(JSON.parse((e as MessageEvent).data).msg || "Navigation: Error");
      cleanup();
    });
    es.addEventListener("end", () => cleanup());

    es.addEventListener("close", () => window.removeEventListener("keydown", onEsc));
  };

  // To launch the waypoint follower
  const handleLaunch = async () => {
    if (!selectedFile) return;
    const cmd = [
      "run claudi_navigation waypoint_follower",
      "--ros-args",
      `-p waypoints_yaml_filepath:=/navigation/waypoints/${selectedFile}`,
      `-p force_full_route:=${forceFullRouteParameter}`,
      `-p reverse_waypoints:=${reverseRouteParameter}`
    ].join(" ");

    try {
      const res = await fetch(`${api_url}/api/ros2-sim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Waypoint follower launched");
      } else {
        toast.error(data.error || "Failed to launch waypoint follower");
      }
    } catch (err) {
      toast.error("Failed to launch waypoint follower");
    }
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

            {status === "Action running" ? (
              <button
                onClick={handleStop}
                className="w-full rounded-md py-2 bg-red-600 text-white"
              >
                Stop
              </button>
            ) : (
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
            )}

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
              Status: &nbsp;
              <span className="text-gray-700">{status}</span>
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
                {waypoints.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              {/* boolean options */}
              <div className="space-y-2 mt-2">
                {/* force full route */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="forceFullRoute"
                    checked={forceFullRouteParameter}
                    onChange={(e) => setForceFullRouteParameter(e.target.checked)}
                  />
                  <label htmlFor="forceFullRoute" className="text-sm">
                    Force full route
                  </label>
                  <div className="relative group">
                    <span className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs cursor-help">
                      ?
                    </span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 hidden group-hover:block bg-gray-700 text-white text-xs p-2 rounded w-64 max-w-md whitespace-normal z-10">
                      By default navigation starts at the closest waypoint and skips earlier ones. This forces the robot to start at the first waypoint.
                    </div>
                  </div>
                </div>
                {/* reverse waypoints */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="reverseWaypoints"
                    checked={reverseRouteParameter}
                    onChange={(e) => setReverseRouteParameter(e.target.checked)}
                  />
                  <label htmlFor="reverseWaypoints" className="text-sm">
                    Reverse waypoints
                  </label>
                  <div className="relative group">
                    <span className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs cursor-help">
                      ?
                    </span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 hidden group-hover:block bg-gray-700 text-white text-xs p-2 rounded w-64 max-w-md z-10">
                      Reverse the order of the waypoints before planning the route.
                    </div>
                  </div>
                </div>
              </div>

            <button
              onClick={handleLaunch}
              disabled={!selectedFile}
              className={`w-full rounded-md py-2 ${
                selectedFile?"bg-brand text-white":"bg-gray-300 text-gray-600 cursor-not-allowed"
              }`}
            >
              Launch
            </button>
          </div>
        </div>
      </div>
    </LoadingOverlay>
  );
}
