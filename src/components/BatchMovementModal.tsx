import { useEffect, useMemo, useRef, useState } from "react";
import { type Product, displayName } from "../state/db";
import { todayYMD, isInCurrentMonth, startOfMonthYMD, isNotFutureYMD } from "../state/logic";
import { useSupaDB, type UsageArgs } from "../state/SupabaseDBContext";

type Section = "PRODUCTS" | "SUPPLIES";

type Line = {
    key: number;
    section: Section;
    productId: string;
    // tekst wpisany w pole wyszukiwania produktu
    query: string;
    qty: string;
};

// DELIVERY = przyjęcie dostawy (IN), USAGE = zużycie w gabinecie (CLINIC)
export type BatchKind = "DELIVERY" | "USAGE";

type Props = {
    open: boolean;
    kind: BatchKind;
    onClose: () => void;
};

const DEFAULT_QTY = "1";

let nextKey = 0;
const emptyLine = (section: Section): Line => ({ key: nextKey++, section, productId: "", query: "", qty: DEFAULT_QTY });

export default function BatchMovementModal({ open, kind, onClose }: Props) {
    const { products, applyDelivery, applyUsage, locations, currentLocationId, podologists, rooms } = useSupaDB();
    const [lines, setLines] = useState<Line[]>([]);
    const [occurredAt, setOccurredAt] = useState<string>(todayYMD());
    const [note, setNote] = useState("");
    // tylko dla zużycia: podolog dla produktów, gabinet dla materiałów
    const [podologist, setPodologist] = useState("");
    const [room, setRoom] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const currentLocation = locations.find((l) => l.id === currentLocationId);

    useEffect(() => {
        if (!open) return;
        setLines([emptyLine("PRODUCTS"), emptyLine("SUPPLIES")]);
        setOccurredAt(todayYMD());
        setNote("");
        setPodologist("");
        setRoom("");
        setError(null);
    }, [open, kind]);

    const isUsage = kind === "USAGE";

    if (!open) return null;

    const updateLine = (key: number, patch: Partial<Line>) =>
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

    const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key));

    const addLine = (section: Section) => setLines((prev) => [...prev, emptyLine(section)]);

    const findProduct = (id: string) => products.find((x) => x.id === id);
    const productName = (id: string) => {
        const p = findProduct(id);
        return p ? displayName(p) : id;
    };

    const submit = async () => {
        if (saving) return;
        setError(null);

        const items: UsageArgs["items"] = [];
        const seen = new Set<string>();
        for (const section of ["PRODUCTS", "SUPPLIES"] as const) {
            const label = section === "PRODUCTS" ? "Produkty" : "Materiały";
            for (const [i, line] of lines.filter((l) => l.section === section).entries()) {
                // nietknięta pusta pozycja nie jest błędem - po prostu ją pomijamy
                if (!line.productId) {
                    if (line.query.trim()) return setError(`${label}, pozycja ${i + 1}: wybierz produkt z listy.`);
                    if (line.qty.trim() === "" || line.qty.trim() === DEFAULT_QTY) continue;
                    return setError(`${label}, pozycja ${i + 1}: wybierz produkt.`);
                }
                if (!/^\d+$/.test(line.qty.trim()) || Number(line.qty) <= 0) return setError(`${label}, pozycja ${i + 1}: ilość musi być liczbą całkowitą > 0.`);
                if (seen.has(line.productId)) return setError(`„${productName(line.productId)}” jest na liście więcej niż raz.`);
                seen.add(line.productId);
                const stock = findProduct(line.productId)?.stock ?? 0;
                if (isUsage && Number(line.qty) > stock) return setError(`„${productName(line.productId)}”: brak wystarczającego stanu (stan: ${stock}, ilość: ${line.qty}).`);
                const target = section === "PRODUCTS" ? podologist : room;
                items.push({ productId: line.productId, qty: Number(line.qty), target });
            }
        }
        if (items.length === 0) return setError("Dodaj co najmniej jedną pozycję.");
        if (isUsage) {
            const hasProducts = items.some((i) => !findProduct(i.productId)?.is_clinic_only);
            const hasSupplies = items.some((i) => findProduct(i.productId)?.is_clinic_only);
            if (hasProducts && !podologist) return setError("Wybierz podologa dla produktów.");
            if (hasSupplies && !room) return setError("Wybierz gabinet dla materiałów.");
        }

        if (!occurredAt) return setError("Wybierz datę zdarzenia.");
        if (!isInCurrentMonth(occurredAt)) return setError("Można dodawać ruchy tylko w bieżącym miesiącu.");
        if (!isNotFutureYMD(occurredAt)) return setError("Brak możliwości dodania daty przyszłej");

        setSaving(true);
        try {
            const noteArg = note.trim() ? note.trim() : undefined;
            if (isUsage) await applyUsage({ occurredAt, note: noteArg, items });
            else await applyDelivery({ occurredAt, note: noteArg, items: items.map(({ productId, qty }) => ({ productId, qty })) });
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
                        <div className="font-extrabold text-lg text-neutral-900">{isUsage ? "Zużycie" : "Przyjęcie dostawy"}</div>
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

                    {isUsage ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="grid gap-1.5 min-w-0 content-start">
                                <span className="text-xs text-neutral-500 font-bold">Podolog (dla produktów)</span>
                                <select value={podologist} onChange={(e) => setPodologist(e.target.value)} className="w-full min-w-0 px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 bg-white transition-colors">
                                    <option value="">Wybierz podologa</option>
                                    {podologists.map((p) => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="grid gap-1.5 min-w-0 content-start">
                                <span className="text-xs text-neutral-500 font-bold">Gabinet (dla materiałów)</span>
                                <select value={room} onChange={(e) => setRoom(e.target.value)} className="w-full min-w-0 px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 bg-white transition-colors">
                                    <option value="">Wybierz gabinet</option>
                                    {rooms.map((r) => (
                                        <option key={r.id} value={r.name}>{r.name}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-[12rem_minmax(0,1fr)] gap-3">
                        <label className="grid gap-1.5 min-w-0 content-start">
                            <span className="text-xs text-neutral-500 font-bold">Data</span>
                            <input
                                type="date"
                                value={occurredAt}
                                onChange={(e) => setOccurredAt(e.target.value)}
                                min={startOfMonthYMD()}
                                max={todayYMD()}
                                className="w-full min-w-0 min-h-[42px] appearance-none px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 bg-white transition-colors"
                            />
                        </label>
                        <label className="grid gap-1.5 min-w-0 content-start">
                            <span className="text-xs text-neutral-500 font-bold">Notatka (opcjonalna, dla wszystkich pozycji)</span>
                            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={isUsage ? "Np. zabieg, pacjent" : "Np. faktura FV/123/2026"} className="w-full min-w-0 px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 transition-colors" />
                        </label>
                    </div>

                    {error ? <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold text-sm">{error}</div> : null}

                    <div className="flex justify-end gap-2.5 mt-2">
                        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-neutral-300 bg-neutral-100 text-neutral-900 font-extrabold hover:bg-neutral-200 transition-colors">
                            Anuluj
                        </button>
                        <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl border border-neutral-900 bg-neutral-900 text-white font-extrabold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {saving ? "Zapisywanie…" : isUsage ? "Zapisz zużycie" : "Przyjmij dostawę"}
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
                    <div className="grid gap-1.5 flex-1 min-w-[240px]">
                        {i === 0 ? <span className="text-xs text-neutral-500 font-bold">{title === "Produkty" ? "Produkt" : "Materiał"}</span> : null}
                        <ProductCombobox line={line} products={products} onChange={(patch) => onChange(line.key, patch)} />
                    </div>
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

const optionLabel = (p: Product) => (p.is_clinic_only ? displayName(p) : `${p.producer} — ${displayName(p)}`);

// małe litery + bez polskich znaków, żeby "zel" znajdowało "Żel"
const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");

function ProductCombobox({ line, products, onChange }: {
    line: Line;
    products: Product[];
    onChange: (patch: Partial<Line>) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const listRef = useRef<HTMLUListElement>(null);

    const filtered = useMemo(() => {
        const tokens = normalize(line.query).split(/\s+/).filter(Boolean);
        // gdy pole pokazuje już wybrany produkt, pokazujemy całą listę
        const selected = products.find((p) => p.id === line.productId);
        if (tokens.length === 0 || (selected && optionLabel(selected) === line.query)) return products;
        return products.filter((p) => {
            const hay = normalize(optionLabel(p));
            return tokens.every((t) => hay.includes(t));
        });
    }, [products, line.query, line.productId]);

    useEffect(() => {
        listRef.current?.children[highlight]?.scrollIntoView({ block: "nearest" });
    }, [highlight]);

    const pick = (p: Product) => {
        onChange({ productId: p.id, query: optionLabel(p) });
        setIsOpen(false);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!isOpen) return setIsOpen(true);
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            if (isOpen && filtered[highlight]) {
                e.preventDefault();
                pick(filtered[highlight]);
            }
        } else if (e.key === "Escape") {
            if (isOpen) {
                e.stopPropagation();
                setIsOpen(false);
            }
        }
    };

    const onBlur = () => {
        setIsOpen(false);
        if (line.productId) return;
        // jeśli wpisany tekst pasuje dokładnie do jednego produktu - wybieramy go automatycznie
        if (line.query.trim() && filtered.length === 1) pick(filtered[0]);
    };

    return (
        <div className="relative">
            <input
                type="text"
                value={line.query}
                placeholder="Wpisz, aby wyszukać…"
                autoComplete="off"
                role="combobox"
                aria-expanded={isOpen}
                onChange={(e) => {
                    onChange({ query: e.target.value, productId: "" });
                    setHighlight(0);
                    setIsOpen(true);
                }}
                onFocus={(e) => {
                    e.target.select();
                    setHighlight(0);
                    setIsOpen(true);
                }}
                onClick={() => setIsOpen(true)}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                className={`w-full px-3 py-2 border rounded-xl outline-none focus:border-blue-500 bg-white transition-colors ${
                    line.query.trim() && !line.productId ? "border-amber-400" : "border-neutral-300"
                }`}
            />
            {isOpen ? (
                <ul ref={listRef} role="listbox" className="absolute z-10 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-neutral-300 rounded-xl shadow-lg py-1">
                    {filtered.length === 0 ? <li className="px-3 py-2 text-sm text-neutral-500">Brak pasujących produktów.</li> : null}
                    {filtered.map((p, i) => (
                        <li
                            key={p.id}
                            role="option"
                            aria-selected={p.id === line.productId}
                            // mouseDown zamiast click - żeby wybór nastąpił przed blur inputa
                            onMouseDown={(e) => {
                                e.preventDefault();
                                pick(p);
                            }}
                            onMouseEnter={() => setHighlight(i)}
                            className={`px-3 py-2 text-sm cursor-pointer flex justify-between gap-3 ${i === highlight ? "bg-blue-50" : ""} ${
                                p.id === line.productId ? "font-bold" : ""
                            }`}
                        >
                            <span>{optionLabel(p)}</span>
                            <span className="text-neutral-500 whitespace-nowrap">stan: {p.stock}</span>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
