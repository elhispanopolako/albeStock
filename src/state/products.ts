// src/state/products.ts
import { type DB, type Product, type Producer, type ProductType, monthKey, nowISO, uid } from "./db";
import { getSnapshotForMonth } from "./logic";

export function addProduct(
    db: DB,
    input: {
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        stock: number;
        minLevel: number;
    },
    user: string
): DB {
    const p: Product = {
        id: uid("p"),
        producer: input.producer,
        name: input.name.trim(),
        productType: input.productType,
        size: input.size?.trim() ? input.size.trim() : undefined,
        unit: "szt",
        stock: Math.max(0, Math.floor(input.stock)),
        minLevel: Math.max(0, Math.floor(input.minLevel)),
        createdAt: nowISO(),
    };

    const products = [p, ...db.products];

    // dopisz do snapshotu START bieżącego miesiąca (żeby kolumna "Start mies." miała wartość)
    const m = monthKey();
    const snap = getSnapshotForMonth(db, m);

    let monthlySnapshots = db.monthlySnapshots.slice();
    if (snap) {
        const updated = {
            ...snap,
            startStockByProductId: {
                ...snap.startStockByProductId,
                [p.id]: p.stock,
            },
            // jeśli miesiąc zamknięty (raczej nie w MVP), to też dopisz do end:
            ...(snap.endStockByProductId
                ? { endStockByProductId: { ...snap.endStockByProductId, [p.id]: p.stock } }
                : {}),
        };

        monthlySnapshots = monthlySnapshots.map((s) => (s.month === m ? updated : s));
    }

    return { ...db, products, monthlySnapshots };
}
