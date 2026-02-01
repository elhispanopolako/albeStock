import { useEffect, useMemo, useState } from "react";
import { type MovementType, type Product, displayName } from "../state/db";
import { todayYMD, isInCurrentMonth, startOfMonthYMD, isNotFutureYMD } from "../state/logic";
import { useSupaDB } from "../state/SupabaseDBContext";
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
    const [podologist, setPodologist] = useState<string>("");
    const showPodologist = mode === "SALE" || mode === "CLINIC"; // wymagany zawsze
    const showTypeSelect = mode === "SUPPLY";
    const [occurredAt, setOccurredAt] = useState<string>(todayYMD());



    useEffect(() => {
        if (!open) return;
        setProductId(defaultProductId ?? products[0]?.id ?? "");
        setType("SALE");
        setQty("1");
        setNote("");
        setError(null);

        if (mode === "SALE") setType("SALE");
        if (mode === "CLINIC") setType("CLINIC");
        if (mode === "SUPPLY") setType("IN")
        setPodologist("");
        setOccurredAt(todayYMD());
    }, [open, defaultProductId, products]);

    const selected = useMemo(() => products.find((p) => p.id === productId), [products, productId]);

    if (!open) return null;

    const title =
        type === "IN" ? "Dostawa" : type === "SALE" ? "Sprzedaż" : type === "CLINIC" ? "Zużycie w gabinecie" : "Korekta (ustaw stan)";

    const submit = () => {
        setError(null);

        if (!productId) return setError("Wybierz produkt.");
        let qtyNumber = Number(qty)
        if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) return setError("Ilość musi być > 0.");

        if ((type === "SALE" || type === "CLINIC") && selected && selected.stock - qtyNumber < 0) {
            return setError("Brak wystarczającego stanu (nie można zejść poniżej zera).");
        }
        if ((type === "SALE" || type === "CLINIC") && !podologist) return setError("Wybierz podologa.");


        if (type === "ADJUST" && note.trim().length < 3) {
            return setError("Podaj powód korekty (min. 3 znaki).");
        }
        if (!occurredAt) return setError("Wybierz datę zdarzenia.");
        if (!isInCurrentMonth(occurredAt)) return setError("Można dodawać ruchy tylko w bieżącym miesiącu.");
        if (!isNotFutureYMD(occurredAt)) return setError("Brak możliwości dodania daty przyszłej")

        onSubmit({
            productId,
            type,
            qty: Math.floor(qtyNumber),
            note: note.trim() ? note.trim() : undefined,
            occurredAt,
            ...((type === "SALE" || type === "CLINIC") ? { podologist } : {})

        });

        onClose();
    };

    return (
        <div style={backdrop} role="dialog" aria-modal="true">
            <div style={modal}>
                <div style={header}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
                        {selected ? (
                            <div style={{ color: "#555", marginTop: 4 }}>
                                {displayName(selected)} — stan: <b>{selected.stock}</b> szt
                            </div>
                        ) : null}
                    </div>
                    <button onClick={onClose} style={btnSecondary}>
                        Zamknij
                    </button>
                </div>

                <div style={{ padding: 16, display: "grid", gap: 12 }}>
                    {showTypeSelect ? (
                        <label style={field}>
                            <span style={label}>Rodzaj ruchu</span>
                            <select value={type} onChange={(e) => setType(e.target.value as MovementType)} style={input}>
                                <option value="IN">Dostawa</option>
                                <option value="ADJUST">Korekta (ustaw stan)</option>
                            </select>
                        </label>
                    ) : null}

                    {showPodologist ? (
                        <label style={field}>
                            <span style={label}>Podolog</span>
                            <select value={podologist} onChange={(e) => setPodologist(e.target.value)} style={input}>
                                <option value="">Wybierz podologa</option>
                                {podologists.map((p) => (
                                    <option key={p.id} value={p.name}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}

                    <label style={field}>
                        <span style={label}>Produkt</span>
                        <select value={productId} onChange={(e) => setProductId(e.target.value)} style={input}>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.producer} — {displayName(p)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label style={field}>
                        <span style={label}>
                            {type === "ADJUST" ? "Ustaw stan na (szt.)" : "Ilość (szt.)"}
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            style={input}
                        />
                    </label>
                    <label style={field}>
                        <span style={label}>Data</span>
                        <input
                            type="date"
                            value={occurredAt}
                            onChange={(e) => setOccurredAt(e.target.value)}
                            style={input}
                            min={startOfMonthYMD()}
                            max={todayYMD()}
                        />
                    </label>

                    <label style={field}>
                        <span style={label}>
                            Notatka{type === "ADJUST" ? " (wymagana)" : " (opcjonalna)"}
                        </span>
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            style={input}
                            placeholder={type === "ADJUST" ? "Np. korekta po inwentaryzacji" : "Np. dostawa / uwagi"}
                        />
                    </label>

                    {error ? <div style={errorBox}>{error}</div> : null}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                        <button onClick={onClose} style={btnSecondary}>
                            Anuluj
                        </button>
                        <button onClick={submit} style={btnPrimary}>
                            Zapisz
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const backdrop: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 999,
};

const modal: React.CSSProperties = {
    width: "min(680px, 95vw)",
    background: "white",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const header: React.CSSProperties = {
    padding: 16,
    borderBottom: "1px solid #eee",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
};

const field: React.CSSProperties = { display: "grid", gap: 6 };
const label: React.CSSProperties = { fontSize: 12, color: "#555", fontWeight: 700 };
const input: React.CSSProperties = {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: 12,
    outline: "none",
};

const btnPrimary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #111",
    background: "#111",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#f5f5f5",
    color: "#111",
    fontWeight: 800,
    cursor: "pointer",
};

const errorBox: React.CSSProperties = {
    padding: 10,
    borderRadius: 12,
    background: "#ffe8e8",
    border: "1px solid #ffb3b3",
    color: "#8a0000",
    fontWeight: 700,
};
