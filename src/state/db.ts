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
// History
export type PeriodFilter = "CURRENT" | "PREVIOUS" | "ALL";
export type TypeFilter = MovementType | "ALL"
export type Product = {
    id: string;
    producer: Producer;
    name: string;
    product_type: ProductType;
    size: string | null;
    unit: string;
    stock: number;
    min_level: number;
    created_at: string;
    updated_at: string;
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
    product_id: string;
    type: MovementType;
    qty: number;
    podologist_name: string | null;
    occurred_at: string; // YYYY-MM-DD
    created_at: string;
    created_by: string | null;
    note: string | null;
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
export function prevMonthKey(ym: string) {
    // ym = "YYYY-MM"
    const y = Number(ym.slice(0, 4));
    const m = Number(ym.slice(5, 7));
    const d = new Date(y, m - 2, 1); // m-2 bo Date month jest 0-index
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yy}-${mm}`;
}

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

export function startOfMonthYMD(d = new Date()) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

export function endOfTodayYMD(d = new Date()) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function startOfPrevMonthYMD(d = new Date()) {
    const dd = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return `${dd.getFullYear()}-${pad2(dd.getMonth() + 1)}-01`;
}

export function endOfPrevMonthYMD(d = new Date()) {
    // ostatni dzień poprzedniego miesiąca = dzień 0 bieżącego miesiąca
    const dd = new Date(d.getFullYear(), d.getMonth(), 0);
    return `${dd.getFullYear()}-${pad2(dd.getMonth() + 1)}-${pad2(dd.getDate())}`;
}
export function monthToRange(month: string) {
    // month: YYYY-MM
    const y = Number(month.slice(0, 4));
    const m = Number(month.slice(5, 7));
    const start = `${y}-${pad2(m)}-01`;
    const lastDay = new Date(y, m, 0).getDate(); // month is 1-based, Date expects next month index
    const end = `${y}-${pad2(m)}-${pad2(lastDay)}`;
    return { from: start, to: end };
}

export function displayName(p: Product) {
    const t = p.product_type !== "inne" ? ` (${p.product_type})` : "";
    const s = p.size ? ` ${p.size}` : "";
    return `${p.name}${t}${s}`;
}
/**
 * Przykładowa baza: produkty + kilka ruchów.
 * Założenie: rozchód i sprzedaż traktujemy tak samo => OUT
 */




// export function loadDB(): DB {
//     try {
//         const raw = localStorage.getItem(STORAGE_KEY);
//         if (!raw) return SEED_DB;
//         const parsed = JSON.parse(raw) as DB;
//         if (!parsed?.products || !parsed?.movements || !parsed?.monthlySnapshots) return SEED_DB;
//         return parsed;
//     } catch {
//         return SEED_DB;
//     }
// }

// export function saveDB(db: DB) {
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
// }