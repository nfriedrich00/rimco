import { useViz } from "../store/useVizStore";
import { useEffect, useState } from "react";

export default function StringCard({
  topic,
  name,
}: {
  topic: string;
  name: string;
}) {

  const raw_val = useViz((s) => s.lastValue[topic]) as { data: string; stamp: number } | undefined;
  const staleTTL = useViz((s) => s.settings.stale_ttl_ms);

  const [txt, setTxt] = useState<string>('-');

  useEffect(() => {
    if (raw_val) {
      const elapsed = Date.now() - raw_val.stamp;
      if (elapsed > staleTTL) {
        setTxt('-');
      } else {
        setTxt(raw_val.data);
      }
    } else {
      setTxt('-');
    }
  }, [raw_val, staleTTL]);

  return (
    <div className="rounded-lg shadow bg-white w-48 p-3 space-y-2">
      <h3 className="text-sm font-semibold">{name}</h3>
      <p className="break-words text-xs text-gray-500">{topic}</p>
      <p className="text-base text-center mt-2 break-all">{txt}</p>
    </div>
  );
}
