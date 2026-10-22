import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type Location, type MovementType, type Producer, type StockMovement, type Product, type ProductType, type Room } from "./db";

import { supabase } from "../supabaseClient";

const LOCATION_KEY = "albestock_location";

export type SnapshotRow = {
    location_id: string;
    month: string; // YYYY-MM
    start_stock: Record<string, number>;
    end_stock: Record<string, number> | null;
};

export type PodologistRow = {
    id: string;
    name: string;
    active: boolean;
};

type StockRow = {
    product_id: string;
    location_id: string;
    stock: number;
    min_level: number;
};

export type MovementArgs = {
    productId: string;
    type: MovementType;
    qty: number;
    occurredAt: string; // YYYY-MM-DD
    podologist?: string;
    toLocationId?: string; // tylko dla TRANSFER_OUT
    note?: string;
};

type Ctx = {
    // produkty ze stanem i minimum dla bieżącej lokalizacji
    products: Product[];
    podologists: PodologistRow[];
    // snapshoty bieżącej lokalizacji
    snapshots: SnapshotRow[];
    locations: Location[];
    // wszystkie gabinety (także nieaktywne) ze wszystkich lokalizacji
    allRooms: Room[];
    // aktywne gabinety bieżącej lokalizacji
    rooms: Room[];
    currentLocationId: string | null;
    setCurrentLocationId: (id: string) => void;

    refreshAll: () => Promise<void>;
    fetchMovements: (args: {
        from?: string; // YYYY-MM-DD
        to?: string;   // YYYY-MM-DD
        type?: MovementType | "ALL";
        podologist?: string | "ALL";
    }) => Promise<StockMovement[]>;

    applyMovement: (args: MovementArgs) => Promise<void>;

    addProduct: (args: {
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        stock: number;
        minLevel: number;
        isClinicOnly?: boolean;
    }) => Promise<void>;

    editProduct: (args: {
        id: string;
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        minLevel: number;
        isClinicOnly?: boolean;
    }) => Promise<void>;

    addLocation: (name: string) => Promise<void>;
    renameLocation: (id: string, name: string) => Promise<void>;
    addRoom: (locationId: string, name: string) => Promise<void>;
    renameRoom: (id: string, name: string) => Promise<void>;
    setRoomActive: (id: string, active: boolean) => Promise<void>;
};

const SupaCtx = createContext<Ctx | null>(null);

