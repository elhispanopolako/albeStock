// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SupabaseDBProvider } from "./state/SupabaseDBContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SupabaseDBProvider>
        <App />
      </SupabaseDBProvider>
    </BrowserRouter>
  </React.StrictMode>
);
