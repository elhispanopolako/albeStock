import { useEffect, useState } from "react";
import { type Product, displayName } from "../state/db";
import { todayYMD, isInCurrentMonth, startOfMonthYMD, isNotFutureYMD } from "../state/logic";
import { useSupaDB, type DeliveryArgs } from "../state/SupabaseDBContext";

type Section = "PRODUCTS" | "SUPPLIES";

type Line = {
    key: number;
    section: Section;
    productId: string;
    qty: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
};

const DEFAULT_QTY = "1";

let nextKey = 0;
const emptyLine = (section: Section): Line => ({ key: nextKey++, section, productId: "", qty: DEFAULT_QTY });

export default function DeliveryModal({ open, onClose }: Props) {
    const { products, applyDelivery, locations, currentLocationId } = useSupaDB();
    const [lines, setLines] = useState<Line[]>([]);
    const [occurredAt, setOccurredAt] = useState<string>(todayYMD());
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const currentLocation = locations.find((l) => l.id === currentLocationId);

    useEffect(() => {
        if (!open) return;
        setLines([emptyLine("PRODUCTS"), emptyLine("SUPPLIES")]);
        setOccurredAt(todayYMD());
        setNote("");
        setError(null);
    }, [open]);

    if (!open) return null;

    const updateLine = (key: number, patch: Partial<Line>) =>
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

    const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key));

    const addLine = (section: Section) => setLines((prev) => [...prev, emptyLine(section)]);

    const productName = (id: string) => {
        const p = products.find((x) => x.id === id);
        return p ? displayName(p) : id;
    };

    const submit = async () => {
        if (saving) return;
        setError(null);

        const items: DeliveryArgs["items"] = [];
        const seen = new Set<string>();
        for (const section of ["PRODUCTS", "SUPPLIES"] as const) {
            const label = section === "PRODUCTS" ? "Produkty" : "Materiały";
            for (const [i, line] of lines.filter((l) => l.section === section).entries()) {
                // nietknięta pusta pozycja nie jest błędem - po prostu ją pomijamy
                if (!line.productId) {
                    if (line.qty.trim() === "" || line.qty.trim() === DEFAULT_QTY) continue;
                    return setError(`${label}, pozycja ${i + 1}: wybierz produkt.`);
                }
                if (!/^\d+$/.test(line.qty.trim()) || Number(line.qty) <= 0) return setError(`${label}, pozycja ${i + 1}: ilość musi być liczbą całkowitą > 0.`);
                if (seen.has(line.productId)) return setError(`„${productName(line.productId)}” jest na liście więcej niż raz.`);
                seen.add(line.productId);
                items.push({ productId: line.productId, qty: Number(line.qty) });
            }
        }
        if (items.length === 0) return setError("Dodaj co najmniej jedną pozycję.");

        if (!occurredAt) return setError("Wybierz datę zdarzenia.");
        if (!isInCurrentMonth(occurredAt)) return setError("Można dodawać ruchy tylko w bieżącym miesiącu.");
        if (!isNotFutureYMD(occurredAt)) return setError("Brak możliwości dodania daty przyszłej");

        setSaving(true);
        try {
            await applyDelivery({ occurredAt, note: note.trim() ? note.trim() : undefined, items });
            onClose();
        } catch (e) {
            setError((e as { message?: string } | null)?.message ?? "Nie udało się zapisać.");
        } finally {
            setSaving(false);
        }
    };

    const filledLines = lines.filter((l) => l.productId);
    const totalQty = filledLines.reduce((sum, l) => sum + (/^\d+$/.test(l.qty.trim()) ? Number(l.qty) : 0), 0);

    return (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-[999]" role="dialog" aria-modal="true">
            <div className="w-full max-w-[760px] max-h-[90vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-neutral-200 flex items-start justify-between gap-3">
                    <div>
                        <div className="font-extrabold text-lg text-neutral-900">Przyjęcie dostawy</div>
                        <div className="text-neutral-500 mt-1 text-sm">
                            {currentLocation ? <>Lokalizacja: <b className="text-neutral-800">{currentLocation.name}</b> · </> : null}
                            pozycji: <b className="text-neutral-800">{filledLines.length}</b> · razem: <b className="text-neutral-800">{totalQty}</b> szt
                        </div>
                    </div>
                    <button onClick={onClose} className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-neutral-100 text-neutral-800 font-bold text-sm hover:bg-neutral-200 transition-colors">
                        Zamknij
                    </button>
                </div>

                <div className="p-4 grid gap-4 overflow-y-auto">
                    <DeliverySection
                        title="Produkty"
                        accent="border-blue-200 bg-blue-50/40"
                        lines={lines.filter((l) => l.section === "PRODUCTS")}
                        products={products.filter((p) => !p.is_clinic_only)}
                        onChange={updateLine}
                        onRemove={removeLine}
                        onAdd={() => addLine("PRODUCTS")}
                    />
                    <DeliverySection
                        title="Materiały"
                        accent="border-purple-200 bg-purple-50/40"
                        lines={lines.filter((l) => l.section === "SUPPLIES")}
                        products={products.filter((p) => p.is_clinic_only)}
                        onChange={updateLine}
                        onRemove={removeLine}
                        onAdd={() => addLine("SUPPLIES")}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="grid gap-1.5">
                            <span className="text-xs text-neutral-500 font-bold">Data</span>
                            <input
                                type="date"
                                value={occurredAt}
                                onChange={(e) => setOccurredAt(e.target.value)}
                                min={startOfMonthYMD()}
                                max={todayYMD()}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 bg-white transition-colors"
                            />
                        </label>
                        <label className="grid gap-1.5">
                            <span className="text-xs text-neutral-500 font-bold">Notatka (opcjonalna, dla wszystkich pozycji)</span>
                            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Np. faktura FV/123/2026" className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 transition-colors" />
                        </label>
                    </div>

                    {error ? <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold text-sm">{error}</div> : null}

                    <div className="flex justify-end gap-2.5 mt-2">
                        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-neutral-300 bg-neutral-100 text-neutral-900 font-extrabold hover:bg-neutral-200 transition-colors">
                            Anuluj
                        </button>
                        <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl border border-neutral-900 bg-neutral-900 text-white font-extrabold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {saving ? "Zapisywanie…" : "Przyjmij dostawę"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DeliverySection({ title, accent, lines, products, onChange, onRemove, onAdd }: {
    title: string;
    accent: string;
    lines: Line[];
    products: Product[];
    onChange: (key: number, patch: Partial<Line>) => void;
    onRemove: (key: number) => void;
    onAdd: () => void;
}) {
    return (
        <div className={`p-3 border rounded-2xl grid gap-2 ${accent}`}>
            <div className="font-extrabold text-neutral-900">{title}</div>

            {lines.length === 0 ? <p className="m-0 text-neutral-500 text-sm">Brak pozycji.</p> : null}

            {lines.map((line, i) => (
                <div key={line.key} className="flex flex-wrap items-end gap-2">
                    <label className="grid gap-1.5 flex-1 min-w-[240px]">
                        {i === 0 ? <span className="text-xs text-neutral-500 font-bold">{title === "Produkty" ? "Produkt" : "Materiał"}</span> : null}
                        <select value={line.productId} onChange={(e) => onChange(line.key, { productId: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 bg-white transition-colors">
                            <option value="">Wybierz…</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.is_clinic_only ? displayName(p) : `${p.producer} — ${displayName(p)}`} (stan: {p.stock})
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-1.5 w-28">
                        {i === 0 ? <span className="text-xs text-neutral-500 font-bold">Ilość (szt.)</span> : null}
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={line.qty} onChange={(e) => onChange(line.key, { qty: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 bg-white transition-colors" />
                    </label>
                    <button
                        onClick={() => onRemove(line.key)}
                        title="Usuń pozycję"
                        aria-label="Usuń pozycję"
                        className="w-10 h-10 rounded-xl border border-neutral-300 bg-white text-neutral-600 font-black hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                        ×
                    </button>
                </div>
            ))}

            <div>
                <button onClick={onAdd} className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 font-extrabold text-sm hover:bg-neutral-100 transition-colors">
                    + Dodaj pozycję
                </button>
            </div>
        </div>
    );
}
