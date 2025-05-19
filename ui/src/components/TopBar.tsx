import { useLocation } from "react-router-dom";

const map: Record<string,string> = {
  "/monitoring":"Monitoring",
  "/visualization":"Visualization",
  "/manual":"Manual Control",
};

export default function TopBar() {
  const title = map[useLocation().pathname] ?? "";
  return (
    <header className="h-14 flex items-center px-6 bg-brand text-white shadow">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
