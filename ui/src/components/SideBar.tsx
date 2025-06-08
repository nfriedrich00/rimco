import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, ChevronLeft, LayoutGrid, BarChart, Joystick, MapIcon } from "lucide-react";
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

  useEffect(()=>{
    const api_url = import.meta.env.VITE_API_URL || '';
    fetch(`${api_url}/api/layouts`).then(r=>r.json()).then(setNames).catch(()=>setNames([]));
  },[]);

  // recompute layoutNames after a save (so new name appears immediately)
  useEffect(() => {
    if (!layoutDirty && loadedLayout && !layoutNames.includes(loadedLayout)) {
      setNames(n => [...n, loadedLayout]);
    }
  }, [layoutDirty, loadedLayout]);

  const selectValue = layoutDirty
    ? "__unsaved__"
    : (loadedLayout || "");

  return (
    <aside
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
              const name = prompt("Save layout as…");
              if(name) saveLayout(name, cards);
            }}>
            Save layout
          </button>
          <select
            className="mx-2 mb-2 w-[85%] rounded px-3 py-3 border text-sm bg-white text-black font-bold text-center"
            value={selectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__unsaved__" || v === "") return;
              loadLayout(v);
            }}
          >
            <option disabled value="">Load layout …</option>
            {layoutDirty && (
              <option value="__unsaved__" disabled>Unsaved Layout</option>
            )}
            {layoutNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </>
      )}
    </aside>
  );
}
