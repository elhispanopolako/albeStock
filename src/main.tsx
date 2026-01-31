// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { DBProvider } from "./state/DBContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DBProvider>
        <App />
      </DBProvider>
    </BrowserRouter>
  </React.StrictMode>
);
