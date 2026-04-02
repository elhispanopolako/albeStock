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
        <div className="min-h-screen grid place-items-center p-4 bg-neutral-50">
            <div className="w-full max-w-[420px] bg-white border border-neutral-200 rounded-2xl p-6 shadow-xl">
                <div className="font-black text-xl mb-6 text-neutral-900 text-center">
                    Zaloguj się
                </div>

                <label className="grid gap-1.5 mb-4">
                    <span className="text-xs text-neutral-500 font-extrabold">Username</span>
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="px-3 py-2.5 rounded-xl border border-neutral-300 outline-none focus:border-blue-500 transition-colors w-full"
                        placeholder=""
                        autoComplete="username"
                    />
                </label>

                <label className="grid gap-1.5 mb-6">
                    <span className="text-xs text-neutral-500 font-extrabold">Hasło</span>
                    <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="px-3 py-2.5 rounded-xl border border-neutral-300 outline-none focus:border-blue-500 transition-colors w-full"
                        type="password"
                        autoComplete="current-password"
                    />
                </label>

                {error ? (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold text-sm mb-4">
                        {error}
                    </div>
                ) : null}

                <button
                    onClick={submit}
                    disabled={busy}
                    className="w-full px-4 py-2.5 rounded-xl border border-blue-600 bg-blue-600 text-white font-black hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {busy ? "Logowanie…" : "Zaloguj"}
                </button>
            </div>
        </div>
    );
}