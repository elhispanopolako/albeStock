import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import History from "./pages/History";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        padding: "8px 12px",
        borderRadius: 10,
        textDecoration: "none",
        color: isActive ? "white" : "#111",
        background: isActive ? "#111" : "#f2f2f2",
        fontWeight: 600,
      })}
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <header style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Magazyn podologiczny — MVP</h1>
        <nav style={{ display: "flex", gap: 10 }}>
          <NavItem to="/" label="Dashboard" />
          <NavItem to="/products" label="Produkty" />
          <NavItem to="/history" label="Historia" />
        </nav>
      </header>

      <main style={{ marginTop: 16 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
