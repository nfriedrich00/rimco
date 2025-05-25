import { useState } from "react";
import AddTile from "../components/AddTile";
import Modal from "../components/Modal";
import BoolCard from "../components/BoolCard";
import NumberCard from "../components/NumberCard";
import StringCard from "../components/StringCard";
import { useViz } from "../store/useVizStore";
import type { CardConfig} from "../store/useVizStore";

type DraftType =
  | "bool"
  | "float-value"
  | "float-plot"
  | "int-value"
  | "int-plot"
  | "string-value";

export default function Visualization() {
  const { cards, addCard, updateCard, removeCard } = useViz();
  const [stage, setStage] = useState<"idle" | "pick" | "form" | "edit">("idle");
  const [draftType, setDraftType] = useState<DraftType | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  /* form fields */
  const [formName,  setFormName ]  = useState("");
  const [formTopic, setFormTopic]  = useState("");
  const [formUnit,  setFormUnit ]  = useState("");

  const resetForm = () => {
    setDraftType(null);
    setFormName("");
    setFormTopic("");
    setFormUnit("");
  };

  const close = () => {
    setStage("idle");
    resetForm();
    setEditIdx(null);
  };

  const openEdit = (idx: number, cfg: CardConfig) => {
    setEditIdx(idx);
    setDraftType(cfg.type as DraftType);
    setFormName(cfg.name);
    setFormTopic(cfg.topic);
    if ("unit" in cfg) setFormUnit(cfg.unit);
    setStage("edit");
  };

  const saveForm = () => {
    if (!draftType || !formName || !formTopic) return;
    const common = { name: formName, topic: formTopic } as any;
    const cfg: CardConfig =
      draftType === "bool"      ? { type: "bool",         ...common } :
      draftType === "string-value"? { type: "string-value", ...common } :
      { type: draftType, ...common, unit: formUnit };

    if (stage == "form") {
      addCard(cfg);
    } else if (stage === "edit" && editIdx !== null) {
      updateCard(editIdx, cfg);
    }
    close();
  };

  const renderCard = (c: CardConfig, i: number) => {
    const wrapper = (child: JSX.Element) => (
      <div onClick={()=>openEdit(i,c)} className="cursor-pointer">
        {child}
      </div>
    );

    switch (c.type) {
      case "bool":
        return wrapper(<BoolCard   title={c.name} topic={c.topic} />);
      case "float-value":
        return wrapper(
          <NumberCard
            name={c.name}
            topic={c.topic}
            unit={c.unit}
            messageType="std_msgs/msg/Float32"/>
        );
      case "int-value":
        return wrapper(
          <NumberCard
            name={c.name}
            topic={c.topic}
            unit={c.unit}
            messageType="std_msgs/msg/Int16"/>
        );
      case "string-value":
        return wrapper(
          <StringCard
            name={c.name}
            topic={c.topic} />
        );
      default:
        return wrapper(
          <div className="rounded-lg shadow bg-gray-100 text-gray-500 w-48 h-32 flex items-center justify-center text-sm">plot coming&nbsp;soon</div>
        );
    }
  };

  const fullBtn = "block w-full rounded-md border px-4 py-2 text-left hover:bg-gray-50";

  /* ---------- JSX ---------- */
  return (
    <div className="p-6 flex flex-wrap gap-4">
      {cards.map(renderCard)}
      <AddTile onClick={() => setStage("pick")} />

      {/* pick type */}
      {stage === "pick" && (
        <Modal onClose={close}>
          <h2 className="text-lg font-semibold mb-4">Add visualization</h2>
          {(["bool","float-value","float-plot","int-value","int-plot","string-value"] as DraftType[])
            .map(t => (
              <button
                key={t}
                className={fullBtn}
                onClick={() => {
                  setDraftType(t);
                  setStage("form");
                }}
              >
                {t.replace("-", " ")}
              </button>
            ))}
        </Modal>
      )}

      {/* form / edit */}
      {["form","edit"].includes(stage) && draftType && (
        <Modal onClose={close}>
          {/* Wrap inputs in a form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveForm();
            }}
          >
            <h2 className="text-lg font-semibold mb-4">
              {stage === "form" ? "Add" : "Edit"}{" "}
              {draftType.replace("-", " ")}
            </h2>
            <label className="block mb-3">
              <span className="text-sm">Display name</span>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
            <label className="block mb-3">
              <span className="text-sm">Topic</span>
              <input
                value={formTopic}
                onChange={(e) => setFormTopic(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
            {draftType.includes("value") && (
              <label className="block mb-4">
                <span className="text-sm">Unit (optional)</span>
                <input
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="mt-1 w-full rounded border px-2 py-1"
                />
              </label>
            )}

            <div className="text-right space-x-2">
              {stage === "edit" && editIdx !== null && (
                <button
                  type="button"
                  className="px-3 py-1 rounded bg-red-600 text-white"
                  onClick={() => {
                    removeCard(editIdx);
                    close();
                  }}
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={close}
                className="px-3 py-1 rounded bg-gray-100"
              >
                Cancel
              </button>
              {/* Our submit button for Enter press */}
              <button
                type="submit"
                disabled={!formName || !formTopic}
                className="px-4 py-1 rounded bg-brand text-white disabled:opacity-50"
              >
                {stage === "form" ? "Add" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}