import { useState } from "react";
import { useTopic } from "../lib/ros";

interface Props {
  topic: string;
  name: string;
  unit?: string;
  messageType: "std_msgs/msg/Float32" | "std_msgs/msg/Int16";
}

export default function NumberCard({ topic, name, unit, messageType }: Props) {
  const [val, setVal] = useState<number | null>(null);

  useTopic<any>(topic, messageType, (m) => setVal(m.data));

  return (
    <div className="rounded-lg shadow bg-white w-48 p-3 space-y-2">
      <h3 className="text-sm font-semibold">{name}</h3>
      <p className="break-words text-xs text-gray-500">{topic}</p>
      <p className="text-xl font-semibold text-center mt-2">
        {val === null ? "—" : val.toFixed(2)}{" "}
        <span className="text-sm font-normal">{unit}</span>
      </p>
    </div>
  );
}

