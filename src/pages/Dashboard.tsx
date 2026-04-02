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
        const start = snap?.start_stock ?? {};
        const end = snap?.end_stock ?? null;

        return products
            .map((p) => {
                const startVal = typeof start[p.id] === "number" ? start[p.id] : null;
                const endVal = end ? (typeof end[p.id] === "number" ? end[p.id] : null) : p.stock;

                const diff = startVal == null || endVal == null ? null : endVal - startVal;

                return { p, startVal, endVal, diff };
            })
            .sort((a, b) => {
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
        <section className="p-4 border border-neutral-200 rounded-2xl bg-white shadow-sm">
            <h2 className="mt-0 mb-4 text-2xl font-black text-neutral-800">Dashboard</h2>

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <label className="grid gap-1.5">
                    <span className="text-xs text-neutral-500 font-extrabold">Miesiąc</span>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-neutral-300 bg-white outline-none focus:border-blue-500 transition-colors"
                    >
                        {months.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                </label>

                <span className={`text-xs font-extrabold ${isClosed ? "text-green-700" : "text-amber-600"}`}>
                    {isClosed ? "Miesiąc zamknięty (start vs koniec)" : "Miesiąc w trakcie (start vs aktualny)"}
                </span>

                {!snap ? (
                    <span className="text-xs font-extrabold text-red-700">
                        Brak snapshotu start dla {selectedMonth} (warto uruchomić ensure_current_month_snapshot / zrobić start).
                    </span>
                ) : null}
            </div>

            <div className="grid gap-4">
                <div className="p-4 border border-neutral-100 rounded-2xl bg-neutral-50/50">
                    <h3 className="m-0 mb-3 text-lg font-bold text-neutral-800">Podsumowanie ruchów w miesiącu</h3>

                    {loadingMov ? <div className="text-neutral-500 text-sm">Ładowanie…</div> : null}
                    {movError ? <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold text-sm mt-2">{movError}</div> : null}

                    <ul className="m-0 pl-5 text-neutral-700 space-y-1">
                        <li><b className="text-neutral-900">Sprzedaż:</b> {summary.SALE} szt</li>
                        <li><b className="text-neutral-900">Zużycie w gabinecie:</b> {summary.CLINIC} szt</li>
                        <li><b className="text-neutral-900">Dostawy:</b> {summary.IN} szt</li>
                        <li><b className="text-neutral-900">Korekty:</b> {summary.ADJUST} operacji</li>
                    </ul>
                </div>

                <div className="p-4 border border-neutral-100 rounded-2xl bg-neutral-50/50">
                    <h3 className="m-0 mb-3 text-lg font-bold text-neutral-800">Sprzedaż / gabinet per podolog</h3>

                    {perPodologist.length === 0 ? (
                        <p className="m-0 text-neutral-500 text-sm">Brak danych dla wybranego miesiąca.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-neutral-200">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="text-left border-b border-neutral-200 p-2.5 font-bold text-neutral-600">Podolog / Gabinet</th>
                                        <th className="text-left border-b border-neutral-200 p-2.5 font-bold text-neutral-600">Sprzedaż</th>
                                        <th className="text-left border-b border-neutral-200 p-2.5 font-bold text-neutral-600">Gabinet</th>
                                        <th className="text-left border-b border-neutral-200 p-2.5 font-bold text-neutral-600">Razem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {perPodologist.map(([name, v]) => (
                                        <tr key={name} className="hover:bg-white transition-colors">
                                            <td className="border-b border-neutral-100 p-2.5 text-neutral-800">{name}</td>
                                            <td className="border-b border-neutral-100 p-2.5 text-neutral-800">{v.SALE}</td>
                                            <td className="border-b border-neutral-100 p-2.5 text-neutral-800">{v.CLINIC}</td>
                                            <td className="border-b border-neutral-100 p-2.5 text-neutral-800 font-bold">{v.SALE + v.CLINIC}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {podologists.length > 0 ? (
                        <div className="mt-3 text-xs text-neutral-500">
                            Aktywni podolodzy: {podologists.map((p) => p.name).join(", ")}
                        </div>
                    ) : null}
                </div>

                <div className="p-4 border border-neutral-100 rounded-2xl bg-neutral-50/50">
                    <h3 className="m-0 mb-3 text-lg font-bold text-neutral-800">Start vs {isClosed ? "Koniec" : "Aktualny"} (Top 10 rozchodu)</h3>

                    {!snap ? (
                        <p className="m-0 text-neutral-500 text-sm">
                            Brak snapshotu start dla {selectedMonth}. Dodaj snapshot, żeby widzieć porównanie.
                        </p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-neutral-200">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="text-left border-b border-neutral-200 p-2.5 font-bold text-neutral-600 whitespace-nowrap">Produkt</th>
                                        <th className="text-left border-b border-neutral-200 p-2.5 font-bold text-neutral-600 whitespace-nowrap">Start</th>
                                        <th className="text-left border-b border-neutral-200 p-2.5 font-bold text-neutral-600 whitespace-nowrap">{isClosed ? "Koniec" : "Aktualny"}</th>
                                        <th className="text-left border-b border-neutral-200 p-2.5 font-bold text-neutral-600 whitespace-nowrap">Różnica (start - koniec)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statusRows.slice(0, 10).map(({ p, startVal, endVal, diff }) => (
                                        <tr key={p.id} className="hover:bg-white transition-colors">
                                            <td className="border-b border-neutral-100 p-2.5 text-neutral-800">{displayName(p)}</td>
                                            <td className="border-b border-neutral-100 p-2.5 text-neutral-800">{startVal == null ? "-" : startVal}</td>
                                            <td className="border-b border-neutral-100 p-2.5 text-neutral-800">{endVal == null ? "-" : endVal}</td>
                                            <td className="border-b border-neutral-100 p-2.5 text-neutral-800 font-bold">{formatDiff(diff)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-4 border border-neutral-100 rounded-2xl bg-neutral-50/50">
                    <h3 className="m-0 mb-3 text-lg font-bold text-neutral-800">Do zamówienia (aktualnie)</h3>

                    {low.length === 0 ? (
                        <p className="m-0 text-neutral-500 text-sm">Brak produktów do zamówienia 🎉</p>
                    ) : (
                        <ul className="m-0 pl-5 text-neutral-700 space-y-1">
                            {low.map((p) => (
                                <li key={p.id}>
                                    <b className="text-neutral-900">{displayName(p)}</b> — stan: <span className="text-red-600 font-bold">{p.stock}</span> / min: {p.min_level} ({p.producer})
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}

function formatDiff(diff: number | null) {
    if (diff == null) return "-";
    if (diff > 0) return `+${diff}`;
    return diff; // 0 lub ujemne
}