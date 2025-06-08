import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Menu, ChevronLeft, LayoutGrid, BarChart, Joystick, MapIcon, Trash2 } from "lucide-react";
import { useViz } from "../store/useVizStore";

const nav = [
  { to: "/monitoring",    label: "Monitoring",    Icon: LayoutGrid },
  { to: "/visualization", label: "Visualization", Icon: BarChart },
  { to: "/manual_control",label: "Manual Control",Icon: Joystick },
  { to: "/navigation",    label:"Navigation",     Icon: MapIcon }
];

export default function SideBar() {
  const [open, setOpen] = useState(true);
  const location = useLocation();
  const onViz = location.pathname === "/visualization";
  const { saveLayout, loadLayout, cards, loadedLayout, layoutDirty } = useViz();
  const [layoutNames, setNames] = useState<string[]>([]);
  const api_url = import.meta.env.VITE_API_URL || '';

  useEffect(()=>{
    fetch(`${api_url}/api/layouts`)
      .then(r=>r.json())
      .then(setNames)
      .catch(()=>setNames([]));
  },[]);

  useEffect(() => {
    if (!layoutDirty && loadedLayout && !layoutNames.includes(loadedLayout)) {
      setNames(n => [...n, loadedLayout]);
    }
  }, [layoutDirty, loadedLayout]);


  const [openList, setOpenList] = useState(false);
  const panelRef = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (openList && panelRef.current &&
         !panelRef.current.contains(e.target as Node))
        setOpenList(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
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
      {onViz && (
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
            {layoutDirty ? "Unsaved layout" :
             loadedLayout || "Load layout …"}
          </button>

          {/* dropdown */}
          {openList && (
            <div
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
    </aside>
  );
}
