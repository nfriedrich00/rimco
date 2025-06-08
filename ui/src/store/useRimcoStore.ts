import { create } from "zustand";
import type { LatLngLiteral } from "leaflet";

type TailPoint = [number, number];  // lat, lon

interface TrackState {
  tail: LatLngLiteral[];
  last?: LatLngLiteral;
  yaw?: number;
  color: string;
  displayName: string;
}

interface RimcoState {
  clock: number; // ms unix, used to trigger re-renders
  /* new map */



  /* map */
  tail: TailPoint[];
  lastFix: { lat: number; lon: number; yaw: number } | null;
  map: {
    show: Record<string, boolean>;
    tracks: Record<string,TrackState>;
  };

  /* monitoring */
  components: Record<string, ComponentEntry>;

  /* actions */
  pushTail: (p: TailPoint, max?: number) => void;
  setFix: (lat: number, lon: number, yaw: number) => void;
  upsertComponent: (name: string, level: number, stamp: number) => void;
  setTracks: (t: Record<string,TrackState>) => void;
  pushTrack: (name: string, pos?: LatLngLiteral, yaw?: number) => void;
  setTrackShow: (name: string, v: boolean) => void;
  clearTracks: () => void;
}

export interface ComponentEntry {
  name: string;
  level: number;      // 0..3
  lastUpdate: number; // ms unix
}

export const useRimco = create<RimcoState>((set, get) => {
  setInterval(() => {
    set({ clock: Date.now() });
  }, 1000);

  return {
  clock: Date.now(),
  /* -------------------------------- map ------------------------------- */
  staleMap: {},

  tail: [],
  lastFix: null,

  map: {
    show: {},
    tracks: {}
  },

  setTracks: (tracks) =>
    set(() => ({
      map: {
        tracks,
        show: Object.fromEntries(
          Object.keys(tracks).map(name => [name, true])
        )
      }
    })),

  pushTail: (p, max = 3600) =>
    set((s) => {
      const tail = [...s.tail, p].slice(-max);
      return { tail };
    }),

  setFix: (lat, lon, yaw) => set({ lastFix: { lat, lon, yaw: yaw } }),

  pushTrack: (name, pos, yaw) =>
    set(s => {
      const t = s.map.tracks[name];
      if (!t) return s;
      const newTail = pos ? [...t.tail, pos].slice(-3600) : t.tail;
      const newLast = pos ?? t.last;
      return {
        map: {
          ...s.map,
          tracks: {
            ...s.map.tracks,
            [name]: {
              ...t,
              tail: newTail,
              last: newLast,
              yaw: yaw != null ? yaw : t.yaw
            }
          }
        }
      };
    }),

  setTrackShow: (name, v) =>
    set(s => ({
      map: {
        ...s.map,
        show: { ...s.map.show, [name]: v }
      }
    })),

  clearTracks: () =>
      set(s => ({
        map: {
          ...s.map,
          tracks: Object.fromEntries(
            Object.entries(s.map.tracks).map(
              ([name,t]) => [name, { ...t, tail: [] }] 
            )
          )
        }
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
};})
