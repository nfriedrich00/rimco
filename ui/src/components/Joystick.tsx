import { useEffect, useRef, useState } from "react";
import ROSLIB from "roslib";
import { ros } from "../lib/ros";

/* ───────── constants ───────── */
const R = 60;              // ring radius  (px)
const KNOB = 38;           // knob diameter(px)
const V_MAX = 1.0;         // m/s  at rim
const W_MAX = 1.0;         // rad/s at rim
const PERIOD = 500;        // 2 Hz  (ms)

/* ───────── ROS topic ───────── */
const cmdVel = new ROSLIB.Topic({
  ros,
  name: "/cmd_vel",
  messageType: "geometry_msgs/msg/Twist",
});

/* ───────── helpers ─────────── */
type Vec = { x: number; y: number }; // -1..1
const publish = ({ x, y }: Vec) =>
  cmdVel.publish({
    linear:  { x:  y * V_MAX },
    angular: { z: -x * W_MAX },
  });

/* ───────── component ───────── */
export default function Joystick() {
  const [vec, setVec] = useState<Vec>({ x: 0, y: 0 });
  const ringRef = useRef<HTMLDivElement>(null);
  const interval = useRef<number | null>(null);

  /* ------ interval logic (2 Hz) ------ */
  useEffect(() => {
    clearInterval(interval.current!);

    if (vec.x || vec.y) {
      publish(vec);                                    // immediate
      interval.current = window.setInterval(
        () => publish(vec),
        PERIOD,
      ) as unknown as number;
    } else {
      publish({ x: 0, y: 0 });                         // single stop
      interval.current = null;
    }
    return () => clearInterval(interval.current!);
  }, [vec]);

  /* ------ pointer drag -------------- */
  const dragging = useRef(false);
  const clampVec = (dx: number, dy: number): Vec => {
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(1, len / R);
    const nx = clamped * (dx / (len || 1));
    const ny = clamped * (dy / (len || 1));
    return { x: nx, y: -ny };
  };

  const updateFromPointer = (e: PointerEvent | MouseEvent | Touch) => {
    const rect = ringRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX ?? 0) - cx;
    const dy = (e.clientY ?? 0) - cy;
    setVec(clampVec(dx, dy));
  };

  const start = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromPointer(e.nativeEvent);
  };
  const move  = (e: React.PointerEvent) => dragging.current && updateFromPointer(e.nativeEvent);
  const stop  = () => { dragging.current = false; setVec({ x: 0, y: 0 }); };

  /* ------ WASD keys ----------------- */
  useEffect(() => {
    const held = new Set<string>();
    const recompute = () => {
      const y = (held.has("w") ? 1 : 0) + (held.has("s") ? -1 : 0);
      const x = (held.has("d") ? 1 : 0) + (held.has("a") ? -1 : 0);
      if (x || y) {
        const len = Math.hypot(x, y);
        setVec({ x: x / len, y: y / len });
      } else setVec({ x: 0, y: 0 });
    };
    const down = (e: KeyboardEvent) => { if ("wasd".includes(e.key)) { held.add(e.key); recompute(); } };
    const up   = (e: KeyboardEvent) => { held.delete(e.key); recompute(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  /* ------ render -------------------- */
  const offX = vec.x * (R - KNOB / 2);
  const offY = -vec.y * (R - KNOB / 2);

  return (
    <div
      ref={ringRef}
      className="relative touch-none select-none"
      style={{ width: R * 2, height: R * 2 }}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <div className="absolute inset-0 rounded-full bg-gray-200"
           style={{ border: "3px solid rgb(110,231,183)" }} />
      <div className="absolute left-1/2 top-1/2 rounded-full bg-gray-600"
           style={{
             width: KNOB, height: KNOB,
             transform: `translate(-50%,-50%) translate(${offX}px,${offY}px)`,
           }} />
    </div>
  );
}

