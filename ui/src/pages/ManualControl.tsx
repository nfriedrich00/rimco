import MapView from "../components/MapView";

export default function ManualControl() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Current position</h2>
      <MapView />
      {/* manual joystick & coordinate readout will go here in phase-2 */}
    </div>
  );
}

