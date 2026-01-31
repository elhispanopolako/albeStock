// src/state/db.ts

export type Unit = "szt";

export type Producer = "Podopharm" | "Epione" | "Podoland";
export type MovementType = "IN" | "SALE" | "CLINIC" | "ADJUST";
export type ProductType =
    | "spray"
    | "krople"
    | "krem"
    | "maść"
    | "pasta"
    | "serum"
    | "olejek"
    | "mydło"
    | "sól"
    | "inne";

export type Product = {
    id: string;
    name: string;
    producer: Producer;
    productType: ProductType;
    size?: string;
    unit: Unit;
    minLevel: number;
    stock: number;
    createdAt: string;
};
export type MonthlySnapshot = {
    month: string; // np. "2026-01"

    startCreatedAt: string;
    startCreatedBy: string;
    startStockByProductId: Record<string, number>;
    // dla zamkniętych miesięcy:
    endCreatedAt?: string;
    endCreatedBy?: string;
    endStockByProductId?: Record<string, number>;
};
export type StockMovement = {
    id: string;
    productId: string;
    type: MovementType;
    qty: number;       // IN/OUT: ilość; ADJUST: ustaw na qty
    user: string;
    podologist?: string;
    note?: string;
    createdAt: string;
    occurredAt: string;
};

export type DB = {
    products: Product[];
    movements: StockMovement[];
    monthlySnapshots: MonthlySnapshot[];
};

export const STORAGE_KEY = "podology_stock_mvp_v1";

export function uid(prefix = "id") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function nowISO() {
    return new Date().toISOString();
}
export function monthKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

export function displayName(p: Product) {
    const t = p.productType !== "inne" ? ` (${p.productType})` : "";
    const s = p.size ? ` ${p.size}` : "";
    return `${p.name}${t}${s}`;
}
/**
 * Przykładowa baza: produkty + kilka ruchów.
 * Założenie: rozchód i sprzedaż traktujemy tak samo => OUT
 */
export const PODologists = ["Patrycja W", "Anna L", "Beata D"] as const;
export type PodologistName = (typeof PODologists)[number];
export const SEED_DB: DB = {
    products: [
        { id: "p1", name: "Mykobooster", producer: "Podopharm", productType: "spray", size: "125 ml", unit: "szt", stock: 5, minLevel: 3, createdAt: nowISO() },
        { id: "p2", name: "Mykobooster", producer: "Podopharm", productType: "krople", size: "10 ml", unit: "szt", stock: 4, minLevel: 5, createdAt: nowISO() },
        { id: "p3", name: "Tinktura", producer: "Podopharm", productType: "krople", size: "10 ml", unit: "szt", stock: 6, minLevel: 5, createdAt: nowISO() },
        { id: "p4", name: "Verru Immuno", producer: "Podopharm", productType: "pasta", size: "12 ml", unit: "szt", stock: 2, minLevel: 3, createdAt: nowISO() },
        { id: "p5", name: "Onygen", producer: "Podopharm", productType: "inne", size: "20 ml", unit: "szt", stock: 7, minLevel: 4, createdAt: nowISO() },

        { id: "p6", name: "Maść regeneracyjna z colostrum", producer: "Podopharm", productType: "maść", size: "60 ml", unit: "szt", stock: 1, minLevel: 3, createdAt: nowISO() },
        { id: "p7", name: "Mydełko Skinflex", producer: "Podopharm", productType: "mydło", unit: "szt", stock: 6, minLevel: 4, createdAt: nowISO() },

        { id: "p8", name: "Podobaby", producer: "Podoland", productType: "inne", size: "50 ml", unit: "szt", stock: 3, minLevel: 4, createdAt: nowISO() },

        { id: "p9", name: "Serum kolagenowe", producer: "Epione", productType: "serum", size: "15 ml", unit: "szt", stock: 5, minLevel: 3, createdAt: nowISO() },
        { id: "p10", name: "Regeneratio VII", producer: "Epione", productType: "krem", size: "80 ml", unit: "szt", stock: 6, minLevel: 4, createdAt: nowISO() },
        { id: "p11", name: "Vertited VIII", producer: "Epione", productType: "inne", size: "200 g", unit: "szt", stock: 1, minLevel: 2, createdAt: nowISO() },
    ],

    movements: [
        { id: "m1", productId: "p2", type: "CLINIC", qty: 1, user: "podolog", podologist: "Patrycja W", createdAt: nowISO(), occurredAt: nowISO().split('T')[0] },
        { id: "m2", productId: "p4", type: "SALE", qty: 1, user: "podolog", podologist: "Anna L", createdAt: nowISO(), occurredAt: nowISO().split('T')[0] },
        { id: "m3", productId: "p11", type: "SALE", qty: 1, user: "podolog", podologist: "Patrycja W", createdAt: nowISO(), occurredAt: nowISO().split('T')[0] },
    ],

    monthlySnapshots: [
        // BIEŻĄCY: tylko START (END brak)
        {
            month: "2026-01",
            startCreatedAt: nowISO(),
            startCreatedBy: "system",
            startStockByProductId: { p1: 6, p2: 5, p3: 6, p4: 3, p5: 7, p6: 2, p7: 6, p8: 4, p9: 5, p10: 6, p11: 2 },
        },

        // 2025-12: START + END (zamknięty)
        {
            month: "2025-12",
            startCreatedAt: nowISO(),
            startCreatedBy: "system",
            startStockByProductId: { p1: 7, p2: 7, p3: 8, p4: 4, p5: 9, p6: 3, p7: 8, p8: 5, p9: 6, p10: 7, p11: 3 },
            endCreatedAt: nowISO(),
            endCreatedBy: "system",
            endStockByProductId: { p1: 6, p2: 5, p3: 6, p4: 3, p5: 7, p6: 2, p7: 6, p8: 4, p9: 5, p10: 6, p11: 2 },
        },

        {
            month: "2025-11",
            startCreatedAt: nowISO(),
            startCreatedBy: "system",
            startStockByProductId: { p1: 8, p2: 8, p3: 9, p4: 5, p5: 10, p6: 4, p7: 9, p8: 6, p9: 7, p10: 8, p11: 4 },
            endCreatedAt: nowISO(),
            endCreatedBy: "system",
            endStockByProductId: { p1: 7, p2: 7, p3: 8, p4: 4, p5: 9, p6: 3, p7: 8, p8: 5, p9: 6, p10: 7, p11: 3 },
        },

        {
            month: "2025-10",
            startCreatedAt: nowISO(),
            startCreatedBy: "system",
            startStockByProductId: { p1: 9, p2: 9, p3: 10, p4: 6, p5: 11, p6: 5, p7: 10, p8: 7, p9: 8, p10: 9, p11: 5 },
            endCreatedAt: nowISO(),
            endCreatedBy: "system",
            endStockByProductId: { p1: 8, p2: 8, p3: 9, p4: 5, p5: 10, p6: 4, p7: 9, p8: 6, p9: 7, p10: 8, p11: 4 },
        },
    ],

};



export function loadDB(): DB {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return SEED_DB;
        const parsed = JSON.parse(raw) as DB;
        if (!parsed?.products || !parsed?.movements || !parsed?.monthlySnapshots) return SEED_DB;
        return parsed;
    } catch {
        return SEED_DB;
    }
}

export function saveDB(db: DB) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}