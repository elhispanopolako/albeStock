import { useMemo } from "react";
import { useDB } from "../state/DBContext";
import { displayName } from "../state/db";

export default function History() {
    const { db } = useDB();

    const items = useMemo(() => db.movements.slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)), [db.movements]);

    return (
        <section style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 16 }}>
            <h2 style={{ marginTop: 0 }}>Historia</h2>

            {items.length === 0 ? (
                <p style={{ color: "#555" }}>Brak ruchów.</p>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={th}>Data</th>
                                <th style={th}>Typ</th>
                                <th style={th}>Produkt</th>
                                <th style={th}>Ilość</th>
                                <th style={th}>Notatka</th>
                                <th style={th}>Podolog</th>

                            </tr>
                        </thead>
                        <tbody>
                            {items.map((m) => {
                                const p = db.products.find((x) => x.id === m.productId);
                                const typeLabel =
                                    m.type === "IN" ? "Dostawa" :
                                        m.type === "SALE" ? "Sprzedaż" :
                                            m.type === "CLINIC" ? "Gabinet" :
                                                "Korekta";
                                return (
                                    <tr key={m.id}>
                                        <td style={td}>{m.occurredAt.split("-").reverse().join("-")}</td>
                                        <td style={td}>{typeLabel}</td>
                                        <td style={td}>{p ? displayName(p) : m.productId}</td>
                                        <td style={td}>{m.qty}</td>
                                        <td style={td}>{m.note ?? "-"}</td>
                                        <td style={td}>{(m.type === "SALE" || m.type === "CLINIC") ? (m.podologist ?? "-") : "-"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #eee", padding: "8px 6px" };
const td: React.CSSProperties = { borderBottom: "1px solid #f2f2f2", padding: "8px 6px" };
