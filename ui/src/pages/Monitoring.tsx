import { useEffect, useRef, useState } from "react";
import { useTopic } from "../lib/ros";
import StatusCard from "../components/StatusCard";
import type { ComponentStatus } from "../components/StatusCard";
import { useRimco } from "../store/useRimcoStore";

/**
 * Holds latest status for each component.
 * useRef so we don't trigger a React re-render for every msg;
 * we batch updates once per animation frame.
 */
const useMonitoringData = () => {
  const mapRef = useRef<Map<string, ComponentStatus>>(new Map());
  const [, forceRender] = useState(0);

  // subscribe
  useTopic<any>("/monitoring", "diagnostic_msgs/msg/DiagnosticStatus", (msg) => {
    const entry: ComponentStatus = {
      name: msg.name,
      level: msg.level,
      message: msg.message,
      lastUpdate: Date.now(),
    };
    useRimco.getState().upsertComponent(msg.name, msg.level)
    ////mapRef.current.set(msg.name, entry);
    // batch repaint via requestAnimationFrame
    requestAnimationFrame(() => forceRender((x) => x + 1));
  });

  // periodic stale-check repaint (every second)
  useEffect(() => {
    const id = setInterval(
      () => forceRender((x) => x + 1),
      1_000,
    );
    return () => clearInterval(id);
  }, []);

  return Array.from(mapRef.current.values());
};

export default function Monitoring() {
  useMonitoringData();
  const components = Object.values(useRimco((s) => s.components));
  // simple two-column wrap; swap for react-grid-layout later
  return (
    <div className="p-6 flex flex-wrap gap-4">
      {components.map((c) => (
        <StatusCard key={c.name} data={c} />
      ))}
    </div>
  );
}
