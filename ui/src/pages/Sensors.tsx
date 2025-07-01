import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Switch } from "@headlessui/react";
import { useViz } from "../store/useVizStore";
import { useRimco } from "../store/useRimcoStore";
import type { WrapperEntry } from "../store/useRimcoStore";


function formatWrapperName(name: string): string {
  const base = name
    .replace(/^\/wrapper\//, "")
    .replace(/_wrapper_node$/, "");
  const spaced = base.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function normalizeName(s: string) {
  return s
    .replace(/^\/wrapper\//, "")
    .replace(/_wrapper_node$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export default function Sensors() {
  const api_url = import.meta.env.VITE_API_URL || "";
  const ttl = useViz((s) => s.settings.stale_ttl_ms);

  const [editingWrapper, setEditingWrapper] = useState<WrapperEntry | null>(null);
  const [newMonitoring, setNewMonitoring] = useState<string>("");

  const wrapperMap = useRimco((s) => s.wrappers);
  const components = useRimco((s) => s.components);
  const clock = useRimco((s) => s.clock);
  const wrappers = Object.values(wrapperMap);
  const setWrappers = useRimco.getState().setWrappers;
  const setMapping = useRimco.getState().setWrapperMapping;

  // map diagnostic level → dot color
  const levelColor: Record<number,string> = {
    0: "bg-ok",
    1: "bg-warn",
    2: "bg-danger",
    3: "bg-warn",
  };

  // auto‐link any wrapper that hasn’t yet been manually mapped
  useEffect(() => {
    if (wrappers.length === 0) return;
    wrappers.forEach((w) => {
      if (w.monitoring !== null) return;
      const key = normalizeName(w.name);
      const matches = Object.keys(components).filter(
        (mon) => normalizeName(mon) === key
      );
      if (matches.length === 1) {
        const mon = matches[0];
        // 1) update store
        setMapping(w.name, mon);
        // 2) persist to backend config
        fetch(`${api_url}/api/wrapper-mapping`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [w.name]: mon }),
        }).catch(console.error);
      }
    });
  }, [wrappers, components]);

  // close modal on Escape
  useEffect(() => {
    if (!editingWrapper) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingWrapper(null);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [editingWrapper]);


  useEffect(() => {
    let mounted = true;
    let id: number;

    (async () => {
      const nodes = await fetch(`${api_url}/api/lifecycle`).then((r) => r.json());
      if (!mounted) return;
      setWrappers(nodes);

      const map = await fetch(`${api_url}/api/wrapper-mapping`).then((r) => r.json());
      if (!mounted) return;
      Object.entries(map).forEach(([w, mon]) => setMapping(w, mon as string | null));

      id = window.setInterval(async () => {
        const fresh = await fetch(`${api_url}/api/lifecycle`).then((r) => r.json());
        if (!mounted) return;
        setWrappers(fresh);
      }, 5000);
    })();

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [api_url, setWrappers, setMapping]);


  const linkMonitoring = async (w: WrapperEntry) => {
    const name = prompt(
      `Enter monitoring name for ${formatWrapperName(w.name)}`,
      w.monitoring || ""
    );
    if (name === null) return;
    const mon = name.trim() || null;
    setMapping(w.name, mon);
    await fetch(`${api_url}/api/wrapper-mapping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [w.name]: mon }),
    });
  };

  const handleToggle = (w: WrapperEntry) => {
    const nextActive = w.state !== "active";
    const action = nextActive ? "activate" : "deactivate";
    toast
      .promise(
        fetch(`${api_url}/api/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: w.name, action }),
        }).then((r) => {
          if (!r.ok) return Promise.reject(r.statusText);
        }),
        {
          pending: `${action} ${w.name}…`,
          success: `${w.name} ${action}d`,
          error: `Failed to ${action} ${w.name}`,
        },
        { autoClose: 5000 }
      );
  };

  return (
    <div className="p-6 flex flex-wrap gap-4">
      {wrappers.map((w) => {
        const isActive = w.state === "active";
        const stale = clock - w.lastUpdate > ttl;

        let dotColor: string;
        if (w.monitoring) {
          const comp = components[w.monitoring];
          if (comp) {
            const compStale = clock - comp.lastUpdate > ttl;
            dotColor = compStale
              ? "bg-gray-300"
              : levelColor[comp.level] ?? "bg-gray-300";
          } else {
            dotColor = "bg-gray-300"; // monitoring not yet in store
          }
        } else {
          dotColor = "bg-black";      // no mapping
        }
         const dot = (
           <div
             className={`mx-auto h-8 w-8 rounded-full ${dotColor}`}
           />
         );

        return (
          <div
            key={w.name}
            className="rounded-lg shadow bg-white w-48 p-4 space-y-2"
            onClick={() => {
              setEditingWrapper(w);
              setNewMonitoring(w.monitoring || "");
            }}
          >
            <h3 className="text-sm font-semibold truncate">{formatWrapperName(w.name)}</h3>
            {dot}
            <p className="text-center text-xs text-gray-600">
              {stale ? "STALE" : w.state.toUpperCase()}
            </p>
            <div className="flex justify-center">
              <Switch
                checked={isActive}
                onChange={() => handleToggle(w)}
                onClick={(e) => e.stopPropagation()}
                className={`${
                  isActive ? "bg-brand" : "bg-gray-300"
                } relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand`}
              >
                <span
                  className={`${
                    isActive ? "translate-x-6" : "translate-x-1"
                  } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
                />
              </Switch>
            </div>
          </div>
        );
      })}
 
      {/* Modal for editing wrapper→monitoring mapping */}
      {editingWrapper && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setEditingWrapper(null)}
        >          
          <div
            className="bg-white p-6 rounded shadow-lg w-80"
            onClick={(e) => e.stopPropagation()}
          >            <h2 className="text-lg font-semibold mb-4">
              Link monitoring for {formatWrapperName(editingWrapper.name)}
            </h2>
            <select
              className="w-full mb-4 border rounded px-2 py-1"
              value={newMonitoring}
              onChange={(e) => setNewMonitoring(e.target.value)}
            >
              <option value="">-- none --</option>
              {Object.keys(components).map((mon) => (
                <option key={mon} value={mon}>
                  {mon}
                </option>
              ))}
            </select>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditingWrapper(null)}
                className="px-3 py-1 rounded border"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // 1) update store
                  setMapping(editingWrapper.name, newMonitoring || null);
                  // 2) persist to backend
                  await fetch(`${api_url}/api/wrapper-mapping`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ [editingWrapper.name]: newMonitoring || null }),
                  });
                  // 3) close modal
                  setEditingWrapper(null);
                }}
                className="px-3 py-1 rounded bg-brand text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
