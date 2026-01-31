import { useMemo, useState } from "react";
import { useDB } from "../state/DBContext";
import { displayName } from "../state/db";
import { getSnapshotForMonth, listAvailableMonths, monthFromYMD } from "../state/logic";

export default function Dashboard() {
    const { db } = useDB();

    const months = useMemo(() => listAvailableMonths(db), [db]);
    const [selectedMonth, setSelectedMonth] = useState<string>(months[0] ?? "");

    const snap = useMemo(() => getSnapshotForMonth(db, selectedMonth), [db, selectedMonth]);

    const movementsInMonth = useMemo(() => {
        return db.movements.filter((m) => monthFromYMD(m.occurredAt) === selectedMonth);
    }, [db.movements, selectedMonth]);

    const summary = useMemo(() => {
        const s = { SALE: 0, CLINIC: 0, IN: 0, ADJUST: 0 };
        for (const m of movementsInMonth) {
            if (m.type === "SALE") s.SALE += m.qty;
            else if (m.type === "CLINIC") s.CLINIC += m.qty;
            else if (m.type === "IN") s.IN += m.qty;
            else if (m.type === "ADJUST") s.ADJUST += 1; // korektę liczę jako liczbę operacji (opcjonalnie)
        }
        return s;
    }, [movementsInMonth]);

    const perPodologist = useMemo(() => {
        const map = new Map<string, { SALE: number; CLINIC: number }>();
        for (const m of movementsInMonth) {
            if (m.type !== "SALE" && m.type !== "CLINIC") continue;
            const key = m.podologist ?? "(brak)";
            const cur = map.get(key) ?? { SALE: 0, CLINIC: 0 };
            if (m.type === "SALE") cur.SALE += m.qty;
            if (m.type === "CLINIC") cur.CLINIC += m.qty;
            map.set(key, cur);
        }
        return Array.from(map.entries()).sort((a, b) => (b[1].SALE + b[1].CLINIC) - (a[1].SALE + a[1].CLINIC));
    }, [movementsInMonth]);

    const low = useMemo(() => {
        // “Do zamówienia” zawsze z aktualnego stanu (nie miesiąca historycznego)
        return db.products.filter((p) => p.stock <= p.minLevel).sort((a, b) => a.stock - b.stock);
    }, [db.products]);

    const topRows = useMemo(() => {
        if (!snap) return [];

        return db.products.map((p) => {
            const start = snap.startStockByProductId[p.id] ?? p.stock;
            const end =
                snap.endStockByProductId?.[p.id] ?? p.stock; // jeśli brak END -> bieżący stan (miesiąc w trakcie)
            const diff = start - end; // >0 oznacza rozchód netto w miesiącu
            return { p, start, end, diff };
        });
    }, [db.products, snap]);

    return (
        <section style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 16 }}>
            <h2 style={{ marginTop: 0 }}>Dashboard</h2>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: "#555" }}>Miesiąc:</span>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
                    >
                        {months.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                </label>
                {!snap ? (
                    <span style={{ color: "#b00020", fontWeight: 700 }}>
                        Brak snapshotu na początek miesiąca {selectedMonth} (będą dostępne tylko raporty z ruchów).
                    </span>
                ) : (null)}
            </div>

            <h3 style={{ marginTop: 0 }}>Podsumowanie ruchów (wg daty zdarzenia)</h3>
            <ul>
                <li><b>Sprzedaż:</b> {summary.SALE} szt</li>
                <li><b>Zużycie w gabinecie:</b> {summary.CLINIC} szt</li>
                <li><b>Dostawy:</b> {summary.IN} szt</li>
                <li><b>Korekty:</b> {summary.ADJUST} operacji</li>
            </ul>

            <h3>Zużycie / sprzedaż per podolog</h3>
            {perPodologist.length === 0 ? (
                <p style={{ color: "#555" }}>Brak danych w tym miesiącu.</p>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={th}>Podolog</th>
                                <th style={th}>Sprzedaż</th>
                                <th style={th}>Gabinet</th>
                                <th style={th}>Razem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {perPodologist.map(([name, v]) => (
                                <tr key={name}>
                                    <td style={td}>{name}</td>
                                    <td style={td}>{v.SALE}</td>
                                    <td style={td}>{v.CLINIC}</td>
                                    <td style={td}>{v.SALE + v.CLINIC}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <hr style={{ margin: "16px 0" }} />

            <h3>Do zamówienia (aktualnie)</h3>
            {low.length === 0 ? (
                <p style={{ color: "#555" }}>Brak produktów do zamówienia 🎉</p>
            ) : (
                <ul>
                    {low.map((p) => (
                        <li key={p.id}>
                            <b>{displayName(p)}</b> — stan: {p.stock} / min: {p.minLevel} ({p.producer})
                        </li>
                    ))}
                </ul>
            )}

            {snap ? (
                <>
                    <hr style={{ margin: "16px 0" }} />
                    <h3>Start miesiąca vs aktualny stan</h3>
                    <div style={{ color: "#666", marginBottom: 8 }}>
                        Uwaga: dla przeszłych miesięcy „aktualny stan” to stan na koniec danego miesiąca.
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={th}>Produkt</th>
                                    <th style={th}>Start miesiąca</th>
                                    <th style={th}>Aktualny</th>
                                    <th style={th}>Różnica</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topRows
                                    .slice()
                                    .sort((a, b) => b.diff - a.diff)
                                    .map(({ p, start, end, diff }) => (
                                        <tr key={p.id}>
                                            <td style={td}>{displayName(p)}</td>
                                            <td style={td}>{start}</td>
                                            <td style={td}>{end}</td>
                                            <td style={td}>{diff === 0 ? "-" : diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : null}
        </section>
    );
}

const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #eee", padding: "8px 6px" };
const td: React.CSSProperties = { borderBottom: "1px solid #f2f2f2", padding: "8px 6px" };
