import { useState } from "react";
import { useTopic } from "../lib/ros";

export default function BoolCard({
  topic = "/demo/bool",
  title = "Bool Status",
}: {
  topic?: string;
  title?: string;
}) {
  const [value, setValue] = useState<boolean | null>(null);

  useTopic<{ data: boolean }>(topic, "std_msgs/msg/Bool", (msg) =>
    setValue(msg.data),
  );

  const colour =
    value === null ? "bg-gray-300" : value ? "bg-ok" : "bg-danger";

  return (
    <div className="rounded-lg shadow px-4 py-3 bg-white w-48">
      <h3 className="text-sm mb-2">{title}</h3>
      <div
        className={`mx-auto h-8 w-8 rounded-full ${colour}`}
      />
      {/* This can be used to display the value as text:
      <p className="mt-1 text-center text-xs text-gray-600">
        {value === null ? "—" : value ? "TRUE" : "FALSE"}
      </p>
       */}
    </div>
  );
}
