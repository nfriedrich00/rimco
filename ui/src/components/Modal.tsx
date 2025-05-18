import { ReactNode } from "react";

export default function Modal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[22rem]">
        {/* close on backdrop click */}
        <div
          className="absolute inset-0"
          onClick={onClose}
          aria-label="Close"
        />
        {/* content above the invisible backdrop */}
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

