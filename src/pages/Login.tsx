import { useState } from "react";
import { supabase } from "../supabaseClient";

function usernameToEmail(u: string) {
    const clean = u.trim().toLowerCase();
    // prosta walidacja na MVP:
    if (!/^[a-z0-9._-]{3,30}$/.test(clean)) return null;
    return `${clean}@magazyn.local`;
}

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setError(null);

        const email = usernameToEmail(username);
        if (!email) return setError("Username: 3–30 znaków (a-z, 0-9, kropka, myślnik, podkreślnik).");
        if (password.length < 6) return setError("Hasło: minimum 6 znaków.");

        setBusy(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (e: any) {
            setError(e?.message ?? "Błąd logowania.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={s.wrap}>
            <div style={s.card}>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Zaloguj się</div>

                <label style={s.field}>
                    <span style={s.label}>Username</span>
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={s.input}
                        placeholder=""
                        autoComplete="username"
                    />
                </label>

                <label style={s.field}>
                    <span style={s.label}>Hasło</span>
                    <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={s.input}
                        type="password"
                        autoComplete="current-password"
                    />
                </label>

                {error ? <div style={s.error}>{error}</div> : null}

                <button onClick={submit} style={s.btn} disabled={busy}>
                    {busy ? "…" : "Zaloguj"}
                </button>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    wrap: {
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "#fafafa",
    },
    card: {
        width: "min(420px, 95vw)",
        background: "white",
        border: "1px solid #eee",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
    },
    field: { display: "grid", gap: 6, marginBottom: 12 },
    label: { fontSize: 12, color: "#555", fontWeight: 800 },
    input: { padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", outline: "none" },
    btn: {
        width: "100%",
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid #2563eb",
        background: "#2563eb",
        color: "white",
        fontWeight: 900,
        cursor: "pointer",
    },
    linkBtn: {
        border: "none",
        background: "transparent",
        padding: 0,
        color: "#2563eb",
        fontWeight: 900,
        cursor: "pointer",
    },
    error: {
        padding: 10,
        borderRadius: 12,
        background: "#ffe8e8",
        border: "1px solid #ffb3b3",
        color: "#8a0000",
        fontWeight: 800,
        marginBottom: 12,
    },
};
