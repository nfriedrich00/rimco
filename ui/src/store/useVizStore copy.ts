import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CardConfig =
  | { type: "bool";         name: string; topic: string }
  | { type: "float-value";  name: string; topic: string; unit: string }
  | { type: "float-plot";   name: string; topic: string; unit: string }
  | { type: "int-value";    name: string; topic: string; unit: string }
  | { type: "int-plot";     name: string; topic: string; unit: string }
  | { type: "string-value"; name: string; topic: string };

interface VizState {
  /* layout & presets (long-lived) ------------------- */
  cards: CardConfig[];
  saved: Record<string, CardConfig[]>;
  addCard    : (c: CardConfig) => void;
  updateCard : (idx: number, c: CardConfig) => void;
  removeCard : (idx: number) => void;
  saveLayout : (name: string) => void;
  loadLayout : (name: string) => void;
  deleteLayout: (name: string) => void;

  /* live data (NOT persisted) ----------------------- */
  lastValue : Record<string, unknown>;          // topic → latest .data
  setValue  : (topic: string, data: unknown) => void;
}

export const useViz = create<VizState>()(
  persist(
    (set, get) => ({
      /* ---------- layout ---------- */
      cards: [],
      saved: {},

      addCard: (c) => set((s) => ({ cards: [...s.cards, c] })),
      updateCard: (i, c) =>
        set((s) => ({ cards: s.cards.map((x, idx) => (idx === i ? c : x)) })),
      removeCard: (i) =>
        set((s) => ({ cards: s.cards.filter((_, idx) => idx !== i) })),

      saveLayout: (name) =>
        set((s) => ({ saved: { ...s.saved, [name]: s.cards } })),

      loadLayout: (name) => {
        const layout = get().saved[name];
        if (layout) set({ cards: layout });
      },

      deleteLayout: (name) =>
        set((s) => {
          const { [name]: _, ...rest } = s.saved;
          return { saved: rest };
        }),

      /* ---------- live values ---------- */
      lastValue: {} as Record<string, unknown>,
      setValue: (topic: string, data: unknown) =>
        set((s) => ({ lastValue: { ...s.lastValue, [topic]: data } })),

      settings: { stale_ttl_ms: 10000 },
      setSettings: (cfg: any) =>
        set({ settings: cfg }),
    }),

    /* -------- persistor options -------- */
    {
      name: "viz-store",
      /* only save layouts + cards, NOT lastValue  */
      partialize: (state) => ({
        cards: state.cards,
        saved: state.saved,
      }),
    },
  ),
);