export function SupabaseDBProvider({ children }: { children: React.ReactNode }) {
    const [catalog, setCatalog] = useState<Product[]>([]);
    const [stockRows, setStockRows] = useState<StockRow[]>([]);
    const [podologists, setPodologists] = useState<PodologistRow[]>([]);
    const [allSnapshots, setAllSnapshots] = useState<SnapshotRow[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [allRooms, setAllRooms] = useState<Room[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(() => {
        try {
            return localStorage.getItem(LOCATION_KEY);
        } catch {
            return null;
        }
    });

    // zapamiętana lokalizacja mogła zniknąć - wtedy bierzemy pierwszą
    const currentLocationId = locations.some((l) => l.id === selectedLocationId)
        ? selectedLocationId
        : locations[0]?.id ?? null;

    const setCurrentLocationId = (id: string) => {
        setSelectedLocationId(id);
        try {
            localStorage.setItem(LOCATION_KEY, id);
        } catch {
            // brak localStorage - wybór działa tylko do odświeżenia strony
        }
    };

    const refreshAll = async () => {
        const { error: snapshotError } = await supabase.rpc("ensure_current_month_snapshot");

        if (snapshotError) {
            console.error("Błąd podczas sprawdzania snapshotu:", snapshotError);
        }
        const [p, ps, po, s, l, r] = await Promise.all([
            supabase.from("products").select("*").order("name", { ascending: true }),
            supabase.from("product_stock").select("product_id,location_id,stock,min_level"),
            supabase.from("podologists").select("*").eq("active", true).order("name", { ascending: true }),
            supabase.from("monthly_snapshots").select("location_id,month,start_stock,end_stock").order("month", { ascending: false }),
            supabase.from("locations").select("id,name").order("created_at", { ascending: true }),
            supabase.from("rooms").select("id,location_id,name,active").order("name", { ascending: true }),
        ]);

        for (const res of [p, ps, po, s, l, r]) {
            if (res.error) throw res.error;
        }

        setCatalog(p.data as Product[]);
        setStockRows(ps.data as StockRow[]);
        setPodologists(po.data as PodologistRow[]);
        setAllSnapshots(s.data as SnapshotRow[]);
        setLocations(l.data as Location[]);
        setAllRooms(r.data as Room[]);
    };

    // dane ładujemy dopiero po zalogowaniu, a przy wylogowaniu czyścimy
    useEffect(() => {
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_OUT" || !session) {
                setCatalog([]);
                setStockRows([]);
                setPodologists([]);
                setAllSnapshots([]);
                setLocations([]);
                setAllRooms([]);
                return;
            }
            if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
                // setTimeout: nie wolno czekać na zapytania supabase wewnątrz callbacka auth (deadlock)
                setTimeout(() => {
                    refreshAll().catch((e) => console.error("Błąd ładowania danych:", e));
                }, 0);
            }
        });
        return () => sub.subscription.unsubscribe();
    }, []);

    const products = useMemo(() => {
        const byProduct = new Map(
            stockRows.filter((r) => r.location_id === currentLocationId).map((r) => [r.product_id, r])
        );
        // brak wiersza w product_stock = produkt jeszcze nie występował w tej lokalizacji
        return catalog.map((p) => ({
            ...p,
            stock: byProduct.get(p.id)?.stock ?? 0,
            min_level: byProduct.get(p.id)?.min_level ?? 0,
        }));
    }, [catalog, stockRows, currentLocationId]);

    const snapshots = useMemo(
        () => allSnapshots.filter((s) => s.location_id === currentLocationId),
        [allSnapshots, currentLocationId]
    );

    const rooms = useMemo(
        () => allRooms.filter((r) => r.location_id === currentLocationId && r.active),
        [allRooms, currentLocationId]
    );

    const requireLocation = () => {
        if (!currentLocationId) throw new Error("Brak wybranej lokalizacji.");
        return currentLocationId;
    };

    const fetchMovements = async (args: {
        from?: string;
        to?: string;
        type?: MovementType | "ALL";
        podologist?: string | "ALL";
    }) => {
        if (!currentLocationId) return [];

        let q = supabase
            .from("movements")
            .select("*")
            .eq("location_id", currentLocationId)
            .order("occurred_at", { ascending: false })
            .order("created_at", { ascending: false });

        if (args.from) q = q.gte("occurred_at", args.from);
        if (args.to) q = q.lte("occurred_at", args.to);
        if (args.type && args.type !== "ALL") q = q.eq("type", args.type);
        if (args.podologist && args.podologist !== "ALL") q = q.eq("podologist_name", args.podologist);

        const { data, error } = await q;
        if (error) throw error;
        return data as StockMovement[];
    };

    const applyMovement = async (args: MovementArgs) => {
        const locationId = requireLocation();

        const { error } = args.type === "TRANSFER_OUT"
            ? await supabase.rpc("transfer_stock", {
                p_from_location_id: locationId,
                p_to_location_id: args.toLocationId ?? null,
                p_product_id: args.productId,
                p_qty: args.qty,
                p_occurred_at: args.occurredAt,
                p_note: args.note ?? null,
            })
            : await supabase.rpc("apply_movement", {
                p_location_id: locationId,
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
        isClinicOnly?: boolean;
    }) => {
        const { error } = await supabase.rpc("add_product", {
            p_location_id: requireLocation(),
            p_producer: args.producer,
            p_name: args.name.trim(),
            p_product_type: args.productType.trim(),
            p_size: args.size?.trim() ? args.size.trim() : null,
            p_is_clinic_only: args.isClinicOnly ?? false,
            p_stock: Math.max(0, Math.floor(args.stock)),
            p_min_level: Math.max(0, Math.floor(args.minLevel)),
        });
        if (error) throw error;
        await refreshAll();
    };

    const editProduct = async (args: {
        id: string;
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        minLevel: number;
        isClinicOnly?: boolean;
    }) => {
        const locationId = requireLocation();

        const { error } = await supabase
            .from("products")
            .update({
                producer: args.producer,
                name: args.name.trim(),
                product_type: args.productType.trim(),
                size: args.size?.trim() ? args.size.trim() : null,
                is_clinic_only: args.isClinicOnly ?? false,
            })
            .eq("id", args.id);
        if (error) throw error;

        // minimum jest per lokalizacja
        const { error: minError } = await supabase.rpc("set_min_level", {
            p_location_id: locationId,
            p_product_id: args.id,
            p_min_level: Math.max(0, Math.floor(args.minLevel)),
        });
        if (minError) throw minError;

        await refreshAll();
    };

    const addLocation = async (name: string) => {
        const { error } = await supabase.from("locations").insert({ name: name.trim() });
        if (error) throw error;
        await refreshAll();
    };

    const renameLocation = async (id: string, name: string) => {
        const { error } = await supabase.from("locations").update({ name: name.trim() }).eq("id", id);
        if (error) throw error;
        await refreshAll();
    };

    const addRoom = async (locationId: string, name: string) => {
        const { error } = await supabase.from("rooms").insert({ location_id: locationId, name: name.trim() });
        if (error) throw error;
        await refreshAll();
    };

    const renameRoom = async (id: string, name: string) => {
        const { error } = await supabase.from("rooms").update({ name: name.trim() }).eq("id", id);
        if (error) throw error;
        await refreshAll();
    };

    const setRoomActive = async (id: string, active: boolean) => {
        const { error } = await supabase.from("rooms").update({ active }).eq("id", id);
        if (error) throw error;
        await refreshAll();
    };

    const value = useMemo(
        () => ({
            products, podologists, snapshots, locations, allRooms, rooms, currentLocationId, setCurrentLocationId,
            refreshAll, fetchMovements, applyMovement, addProduct, editProduct,
            addLocation, renameLocation, addRoom, renameRoom, setRoomActive,
        }),
        // funkcje zależą tylko od currentLocationId i setterów stanu
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [products, podologists, snapshots, locations, allRooms, rooms, currentLocationId]
    );

    return <SupaCtx.Provider value={value}>{children}</SupaCtx.Provider>;
}

export function useSupaDB() {
    const ctx = useContext(SupaCtx);
    if (!ctx) throw new Error("useSupaDB must be used within SupabaseDBProvider");
    return ctx;
}
