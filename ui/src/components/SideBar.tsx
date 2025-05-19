import { NavLink } from "react-router-dom";
import { useState } from "react";
import { Menu, ChevronLeft, LayoutGrid, BarChart, Joystick, MapIcon } from "lucide-react";

const nav = [
  { to: "/monitoring",    label: "Monitoring",    Icon: LayoutGrid },
  { to: "/visualization", label: "Visualization", Icon: BarChart },
  { to: "/manual_control",label: "Manual Control",Icon: Joystick },
  { to:"/navigation",     label:"Navigation",     Icon: MapIcon }
];

export default function SideBar() {
  const [open, setOpen] = useState(true);

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
    </aside>
  );
}

