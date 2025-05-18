import { create } from "zustand";
import { persist } from "zustand/middleware";

type TailPoint = [number, number];  // lat, lon
type Level = 0 | 1 | 2 | 3 | null;  // DiagnosticStatus level

interface MonitoringEntry {
  name: string;
  level: Level;
  lastUpdate: number;
}

interface RimcoState {
  /* map */
  tail: TailPoint[];
  lastFix: { lat: number; lon: number; yaw: number } | null;

  /* monitoring */
  components: Record<string, MonitoringEntry>;

  /* actions */
  pushTail: (p: TailPoint, max?: number) => void;
  setFix: (lat: number, lon: number, yaw: number) => void;
  upsertComponent: (name: string, level: Level) => void;
}

export const useRimco = create<RimcoState>()(
  persist(
    (set, get) => ({
      tail: [],
      lastFix: null,
      components: {},

      pushTail: (p, max = 3600) =>
        set((s) => {
          const tail = [...s.tail, p].slice(-max);
          return { tail };
        }),

      setFix: (lat, lon, yaw) => set({ lastFix: { lat, lon, yaw } }),

      upsertComponent: (name, level) =>
        set((s) => {
          return {
            components: {
              ...s.components,
              [name]: { name, level, lastUpdate: Date.now() },
            },
          };
        }),
    }),
    { name: "rimco-store" }, // localStorage key
  ),
);
