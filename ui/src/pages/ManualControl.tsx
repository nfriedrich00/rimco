import { useState } from "react";
import MapView from "../components/MapView";
import type { Fix } from "../components/MapView";
import ControlPad from "../components/ControlPad";
import { useTopic } from "../lib/ros";
import Joystick from "../components/Joystick";

// state hook
function useFix(): Fix {
  const [fix, setFix] = useState<Fix>({
    lat: 50.92570234902536,
    lon: 13.331672374817645,
    yaw: 0,
  });

  useTopic<any>("/demo/fix", "sensor_msgs/msg/NavSatFix", (msg) =>
    setFix((f) => ({ ...f, lat: msg.latitude, lon: msg.longitude })),
  );
  useTopic<any>("/demo/odom", "nav_msgs/msg/Odometry", (msg) => {
    // yaw from quaternion
    const { x, y, z, w } = msg.pose.pose.orientation;
    const yaw = Math.atan2(2.0 * (w * z + x * y), 1 - 2 * (y * y + z * z));
    setFix((f) => ({ ...f, yaw }));
  });

  return fix;
}

export default function ManualControl() {
  const fix = useFix();

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
      <MapView fix={fix} />

      <div className="space-y-4">
        <Joystick/>
        <div className="rounded-lg bg-white shadow p-3 w-48">
          <h3 className="text-sm font-semibold mb-2">Coordinates</h3>
          <p className="text-sm monospace">
            {fix.lat.toFixed(6)}<br />
            {fix.lon.toFixed(6)}<br />
            yaw {((fix.yaw * 180) / Math.PI).toFixed(1)}°
          </p>
        </div>
      </div>
    </div>
  );
}

