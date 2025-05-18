import { useState } from "react";
import AddTile from "../components/AddTile";
import Modal from "../components/Modal";
import BoolCard from "../components/BoolCard";

/** ------------------------------------------------------------------ *
 *  1. pick card type   → {type:"bool"}
 *  2. fill config      → {type:"bool", topic, name}
 *  3. add to cards[]   → render
 * ------------------------------------------------------------------ */

type CardConfig =
  | { type: "bool"; name: string; topic: string }
  // | { type:"float32"; … }  // future types go here
  ;

export default function Visualization() {
  const [cards, setCards] = useState<CardConfig[]>([]);
  const [stage, setStage] = useState<"idle" | "pick" | "form">("idle");
  const [draftType, setDraftType] = useState<"bool" | null>(null);

  // form fields
  const [formName, setFormName] = useState("");
  const [formTopic, setFormTopic] = useState("");

  /* ---------- helpers ---------- */
  const close = () => {
    setStage("idle");
    setDraftType(null);
    setFormName("");
    setFormTopic("");
  };

  /* ---------- render ---------- */
  return (
    <div className="p-6 flex flex-wrap gap-4">
      {cards.map((c, i) =>
        c.type === "bool" ? (
          <BoolCard key={i} title={c.name} topic={c.topic} />
        ) : null,
      )}

      <AddTile onClick={() => setStage("pick")} />

      {/* ----- overlay pick type ----- */}
      {stage === "pick" && (
        <Modal onClose={close}>
          <h2 className="text-lg font-semibold mb-4">Add visualization</h2>
          <button
            onClick={() => {
              setDraftType("bool");
              setStage("form");
            }}
            className="block w-full rounded-md border px-4 py-2 text-left hover:bg-gray-50"
          >
            ● Bool indicator
          </button>
          {/* add more buttons for other types later */}
        </Modal>
      )}

      {/* ----- overlay configure form ----- */}
      {stage === "form" && draftType === "bool" && (
        <Modal onClose={close}>
          <h2 className="text-lg font-semibold mb-4">Configure Bool card</h2>

          <label className="block mb-3">
            <span className="text-sm">Display name</span>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1"
              placeholder="e.g. Motor enabled"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm">Topic</span>
            <input
              value={formTopic}
              onChange={(e) => setFormTopic(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1"
              placeholder="/demo/bool"
            />
          </label>

          <div className="text-right">
            <button
              onClick={close}
              className="mr-2 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              disabled={!formName || !formTopic}
              onClick={() => {
                if (formName && formTopic) {
                  setCards((old) => [
                    ...old,
                    { type: "bool", name: formName, topic: formTopic },
                  ]);
                  close();
                }
              }}
              className="px-4 py-1 rounded bg-brand text-white hover:bg-brand/90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

