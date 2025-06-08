import { useViz } from "../store/useVizStore";


export default function BoolCard({
  topic,
  title,
}: {
  topic: string;
  title: string;
}) {
  const raw   = useViz(s => s.lastValue[topic]?.data as boolean|undefined);
  const stale = useViz(s => s.staleMap[topic] ?? true);

  const color = stale
    ? "bg-gray-300"
    : raw
      ? "bg-emerald-500"
      : "bg-red-500";

  return (
    <div className="rounded-lg shadow bg-white w-48 p-3 space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="break-words text-xs text-gray-500">{topic}</p>
      <div className={`w-6 h-6 mx-auto rounded-full ${color}`} />
    </div>
  );
}
