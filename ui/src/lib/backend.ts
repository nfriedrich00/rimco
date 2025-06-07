import { useEffect, useRef } from "react";
import { useViz } from "../store/useVizStore";
import { useRimco } from "../store/useRimcoStore";


export function useBackendSync() {
  const setValue    = useViz((s) => s.setValue);
  const setSettings = useViz((s) => s.setSettings);
  const wsRef = useRef<WebSocket | null>(null);

  const setComp  = useRimco.getState().upsertComponent;


  useEffect(() => {
  const id = setInterval(
    () => useRimco.setState({ clock: Date.now() }),
    1000
  );
  return () => clearInterval(id);
}, []);


  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_BACKEND_URL + "/ws");
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.kind === "snapshot") {
        Object.entries(m.values).forEach(([t, d]) => setValue(t, d, Date.now()));
        Object.entries(m.monitoring).forEach(([n,v]:[string,any]) => setComp(n, v.level, v.stamp));
        setSettings(m.settings);
      } else if (m.kind === "value") {
        //setValue(m.topic, { data: m.data, stamp: Date.now() });
        setValue(m.topic, m.data, Date.now());
      } else if (m.kind === "monitoring") {
        setComp(m.name, m.level, m.stamp);
      }
    };

    ws.onerror = (err) => console.error("Backend WS error", err);

    return () => {
      ws.close();
    };
  }, [setValue, setSettings]);
}
