import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Use Tailwind’s source file with @tailwind directives:
import "./index.css";
// Remove or comment out any reference to "./generated.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

