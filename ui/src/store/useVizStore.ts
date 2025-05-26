import { create } from "zustand";

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

  lastValue: Record<string, unknown>;
  setValue: (topic: string, data: unknown) => void;

  settings: { stale_ttl_ms: number };
  setSettings: (cfg: { stale_ttl_ms: number }) => void;
}

export const useViz = create<VizState>()((set, get) => ({
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
        console.debug("loadLayout", name, res);
        if(res.ok){
          console.debug("Loaded layout", name);
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

      lastValue: {} as Record<string, unknown>,
      setValue: (topic: string, data: unknown) =>
        set((s) => ({ lastValue: { ...s.lastValue, [topic]: data } })),

      settings: { stale_ttl_ms: 10000 },
      setSettings: (cfg: any) =>
        set({ settings: cfg }),
}));
