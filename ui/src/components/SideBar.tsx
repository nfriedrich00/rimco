import { NavLink } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Menu, ChevronLeft, LayoutGrid, BarChart, Joystick, MapIcon, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";
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
  const panelRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);


  useEffect(()=>{
    fetch(`${api_url}/api/layouts`)
    .then(r=>r.json())
    .then(setNames)
    .catch(()=>setNames([]));
  },[]);

  // recompute layoutNames after a save (so new name appears immediately)
  useEffect(() => {
    if (!layoutDirty && loadedLayout && !layoutNames.includes(loadedLayout)) {
      setNames(n => [...n, loadedLayout]);
    }
  }, [layoutDirty, loadedLayout]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) === false) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const onDelete = async (name: string) => {
    if (!confirm(`Delete layout "${name}"?`)) return;
    await fetch(`${api_url}/api/layouts/${name}`, { method: "DELETE" });
    setNames(n => n.filter(x => x !== name));
    // if the just‐deleted layout was loaded, fallback to default
    if (loadedLayout === name) {
      loadLayout("default");
    }
  };

  const selectValue = layoutDirty
    ? "__unsaved__"
    : (loadedLayout || "");

  return (
    <div ref={panelRef}
      className={`h-screen flex flex-col transition-all
                  ${open ? "w-60" : "w-16"}
                  bg-brand text-white`}
    >
      {/* collapse button */}
      <button
        onClick={() => setOpen(!open)}
        className="h-14 flex items-center justify-center hover:bg-accent/25"
      >
        {open ? <ChevronLeft size={22} /> : <Menu size={22} />}
      </button>

      {/* nav list */}
      <nav className="flex-1 py-4 space-y-1">
        {nav.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "mx-2 flex items-center gap-3 rounded-md px-3 py-2",
                isActive ? "bg-accent text-text" : "hover:bg-accent/25",
              ].join(" ")
            }
          >
            <Icon size={20} />
            {open && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {onViz && (
        <>
          <div className="border-t my-3"/>
          <button
            className="mx-2 mb-2 w-[85%] rounded px-3 py-6 bg-emerald-500 text-white text-sm font-bold text-center"
            onClick={()=>{
              setMenuOpen(o => !o);
              const name = prompt("Save layout as…");
              if(name) saveLayout(name, cards);
            }}>
            Save layout
          </button>
          {layoutNames.map(name => (
            <div
              key={name}
              className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <span onClick={() => { loadLayout(name); setMenuOpen(false); }}>
                {name}
              </span>
              <Trash2
                size={16}
                className="text-red-500 hover:text-red-700"
                onClick={e => {
                  e.stopPropagation();
                  onDelete(name);
                }}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
