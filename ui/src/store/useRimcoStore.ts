import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LatLngLiteral } from "leaflet";

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
  map: {
    show: { global: boolean; local: boolean; gnss: boolean };
    tracks: {
      global: { tail: LatLngLiteral[]; last?: LatLngLiteral; yaw?: number };
      local:  { tail: LatLngLiteral[]; last?: LatLngLiteral; yaw?: number };
      gnss:   { tail: LatLngLiteral[]; last?: LatLngLiteral };
    };
  };

  /* monitoring */
  components: Record<string, MonitoringEntry>;

  /* actions */
  pushTail: (p: TailPoint, max?: number) => void;
  setFix: (lat: number, lon: number, yaw: number) => void;
  upsertComponent: (name: string, level: Level) => void;
  pushTrack: (
    which: "global" | "local" | "gnss",
    pos: LatLngLiteral,
    yaw?: number,
    max?: number
  ) => void;
  setTrackShow: (k: keyof RimcoState["map"]["show"], v: boolean) => void;
  clearTracks: () => void;
}

export const useRimco = create<RimcoState>()(
  persist(
    (set, get) => ({
      tail: [],
      lastFix: null,

      map: {
        show: { global: true, local: false, gnss: false },
        tracks: { global: { tail: [] }, local: { tail: [] }, gnss: { tail: [] } },
      },

      components: {},


      pushTail: (p, max = 3600) =>
        set((s) => {
          const tail = [...s.tail, p].slice(-max);
          return { tail };
        }),

      setFix: (lat, lon, yaw) => set({ lastFix: { lat, lon, yaw: yaw } }),

      upsertComponent: (name, level) =>
        set((s) => {
          return {
            components: {
              ...s.components,
              [name]: { name, level, lastUpdate: Date.now() },
            },
          };
        }),

      pushTrack: (
        which: "global" | "local" | "gnss",
        pos: LatLngLiteral,
        yaw?: number,
        max = 3600,
      ) =>
        set((s) => {
          const t = s.map.tracks[which];
          const tail = [...t.tail, pos].slice(-max);
          return {
            map: {
              ...s.map,
              tracks: {
                ...s.map.tracks,
                [which]: { tail, last: pos, yaw: yaw ?? 0.0 },
              },
            },
          };
        }),

      setTrackShow: (k: keyof RimcoState["map"]["show"], v: boolean) =>
        set((s) => ({ map: { ...s.map, show: { ...s.map.show, [k]: v } } })),

      clearTracks: () =>
        set((s) => ({
          map: {
            ...s.map,
            tracks: {
              global: { tail: [] },
              local: { tail: [] },
              gnss: { tail: [] },
            },
          },
        })),
    }),
    { name: "rimco-store" }, // localStorage key
  ),
);
