import { useMemo, useState, useEffect } from "react";
import { useSupaDB } from "../state/SupabaseDBContext";
import { displayName, monthToRange, monthKey, type StockMovement, } from "../state/db";

export default function Dashboard() {
    const { products, snapshots, fetchMovements, podologists } = useSupaDB();

    const currentMonth = monthKey();

    const months = useMemo(() => {
        const set = new Set<string>(snapshots.map((s) => s.month));
        set.add(currentMonth);
        return Array.from(set).sort((a, b) => b.localeCompare(a));
    }, [snapshots, currentMonth]);

    const [selectedMonth, setSelectedMonth] = useState<string>(months[0] ?? currentMonth);

    // gdy snapshots się załadują, ustaw domyślnie bieżący miesiąc (jeśli jeszcze nie ustawiony)
    useEffect(() => {
        if (!selectedMonth) setSelectedMonth(currentMonth);
        // jeśli selectedMonth nie występuje w months (np. zmiana danych), ustaw pierwszy dostępny
        if (months.length > 0 && !months.includes(selectedMonth)) setSelectedMonth(months[0]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [months.join("|")]);

    const snap: any | undefined = useMemo(
        () => snapshots.find((s) => s.month === selectedMonth),
        [snapshots, selectedMonth]
    );

    // ruchy w wybranym miesiącu (pobierane z Supabase)
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loadingMov, setLoadingMov] = useState(false);
    const [movError, setMovError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            setLoadingMov(true);
            setMovError(null);

            try {
                const { from, to } = monthToRange(selectedMonth);
                const data = await fetchMovements({ from, to, type: "ALL", podologist: "ALL" });
                if (!cancelled) setMovements(data);
            } catch (e: any) {
                if (!cancelled) {
                    setMovements([]);
                    setMovError(e?.message ?? "Nie udało się pobrać ruchów.");
                }
            } finally {
                if (!cancelled) setLoadingMov(false);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [fetchMovements, selectedMonth]);

    const summary = useMemo(() => {
        const s = { SALE: 0, CLINIC: 0, IN: 0, ADJUST: 0 };
        for (const m of movements) {
            if (m.type === "SALE") s.SALE += m.qty;
            else if (m.type === "CLINIC") s.CLINIC += m.qty;
            else if (m.type === "IN") s.IN += m.qty;
            else s.ADJUST += 1; // korekty liczone jako liczba operacji
        }
        return s;
    }, [movements]);

    const perPodologist = useMemo(() => {
        const map = new Map<string, { SALE: number; CLINIC: number }>();

        for (const m of movements) {
            if (m.type !== "SALE" && m.type !== "CLINIC") continue;
            const key = m.podologist_name ?? "(brak)";
            const cur = map.get(key) ?? { SALE: 0, CLINIC: 0 };
            if (m.type === "SALE") cur.SALE += m.qty;
            if (m.type === "CLINIC") cur.CLINIC += m.qty;
            map.set(key, cur);
        }

        return Array.from(map.entries()).sort((a, b) => (b[1].SALE + b[1].CLINIC) - (a[1].SALE + a[1].CLINIC));
    }, [movements]);

    const statusRows = useMemo(() => {
        // Do porównania używamy:
        // - start_stock zawsze z snapshotu (jeśli jest)
        // - end_stock jeśli miesiąc zamknięty
        // - w przeciwnym razie aktualny stock z products
        const start = snap?.start_stock ?? {};
        const end = snap?.end_stock ?? null;

        return products
            .map((p) => {
                const startVal = typeof start[p.id] === "number" ? start[p.id] : null;
                const endVal = end ? (typeof end[p.id] === "number" ? end[p.id] : null) : p.stock;

                // diff > 0 oznacza spadek stanu w miesiącu (rozchód netto)
                const diff =
                    startVal == null || endVal == null ? null : startVal - endVal;

                return { p, startVal, endVal, diff };
            })
            .sort((a, b) => {
                // sortuj po największym rozchodzie, a jeśli brak diff, na końcu
                const da = a.diff == null ? -Infinity : a.diff;
                const db = b.diff == null ? -Infinity : b.diff;
                return db - da;
            });
    }, [products, snap]);

    const low = useMemo(() => {
        return products
            .filter((p) => p.stock <= p.min_level)
            .sort((a, b) => a.stock - b.stock);
    }, [products]);

    const isClosed = Boolean(snap?.end_stock);


    return (
        <section style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 16, background: "white" }}>
            <h2 style={{ marginTop: 0 }}>Dashboard</h2>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                <label style={filterLabel}>
                    <span style={filterText}>Miesiąc</span>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={sel}>
                        {months.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                </label>

                <span style={{ fontSize: 12, fontWeight: 800, color: isClosed ? "#0f5a2a" : "#8a5a00" }}>
                    {isClosed ? "Miesiąc zamknięty (start vs koniec)" : "Miesiąc w trakcie (start vs aktualny)"}
                </span>

                {!snap ? (
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#8a0000" }}>
                        Brak snapshotu start dla {selectedMonth} (warto uruchomić ensure_current_month_snapshot / zrobić start).
                    </span>
                ) : null}
            </div>

            <div style={{ display: "grid", gap: 12 }}>
                <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 14 }}>
                    <h3 style={{ margin: 0, marginBottom: 8 }}>Podsumowanie ruchów w miesiącu</h3>

                    {loadingMov ? <div style={{ color: "#666" }}>Ładowanie…</div> : null}
                    {movError ? <div style={errorBox}>{movError}</div> : null}

                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li><b>Sprzedaż:</b> {summary.SALE} szt</li>
                        <li><b>Zużycie w gabinecie:</b> {summary.CLINIC} szt</li>
                        <li><b>Dostawy:</b> {summary.IN} szt</li>
                        <li><b>Korekty:</b> {summary.ADJUST} operacji</li>
                    </ul>
                </div>

                <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 14 }}>
                    <h3 style={{ margin: 0, marginBottom: 8 }}>Sprzedaż / gabinet per podolog</h3>

                    {perPodologist.length === 0 ? (
                        <p style={{ margin: 0, color: "#555" }}>Brak danych dla wybranego miesiąca.</p>
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

                    {/* pomocniczo: lista podologów skonfigurowanych w bazie */}
                    {podologists.length > 0 ? (
                        <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                            Aktywni podolodzy: {podologists.map((p) => p.name).join(", ")}
                        </div>
                    ) : null}
                </div>

                <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 14 }}>
                    <h3 style={{ margin: 0, marginBottom: 8 }}>Start vs {isClosed ? "Koniec" : "Aktualny"} (Top 10 rozchodu)</h3>

                    {!snap ? (
                        <p style={{ margin: 0, color: "#555" }}>
                            Brak snapshotu start dla {selectedMonth}. Dodaj snapshot, żeby widzieć porównanie.
                        </p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th style={th}>Produkt</th>
                                        <th style={th}>Start</th>
                                        <th style={th}>{isClosed ? "Koniec" : "Aktualny"}</th>
                                        <th style={th}>Różnica (start - koniec)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statusRows.slice(0, 10).map(({ p, startVal, endVal, diff }) => (
                                        <tr key={p.id}>
                                            <td style={td}>{displayName(p)}</td>
                                            <td style={td}>{startVal == null ? "-" : startVal}</td>
                                            <td style={td}>{endVal == null ? "-" : endVal}</td>
                                            <td style={td}>{diff == null ? "-" : diff}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 14 }}>
                    <h3 style={{ margin: 0, marginBottom: 8 }}>Do zamówienia (aktualnie)</h3>

                    {low.length === 0 ? (
                        <p style={{ margin: 0, color: "#555" }}>Brak produktów do zamówienia 🎉</p>
                    ) : (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {low.map((p) => (
                                <li key={p.id}>
                                    <b>{displayName(p)}</b> — stan: {p.stock} / min: {p.min_level} ({p.producer})
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}

const sel: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "white",
};

const filterLabel: React.CSSProperties = { display: "grid", gap: 6 };
const filterText: React.CSSProperties = { fontSize: 12, color: "#555", fontWeight: 800 };

const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #eee", padding: "8px 6px", whiteSpace: "nowrap" };
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