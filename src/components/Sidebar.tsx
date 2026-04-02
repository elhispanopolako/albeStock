import { NavLink } from "react-router-dom";

type Item = {
    to: string;
    label: string;
    icon: React.ReactNode;
};

type Props = {
    collapsed: boolean;
    onToggle: () => void;
};

const items: Item[] = [
    { to: "/", label: "Dashboard", icon: <IconHome /> },
    { to: "/products", label: "Produkty", icon: <IconBox /> },
    { to: "/history", label: "Historia", icon: <IconClock /> },
];

export default function Sidebar({ collapsed, onToggle }: Props) {
    return (
        <aside
            className={`h-screen sticky top-0 border-r border-neutral-200 bg-white flex flex-col p-2 box-border transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? "w-16" : "w-60"
                }`}
        >
            <div className="flex items-center justify-between mb-4 mt-1 px-1">
                {/* Tekst jest w kontenerze, który animuje swoją szerokość i przezroczystość.
                  Dzięki temu przycisk strzałki łagodnie przysunie się do lewej krawędzi.
                */}
                <div
                    className={`overflow-hidden transition-all duration-300 flex items-center ${collapsed ? "w-0 opacity-0" : "w-32 opacity-100"
                        }`}
                >
                    <div className="font-black text-lg text-neutral-900">Magazyn</div>
                </div>

                <button
                    onClick={onToggle}
                    className="w-10 h-10 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-center cursor-pointer shrink-0 transition-all duration-150 hover:bg-neutral-200 hover:scale-105 text-neutral-800"
                    title={collapsed ? "Rozwiń" : "Zwiń"}
                >
                    {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
                </button>
            </div>

            <nav className="grid gap-1.5">
                {items.map((it) => (
                    <NavLink
                        key={it.to}
                        to={it.to}
                        end={it.to === "/"}
                        className={({ isActive }) =>
                            `text-neutral-900 rounded-xl flex items-center h-11 select-none transition-all duration-300 hover:bg-neutral-100 hover:translate-x-0.5 overflow-hidden ${isActive ? "bg-neutral-100 border-neutral-200" : ""
                            }`
                        }
                        title={collapsed ? it.label : undefined}
                    >
                        {/* Pudełko ikony ma dokładnie szerokość zwiniętego paska minus marginesy (w-12 = 48px), więc zawsze jest idealnie na środku */}
                        <span className="w-12 flex items-center justify-center shrink-0">
                            {it.icon}
                        </span>

                        {/* Pudełko tekstu, które zwija się do w-0 */}
                        <div
                            className={`overflow-hidden transition-all duration-300 flex items-center ${collapsed ? "w-0 opacity-0" : "w-32 opacity-100"
                                }`}
                        >
                            <span className="font-extrabold">
                                {it.label}
                            </span>
                        </div>
                    </NavLink>
                ))}
            </nav>

            <div className="mt-auto p-2 pb-3">
                <div
                    className={`overflow-hidden transition-all duration-300 ${collapsed ? "w-0 opacity-0" : "w-40 opacity-100"
                        }`}
                >
                    <div className="text-xs text-neutral-500 font-medium">
                        MVP • lokalna baza
                    </div>
                </div>
            </div>
        </aside>
    );
}

// --- minimalistyczne SVG ikony (bez bibliotek) ---
function IconHome() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
}
function IconBox() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 8.5 12 3 3 8.5 12 14l9-5.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M3 8.5V16.5L12 22l9-5.5V8.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 14v8" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
}
function IconClock() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeWidth="2" />
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}
function IconChevronLeft() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18 9 12l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function IconChevronRight() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}