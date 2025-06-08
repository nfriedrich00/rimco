import { useEffect, useRef } from "react";
import { useViz } from "../store/useVizStore";
import { useRimco } from "../store/useRimcoStore";


export function useBackendSync() {
  const setValue    = useViz((s) => s.setValue);
  const pushTail = useRimco((s) => s.pushTail);
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
      console.debug("Backend WS message", e.data);
      const m = JSON.parse(e.data);
      switch (m.kind) {
        case "snapshot":
          Object.entries(m.values).forEach(([t, d]) => setValue(t, d, Date.now()));
          Object.entries(m.monitoring).forEach(([n,v]:[string,any]) => setComp(n, v.level, v.stamp));
          setSettings(m.settings);
          break;
        case "value":
          setValue(m.topic, m.data, Date.now());
          break;
        case "monitoring":
          setComp(m.name, m.level, m.stamp);
          break;
        case "track":
          useRimco.getState().pushTrack(
            m.name,
            { lat: m.data.point[0], lng: m.data.point[1] },
            m.data.yaw
          );
          break;
      }
    };

    ws.onerror = (err) => console.error("Backend WS error", err);

    return () => {
      ws.close();
    };
  }, [setValue, setSettings]);
}
