import { useEffect, useState } from "react";
import { type Producer, type ProductType } from "../state/db";
const ZERO = "0"
type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: (args: {
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        stock: number;
        minLevel: number;
    }) => void;
};

export default function AddProductModal({ open, onClose, onSubmit }: Props) {
    const [producer, setProducer] = useState<Producer>("Podopharm");
    const [name, setName] = useState("");
    const [productType, setProductType] = useState<ProductType>("inne");
    const [size, setSize] = useState("");
    const [stock, setStock] = useState<string>(ZERO);
    const [minLevel, setMinLevel] = useState<string>(ZERO);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setProducer("Podopharm");
        setName("");
        setProductType("inne");
        setSize("");
        setStock(ZERO);
        setMinLevel(ZERO);
        setError(null);
    }, [open]);

    if (!open) return null;

    const submit = () => {
        setError(null);
        if (!name.trim()) return setError("Podaj nazwę produktu.");
        let stockNumber = Number(stock)
        let minLevelNumber = Number(minLevel)
        if (stockNumber < 0 || !Number.isFinite(stockNumber)) return setError("Stan początkowy musi być ≥ 0.");
        if (minLevelNumber < 0 || !Number.isFinite(minLevelNumber)) return setError("Minimum musi być ≥ 0.");

        onSubmit({
            producer,
            name: name.trim(),
            productType,
            size: size.trim() ? size.trim() : undefined,
            stock: Math.floor(stockNumber),
            minLevel: Math.floor(minLevelNumber),
        });
        onClose();
    };

    return (
        <div style={backdrop} role="dialog" aria-modal="true">
            <div style={modal}>
                <div style={header}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>Dodaj produkt</div>
                    <button onClick={onClose} style={btnSecondary}>Zamknij</button>
                </div>

                <div style={{ padding: 16, display: "grid", gap: 12 }}>
                    <label style={field}>
                        <span style={label}>Producent</span>
                        <select value={producer} onChange={(e) => setProducer(e.target.value as Producer)} style={input}>
                            <option value="Podopharm">Podopharm</option>
                            <option value="Epione">Epione</option>
                            <option value="Podoland">Podoland</option>
                        </select>
                    </label>

                    <label style={field}>
                        <span style={label}>Nazwa</span>
                        <input value={name} onChange={(e) => setName(e.target.value)} style={input} placeholder="Np. Mykobooster" />
                    </label>

                    <label style={field}>
                        <span style={label}>Typ produktu</span>
                        <select value={productType} onChange={(e) => setProductType(e.target.value as ProductType)} style={input}>
                            <option value="spray">spray</option>
                            <option value="krople">krople</option>
                            <option value="krem">krem</option>
                            <option value="maść">maść</option>
                            <option value="pasta">pasta</option>
                            <option value="serum">serum</option>
                            <option value="olejek">olejek</option>
                            <option value="mydło">mydło</option>
                            <option value="sól">sól</option>
                            <option value="inne">inne</option>
                        </select>
                    </label>

                    <label style={field}>
                        <span style={label}>Wielkość (opcjonalnie)</span>
                        <input value={size} onChange={(e) => setSize(e.target.value)} style={input} placeholder='Np. "125 ml" / "200 g"' />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <label style={field}>
                            <span style={label}>Stan początkowy (szt.)</span>
                            <input type="text" inputMode="numeric" pattern="[0-9]*" value={stock} onChange={(e) => setStock(e.target.value)} style={input} />
                        </label>

                        <label style={field}>
                            <span style={label}>Minimum (alert)</span>
                            <input type="text" inputMode="numeric" pattern="[0-9]*" value={minLevel} onChange={(e) => setMinLevel(e.target.value)} style={input} />
                        </label>
                    </div>

                    {error ? <div style={errorBox}>{error}</div> : null}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                        <button onClick={onClose} style={btnSecondary}>Anuluj</button>
                        <button onClick={submit} style={btnPrimary}>Dodaj</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const backdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 999 };
const modal: React.CSSProperties = { width: "min(680px, 95vw)", background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" };
const header: React.CSSProperties = { padding: 16, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" };
const field: React.CSSProperties = { display: "grid", gap: 6 };
const label: React.CSSProperties = { fontSize: 12, color: "#555", fontWeight: 800 };
const input: React.CSSProperties = { padding: "10px 12px", border: "1px solid #ddd", borderRadius: 12, outline: "none" };
const btnPrimary: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "white", fontWeight: 900, cursor: "pointer" };
const btnSecondary: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", background: "#f5f5f5", color: "#111", fontWeight: 900, cursor: "pointer" };
const errorBox: React.CSSProperties = { padding: 10, borderRadius: 12, background: "#ffe8e8", border: "1px solid #ffb3b3", color: "#8a0000", fontWeight: 800 };
