import { useEffect, useState } from "react";
import type { Producer, Product, ProductType } from "../state/db";

type Props = {
    open: boolean;
    onClose: () => void;
    product: Product | null;
    onSubmit: (args: {
        id: string;
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        minLevel: number;
    }) => void;
};

export default function EditProductModal({ open, onClose, product, onSubmit }: Props) {
    const [producer, setProducer] = useState<Producer>("Podopharm");
    const [name, setName] = useState("");
    const [productType, setProductType] = useState<ProductType>("inne");
    const [size, setSize] = useState("");
    const [minLevel, setMinLevel] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !product) return;
        setProducer(product.producer);
        setName(product.name);
        setProductType(product.product_type);
        setSize(product.size ?? "");
        setMinLevel(String(product.min_level));
        setError(null);
    }, [open, product]);

    if (!open || !product) return null;

    const submit = () => {
        setError(null);
        let minLevelNumber = Number(minLevel)
        if (!name.trim()) return setError("Podaj nazwę produktu.");
        if (!Number.isFinite(minLevelNumber) || minLevelNumber < 0) return setError("Minimum musi być ≥ 0.");

        onSubmit({
            id: product.id,
            producer,
            name: name.trim(),
            productType,
            size: size.trim() ? size.trim() : undefined,
            minLevel: Math.floor(minLevelNumber),
        });
        onClose();
    };

    return (
        <div style={backdrop} role="dialog" aria-modal="true">
            <div style={modal}>
                <div style={header}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>Edytuj produkt</div>
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
                        <input value={name} onChange={(e) => setName(e.target.value)} style={input} />
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
                        <input value={size} onChange={(e) => setSize(e.target.value)} style={input} />
                    </label>

                    <label style={field}>
                        <span style={label}>Minimum (alert)</span>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={minLevel} onChange={(e) => {
                            return setMinLevel(e.target.value);
                        }} style={input} />
                    </label>

                    {error ? <div style={errorBox}>{error}</div> : null}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                        <button onClick={onClose} style={btnSecondary}>Anuluj</button>
                        <button onClick={submit} style={btnPrimary}>Zapisz</button>
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
