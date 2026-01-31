// src/state/DBContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type DB, type MovementType, type Producer, type ProductType, loadDB, saveDB } from "./db";
import { applyMovement, ensureCurrentMonthSnapshot, createMovement } from "./logic";
import { addProduct as addProductLogic, updateProduct as updateProductLogic } from "./products";


type DBContextValue = {
    db: DB;
    user: string;
    setUser: (u: string) => void;
    move: (args: { productId: string; type: MovementType; qty: number; note?: string, podologist?: string; occurredAt: string; }) => void;
    addProduct: (args: {
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        stock: number;
        minLevel: number;
    }) => void;
    editProduct: (args: {
        id: string;
        producer: Producer;
        name: string;
        productType: ProductType;
        size?: string;
        minLevel: number;
    }) => void;

};
const Ctx = createContext<DBContextValue | null>(null);

export function DBProvider({ children }: { children: React.ReactNode }) {
    const [db, setDb] = useState<DB>(() => loadDB());
    const [user, setUser] = useState("Podolog");

    // 1) zapewnij snapshot miesiąca przy starcie (i po zmianie usera)
    useEffect(() => {
        setDb((prev) => ensureCurrentMonthSnapshot(prev, user));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // 2) persistencja
    useEffect(() => {
        saveDB(db);
    }, [db]);


    const move = (args: { productId: string; type: MovementType; qty: number; note?: string, podologist?: string, occurredAt: string }) => {
        setDb((prev) =>
            applyMovement(
                prev,
                createMovement({
                    productId: args.productId,
                    type: args.type,
                    qty: args.qty,
                    user,
                    note: args.note,
                    podologist: args.podologist,
                    occurredAt: args.occurredAt

                })
            )
        );
    };
    const addProduct = (args: { producer: Producer; name: string; productType: ProductType; size?: string; stock: number; minLevel: number }) => {
        setDb((prev) => addProductLogic(prev, args));
    };
    const editProduct = (args: { id: string; producer: Producer; name: string; productType: ProductType; size?: string; minLevel: number }) => {
        setDb((prev) => updateProductLogic(prev, args.id, args));
    };

    const value = useMemo(() => ({ db, user, setUser, move, addProduct, editProduct }), [db, user]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDB() {
    const v = useContext(Ctx);
    if (!v) throw new Error("useDB must be used within DBProvider");
    return v;
}
