import { useViz } from "../store/useVizStore";
import type { ComponentEntry } from "../store/useRimcoStore";
import { useRimco } from "../store/useRimcoStore";

const levelColor: Record<number, string> = {
  0: "bg-ok",        // OK
  1: "bg-warn",      // WARN
  2: "bg-danger",    // ERROR
  3: "bg-warn",      // STALE (treat like warn)
};

export interface ComponentStatus {
  name: string;
  level: number | null;   // null until first message or after timeout
  message?: string;
  lastUpdate: number;     // unix millis
}

export default function StatusCard({data}:{data:ComponentEntry}){
  const clock = useRimco(s=>s.clock);

  const ttl = useViz((s)=>s.settings.stale_ttl_ms);

  const stale = clock - data.lastUpdate > ttl;
  const color = stale ? "bg-gray-300" : levelColor[data.level] || "bg-gray-300";


  const tooltip = stale
    ? "Stale: There is no information about this component."
    : data.level === 2
      ? "Error: This component doesn't meet the required frequency."
      : data.level === 1
        ? "Warn: This component hasn't been turned on yet."
        : "OK: This component works fine.";

  return (
    <div
      className="rounded-lg shadow px-4 py-3 bg-white w-48"
      title={tooltip}
      aria-label={tooltip}
    >
      <h3 className="text-sm mb-2 truncate">{data.name}</h3>
      <div className={`mx-auto h-8 w-8 rounded-full ${color}`}/>
      <p className="mt-1 text-center text-xs text-gray-600">
        {stale ? "STALE" : ["OK","WARN","ERR","STALE"][data.level] }
      </p>
    </div>
  );
}
