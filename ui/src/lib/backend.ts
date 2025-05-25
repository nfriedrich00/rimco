/* ui/src/lib/backend.ts */
import { useEffect } from "react";
import { useViz } from "../store/useVizStore";

const ws = new WebSocket(import.meta.env.VITE_BACKEND_URL);

export function useBackendSync() {
  const setValue    = useViz((s) => s.setValue);
  const setSettings = useViz((s) => s.setSettings);

  useEffect(() => {
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.kind === "snapshot") {
        Object.entries(m.values).forEach(([t, d]) => setValue(t, d));
        setSettings(m.settings);
      } else if (m.kind === "value") {
        setValue(m.topic, m.data);
      }
    };
  }, [setValue, setSettings]);
}
