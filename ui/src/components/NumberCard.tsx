import { useViz } from "../store/useVizStore";
import { useEffect, useState } from "react";

export default function NumberCard({
  topic,
  name,
  unit,
  messageType
}: {
  topic: string;
  name: string;
  unit?: string;
  messageType: "std_msgs/msg/Float32" | "std_msgs/msg/Int16";
}) {

  const raw_val = useViz((s) => s.lastValue[topic]) as { data: number; stamp: number } | null;
  const staleTTL = useViz((s) => s.settings.stale_ttl_ms);

  const [val, setVal] = useState<number | null>(null);

  useEffect(() => {
    if (raw_val) {
      const elapsed = Date.now() - raw_val.stamp;
      if (elapsed > staleTTL) {
        setVal(null);
      } else {
        setVal(raw_val.data);
      }
    } else {
      setVal(null);
    }
  }, [raw_val, staleTTL]);

  return (
    <div className="rounded-lg shadow bg-white w-48 p-3 space-y-2">
      <h3 className="text-sm font-semibold">{name}</h3>
      <p className="break-words text-xs text-gray-500">{topic}</p>
      <p className="text-xl font-semibold text-center mt-2">
        {val === null ? "-" : val.toFixed(2)}{" "}
        <span className="text-sm font-normal">{unit}</span>
      </p>
    </div>
  );
}
