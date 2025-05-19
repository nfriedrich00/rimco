import { useState } from "react";
import { useTopic } from "../lib/ros";

export default function StringCard({
  topic,
  name,
}: {
  topic: string;
  name: string;
}) {
  const [txt, setTxt] = useState<string>("—");
  useTopic<any>(topic, "std_msgs/msg/String", (m) => setTxt(m.data));

  return (
    <div className="rounded-lg shadow bg-white w-48 p-3 space-y-2">
      <h3 className="text-sm font-semibold">{name}</h3>
      <p className="break-words text-xs text-gray-500">{topic}</p>
      <p className="text-base text-center mt-2 break-all">{txt}</p>
    </div>
  );
}

