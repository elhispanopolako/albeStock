import { useMemo, useState } from "react";
import { useDB } from "../state/DBContext";
import { displayName, PODologists } from "../state/db";
import { monthKey, prevMonthKey, type PeriodFilter, type TypeFilter } from "../state/db";
import { monthFromYMD } from "../state/logic";

export default function History() {
    const { db } = useDB();
    const [period, setPeriod] = useState<PeriodFilter>("CURRENT");
    const [podologist, setPodologist] = useState<string>("ALL");
    const [type, setType] = useState<TypeFilter>("ALL");

    const currentMonth = monthKey();
    const previousMonth = prevMonthKey(currentMonth);

    const items = useMemo(() => {
        const byPeriod = (m: any) => {
            if (period === "ALL") return true;
            const mon = monthFromYMD(m.occurredAt);
            if (period === "CURRENT") return mon === currentMonth;
            return mon === previousMonth;
        };

        const byType = (m: any) => (type === "ALL" ? true : m.type === type);

        const byPodologist = (m: any) => {
            if (podologist === "ALL") return true;
            // filtr działa tylko sensownie dla SALE/CLINIC, ale jeśli ktoś wybierze podologa,
            // to IN/ADJUST po prostu nie przejdą (bo mają undefined)
            return (m.podologist ?? "") === podologist;
        };

        return db.movements
            .filter((m) => byPeriod(m) && byType(m) && byPodologist(m))
            .slice()
            .sort((a, b) => {
                // najpierw data zdarzenia (occurredAt) malejąco
                const c = b.occurredAt.localeCompare(a.occurredAt);
                if (c !== 0) return c;
                // potem data wpisu (createdAt) malejąco
                return b.createdAt.localeCompare(a.createdAt);
            });
    }, [db.movements, period, podologist, type, currentMonth, previousMonth]);

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
                        {PODologists.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </label>

                <div style={{ marginLeft: "auto", color: "#666", fontSize: 12 }}>
                    Wyników: <b>{items.length}</b>
                </div>
            </div>
            {items.length === 0 ? (
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
                                const p = db.products.find((x) => x.id === m.productId);
                                const typeLabel =
                                    m.type === "IN" ? "Dostawa" :
                                        m.type === "SALE" ? "Sprzedaż" :
                                            m.type === "CLINIC" ? "Gabinet" :
                                                "Korekta";
                                return (
                                    <tr key={m.id}>
                                        <td style={td}>{m.occurredAt.split("-").reverse().join("-")}</td>
                                        <td style={td}>{typeLabel}</td>
                                        <td style={td}>{p ? displayName(p) : m.productId}</td>
                                        <td style={td}>{m.qty}</td>
                                        <td style={td}>{m.note ?? "-"}</td>
                                        <td style={td}>{(m.type === "SALE" || m.type === "CLINIC") ? (m.podologist ?? "-") : "-"}</td>
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
