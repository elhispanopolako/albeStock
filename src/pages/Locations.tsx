import { useState } from "react";
import { useSupaDB } from "../state/SupabaseDBContext";
import { type Location, type Room } from "../state/db";

const inputClass = "px-3 py-2 rounded-xl border border-neutral-300 outline-none focus:border-blue-500 transition-colors";
const primaryButtonClass = "px-3 py-2 rounded-xl bg-blue-600 border border-blue-600 text-white font-extrabold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButtonClass = "px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 font-extrabold text-xs hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export default function Locations() {
    const { locations, allRooms, addLocation } = useSupaDB();

    return (
        <section className="p-4 border border-neutral-200 rounded-2xl bg-white shadow-sm">
            <h2 className="mt-0 mb-4 text-2xl font-black text-neutral-800">Lokalizacje i gabinety</h2>

            <div className="mb-6">
                <NameForm placeholder="Nazwa nowej lokalizacji" buttonLabel="Dodaj lokalizację" onSubmit={addLocation} />
            </div>

            <div className="grid gap-4">
                {locations.map((l) => (
                    <LocationCard key={l.id} location={l} rooms={allRooms.filter((r) => r.location_id === l.id)} />
                ))}
            </div>
        </section>
    );
}

function LocationCard({ location, rooms }: { location: Location; rooms: Room[] }) {
    const { renameLocation, addRoom, renameRoom, setRoomActive } = useSupaDB();

    return (
        <div className="p-4 border border-neutral-100 rounded-2xl bg-neutral-50/50">
            <EditableName value={location.name} onSave={(name) => renameLocation(location.id, name)} large />

            <h3 className="mt-4 mb-2 text-sm font-bold text-neutral-600">Gabinety</h3>
            {rooms.length === 0 ? <p className="m-0 mb-3 text-neutral-500 text-sm">Brak gabinetów.</p> : null}

            <ul className="m-0 p-0 list-none grid gap-2 mb-3">
                {rooms.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2">
                        <div className={r.active ? "" : "opacity-50"}>
                            <EditableName value={r.name} onSave={(name) => renameRoom(r.id, name)} />
                        </div>
                        <ActionButton
                            label={r.active ? "Wyłącz" : "Włącz"}
                            title={r.active ? "Gabinet zniknie z wyboru przy zużyciu, historia zostaje" : "Przywróć gabinet do wyboru"}
                            onClick={() => setRoomActive(r.id, !r.active)}
                        />
                    </li>
                ))}
            </ul>

            <NameForm placeholder="Nazwa nowego gabinetu" buttonLabel="Dodaj gabinet" onSubmit={(name) => addRoom(location.id, name)} />
        </div>
    );
}

function NameForm({ placeholder, buttonLabel, onSubmit }: { placeholder: string; buttonLabel: string; onSubmit: (name: string) => Promise<void> }) {
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        if (!name.trim()) return setError("Podaj nazwę.");
        setError(null);
        setSaving(true);
        try {
            await onSubmit(name);
            setName("");
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="grid gap-2">
            <div className="flex flex-wrap gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} className={`${inputClass} min-w-[220px]`} />
                <button type="submit" disabled={saving} className={primaryButtonClass}>
                    {buttonLabel}
                </button>
            </div>
            {error ? <ErrorBox message={error} /> : null}
        </form>
    );
}

function EditableName({ value, onSave, large }: { value: string; onSave: (name: string) => Promise<void>; large?: boolean }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(value);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!editing) {
        return (
            <div className="flex items-center gap-2">
                <span className={large ? "text-lg font-extrabold text-neutral-900" : "font-bold text-neutral-800"}>{value}</span>
                <button onClick={() => { setName(value); setError(null); setEditing(true); }} className={secondaryButtonClass}>
                    Zmień nazwę
                </button>
            </div>
        );
    }

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        if (!name.trim()) return setError("Podaj nazwę.");
        setSaving(true);
        try {
            await onSave(name);
            setEditing(false);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={save} className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                <button type="submit" disabled={saving} className={secondaryButtonClass}>Zapisz</button>
                <button type="button" onClick={() => setEditing(false)} className={secondaryButtonClass}>Anuluj</button>
            </div>
            {error ? <ErrorBox message={error} /> : null}
        </form>
    );
}

function ActionButton({ label, title, onClick }: { label: string; title: string; onClick: () => Promise<void> }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = async () => {
        setBusy(true);
        setError(null);
        try {
            await onClick();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button onClick={run} disabled={busy} title={title} className={secondaryButtonClass}>{label}</button>
            {error ? <ErrorBox message={error} /> : null}
        </>
    );
}

function ErrorBox({ message }: { message: string }) {
    return <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold text-sm">{message}</div>;
}

function errorMessage(err: unknown) {
    const msg = (err as { message?: string } | null)?.message ?? "Nie udało się zapisać.";
    // naruszenie unikalności nazwy
    return msg.includes("duplicate key") ? "Taka nazwa już istnieje." : msg;
}
