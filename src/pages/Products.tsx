import { useMemo, useState } from "react";
import { useSupaDB } from "../state/SupabaseDBContext";
import MovementModal from "../components/MovementModal";
import { type Producer, type ProductType, displayName } from "../state/db";
import AddProductModal from "../components/AddProductModal";
import EditProductModal from "../components/EditProductModal";

export default function Products() {
    const { products, applyMovement, addProduct, editProduct } = useSupaDB();
    const [q, setQ] = useState("");
    const [producer, setProducer] = useState<Producer | "ALL">("ALL");
    const [ptype, setPtype] = useState<ProductType | "ALL">("ALL");
    const [open, setOpen] = useState(false);
    const [defaultPid, setDefaultPid] = useState<string | undefined>(undefined);
    const [mode, setMode] = useState<"SALE" | "CLINIC" | "SUPPLY">("SALE");
    const [addOpen, setAddOpen] = useState(false);

    type SortKey = "NAME_ASC" | "NAME_DESC" | "STOCK_ASC" | "STOCK_DESC" | "DEFAULT";
    const [sortKey, setSortKey] = useState<SortKey>("NAME_ASC");

    const [editOpen, setEditOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const editProductItem = editId ? products.find((p) => p.id === editId) ?? null : null;

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        const base = products.filter((p) => {
            if (producer !== "ALL" && p.producer !== producer) return false;
            if (ptype !== "ALL" && p.product_type !== ptype) return false;
            if (!qq) return true;
            return displayName(p).toLowerCase().includes(qq);
        });
        const byName = (a: typeof base[number], b: typeof base[number]) =>
            displayName(a).localeCompare(displayName(b), "pl", { sensitivity: "base" });

        const byStock = (a: typeof base[number], b: typeof base[number]) => a.stock - b.stock;

        if (sortKey !== "DEFAULT") {
            base.sort((a, b) => {
                if (sortKey === "NAME_ASC") return byName(a, b);
                if (sortKey === "NAME_DESC") return byName(b, a);
                if (sortKey === "STOCK_ASC") return byStock(a, b);
                return byStock(b, a);
            });
        }
        return base;
    }, [products, producer, ptype, q, sortKey]);

    return (
        <section className="p-4 border border-neutral-200 rounded-2xl bg-white shadow-sm">
            <h2 className="mt-0 mb-4 text-2xl font-black text-neutral-800">Produkty</h2>

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Szukaj…"
                    className="px-3 py-2 rounded-xl border border-neutral-300 min-w-[220px] outline-none focus:border-blue-500 transition-colors"
                />

                <select value={producer} onChange={(e) => setProducer(e.target.value as any)} className="px-3 py-2 rounded-xl border border-neutral-300 bg-white outline-none focus:border-blue-500 transition-colors">
                    <option value="ALL">Wszyscy producenci</option>
                    <option value="Podopharm">Podopharm</option>
                    <option value="Epione">Epione</option>
                    <option value="Podoland">Podoland</option>
                </select>

                <select value={ptype} onChange={(e) => setPtype(e.target.value as any)} className="px-3 py-2 rounded-xl border border-neutral-300 bg-white outline-none focus:border-blue-500 transition-colors">
                    <option value="ALL">Wszystkie typy</option>
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

                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="px-3 py-2 rounded-xl border border-neutral-300 bg-white outline-none focus:border-blue-500 transition-colors">
                    <option value="DEFAULT">Domyślnie</option>
                    <option value="NAME_ASC">Nazwa A–Z</option>
                    <option value="NAME_DESC">Nazwa Z–A</option>
                    <option value="STOCK_ASC">Stan rosnąco</option>
                    <option value="STOCK_DESC">Stan malejąco</option>
                </select>

                <button
                    onClick={() => setAddOpen(true)}
                    className="px-3 py-2 rounded-xl bg-blue-600 border border-blue-600 text-white font-extrabold hover:bg-blue-700 transition-colors"
                >
                    Dodaj produkt
                </button>
                <div className="ml-auto text-xs text-neutral-500 font-bold self-center">
                    Ilość: <b className="text-neutral-800">{filtered.length}</b>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-neutral-200">
                <table className="w-full border-collapse text-sm">
                    <thead className="bg-neutral-50">
                        <tr>
                            <th className="text-left border-b border-neutral-200 p-3 font-bold text-neutral-600 whitespace-nowrap">Produkt</th>
                            <th className="text-left border-b border-neutral-200 p-3 font-bold text-neutral-600 whitespace-nowrap">Producent</th>
                            <th className="text-left border-b border-neutral-200 p-3 font-bold text-neutral-600 whitespace-nowrap">Stan</th>
                            <th className="text-left border-b border-neutral-200 p-3 font-bold text-neutral-600 whitespace-nowrap">Status</th>
                            <th className="text-left border-b border-neutral-200 p-3 font-bold text-neutral-600 whitespace-nowrap">Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p) => {
                            return (
                                <tr key={p.id} className="hover:bg-neutral-50 transition-colors group">
                                    <td className="border-b border-neutral-100 p-3 text-neutral-900">
                                        <strong className="font-extrabold">{displayName(p)}</strong>
                                    </td>
                                    <td className="border-b border-neutral-100 p-3 text-neutral-700">{p.producer}</td>
                                    <td className="border-b border-neutral-100 p-3 text-neutral-700 font-bold">{p.stock}</td>
                                    <td className="border-b border-neutral-100 p-3">
                                        <StatusBadge stock={p.stock} minLevel={p.min_level} />
                                    </td>
                                    <td className="border-b border-neutral-100 p-2.5">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => { setDefaultPid(p.id); setMode("SALE"); setOpen(true); }}
                                                className="px-3 py-1.5 rounded-lg bg-blue-600 border border-blue-600 text-white font-extrabold text-xs hover:bg-blue-700 transition-colors"
                                                title="Sprzedaż"
                                            >
                                                Sprzedaż
                                            </button>

                                            <button
                                                onClick={() => { setDefaultPid(p.id); setMode("CLINIC"); setOpen(true); }}
                                                className="px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 font-extrabold text-xs hover:bg-neutral-200 transition-colors"
                                                title="Zużycie w gabinecie"
                                            >
                                                Zużycie
                                            </button>

                                            <button
                                                onClick={() => { setDefaultPid(p.id); setMode("SUPPLY"); setOpen(true); }}
                                                className="px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 font-extrabold text-xs hover:bg-neutral-200 transition-colors"
                                                title="Dostawa / Korekta"
                                            >
                                                Dostawa
                                            </button>
                                            <button
                                                onClick={() => { setEditId(p.id); setEditOpen(true); }}
                                                className="w-8 h-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:bg-neutral-100 hover:text-blue-600 transition-colors"
                                                title="Edytuj produkt"
                                                aria-label="Edytuj produkt"
                                            >
                                                <PencilIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filtered.length === 0 ? <p className="p-4 text-neutral-500 text-center font-bold">Brak wyników.</p> : null}
            </div>

            <MovementModal
                open={open}
                onClose={() => setOpen(false)}
                products={products}
                defaultProductId={defaultPid}
                mode={mode}
                onSubmit={(args) => applyMovement(args)}
            />
            <AddProductModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSubmit={(args) => addProduct(args)}
            />
            <EditProductModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                product={editProductItem}
                onSubmit={(args) => editProduct(args)}
            />
        </section>
    );
}

function StatusBadge({ stock, minLevel }: { stock: number; minLevel: number }) {
    const status =
        stock === 0
            ? { label: "Brak w magazynie", tone: "danger" as const }
            : stock <= minLevel
                ? { label: "Kończy się", tone: "warn" as const }
                : { label: "Na stanie", tone: "ok" as const };

    const styleMap = {
        danger: "bg-red-50 border-red-200 text-red-800",
        warn: "bg-amber-50 border-amber-200 text-amber-800",
        ok: "bg-green-50 border-green-200 text-green-800",
    };

    const dotMap = {
        danger: "bg-red-600",
        warn: "bg-amber-500",
        ok: "bg-green-600",
    };

    return (
        <span
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-black whitespace-nowrap ${styleMap[status.tone]}`}
        >
            <span
                aria-hidden="true"
                className={`w-2 h-2 rounded-full ${dotMap[status.tone]}`}
            />
            {status.label}
        </span>
    );
}

function PencilIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
}