import { create } from "zustand";
import type { LatLngLiteral } from "leaflet";

// only record if moved at least 2 cm
const toRad = (deg: number) => (deg * Math.PI) / 180
const getDistance = (a: LatLngLiteral, b: LatLngLiteral): number => {
  const R = 6_371_000 // m
  const φ1 = toRad(a.lat), φ2 = toRad(b.lat)
  const Δφ = toRad(b.lat - a.lat), Δλ = toRad(b.lng - a.lng)
  const sinΔφ = Math.sin(Δφ/2), sinΔλ = Math.sin(Δλ/2)
  const aa = sinΔφ*sinΔφ + Math.cos(φ1)*Math.cos(φ2)*sinΔλ*sinΔλ
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa))
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "");

type TailPoint = [number, number];  // lat, lon

interface TrackState {
  tail: LatLngLiteral[];
  last?: LatLngLiteral;
  yaw?: number;
  color: string;
  displayName: string;
}

export interface RimcoState {
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
  clearTail: (name: string) => void;
  setFix: (lat: number, lon: number, yaw: number) => void;
  upsertComponent: (name: string, level: number, stamp: number) => void;
  setTracks: (t: Record<string,TrackState>) => void;
  pushTrack: (name: string, pos?: LatLngLiteral, yaw?: number) => void;
  setTrackShow: (name: string, v: boolean) => void;
  clearTracks: () => void;

  wrappers: Record<string, WrapperEntry>;
  setWrappers: (raw: { name: string; state: string }[]) => void;
  setWrapperMapping: (wrapperName: string, monitoringName: string | null) => void;
}

export interface ComponentEntry {
  name: string;
  level: number;      // 0..3
  lastUpdate: number; // ms unix
}

export interface WrapperEntry {
  name: string;
  state: string;
  lastUpdate: number; // ms unix
  monitoring: string | null;
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

  pushTail: (p, max = 36000) =>
    set((s) => {
      const tail = [...s.tail, p].slice(-max);
      return { tail };
    }),

  clearTail: (name) =>
    set((s) => {
      const tracks = { ...s.map.tracks };
      if (tracks[name]) {
        tracks[name] = {
          ...tracks[name],
          tail: [],
          last: undefined,
          yaw: undefined
        }
      }
      return {
        map: {
          ...s.map,
          tracks
        }
      };
    }),

  setFix: (lat, lon, yaw) => set({ lastFix: { lat, lon, yaw: yaw } }),

  pushTrack: (name, pos, yaw) =>
    set(s => {
      const t = s.map.tracks[name];
      if (!t || !pos) return s;

      if (t.last) {
        if (getDistance(t.last, pos) < 0.01) {
          return s
        }
      }

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


  /* ------------------------------ controlling ----------------------------- */
  wrappers: {},

  setWrappers: (list) =>
   set(() => {
     const now = Date.now();
     const next: Record<string, WrapperEntry> = {};
     for (const { name, state } of list) {
       next[name] = {
         name,
         state,
         lastUpdate: now,
         monitoring: null    // never auto‐link
       };
     }
     return { wrappers: next };
   }),

  setWrapperMapping: (wrapperName, monitoringName) =>
    set((s) => {
      const w = s.wrappers[wrapperName];
      if (!w) return {};
      return {
        wrappers: {
          ...s.wrappers,
          [wrapperName]: { ...w, monitoring: monitoringName },
        },
      };
    }),

};})
