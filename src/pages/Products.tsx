import { useMemo, useState } from "react";
import { useDB } from "../state/DBContext";
import MovementModal from "../components/MovementModal";
import { type Producer, type ProductType, displayName } from "../state/db";
import AddProductModal from "../components/AddProductModal";


export default function Products() {
    const { db, move, addProduct } = useDB();
    const [q, setQ] = useState("");
    const [producer, setProducer] = useState<Producer | "ALL">("ALL");
    const [ptype, setPtype] = useState<ProductType | "ALL">("ALL");
    const [open, setOpen] = useState(false);
    const [defaultPid, setDefaultPid] = useState<string | undefined>(undefined);
    const [mode, setMode] = useState<"SALE" | "CLINIC" | "SUPPLY">("SALE");
    const [addOpen, setAddOpen] = useState(false);





    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        return db.products.filter((p) => {
            if (producer !== "ALL" && p.producer !== producer) return false;
            if (ptype !== "ALL" && p.productType !== ptype) return false;
            if (!qq) return true;
            return displayName(p).toLowerCase().includes(qq);
        });
    }, [db.products, producer, ptype, q]);

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
                <button
                    onClick={() => setAddOpen(true)}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "white", fontWeight: 800 }}
                >
                    Dodaj produkt
                </button>
            </div>

            <div style={{ overflowX: "auto" }}>

                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={th}>Produkt</th>
                            <th style={th}>Producent</th>
                            <th style={th}>Stan</th>
                            <th style={th}>Min</th>
                            <th style={th}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p) => {
                            const low = p.stock <= p.minLevel;
                            return (
                                <tr key={p.id}>
                                    <td style={td}>
                                        <strong>{displayName(p)}</strong>{" "}
                                        {low ? <span style={{ marginLeft: 8, color: "#b00020" }}>KOŃCZY SIĘ</span> : null}
                                    </td>
                                    <td style={td}>{p.producer}</td>
                                    <td style={td}>{p.stock}</td>
                                    <td style={td}>{p.minLevel}</td>
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
                products={db.products}
                defaultProductId={defaultPid}
                mode={mode}
                onSubmit={(args) => move(args)}
            />
            <AddProductModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSubmit={(args) => addProduct(args)}
            />
        </section>
    );
}

const sel: React.CSSProperties = { padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" };
const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #eee", padding: "8px 6px" };
const td: React.CSSProperties = { borderBottom: "1px solid #f2f2f2", padding: "8px 6px" };
const btnDark: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #111",
    background: "#111",
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