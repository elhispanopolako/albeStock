import { useMemo, useState } from "react";
import { useSupaDB } from "../state/SupabaseDBContext";
import MovementModal from "../components/MovementModal";
import { type Producer, type ProductType, displayName } from "../state/db";
import AddProductModal from "../components/AddProductModal";
import EditProductModal from "../components/EditProductModal";



export default function Products() {
    const { products, applyMovement, addProduct, editProduct } = useSupaDB();
    const [q, setQ] = useState("");
    const [producer, setProducer] = useState<Producer | "ALL">("ALL");
    const [ptype, setPtype] = useState<ProductType | "ALL">("ALL");
    const [open, setOpen] = useState(false);
    const [defaultPid, setDefaultPid] = useState<string | undefined>(undefined);
    const [mode, setMode] = useState<"SALE" | "CLINIC" | "SUPPLY">("SALE");
    const [addOpen, setAddOpen] = useState(false);
    type SortKey = "NAME_ASC" | "NAME_DESC" | "STOCK_ASC" | "STOCK_DESC" | "DEFAULT";
    const [sortKey, setSortKey] = useState<SortKey>("NAME_ASC");
    const [editOpen, setEditOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const editProductItem = editId ? products.find((p) => p.id === editId) ?? null : null;


    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        const base = products.filter((p) => {
            if (producer !== "ALL" && p.producer !== producer) return false;
            if (ptype !== "ALL" && p.product_type !== ptype) return false;
            if (!qq) return true;
            return displayName(p).toLowerCase().includes(qq);
        });
        const byName = (a: typeof base[number], b: typeof base[number]) =>
            displayName(a).localeCompare(displayName(b), "pl", { sensitivity: "base" });

        const byStock = (a: typeof base[number], b: typeof base[number]) => a.stock - b.stock;
        if (sortKey != "DEFAULT") {
            base.sort((a, b) => {
                if (sortKey === "NAME_ASC") return byName(a, b);
                if (sortKey === "NAME_DESC") return byName(b, a);
                if (sortKey === "STOCK_ASC") return byStock(a, b);
                return byStock(b, a);
            });
        }
        return base
    }, [products, producer, ptype, q, sortKey]);

    return (
        <section style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 16 }}>
            <h2 style={{ marginTop: 0 }}>Produkty</h2>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Szukaj…"
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", minWidth: 220 }}
                />

                <select value={producer} onChange={(e) => setProducer(e.target.value as any)} style={sel}>
                    <option value="ALL">Wszyscy producenci</option>
                    <option value="Podopharm">Podopharm</option>
                    <option value="Epione">Epione</option>
                    <option value="Podoland">Podoland</option>
                </select>

                <select value={ptype} onChange={(e) => setPtype(e.target.value as any)} style={sel}>
                    <option value="ALL">Wszystkie typy</option>
                    <option value="spray">spray</option>
                    <option value="krople">krople</option>
                    <option value="krem">krem</option>
                    <option value="maść">maść</option>
                    <option value="pasta">pasta</option>
                    <option value="serum">serum</option>
                    <option value="olejek">olejek</option>
                    <option value="mydło">mydło</option>
                    <option value="sól">sól</option>
                    <option value="inne">inne</option>
                </select>
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} style={sel}>
                    <option value="DEFAULT">Domyślnie</option>
                    <option value="NAME_ASC">Nazwa A–Z</option>
                    <option value="NAME_DESC">Nazwa Z–A</option>
                    <option value="STOCK_ASC">Stan rosnąco</option>
                    <option value="STOCK_DESC">Stan malejąco</option>
                </select>

                <button
                    onClick={() => setAddOpen(true)}
                    style={btnDark}
                >
                    Dodaj produkt
                </button>
                <div style={{ marginLeft: "auto", color: "#666", fontSize: 12, alignSelf: "center" }}>
                    Ilość: <b>{filtered.length}</b>
                </div>
            </div>

            <div style={{ overflowX: "auto" }}>

                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={th}>Produkt</th>
                            <th style={th}>Producent</th>
                            <th style={th}>Stan</th>
                            <th style={th}>Status</th>
                            <th style={th}>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p) => {
                            return (
                                <tr key={p.id}>
                                    <td style={td}>
                                        <strong>{displayName(p)}</strong>{" "}
                                    </td>
                                    <td style={td}>{p.producer}</td>
                                    <td style={td}>{p.stock}</td>
                                    <td style={td}>
                                        <StatusBadge stock={p.stock} minLevel={p.min_level} />
                                    </td>
                                    <td style={td}>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            <button
                                                onClick={() => { setDefaultPid(p.id); setMode("SALE"); setOpen(true); }}
                                                style={btnDark}
                                                title="Sprzedaż"
                                            >
                                                Sprzedaż
                                            </button>

                                            <button
                                                onClick={() => { setDefaultPid(p.id); setMode("CLINIC"); setOpen(true); }}
                                                style={btnLight}
                                                title="Zużycie w gabinecie"
                                            >
                                                Zużycie
                                            </button>

                                            <button
                                                onClick={() => { setDefaultPid(p.id); setMode("SUPPLY"); setOpen(true); }}
                                                style={btnLight}
                                                title="Dostawa / Korekta"
                                            >
                                                Dostawa
                                            </button>
                                            <button
                                                onClick={() => { setEditId(p.id); setEditOpen(true); }}
                                                style={iconBtn}
                                                title="Edytuj produkt"
                                                aria-label="Edytuj produkt"
                                            >
                                                <PencilIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filtered.length === 0 ? <p style={{ color: "#555" }}>Brak wyników.</p> : null}
            </div>
            <MovementModal
                open={open}
                onClose={() => setOpen(false)}
                products={products}
                defaultProductId={defaultPid}
                mode={mode}
                onSubmit={(args) => applyMovement(args)}
            />
            <AddProductModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSubmit={(args) => addProduct(args)}
            />
            <EditProductModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                product={editProductItem}
                onSubmit={(args) => editProduct(args)}
            />
        </section>
    );
}
function StatusBadge({ stock, minLevel }: { stock: number; minLevel: number }) {
    const status =
        stock === 0
            ? { label: "Brak w magazynie", tone: "danger" as const }
            : stock <= minLevel
                ? { label: "Kończy się", tone: "warn" as const }
                : { label: "Na stanie", tone: "ok" as const };

    const toneStyle =
        status.tone === "danger"
            ? { background: "#ffe8e8", border: "#ffb3b3", dot: "#d32f2f", text: "#8a0000" }
            : status.tone === "warn"
                ? { background: "#fff4dd", border: "#ffd59a", dot: "#f59e0b", text: "#8a5a00" }
                : { background: "#e9f8ef", border: "#bfe7cc", dot: "#16a34a", text: "#0f5a2a" };

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${toneStyle.border}`,
                background: toneStyle.background,
                color: toneStyle.text,
                fontWeight: 800,
                fontSize: 12,
                lineHeight: 1,
                whiteSpace: "nowrap",
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: toneStyle.dot,
                    display: "inline-block",
                }}
            />
            {status.label}
        </span>
    );
}

const sel: React.CSSProperties = { padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" };
const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #eee", padding: "8px 6px" };
const td: React.CSSProperties = { borderBottom: "1px solid #f2f2f2", padding: "8px 6px" };
const btnDark: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #3b82f6",
    background: "#3b82f6",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
};

const btnLight: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#f5f5f5",
    color: "#111",
    fontWeight: 800,
    cursor: "pointer",
};
const iconBtn: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fff",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
};

function PencilIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 20h9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </svg>
    );
}