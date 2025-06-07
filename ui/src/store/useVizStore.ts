import { create } from "zustand";
import { debounce } from "lodash-es";

export type CardConfig =
  | { type: "bool";         name: string; topic: string }
  | { type: "float-value";  name: string; topic: string; unit: string }
  | { type: "float-plot";   name: string; topic: string; unit: string }
  | { type: "int-value";    name: string; topic: string; unit: string }
  | { type: "int-plot";     name: string; topic: string; unit: string }
  | { type: "string-value"; name: string; topic: string };

interface VizState {
  cards: CardConfig[];
  addCard    : (c: CardConfig) => void;
  updateCard : (idx: number, c: CardConfig) => void;
  removeCard : (idx: number) => void;
  saveLayout : (name: string, cards: CardConfig[]) => Promise<void>;
  loadLayout : (name: string) => void;

  lastValue: Record<string, {data:unknown; stamp:number}>;
  staleMap:  Record<string,boolean>;
  setValue: (topic: string, data: unknown, stamp: number) => void;

  settings: { stale_ttl_ms: number };
  setSettings: (cfg: { stale_ttl_ms: number }) => void;
}

export const useViz = create<VizState>()((set, get) => {
  const setValue = (topic:string, data:unknown, stamp:number) => {
    set((s) => ({
      lastValue: {...s.lastValue, [topic]:{data,stamp}},
      staleMap: {...s.staleMap, [topic]: false},
    }));
  };

  // 2) single timer that recomputes staleMap every second
  setInterval(() => {
    const now = Date.now();
    const { lastValue, settings, staleMap: prev } = get();

    const next:Record<string,boolean> = {};
    let changed = false;

    for (const [topic, {stamp}] of Object.entries(lastValue)) {
      const isStale = now - stamp > settings.stale_ttl_ms;
      next[topic] = isStale;
      if (prev[topic] !== isStale) changed = true;
    }
    // If anything really flipped, update the store
    if (changed) set({ staleMap: next });
  }, 1000);

  return {
  /* ------------------------------ subscribers ----------------------------- */
      syncTopics: debounce(async ()=>{
        const cards = get().cards;
        const map: Record<string, string> = {}; // topic -> msgType
        cards.forEach(c=>{
          if(c.type==="bool") map[c.topic] = "std_msgs/msg/Bool";
          else if(c.type==="string-value") map[c.topic] = "std_msgs/msg/String";
          else if(c.type.endsWith("value")) map[c.topic] =
            c.type.startsWith("float")? "std_msgs/msg/Float32":"std_msgs/msg/Int16";
          // extend for plots later
        });
        const api_url = import.meta.env.VITE_API_URL || '';

        await fetch(`${api_url}/api/topics`,{
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ topics: map }),
        });
      }, 500),   // wait 0.5 s after last change

      /* ------------------------------ layout ------------------------------ */
      cards: [],
      addCard: (c) => set((s) => ({ cards: [...s.cards, c] })),
      updateCard: (i, c) =>
        set((s) => ({ cards: s.cards.map((x, idx) => (idx === i ? c : x)) })),
      removeCard: (i) =>
        set((s) => ({ cards: s.cards.filter((_, idx) => idx !== i) })),


      saveLayout: async (name:string, cards:CardConfig[])=>{
        const api_url = import.meta.env.VITE_API_URL || '';
        await fetch(`${api_url}/api/layouts/${name}`, {
          method:"POST",
          headers:{ "Content-Type":"application/json"},
          body: JSON.stringify(cards),
        });
      },
      loadLayout: async (name:string)=>{
        const api_url = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${api_url}/api/layouts/${name}`);
        if(res.ok){
          const cards = await res.json();
          set({ cards });
        }
      },

// todo: add option to delete saved layouts      
//      deleteLayout: (name) =>
//        set((s) => {
//          const { [name]: _, ...rest } = s.saved;
//          return { saved: rest };
//        }),

      lastValue: {},
      staleMap:  {},
      setValue,

      settings: { stale_ttl_ms: 10000 },
      setSettings: (cfg: any) =>
        set({ settings: cfg }),
};})
