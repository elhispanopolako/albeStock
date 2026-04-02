import { useMemo, useState, useEffect } from "react";
import { useSupaDB } from "../state/SupabaseDBContext";
import { displayName, endOfTodayYMD, startOfPrevMonthYMD, endOfPrevMonthYMD, monthKey, prevMonthKey, startOfMonthYMD, } from "../state/db";
import { type PeriodFilter, type TypeFilter, type StockMovement } from "../state/db";

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
        <section className="p-4 border border-neutral-200 rounded-2xl bg-white shadow-sm">
            <h2 className="mt-0 mb-4 text-2xl font-black text-neutral-800">Historia</h2>

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <label className="grid gap-1.5">
                    <span className="text-xs text-neutral-500 font-extrabold">Okres</span>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                        className="px-3 py-2 rounded-xl border border-neutral-300 bg-white outline-none focus:border-blue-500 transition-colors"
                    >
                        <option value="CURRENT">Bieżący miesiąc ({currentMonth})</option>
                        <option value="PREVIOUS">Poprzedni miesiąc ({previousMonth})</option>
                        <option value="ALL">Cała historia</option>
                    </select>
                </label>

                <label className="grid gap-1.5">
                    <span className="text-xs text-neutral-500 font-extrabold">Typ</span>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as TypeFilter)}
                        className="px-3 py-2 rounded-xl border border-neutral-300 bg-white outline-none focus:border-blue-500 transition-colors"
                    >
                        <option value="ALL">Wszystkie</option>
                        <option value="CLINIC">Gabinet</option>
                        <option value="SALE">Sprzedaż</option>
                        <option value="IN">Dostawa</option>
                        <option value="ADJUST">Korekta</option>
                    </select>
                </label>

                <label className="grid gap-1.5">
                    <span className="text-xs text-neutral-500 font-extrabold">Podolog</span>
                    <select
                        value={podologist}
                        onChange={(e) => setPodologist(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-neutral-300 bg-white outline-none focus:border-blue-500 transition-colors"
                    >
                        <option value="ALL">Wszyscy</option>
                        <optgroup label="Podolodzy">
                            {podologists.map((p) => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Gabinety">
                            <option value="Gabinet 1">Gabinet 1</option>
                            <option value="Gabinet 2">Gabinet 2</option>
                        </optgroup>
                    </select>
                </label>

                <div className="ml-auto text-xs text-neutral-500 font-bold self-center">
                    Wyników: <b className="text-neutral-800">{items.length}</b>
                </div>
            </div>

            {error ? <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold text-sm mb-4">{error}</div> : null}

            {loading ? (
                <div className="text-neutral-500 font-bold text-sm">Ładowanie…</div>
            ) : items.length === 0 ? (
                <p className="text-neutral-500 font-bold text-center py-4">Brak ruchów.</p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-neutral-200">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th className="text-left border-b border-neutral-200 p-3 font-bold text-neutral-600 whitespace-nowrap">Data</th>
                                <th className="text-left border-b border-neutral-200 p-3 font-bold text-neutral-600 whitespace-nowrap">Typ</th>
                                <th className="text-left border-b border-neutral-200 p-3 font-bold text-neutral-600 whitespace-nowrap">Produkt</th>
                                <th className="text-left border-b border-neutral-200 p-3 font-bold text-neutral-600 whitespace-nowrap">Ilość</th>
                                <th className="text-left border-b border-neutral-200 p-3 font-bold text-neutral-600 whitespace-nowrap">Notatka</th>
                                <th className="text-left border-b border-neutral-200 p-3 font-bold text-neutral-600 whitespace-nowrap">Podolog / Gabinet</th>                            </tr>
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
                                    <tr key={m.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="border-b border-neutral-100 p-3 text-neutral-800 font-medium">{m.occurred_at.split("-").reverse().join("-")}</td>
                                        <td className="border-b border-neutral-100 p-3 text-neutral-800">
                                            <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold ${m.type === 'IN' ? 'bg-green-100 text-green-800' :
                                                m.type === 'SALE' ? 'bg-blue-100 text-blue-800' :
                                                    m.type === 'CLINIC' ? 'bg-purple-100 text-purple-800' :
                                                        'bg-neutral-200 text-neutral-800'
                                                }`}>
                                                {typeLabel}
                                            </span>
                                        </td>
                                        <td className="border-b border-neutral-100 p-3 text-neutral-900 font-bold">{p ? displayName(p) : m.product_id}</td>
                                        <td className="border-b border-neutral-100 p-3 text-neutral-800 font-black">{m.qty}</td>
                                        <td className="border-b border-neutral-100 p-3 text-neutral-600">{m.note ?? "-"}</td>
                                        <td className="border-b border-neutral-100 p-3 text-neutral-800">{(m.type === "SALE" || m.type === "CLINIC") ? (m.podologist_name ?? "-") : "-"}</td>
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