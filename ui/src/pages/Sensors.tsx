import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Switch } from "@headlessui/react";

type WrapperNode = { name: string; state: string };

export default function Sensors() {
  const [nodes, setNodes] = useState<WrapperNode[]>([]);
  const api_url = import.meta.env.VITE_API_URL || "";

  // fetch + auto-configure
  const fetchLifecycle = async () => {
    try {
      const res = await fetch(`${api_url}/api/lifecycle`);
      if (res.ok) setNodes(await res.json());
    } catch {
      console.error("Failed to load lifecycle nodes");
    }
  };

  useEffect(() => {
    fetchLifecycle();
    const id = setInterval(fetchLifecycle, 5000);
    return () => clearInterval(id);
  }, []);

  const handleToggle = (n: WrapperNode) => {
    const nextActive = n.state !== "active";
    const action = nextActive ? "activate" : "deactivate";
    toast
      .promise(
        fetch(`${api_url}/api/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: n.name, action }),
        }).then((r) => {
          if (!r.ok) return Promise.reject(r.statusText);
        }),
        {
          pending: `${action} ${n.name}…`,
          success: `${n.name} ${action}d`,
          error: `Failed to ${action} ${n.name}`,
        },
        { autoClose: 5000 }
      )
      .finally(fetchLifecycle);
  };

  return (
    <div className="p-6 flex flex-wrap gap-4">
      {nodes.map((n) => {
        const isActive = n.state === "active";

        return (
          <div key={n.name} className="rounded-lg shadow px-4 py-3 bg-white w-48">
            <h3 className="text-sm mb-2 truncate">{n.name}</h3>
            <div className={`mx-auto h-8 w-8 rounded-full ${isActive ? "bg-ok" : "bg-danger"}`} />
            <p className="mt-1 text-center text-xs text-gray-600">
              {n.state.toUpperCase()}
            </p>

            <div className="mt-3 flex justify-center">
              <Switch
                checked={isActive}
                onChange={() => handleToggle(n)}
                className={`${
                  isActive ? "bg-brand" : "bg-gray-300"
                } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand`}
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
