import { useViz } from "../store/useVizStore";
import { useEffect, useState } from "react";


export default function BoolCard({
  topic,
  title,
}: {
  topic: string;
  title: string;
}) {

  const raw_val = useViz((s) => s.lastValue[topic]) as { data: boolean; stamp: number } | undefined;
  const staleTTL = useViz((s) => s.settings.stale_ttl_ms);

  const [val, setVal] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (raw_val) {
      const elapsed = Date.now() - raw_val.stamp;
      if (elapsed > staleTTL) {
        setVal(undefined);
      } else {
        setVal(raw_val.data);
      }
    } else {
      setVal(undefined);
    }
  }, [raw_val, staleTTL]);

  const color =
    val === undefined ? "bg-gray-300" : val ? "bg-emerald-500" : "bg-red-500";

  return (
    <div className="rounded-lg shadow bg-white w-48 p-3 space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="break-words text-xs text-gray-500">{topic}</p>
      <div className={`w-6 h-6 mx-auto rounded-full ${color}`} />
    </div>
  );
}
