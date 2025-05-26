import { create } from "zustand";
import type { LatLngLiteral } from "leaflet";

type TailPoint = [number, number];  // lat, lon

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
  components: Record<string, ComponentEntry>;

  /* actions */
  pushTail: (p: TailPoint, max?: number) => void;
  setFix: (lat: number, lon: number, yaw: number) => void;
  upsertComponent: (name: string, level: number, stamp: number) => void;
  pushTrack: (
    which: "global" | "local" | "gnss",
    pos: LatLngLiteral,
    yaw?: number,
    max?: number
  ) => void;
  setTrackShow: (k: keyof RimcoState["map"]["show"], v: boolean) => void;
  clearTracks: () => void;
}

export interface ComponentEntry {
  name: string;
  level: number;      // 0..3
  lastUpdate: number; // ms unix
}

export const useRimco = create<RimcoState>()((set, get) => ({
      /* -------------------------------- map ------------------------------- */

      tail: [],
      lastFix: null,

      map: {
        show: { global: true, local: false, gnss: false },
        tracks: { global: { tail: [] }, local: { tail: [] }, gnss: { tail: [] } },
      },


      pushTail: (p, max = 3600) =>
        set((s) => {
          const tail = [...s.tail, p].slice(-max);
          return { tail };
        }),

      setFix: (lat, lon, yaw) => set({ lastFix: { lat, lon, yaw: yaw } }),

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


      /* ---------------------------- monitoring ---------------------------- */

      components: {} as Record<string, ComponentEntry>,

      upsertComponent: (name: string, level: number, stamp: number) =>
        set((s) => ({
          components: {
            ...s.components,
            [name]: { name, level, lastUpdate: stamp },
            },
        })),
}));
