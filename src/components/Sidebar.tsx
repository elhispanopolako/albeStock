import { NavLink } from "react-router-dom";
import "./sidebar.css"

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
            style={{
                ...s.sidebar,
                width: collapsed ? 64 : 240,
            }}
        >
            <div style={s.top}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {!collapsed ? (
                        <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            Magazyn
                        </div>
                    ) : null}
                </div>

                <button onClick={onToggle} style={s.iconBtn} title={collapsed ? "Rozwiń" : "Zwiń"}>
                    {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
                </button>
            </div>

            <nav style={s.nav}>
                {items.map((it) => (
                    <NavLink
                        key={it.to}
                        to={it.to}
                        end={it.to === "/"}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
                        }
                        style={{
                            ...s.link,
                            justifyContent: collapsed ? "center" : "flex-start",
                        }}
                        title={collapsed ? it.label : undefined}
                    >
                        <span style={s.iconWrap}>{it.icon}</span>
                        {!collapsed ? <span style={s.linkText}>{it.label}</span> : null}
                    </NavLink>
                ))}
            </nav>

            <div style={s.bottom}>
                {!collapsed ? (
                    <div style={{ fontSize: 12, color: "#666" }}>
                        MVP • lokalna baza
                    </div>
                ) : null}
            </div>
        </aside>
    );
}

const s: Record<string, React.CSSProperties> = {
    sidebar: {
        height: "100vh",
        position: "sticky",
        top: 0,
        borderRight: "1px solid #eee",
        background: "white",
        display: "flex",
        flexDirection: "column",
        padding: 10,
        boxSizing: "border-box",
        transition: "width 400ms ease",
    },
    top: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 6px 10px 6px",
    },
    brandDot: {
        width: 12,
        height: 12,
        borderRadius: 999,
        background: "#111",
        flex: "0 0 auto",
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        border: "1px solid #ddd",
        background: "#f7f7f7",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        flex: "0 0 auto",
    },
    nav: {
        display: "grid",
        gap: 6,
        paddingTop: 6,
    },
    link: {
        textDecoration: "none",
        color: "#111",
        borderRadius: 14,
        padding: "10px 10px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 44,
        userSelect: "none",
    },
    linkActive: {
        background: "#f2f2f2",
        borderColor: "#e5e5e5",
    },
    iconWrap: {
        width: 22,
        height: 22,
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
    },
    linkText: {
        fontWeight: 800,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    bottom: {
        marginTop: "auto",
        padding: "10px 6px 6px 6px",
    },
};

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
