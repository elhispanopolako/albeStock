import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
    throw new Error("Brak VITE_SUPABASE_URL lub VITE_SUPABASE_ANON_KEY w .env.local");
}

export const supabase = createClient(url, anonKey);