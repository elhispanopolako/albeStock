import { useEffect, useMemo, useState } from "react";
import { type MovementType, type Product, displayName } from "../state/db";
import { todayYMD, isInCurrentMonth, startOfMonthYMD, isNotFutureYMD } from "../state/logic";
import { useSupaDB } from "../state/SupabaseDBContext";

// Definiujemy gabinety na potrzeby MVP:
const ROOMS = ["Gabinet 1", "Gabinet 2"];

type Props = {
    open: boolean;
    onClose: () => void;
    products: Product[];
    defaultProductId?: string;
    mode: "SALE" | "CLINIC" | "SUPPLY";
    onSubmit: (args: { productId: string; type: MovementType; qty: number; note?: string; occurredAt: string, podologist?: string }) => void;
};

export default function MovementModal({ open, onClose, products, defaultProductId, mode, onSubmit }: Props) {
    const { podologists } = useSupaDB();
    const [productId, setProductId] = useState(defaultProductId ?? products[0]?.id ?? "");
    const [type, setType] = useState<MovementType>("SALE");
    const [qty, setQty] = useState<string>("");
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [occurredAt, setOccurredAt] = useState<string>(todayYMD());

    // Wspólny stan dla wyboru Podologa lub Gabinetu
    const [target, setTarget] = useState<string>("");

    const selected = useMemo(() => products.find((p) => p.id === productId), [products, productId]);

    const showTypeSelect = mode === "SUPPLY";
    const isSale = type === "SALE";
    const isClinic = type === "CLINIC";

    // --- NOWA LOGIKA BIZNESOWA ---
    // Pokazujemy Podologa jeśli to Sprzedaż LUB jeśli to Zużycie, ale produkt NIE JEST materiałem gabinetowym
    const showPodologist = isSale || (isClinic && selected && !selected.is_clinic_only);
    // Pokazujemy Gabinet TYLKO jeśli to Zużycie I produkt JEST materiałem gabinetowym
    const showRoom = isClinic && selected && selected.is_clinic_only;

    useEffect(() => {
        if (!open) return;
        setProductId(defaultProductId ?? products[0]?.id ?? "");
        setType(mode === "SUPPLY" ? "IN" : mode);
        setQty("1");
        setNote("");
        setError(null);
        setTarget("");
        setOccurredAt(todayYMD());
    }, [open, defaultProductId, products, mode]);

    if (!open) return null;

    const title = type === "IN" ? "Dostawa" : type === "SALE" ? "Sprzedaż" : type === "CLINIC" ? "Zużycie" : "Korekta (ustaw stan)";

    const submit = () => {
        setError(null);

        if (!productId) return setError("Wybierz produkt.");
        let qtyNumber = Number(qty);
        if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) return setError("Ilość musi być > 0.");

        if ((isSale || isClinic) && selected && selected.stock - qtyNumber < 0) {
            return setError("Brak wystarczającego stanu (nie można zejść poniżej zera).");
        }

        // Dynamiczna walidacja
        if (showPodologist && !target) return setError("Wybierz podologa.");
        if (showRoom && !target) return setError("Wybierz gabinet.");

        if (type === "ADJUST" && note.trim().length < 3) {
            return setError("Podaj powód korekty (min. 3 znaki).");
        }
        if (!occurredAt) return setError("Wybierz datę zdarzenia.");
        if (!isInCurrentMonth(occurredAt)) return setError("Można dodawać ruchy tylko w bieżącym miesiącu.");
        if (!isNotFutureYMD(occurredAt)) return setError("Brak możliwości dodania daty przyszłej");

        onSubmit({
            productId,
            type,
            qty: Math.floor(qtyNumber),
            note: note.trim() ? note.trim() : undefined,
            occurredAt,
            ...((isSale || isClinic) ? { podologist: target } : {})
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-[999]" role="dialog" aria-modal="true">
            <div className="w-full max-w-[680px] bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-neutral-200 flex items-start justify-between gap-3">
                    <div>
                        <div className="font-extrabold text-lg text-neutral-900">{title}</div>
                        {selected ? (
                            <div className="text-neutral-500 mt-1 text-sm">
                                {displayName(selected)} — stan: <b className="text-neutral-800">{selected.stock}</b> szt
                            </div>
                        ) : null}
                    </div>
                    <button onClick={onClose} className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-neutral-100 text-neutral-800 font-bold text-sm hover:bg-neutral-200 transition-colors">
                        Zamknij
                    </button>
                </div>

                <div className="p-4 grid gap-3">
                    {showTypeSelect ? (
                        <label className="grid gap-1.5">
                            <span className="text-xs text-neutral-500 font-bold">Rodzaj ruchu</span>
                            <select value={type} onChange={(e) => setType(e.target.value as MovementType)} className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 bg-white transition-colors">
                                <option value="IN">Dostawa</option>
                                <option value="ADJUST">Korekta (ustaw stan)</option>
                            </select>
                        </label>
                    ) : null}

                    {/* DYNAMICZNY WYBÓR: PODOLOG */}
                    {showPodologist ? (
                        <label className="grid gap-1.5">
                            <span className="text-xs text-neutral-500 font-bold">Podolog</span>
                            <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 bg-white transition-colors">
                                <option value="">Wybierz podologa</option>
                                {podologists.map((p) => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </label>
                    ) : null}

                    {/* DYNAMICZNY WYBÓR: GABINET */}
                    {showRoom ? (
                        <label className="grid gap-1.5">
                            <span className="text-xs text-neutral-500 font-bold">Gabinet</span>
                            <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 bg-white transition-colors">
                                <option value="">Wybierz gabinet</option>
                                {ROOMS.map((room) => (
                                    <option key={room} value={room}>{room}</option>
                                ))}
                            </select>
                        </label>
                    ) : null}

                    <label className="grid gap-1.5">
                        <span className="text-xs text-neutral-500 font-bold">
                            {selected?.is_clinic_only ? "Materiał" : "Produkt"}
                        </span>
                        <select value={productId} onChange={(e) => {
                            setProductId(e.target.value);
                            setTarget(""); // Resetujemy wybór, bo mógł się zmienić tryb (Podolog <-> Gabinet)
                        }} className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 bg-white transition-colors">
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.is_clinic_only
                                        ? displayName(p)
                                        : `${p.producer} — ${displayName(p)}`}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-1.5">
                        <span className="text-xs text-neutral-500 font-bold">
                            {type === "ADJUST" ? "Ustaw stan na (szt.)" : "Ilość (szt.)"}
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 transition-colors"
                        />
                    </label>

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
                        <span className="text-xs text-neutral-500 font-bold">
                            Notatka{type === "ADJUST" ? " (wymagana)" : " (opcjonalna)"}
                        </span>
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={type === "ADJUST" ? "Np. korekta po inwentaryzacji" : "Np. dostawa / uwagi"}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 transition-colors"
                        />
                    </label>

                    {error ? <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold text-sm">{error}</div> : null}

                    <div className="flex justify-end gap-2.5 mt-2">
                        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-neutral-300 bg-neutral-100 text-neutral-900 font-extrabold hover:bg-neutral-200 transition-colors">
                            Anuluj
                        </button>
                        <button onClick={submit} className="px-4 py-2 rounded-xl border border-neutral-900 bg-neutral-900 text-white font-extrabold hover:bg-black transition-colors">
                            Zapisz
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}