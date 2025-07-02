import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SideBar from "./components/SideBar";
import TopBar from "./components/TopBar";

import Monitoring from "./pages/Monitoring";
import Visualization from "./pages/Visualization";
import ManualControl from "./pages/ManualControl";
import Navigation from "./pages/Navigation";
import Sensors from "./pages/Sensors";
import Evaluation from "./pages/Evaluation";
import { useBackendSync } from "./lib/backend";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  useBackendSync();
  return (
    <BrowserRouter>
      <div className="flex">
        <SideBar />
        <div className="flex flex-col flex-1 h-screen bg-gray-50">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/monitoring" replace />} />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route path="/visualization" element={<Visualization />} />
              <Route path="/manual_control" element={<ManualControl />} />
              <Route path="/navigation" element={<Navigation />} />
              <Route path="/sensors" element={<Sensors />} />
              <Route path="/evaluation" element={<Evaluation />} />
            </Routes>
          </main>
        </div>
      </div>
    <ToastContainer position="top-center" />
    </BrowserRouter>
  );
}
