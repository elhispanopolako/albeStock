import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import History from "./pages/History";
import Supplies from "./pages/Supplies";

const SIDEBAR_KEY = "mvp_sidebar_collapsed";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_KEY);
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  if (!session) return <Login />;

  return (
    <div className="grid grid-cols-[auto_1fr] min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <main className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
          <div className="font-black text-lg">Magazyn podologiczny</div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-3 py-2 rounded-xl border border-neutral-300 bg-white font-extrabold shadow-sm hover:bg-neutral-100 transition-colors"
          >
            Wyloguj
          </button>
        </header>

        <div className="p-4 w-full max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/supplies" element={<Supplies />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}