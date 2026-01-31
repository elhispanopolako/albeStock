import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import History from "./pages/History";

const SIDEBAR_KEY = "mvp_sidebar_collapsed";

export default function App() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_KEY);
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  return (
    <div style={s.shell}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <main style={s.main}>
        <header style={s.header}>
          <div style={{ fontWeight: 900 }}>Magazyn podologiczny</div>
        </header>

        <div style={s.content}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    minHeight: "100vh",
    background: "#fafafa",
  },
  main: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 5,
    background: "rgba(250,250,250,0.9)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid #eee",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  userInput: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    width: 180,
    background: "white",
  },
  content: {
    padding: 16,
    maxWidth: 1100,
    width: "100%",
    boxSizing: "border-box",
  },
};
