import StatusCard from "../components/StatusCard";
import { useRimco } from "../store/useRimcoStore";

export default function Monitoring(){
  const comps = Object.values(useRimco((s)=>s.components));
  return (
    <div className="p-6 flex flex-wrap gap-4">
      {comps.map(c=> <StatusCard key={c.name} data={c}/>)}
    </div>
  );
}
