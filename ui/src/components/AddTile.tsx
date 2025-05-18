export default function AddTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border-2 border-dashed border-gray-300 w-48 h-32 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
    >
      <span className="text-4xl leading-none">＋</span>
    </button>
  );
}

