import { useEffect, useState } from "react";

/** Maps DiagnosticStatus.level -> Tailwind colour */
const levelColour: Record<number, string> = {
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

export default function StatusCard({ data }: { data: ComponentStatus }) {
  const now = Date.now();
  const stale = now - data.lastUpdate > 10_000;     // 10 s timeout
  const colour =
    data.level === null || stale
      ? "bg-gray-300"
      : levelColour[data.level] ?? "bg-gray-300";

  return (
    <div className="rounded-lg shadow px-4 py-3 bg-white w-48">
      <h3 className="text-sm mb-2 truncate">{data.name}</h3>
      <div
        className={`mx-auto h-8 w-8 rounded-full ${colour} border border-gray-400`}
      />
      <p className="mt-1 text-center text-xs text-gray-600">
        {stale
          ? "STALE"
          : data.level === null
          ? "—"
          : ["OK", "WARN", "ERR", "STALE"][data.level] ?? data.level}
      </p>
    </div>
  );
}

