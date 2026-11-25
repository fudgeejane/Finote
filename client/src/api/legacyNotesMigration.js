import { NOTES_STORAGE_KEY } from "../components/utils/studyTools";

const MAX_IMPORT_BYTES = 600000;
const MAX_IMPORT_NOTES = 250;

const pendingMigrations = new Map();

export async function importLegacyNotes(apiRequest, userId) {
    const stored = localStorage.getItem(NOTES_STORAGE_KEY);
    if (stored === null) return false;

    let legacyNotes;
    try {
        legacyNotes = JSON.parse(stored);
    } catch {
        throw new Error("Your saved notes could not be read. They have been left unchanged.");
    }
    if (!Array.isArray(legacyNotes)) {
        throw new Error("Your saved notes are invalid. They have been left unchanged.");
    }
    if (!legacyNotes.length) {
        localStorage.removeItem(NOTES_STORAGE_KEY);
        return false;
    }

    const key = `${userId}:${legacyNotes.map((note) => String(note?.id ?? "")).join("\u0000")}`;
    if (pendingMigrations.has(key)) return pendingMigrations.get(key);

    const migration = (async () => {
        const batches = [];
        let batch = [];
        for (const note of legacyNotes) {
            if (
                !note ||
                typeof note !== "object" ||
                (typeof note.id !== "string" && typeof note.id !== "number") ||
                typeof note.content !== "string" ||
                (note.title !== undefined && typeof note.title !== "string")
            ) {
                throw new Error("A saved note is invalid. Your saved notes have been left unchanged.");
            }
            const entry = {
                id: note.id,
                title: note.title,
                content: note.content,
            };
            const entryBody = JSON.stringify({ notes: [entry] });
            if (new TextEncoder().encode(entryBody).length > MAX_IMPORT_BYTES) {
                throw new Error("A saved note is too large to import. Your saved notes have been left unchanged.");
            }
            const nextBatch = [...batch, entry];
            const requestBody = JSON.stringify({ notes: nextBatch });
            if (
                batch.length >= MAX_IMPORT_NOTES ||
                new TextEncoder().encode(requestBody).length > MAX_IMPORT_BYTES
            ) {
                if (!batch.length) {
                    throw new Error("A saved note is too large to import. Your saved notes have been left unchanged.");
                }
                batches.push(batch);
                batch = [entry];
            } else {
                batch = nextBatch;
            }
        }
        if (batch.length) batches.push(batch);

        for (const notes of batches) {
            await apiRequest("/notes/migrate", {
                method: "POST",
                body: JSON.stringify({ notes }),
            });
        }
        localStorage.removeItem(NOTES_STORAGE_KEY);
        return true;
    })();

    pendingMigrations.set(key, migration);
    try {
        return await migration;
    } finally {
        pendingMigrations.delete(key);
    }
}
