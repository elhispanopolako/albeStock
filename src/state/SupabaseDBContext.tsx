import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type MovementType, type Producer, type StockMovement, type Product, type ProductType } from "./db";

import { supabase } from "../supabaseClient";



export type SnapshotRow = {
    month: string; // YYYY-MM
    start_stock: Record<string, number>;
    end_stock: Record<string, number> | null;
};

export type PodologistRow = {
    id: string;
    name: string;
    active: boolean;
};

type Ctx = {
    products: Product[];
    podologists: PodologistRow[];
    snapshots: SnapshotRow[];

    refreshAll: () => Promise<void>;
    fetchMovements: (args: {
        from?: string; // YYYY-MM-DD
        to?: string;   // YYYY-MM-DD
        type?: MovementType | "ALL";
        podologist?: string | "ALL";
    }) => Promise<StockMovement[]>;

    applyMovement: (args: {
        productId: string;
        type: MovementType;
        qty: number;
        occurredAt: string; // YYYY-MM-DD
        podologistName?: string;
        note?: string;
    }) => Promise<void>;

    addProduct: (args: {
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        stock: number;
        minLevel: number;
    }) => Promise<void>;

    editProduct: (args: {
        id: string;
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        minLevel: number;
    }) => Promise<void>;
};

const SupaCtx = createContext<Ctx | null>(null);

export function SupabaseDBProvider({ children }: { children: React.ReactNode }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [podologists, setPodologists] = useState<PodologistRow[]>([]);
    const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);

    const refreshAll = async () => {
        const [p, po, s] = await Promise.all([
            supabase.from("products").select("*").order("name", { ascending: true }),
            supabase.from("podologists").select("*").eq("active", true).order("name", { ascending: true }),
            supabase.from("monthly_snapshots").select("month,start_stock,end_stock").order("month", { ascending: false }),
        ]);

        if (p.error) throw p.error;
        if (po.error) throw po.error;
        if (s.error) throw s.error;

        setProducts(p.data as any);
        setPodologists(po.data as any);
        setSnapshots(s.data as any);
    };

    useEffect(() => {
        refreshAll().catch(() => { });
    }, []);

    const fetchMovements = async (args: {
        from?: string;
        to?: string;
        type?: MovementType | "ALL";
        podologist?: string | "ALL";
    }) => {
        let q = supabase
            .from("movements")
            .select("*")
            .order("occurred_at", { ascending: false })
            .order("created_at", { ascending: false });

        if (args.from) q = q.gte("occurred_at", args.from);
        if (args.to) q = q.lte("occurred_at", args.to);
        if (args.type && args.type !== "ALL") q = q.eq("type", args.type);
        if (args.podologist && args.podologist !== "ALL") q = q.eq("podologist_name", args.podologist);

        const { data, error } = await q;
        if (error) throw error;
        return data as any as StockMovement[];
    };

    const applyMovement = async (args: {
        productId: string;
        type: MovementType;
        qty: number;
        occurredAt: string;
        podologist?: string;
        note?: string;
    }) => {
        const { error } = await supabase.rpc("apply_movement", {
            p_product_id: args.productId,
            p_type: args.type,
            p_qty: args.qty,
            p_occurred_at: args.occurredAt,
            p_podologist_name: args.podologist ?? null,
            p_note: args.note ?? null,
        });

        if (error) throw error;

        // ruch zmienia stock oraz może tworzyć snapshot start miesiąca
        await refreshAll();
    };

    const addProduct = async (args: {
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        stock: number;
        minLevel: number;
    }) => {
        const { error } = await supabase.from("products").insert({
            producer: args.producer,
            name: args.name.trim(),
            product_type: args.productType.trim(),
            size: args.size?.trim() ? args.size.trim() : null,
            unit: "szt",
            stock: Math.max(0, Math.floor(args.stock)),
            min_level: Math.max(0, Math.floor(args.minLevel)),
        });
        if (error) throw error;

        // upewnij snapshot start dla bieżącego miesiąca
        await supabase.rpc("ensure_current_month_snapshot");
        await refreshAll();
    };

    const editProduct = async (args: {
        id: string;
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        minLevel: number;
    }) => {
        const { error } = await supabase
            .from("products")
            .update({
                producer: args.producer,
                name: args.name.trim(),
                product_type: args.productType.trim(),
                size: args.size?.trim() ? args.size.trim() : null,
                min_level: Math.max(0, Math.floor(args.minLevel)),
            })
            .eq("id", args.id);

        if (error) throw error;
        await refreshAll();
    };

    const value = useMemo(
        () => ({ products, podologists, snapshots, refreshAll, fetchMovements, applyMovement, addProduct, editProduct }),
        [products, podologists, snapshots]
    );

    return <SupaCtx.Provider value={value}>{children}</SupaCtx.Provider>;
}

export function useSupaDB() {
    const ctx = useContext(SupaCtx);
    if (!ctx) throw new Error("useSupaDB must be used within SupabaseDBProvider");
    return ctx;
}
