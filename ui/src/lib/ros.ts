import ROSLIB from "roslib";
import React from "react";

const defaultURL = `ws://${window.location.hostname}:9090`;

const ros = new ROSLIB.Ros({
  url: import.meta.env.VITE_ROSBRIDGE_URL ?? "ws://localhost:9090",
});

export function useTopic<T = any>(
  topic: string,
  msgType: string,
  cb: (msg: T) => void,
) {
  React.useEffect(() => {
    const t = new ROSLIB.Topic({ ros, name: topic, messageType: msgType });
    t.subscribe(cb);
    return () => t.unsubscribe(cb);
  }, [topic, msgType, cb]);
}

export { ros };

