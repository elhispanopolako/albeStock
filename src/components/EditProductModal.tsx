import { useEffect, useState } from "react";
import { type Producer, type Product, type ProductType, displayName } from "../state/db";

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
        isClinicOnly?: boolean;
    }) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
};

export default function EditProductModal({ open, onClose, product, onSubmit, onDelete }: Props) {
    const [producer, setProducer] = useState<Producer>("Podopharm");
    const [name, setName] = useState("");
    const [productType, setProductType] = useState<ProductType>("inne");
    const [size, setSize] = useState("");
    const [minLevel, setMinLevel] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    // drugi krok usuwania - żeby nie skasować produktu jednym przypadkowym kliknięciem
    const [confirmDelete, setConfirmDelete] = useState(false);
    const isClinicOnly = product?.is_clinic_only ?? false
    useEffect(() => {
        if (!open || !product) return;
        setProducer(product.producer);
        setName(product.name);
        setProductType(product.product_type);
        setSize(product.size ?? "");
        setMinLevel(String(product.min_level));
        setError(null);
        setConfirmDelete(false);
    }, [open, product]);

    if (!open || !product) return null;

    const submit = async () => {
        if (saving) return;
        setError(null);
        let minLevelNumber = Number(minLevel);
        if (!name.trim()) return setError("Podaj nazwę produktu.");
        if (!Number.isFinite(minLevelNumber) || minLevelNumber < 0) return setError("Minimum musi być ≥ 0.");

        setSaving(true);
        try {
            await onSubmit({
                id: product.id,
                producer: isClinicOnly ? "Brak" : producer,
                name: name.trim(),
                productType,
                size: size.trim() ? size.trim() : undefined,
                minLevel: Math.floor(minLevelNumber),
                isClinicOnly: isClinicOnly,
            });
            onClose();
        } catch (e: any) {
            setError(e?.message ?? "Nie udało się zapisać.");
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (saving) return;
        setError(null);
        setSaving(true);
        try {
            await onDelete(product.id);
            onClose();
        } catch (e) {
            setError((e as { message?: string } | null)?.message ?? "Nie udało się usunąć.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-[999]" role="dialog" aria-modal="true">
            <div className="w-full max-w-[680px] bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                    <div className="font-extrabold text-lg text-neutral-900">Edytuj produkt</div>
                    <button onClick={onClose} className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-neutral-100 text-neutral-800 font-bold text-sm hover:bg-neutral-200 transition-colors">
                        Zamknij
                    </button>
                </div>

                <div className="p-4 grid gap-3">
                    {!isClinicOnly ? (
                        <label className="grid gap-1.5">
                            <span className="text-xs text-neutral-500 font-bold">Producent</span>
                            <select value={producer} onChange={(e) => setProducer(e.target.value as Producer)} className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 bg-white transition-colors">
                                <option value="Podopharm">Podopharm</option>
                                <option value="Epione">Epione</option>
                                <option value="Podoland">Podoland</option>
                                <option value="Procarexpert">Procarexpert</option>
                            </select>
                        </label>
                    ) : null}

                    <label className="grid gap-1.5">
                        <span className="text-xs text-neutral-500 font-bold">Nazwa</span>
                        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 transition-colors" />
                    </label>

                    <label className="grid gap-1.5">
                        <span className="text-xs text-neutral-500 font-bold">Typ produktu</span>
                        <select value={productType} onChange={(e) => setProductType(e.target.value as ProductType)} className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 bg-white transition-colors">
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

                    <label className="grid gap-1.5">
                        <span className="text-xs text-neutral-500 font-bold">Wielkość (opcjonalnie)</span>
                        <input value={size} onChange={(e) => setSize(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 transition-colors" />
                    </label>

                    <label className="grid gap-1.5">
                        <span className="text-xs text-neutral-500 font-bold">Minimum w bieżącej lokalizacji (alert)</span>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={minLevel} onChange={(e) => setMinLevel(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 rounded-xl outline-none focus:border-blue-500 transition-colors" />
                    </label>

                    {error ? <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold text-sm">{error}</div> : null}

                    {confirmDelete ? (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 grid gap-3">
                            <div className="text-sm text-red-900">
                                Czy na pewno usunąć <b>{displayName(product)}</b>?
                                {product.stock > 0 ? <> W bieżącej lokalizacji na stanie jest jeszcze <b>{product.stock} szt.</b></> : null}
                                <div className="mt-1 text-red-800/80">Produkt zniknie z list we wszystkich lokalizacjach. Historia ruchów zostanie zachowana.</div>
                            </div>
                            <div className="flex justify-end gap-2.5">
                                <button onClick={() => setConfirmDelete(false)} disabled={saving} className="px-4 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-900 font-extrabold hover:bg-neutral-100 transition-colors disabled:opacity-50">
                                    Nie, wróć
                                </button>
                                <button onClick={remove} disabled={saving} className="px-4 py-2 rounded-xl border border-red-700 bg-red-600 text-white font-extrabold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    {saving ? "Usuwanie…" : "Tak, usuń produkt"}
                                </button>
                            </div>
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-2.5 mt-2">
                        <button
                            onClick={() => setConfirmDelete(true)}
                            disabled={saving || confirmDelete}
                            className="mr-auto px-4 py-2 rounded-xl border border-red-200 bg-white text-red-700 font-extrabold hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Usuń produkt
                        </button>
                        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-neutral-300 bg-neutral-100 text-neutral-900 font-extrabold hover:bg-neutral-200 transition-colors">
                            Anuluj
                        </button>
                        <button onClick={submit} disabled={saving || confirmDelete} className="px-4 py-2 rounded-xl border border-neutral-900 bg-neutral-900 text-white font-extrabold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {saving ? "Zapisywanie…" : "Zapisz"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}