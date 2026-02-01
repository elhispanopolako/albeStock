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
    }
): DB {
    const p: Product = {
        id: uid("p"),
        producer: input.producer,
        name: input.name.trim(),
        product_type: input.productType,
        size: input.size?.trim() ? input.size.trim() : null,
        unit: "szt",
        stock: Math.max(0, Math.floor(input.stock)),
        min_level: Math.max(0, Math.floor(input.minLevel)),
        created_at: nowISO(),
        updated_at: nowISO(),
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


export function updateProduct(
    db: DB,
    id: string,
    patch: {
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        minLevel: number;
    }
): DB {
    const idx = db.products.findIndex((p) => p.id === id);
    if (idx < 0) return db;

    const current = db.products[idx];

    const updated = {
        ...current,
        producer: patch.producer,
        name: patch.name.trim(),
        product_type: patch.productType,
        size: patch.size?.trim() ? patch.size.trim() : null,
        min_level: Math.max(0, Math.floor(patch.minLevel)),
        updated_at: nowISO(),
    };

    const products = db.products.slice();
    products[idx] = updated;

    return { ...db, products };
}