import { useViz } from "../store/useVizStore";

export interface NumberCardProps {
  topic: string;
  name: string;
  unit?: string;
  messageType: "std_msgs/msg/Float32" | "std_msgs/msg/Int16";
}

export default function NumberCard({
  name,
  topic,
  unit,
}: {
  topic: string;
  name: string;
  unit?: string;
  messageType: "std_msgs/msg/Float32" | "std_msgs/msg/Int16";
}) {
  const raw = useViz(s => s.lastValue[topic]?.data as number|undefined);
  const stale = useViz(s => s.staleMap[topic] ?? true);

  const display = (!stale && typeof raw==="number") ? raw.toFixed(2) : "-";

  return (
    <div className="rounded-lg shadow bg-white w-48 p-3 space-y-2">
      <h3 className="text-sm font-semibold">{name}</h3>
      <p className="break-words text-xs text-gray-500">{topic}</p>
      <p className="text-xl font-semibold text-center mt-2">
        {display}{" "}
        <span className="text-sm font-normal">{unit}</span>
      </p>
    </div>
  );
}
