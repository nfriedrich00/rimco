/* ui/src/lib/backend.ts */
import { useEffect, useRef } from "react";
import { useViz } from "../store/useVizStore";


export function useBackendSync() {
  const setValue    = useViz((s) => s.setValue);
  const setSettings = useViz((s) => s.setSettings);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_BACKEND_URL + "/ws");
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.kind === "snapshot") {
        Object.entries(m.values).forEach(([t, d]) => setValue(t, d));
        setSettings(m.settings);
      } else if (m.kind === "value") {
        setValue(m.topic, { data: m.data, stamp: Date.now() });
      }
    };

    ws.onerror = (err) => console.error("Backend WS error", err);

    return () => {
      ws.close();
    };
  }, [setValue, setSettings]);
}
