import { useState } from "react";
import AddTile from "../components/AddTile";
import Modal from "../components/Modal";
import BoolCard from "../components/BoolCard";
import NumberCard from "../components/NumberCard";
import StringCard from "../components/StringCard";

/* ---------- card model ---------- */
export type CardConfig =
  | { type: "bool";         name: string; topic: string }
  | { type: "float-value";  name: string; topic: string; unit: string }
  | { type: "float-plot";   name: string; topic: string; unit: string }
  | { type: "int-value";    name: string; topic: string; unit: string }
  | { type: "int-plot";     name: string; topic: string; unit: string }
  | { type: "string-value"; name: string; topic: string };

type DraftType =
  | "bool"
  | "float-value"
  | "float-plot"
  | "int-value"
  | "int-plot"
  | "string-value";

export default function Visualization() {
  const [cards, setCards] = useState<CardConfig[]>([]);
  const [stage, setStage] = useState<"idle" | "pick" | "form">("idle");
  const [draftType, setDraftType] = useState<DraftType | null>(null);

  /* form fields */
  const [formName,  setFormName ]  = useState("");
  const [formTopic, setFormTopic]  = useState("");
  const [formUnit,  setFormUnit ]  = useState("");

  const close = () => {
    setStage("idle");
    setDraftType(null);
    setFormName(""); setFormTopic(""); setFormUnit("");
  };

  /* ------------- render cards ---------------- */
  const renderCard = (c: CardConfig, i: number) => {
    switch (c.type) {
      case "bool":
        return <BoolCard key={i} title={c.name} topic={c.topic} />;
      case "float-value":
        return (
          <NumberCard
            key={i}
            name={c.name}
            topic={c.topic}
            unit={c.unit}
            messageType="std_msgs/msg/Float32"
          />
        );
      case "int-value":
        return (
          <NumberCard
            key={i}
            name={c.name}
            topic={c.topic}
            unit={c.unit}
            messageType="std_msgs/msg/Int16"
          />
        );
      case "string-value":
        return <StringCard key={i} name={c.name} topic={c.topic} />;
      default:
        return (
          <div
            key={i}
            className="rounded-lg shadow bg-gray-100 text-gray-500 w-48 h-32 flex items-center justify-center text-sm"
          >
            plot coming&nbsp;soon
          </div>
        );
    }
  };

  /* ------------- helpers --------------------- */
  const addCard = () => {
    if (!draftType || !formName || !formTopic) return;
    const common = { name: formName, topic: formTopic };
    switch (draftType) {
      case "bool":
        setCards((prev) => [...prev, { type: "bool", ...common }]);
        break;
      case "float-value":
      case "float-plot":
      case "int-value":
      case "int-plot":
        setCards((prev) => [
          ...prev,
          { type: draftType, ...common, unit: formUnit },
        ]);
        break;
      case "string-value":
        setCards((prev) => [...prev, { type: "string-value", ...common }]);
        break;
    }
    close();
  };

  const fullBtn =
    "block w-full rounded-md border px-4 py-2 text-left hover:bg-gray-50";

  /* ============== JSX ======================== */
  return (
    <div className="p-6 flex flex-wrap gap-4">
      {cards.map(renderCard)}
      <AddTile onClick={() => setStage("pick")} />

      {/* ---------- choose type ---------- */}
      {stage === "pick" && (
        <Modal onClose={close}>
          <h2 className="text-lg font-semibold mb-4">Add visualization</h2>
          <button className={fullBtn} onClick={()=>{setDraftType("bool");        setStage("form");}}>● Bool indicator</button>
          <button className={fullBtn} onClick={()=>{setDraftType("float-value"); setStage("form");}}>123 Float32 value</button>
          <button className={fullBtn} onClick={()=>{setDraftType("float-plot");  setStage("form");}}>📈 Float32 plot</button>
          <button className={fullBtn} onClick={()=>{setDraftType("int-value");   setStage("form");}}>123 Int16 value</button>
          <button className={fullBtn} onClick={()=>{setDraftType("int-plot");    setStage("form");}}>📈 Int16 plot</button>
          <button className={fullBtn} onClick={()=>{setDraftType("string-value");setStage("form");}}>𝚺 String value</button>
        </Modal>
      )}

      {/* ---------- configure form ---------- */}
      {stage === "form" && draftType && (
        <Modal onClose={close}>
          <h2 className="text-lg font-semibold mb-4">
            Configure {draftType.replace("-", " ")}
          </h2>

          <label className="block mb-3">
            <span className="text-sm">Display name</span>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1"
              placeholder="e.g. Distance from path"
            />
          </label>

          <label className="block mb-3">
            <span className="text-sm">Topic</span>
            <input
              value={formTopic}
              onChange={(e) => setFormTopic(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1"
              placeholder="/plan/margin"
            />
          </label>

          {draftType.includes("value") && (
            <label className="block mb-4">
              <span className="text-sm">Unit (optional)</span>
              <input
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
                placeholder="cm"
              />
            </label>
          )}

          <div className="text-right">
            <button
              onClick={close}
              className="mr-2 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              disabled={!formName || !formTopic}
              onClick={addCard}
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
