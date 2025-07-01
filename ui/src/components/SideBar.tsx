import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Menu, ChevronLeft, LayoutGrid, BarChart, Joystick, MapIcon, Trash2, Thermometer, Settings } from "lucide-react";
import { useViz } from "../store/useVizStore";
import Modal from "./Modal";

const nav = [
  { to: "/monitoring", label: "Monitoring", Icon: LayoutGrid },
  { to: "/sensors", label: "Component control", Icon: Thermometer },
  { to: "/visualization", label: "Visualization", Icon: BarChart },
  { to: "/navigation", label:"Navigation", Icon: MapIcon },
];

export default function SideBar() {
  const api_url = import.meta.env.VITE_API_URL || '';

  const [open, setOpen] = useState(true);
  const location = useLocation();

  const { settings, setSettings } = useViz();
  const [ttl, setTtl] = useState(settings.stale_ttl_ms);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"General"|"Navigation">("General");


  const onViz = location.pathname === "/visualization";
  const { saveLayout, loadLayout, cards, loadedLayout, layoutDirty } = useViz();
  const [layoutNames, setNames] = useState<string[]>([]);


  useEffect(() => {
    setTtl(settings.stale_ttl_ms);
  }, [settings.stale_ttl_ms]);

  useEffect(()=>{
    fetch(`${api_url}/api/layouts`)
      .then(r=>r.json())
      .then(setNames)
      .catch(()=>setNames([]));
  },[]);

  // close Settings on Esc key
  useEffect(() => {
    if (!settingsOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (!layoutDirty && loadedLayout && !layoutNames.includes(loadedLayout)) {
      setNames(n => [...n, loadedLayout]);
    }
  }, [layoutDirty, loadedLayout]);


  const [openList, setOpenList] = useState(false);
  const panelRef = useRef<HTMLDivElement|null>(null);
  const menuRef  = useRef<HTMLDivElement>(null);

  /* close with mouse click outside the menu */
  useEffect(() => {
    function onClick (e: MouseEvent) {
      if (
        openList &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpenList(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [openList]);

  /* close with esc */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && openList) setOpenList(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openList]);

  /* delete */
  const onDelete = async(name: string) => {
    if (!confirm(`Delete layout "${name}"?`)) return;
    await fetch(`${api_url}/api/layouts/${name}`, { method: "DELETE" });
    setNames(n => n.filter(x => x !== name));
    // if the just‐deleted layout was loaded, fallback to default
    if (loadedLayout === name) {
      loadLayout("default");
    }
  };

  return (
    <>
    <aside ref={panelRef}
      className={`relative h-screen flex flex-col transition-all
                  ${open?"w-60":"w-16"} bg-brand text-white`}>
      {/* collapse */}
      <button onClick={() => setOpen(!open)}
              className="h-14 flex items-center justify-center hover:bg-accent/25">
        {open ? <ChevronLeft size={22}/> : <Menu size={22}/>}
      </button>

      {/* nav */}
      <nav className="flex-1 py-4 space-y-1">
        {nav.map(({to,label,Icon}) => (
          <NavLink key={to} to={to}
            className={({isActive})=>
              "mx-2 flex items-center gap-3 rounded-md px-3 py-2 " +
              (isActive? "bg-accent text-text":"hover:bg-accent/25")}>
            <Icon size={20} />
            {open && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
      

      {/* -------- visualization actions -------- */}
      {onViz && open && (
        <>
          <div className="border-t my-3"/>
          {/* save */}
          <button
            className="mx-2 mb-2 w-[85%] rounded px-3 py-6 bg-emerald-500 text-white text-sm font-bold text-center"
            onClick={() => {
              const name = prompt("Save layout as…");
              if (name) saveLayout(name, cards);
            }}>
            Save layout
          </button>

          {/* load */}
          <button
            onClick={() => setOpenList(v => !v)}
            className="relative mx-2 mb-2 w-[85%] rounded px-3 py-3 border
                       bg-white text-black text-sm font-bold text-center">
            {(() => {
              if (layoutDirty) return "Unsaved layout";
              if (loadedLayout && loadedLayout !== "current") return loadedLayout;
              return "Load layout …";
            })()}
          </button>

          {/* dropdown */}
          {openList && (
            <div ref={menuRef}
              className="absolute left-0 right-0 bottom-20 mx-2
                         max-h-64 overflow-auto rounded border
                         bg-white text-black shadow-lg z-20">
              <div className="px-3 py-2 text-gray-500 text-sm select-none">
                Load layout …
              </div>
              {layoutDirty && (
                <div className="px-3 py-2 text-gray-500 text-sm select-none">
                  Unsaved layout – save first
                </div>
              )}
              {layoutNames.map(name => (
                <button key={name}
                        className="w-full px-3 py-2 text-left flex
                                   items-center justify-between hover:bg-gray-100"
                        onClick={() => {
                          loadLayout(name);
                          setOpenList(false);
                        }}>
                  <span>{name}</span>
                  <Trash2
                    size={16}
                          className="text-red-500 hover:text-red-700"
                          onClick={e => {
                            e.stopPropagation();
                            onDelete(name);
                          }}
                        />
                </button>
              ))}
              {layoutNames.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-500">No layouts</p>
              )}
            </div>
          )}
        </>
      )}

      {/* -------- settings gear -------- */}
      <div className="mt-auto px-2 pb-2">
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-full flex items-center justify-center py-3 hover:bg-accent/25 rounded"
        >
          <Settings size={20} />
          {open && <span className="ml-2">Settings</span>}
        </button>
      </div>
    </aside>

    {settingsOpen && (
      <Modal onClose={() => setSettingsOpen(false)}>
        <h2 className="text-xl font-semibold mb-4">Settings</h2>

        {/* Tabs */}
        <div className="flex space-x-4 border-b mb-4">
          {(["General","Navigation"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 ${
                activeTab === tab
                  ? "border-b-2 border-brand text-brand"
                  : "text-gray-600 hover:text-brand"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === "General" && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm">Message TTL (ms)</span>
              <input
                type="number"
                value={ttl}
                onChange={(e) => setTtl(Number(e.target.value))}
                className="mt-1 w-32 rounded border px-2 py-1"
              />
            </label>
            {/* add further general options here */}
          </div>
        )}

        {/* Navigation Tab */}
        {activeTab === "Navigation" && (
          <div className="space-y-4">
            {/* 
              TODO: wire these up to your tracks.json / useRimcoStore
              For now just a placeholder
            */}
            <p className="text-sm text-gray-700">
              Here you will be able to edit your map-view tracks, colors, max speed, etc.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-1 rounded border"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              // 1) persist to backend
              await fetch(`${api_url}/api/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stale_ttl_ms: ttl }),
              });
              // 2) update zustand store
              setSettings({ stale_ttl_ms: ttl });
              setSettingsOpen(false);
            }}
            className="px-4 py-1 rounded bg-brand text-white"
          >
            Save
          </button>
        </div>
      </Modal>
    )}
   </>
  );
}
