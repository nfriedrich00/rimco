import MapView from "../components/MapView";
import type { Fix } from "../components/MapView";
import Joystick from "../components/Joystick";
import { useRimco } from "../store/useRimcoStore";

function useFix(): Fix | null {
  const last = useRimco(s => s.map.tracks.gnss.last);
  if (!last) return null;
  return { lat: last.lat, lon: last.lng };
}

export default function ManualControl() {
  const fix = useFix();

  {/* -------------------------------- PAGE -------------------------------- */}
  if (!fix) return <p className="p-6">Waiting for robot pose…</p>;  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
      <MapView fix={fix} />

      <div className="space-y-4">
        <Joystick/>
        <div className="rounded-lg bg-white shadow p-3 w-48">
          <h3 className="text-sm font-semibold mb-2">Coordinates</h3>
          <p className="text-sm monospace">
            {fix.lat.toFixed(6)}<br />
            {fix.lon.toFixed(6)}<br />
            yaw todo°
          </p>
        </div>
      </div>
    </div>
  );
}
