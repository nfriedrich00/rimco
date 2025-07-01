import { useEffect, useCallback } from "react";
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

export default function Sensors() {
  const api_url = import.meta.env.VITE_API_URL || "";
  const ttl = useViz((s) => s.settings.stale_ttl_ms);

  const wrapperMap = useRimco((s) => s.wrappers);
  const clock = useRimco((s) => s.clock);
  const wrappers = Object.values(wrapperMap);
  const setWrappers = useRimco.getState().setWrappers;

  const fetchLifecycle = useCallback(async () => {
    try {
      const res = await fetch(`${api_url}/api/lifecycle`);
      if (res.ok) setWrappers(await res.json());
    } catch (err) {
      console.error("Failed to load lifecycle nodes", err);
    }
  }, [api_url, setWrappers]);
  

  useEffect(() => {
    fetchLifecycle();
    const id = setInterval(fetchLifecycle, 5000);
    return () => clearInterval(id);
  }, [fetchLifecycle]);

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
      )
      .finally(fetchLifecycle);
  };

  return (
    <div className="p-6 flex flex-wrap gap-4">
      {wrappers.map((w) => {
        const isActive = w.state === "active";
        const stale = clock - w.lastUpdate > ttl;

        // pick color from linked monitoring, or black if none
        const dotColor = stale ? "bg-gray-300" : "bg-black";
        const dot = <div className={`mx-auto h-8 w-8 rounded-full ${stale ? "bg-gray-300" : dotColor}`} />;

        return (
          <div key={w.name} className="rounded-lg shadow bg-white w-48 p-4 space-y-2">
            <h3 className="text-sm font-semibold truncate">{formatWrapperName(w.name)}</h3>
            {dot}
            <p className="text-center text-xs text-gray-600">
              {stale ? "STALE" : w.state.toUpperCase()}
            </p>
            <div className="flex justify-center">
              <Switch
                checked={isActive}
                onChange={() => handleToggle(w)}
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
    </div>
  );
}
