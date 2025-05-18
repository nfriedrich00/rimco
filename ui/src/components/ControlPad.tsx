import { useEffect, useRef, useState } from "react";
import { ros } from "../lib/ros";
import ROSLIB from "roslib";

const topic = new ROSLIB.Topic({
  ros,
  name: "/cmd_vel",
  messageType: "geometry_msgs/msg/Twist",
});

const V = 0.3;   // m/s
const W = 0.6;   // rad/s

export default function ControlPad() {
  const [vx, setVx] = useState(0);
  const [wz, setWz] = useState(0);
  const timerRef = useRef<number | null>(null);

  // start / stop publisher loop
  useEffect(() => {
    if (vx !== 0 || wz !== 0) {
      timerRef.current ??= window.setInterval(() => {
        topic.publish({
          linear: { x: vx, y: 0, z: 0 },
          angular: { x: 0, y: 0, z: wz },
        });
      }, 100); // 10 Hz
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      topic.publish({ linear: { x: 0, y: 0, z: 0 }, angular: { z: 0 } });
    }
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [vx, wz]);

  const press = (vx: number, wz: number) => () => {
    setVx(vx);
    setWz(wz);
  };
  const release = () => {
    setVx(0);
    setWz(0);
  };

  return (
    <div className="grid grid-cols-3 gap-1">
      <button className="pad-btn" onMouseDown={press(V, 0)} onMouseUp={release}>
        ↑
      </button>
      <button className="pad-btn" onMouseDown={press(0, 0)} onMouseUp={release}>
        ●
      </button>
      <button className="pad-btn" onMouseDown={press(0, -W)} onMouseUp={release}>
        →
      </button>
      <button className="pad-btn" onMouseDown={press(-V, 0)} onMouseUp={release}>
        ↓
      </button>
      <style jsx>{`
        .pad-btn {
          @apply w-12 h-12 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400;
        }
      `}</style>
    </div>
  );
}

