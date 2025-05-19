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
  cards: CardConfig[];
  addCard: (c: CardConfig) => void;
  updateCard: (idx: number, c: CardConfig) => void;
  removeCard: (idx: number) => void;

  /* named layouts */
  saved: Record<string, CardConfig[]>;
  saveLayout: (name: string) => void;
  loadLayout: (name: string) => void;
  deleteLayout: (name: string) => void;
}

export const useViz = create<VizState>()(
  persist(
    (set, get) => ({
      cards: [],
      addCard: (c) => set((s) => ({ cards: [...s.cards, c] })),
      updateCard: (i, c) =>
        set((s) => ({ cards: s.cards.map((x, idx) => (idx === i ? c : x)) })),
      removeCard: (i) =>
        set((s) => ({ cards: s.cards.filter((_, idx) => idx !== i) })),

      saved: {},
      saveLayout: (name) =>
        set((s) => ({ saved: { ...s.saved, [name]: s.cards } })),
      loadLayout: (name) =>
        set((s) => ({ cards: s.saved[name] ?? s.cards })),
      deleteLayout: (name) =>
        set((s) => {
          const { [name]: _, ...rest } = s.saved;
          return { saved: rest };
        }),
    }),
    { name: "viz-store" },
  ),
);

