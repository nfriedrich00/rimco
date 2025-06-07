import { useViz } from "../store/useVizStore";

export default function StringCard({
  topic,
  name,
}: {
  topic: string;
  name: string;
}) {
  const raw = useViz(s => s.lastValue[topic]?.data as string|undefined);
  const stale = useViz(s => s.staleMap[topic] ?? true);

  const display = (!stale && typeof raw === "string") ? raw : "-";

  return (
    <div className="rounded-lg shadow bg-white w-48 p-3 space-y-2">
      <h3 className="text-sm font-semibold">{name}</h3>
      <p className="break-words text-xs text-gray-500">{topic}</p>
      <p className="text-base text-center mt-2 break-all">{display}</p>
    </div>
  );
}
