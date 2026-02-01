// src/state/logic.ts
import { type DB, type MonthlySnapshot, type Product, type StockMovement, type MovementType, monthKey, nowISO, uid } from "./db";

export function ensureCurrentMonthSnapshot(db: DB, user: string, d = new Date()): DB {
    const key = monthKey(d);

    // jeśli już jest snapshot na ten miesiąc, nic nie rób
    const exists = db.monthlySnapshots.some((s) => s.month === key);
    if (exists) return db;

    // 1) ZAMKNIJ poprzedni najnowszy snapshot jeśli nie ma end
    const snapshots = db.monthlySnapshots.slice();

    // znajdź najnowszy snapshot (po month malejąco) – to “poprzedni miesiąc” w praktyce
    const latest = snapshots
        .slice()
        .sort((a, b) => b.month.localeCompare(a.month))[0];

    if (latest && !latest.endStockByProductId) {
        const closed: MonthlySnapshot = {
            ...latest,
            endCreatedAt: nowISO(),
            endCreatedBy: user || "system",
            endStockByProductId: Object.fromEntries(db.products.map((p) => [p.id, p.stock])),
        };

        const idx = snapshots.findIndex((s) => s.month === latest.month);
        if (idx >= 0) snapshots[idx] = closed;
    }

    // 2) UTWÓRZ START dla nowego miesiąca
    const startSnap: MonthlySnapshot = {
        month: key,
        startCreatedAt: nowISO(),
        startCreatedBy: user || "system",
        startStockByProductId: Object.fromEntries(db.products.map((p) => [p.id, p.stock])),
    };

    return { ...db, monthlySnapshots: [startSnap, ...snapshots] };
}

export function getCurrentMonthSnapshot(db: DB, d = new Date()) {
    const key = monthKey(d);
    return db.monthlySnapshots.find((s) => s.month === key);
}
export function getSnapshotForMonth(db: DB, month: string) {
    return db.monthlySnapshots.find((s) => s.month === month);
}

export function listAvailableMonths(db: DB) {
    // miesiące ze snapshotów + miesiące z ruchów
    const months = new Set<string>();

    for (const s of db.monthlySnapshots) months.add(s.month);
    for (const m of db.movements) months.add(monthFromYMD(m.occurred_at));

    // zawsze dodaj bieżący miesiąc
    months.add(monthKey());

    return Array.from(months).sort((a, b) => b.localeCompare(a)); // malejąco
}

export function applyMovement(db: DB, mv: StockMovement): DB {
    const idx = db.products.findIndex((p) => p.id === mv.product_id);
    if (idx < 0) return db;

    const p = db.products[idx];
    let nextStock = p.stock;

    if (mv.type === "IN") nextStock = p.stock + mv.qty;
    if (mv.type === "SALE" || mv.type === "CLINIC") nextStock = p.stock - mv.qty;
    if (mv.type === "ADJUST") nextStock = mv.qty;

    // blokada poniżej zera
    if (nextStock < 0) return db;

    const nextProduct: Product = { ...p, stock: nextStock };
    const products = db.products.slice();
    products[idx] = nextProduct;

    return { ...db, products, movements: [mv, ...db.movements] };
}
export function todayYMD(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
export function monthFromYMD(ymd: string) {
    // "2026-01-25" -> "2026-01"
    return ymd.slice(0, 7);
}
export function startOfMonthYMD(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
}

export function isInCurrentMonth(ymd: string, d = new Date()) {
    return monthFromYMD(ymd) === monthKey(d);
}

export function isNotFutureYMD(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; // prosty check formatu
    return value <= todayYMD();
}
export function createMovement(params: {
    productId: string;
    type: MovementType;
    qty: number;
    user: string;
    note?: string;
    podologist?: string;
    occurredAt: string;
}) {
    return {
        id: uid("m"),
        productId: params.productId,
        type: params.type,
        qty: params.qty,
        user: params.user,
        podologist: params.podologist,
        occurredAt: params.occurredAt,
        createdAt: nowISO(),
        note: params.note,
    };
}
