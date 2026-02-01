import { useMemo, useState, useEffect } from "react";
import { useSupaDB } from "../state/SupabaseDBContext";
import { displayName, endOfTodayYMD, startOfPrevMonthYMD, endOfPrevMonthYMD, monthKey, prevMonthKey, startOfMonthYMD, } from "../state/db";
import { type PeriodFilter, type TypeFilter, type StockMovement } from "../state/db";
// import { monthFromYMD } from "../state/logic";

export default function History() {
    const { products, podologists, fetchMovements } = useSupaDB();
    const [period, setPeriod] = useState<PeriodFilter>("CURRENT");
    const [podologist, setPodologist] = useState<string>("ALL");
    const [type, setType] = useState<TypeFilter>("ALL");
    const [items, setItems] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const currentMonth = monthKey();
    const previousMonth = prevMonthKey(currentMonth);


    const range = useMemo(() => {
        const now = new Date();
        if (period === "ALL") return { from: undefined as string | undefined, to: undefined as string | undefined };

        if (period === "CURRENT") {
            return { from: startOfMonthYMD(now), to: endOfTodayYMD(now) };
        }

        // PREVIOUS
        return { from: startOfPrevMonthYMD(now), to: endOfPrevMonthYMD(now) };
    }, [period])

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await fetchMovements({
                    from: range.from,
                    to: range.to,
                    type: type === "ALL" ? "ALL" : type,
                    podologist: podologist === "ALL" ? "ALL" : podologist,
                });

                if (!cancelled) setItems(data);
            } catch (e: any) {
                if (!cancelled) {
                    setItems([]);
                    setError(e?.message ?? "Nie udało się pobrać historii.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [fetchMovements, range.from, range.to, type, podologist]);


    return (
        <section style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 16 }}>
            <h2 style={{ marginTop: 0 }}>Historia</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                <label style={filterLabel}>
                    <span style={filterText}>Okres</span>
                    <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodFilter)} style={sel}>
                        <option value="CURRENT">Bieżący miesiąc ({currentMonth})</option>
                        <option value="PREVIOUS">Poprzedni miesiąc ({previousMonth})</option>
                        <option value="ALL">Cała historia</option>
                    </select>
                </label>

                <label style={filterLabel}>
                    <span style={filterText}>Typ</span>
                    <select value={type} onChange={(e) => setType(e.target.value as TypeFilter)} style={sel}>
                        <option value="ALL">Wszystkie</option>
                        <option value="CLINIC">Gabinet</option>
                        <option value="SALE">Sprzedaż</option>
                        <option value="IN">Dostawa</option>
                        <option value="ADJUST">Korekta</option>
                    </select>
                </label>

                <label style={filterLabel}>
                    <span style={filterText}>Podolog</span>
                    <select value={podologist} onChange={(e) => setPodologist(e.target.value)} style={sel}>
                        <option value="ALL">Wszyscy</option>
                        {podologists.map((p) => (
                            <option key={p.id} value={p.name}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </label>

                <div style={{ marginLeft: "auto", color: "#666", fontSize: 12 }}>
                    Wyników: <b>{items.length}</b>
                </div>
            </div>
            {error ? <div style={errorBox}>{error}</div> : null}
            {loading ? (
                <div style={{ color: "#666" }}>Ładowanie…</div>
            ) : items.length === 0 ? (
                <p style={{ color: "#555" }}>Brak ruchów.</p>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={th}>Data</th>
                                <th style={th}>Typ</th>
                                <th style={th}>Produkt</th>
                                <th style={th}>Ilość</th>
                                <th style={th}>Notatka</th>
                                <th style={th}>Podolog</th>

                            </tr>
                        </thead>
                        <tbody>
                            {items.map((m) => {
                                const p = products.find((x) => x.id === m.product_id);
                                const typeLabel =
                                    m.type === "IN" ? "Dostawa" :
                                        m.type === "SALE" ? "Sprzedaż" :
                                            m.type === "CLINIC" ? "Gabinet" :
                                                "Korekta";
                                return (
                                    <tr key={m.id}>
                                        <td style={td}>{m.occurred_at.split("-").reverse().join("-")}</td>
                                        <td style={td}>{typeLabel}</td>
                                        <td style={td}>{p ? displayName(p) : m.product_id}</td>
                                        <td style={td}>{m.qty}</td>
                                        <td style={td}>{m.note ?? "-"}</td>
                                        <td style={td}>{(m.type === "SALE" || m.type === "CLINIC") ? (m.podologist_name ?? "-") : "-"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

const sel: React.CSSProperties = { padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white" };
const filterLabel: React.CSSProperties = { display: "grid", gap: 6 };
const filterText: React.CSSProperties = { fontSize: 12, color: "#555", fontWeight: 800 };
const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #eee", padding: "8px 6px" };
const td: React.CSSProperties = { borderBottom: "1px solid #f2f2f2", padding: "8px 6px" };
const errorBox: React.CSSProperties = {
    padding: 10,
    borderRadius: 12,
    background: "#ffe8e8",
    border: "1px solid #ffb3b3",
    color: "#8a0000",
    fontWeight: 800,
    marginTop: 8,
};