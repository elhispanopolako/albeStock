import { supabase } from "./supabaseClient";

export async function fetchProducts() {
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

    if (error) throw error;
    return data;
}

export async function fetchMovements(params: { from?: string; to?: string; type?: string; podologist?: string }) {
    let q = supabase.from("movements").select("*").order("occurred_at", { ascending: false }).order("created_at", { ascending: false });

    if (params.from) q = q.gte("occurred_at", params.from);
    if (params.to) q = q.lte("occurred_at", params.to);
    if (params.type && params.type !== "ALL") q = q.eq("type", params.type);
    if (params.podologist && params.podologist !== "ALL") q = q.eq("podologist_name", params.podologist);

    const { data, error } = await q;
    if (error) throw error;
    return data;
}

export async function applyMovement(args: {
    productId: string;
    type: "IN" | "SALE" | "CLINIC" | "ADJUST";
    qty: number;
    occurredAt: string; // YYYY-MM-DD
    podologistName?: string;
    note?: string;
}) {
    const { error } = await supabase.rpc("apply_movement", {
        p_product_id: args.productId,
        p_type: args.type,
        p_qty: args.qty,
        p_occurred_at: args.occurredAt,
        p_podologist_name: args.podologistName ?? null,
        p_note: args.note ?? null,
    });

    if (error) throw error;
}
