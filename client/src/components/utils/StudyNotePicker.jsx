import { useState } from "react";
import { Search } from "lucide-react";
import Styling from "../theme/Styling";

const SEARCH_THRESHOLD = 8;

export default function StudyNotePicker({
    notes,
    selectedNoteIds,
    onSelectNote,
    onSelectVisibleNotes,
    headingId,
}) {
    const styles = Styling();
    const [query, setQuery] = useState("");
    const filteredNotes = notes.filter((note) =>
        (note.title || "Untitled note").toLowerCase().includes(query.trim().toLowerCase())
    );
    const allVisibleSelected = filteredNotes.length > 0
        && filteredNotes.every((note) => selectedNoteIds.includes(note.id));

    return (
        <section aria-labelledby={headingId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 id={headingId} className={`text-sm font-semibold ${styles.primaryText}`}>Select notes</h3>
                    <p className={`mt-0.5 text-xs ${styles.studyMutedText}`}>
                        {selectedNoteIds.length} of {notes.length} selected
                    </p>
                </div>
                {notes.length > 0 && (
                    <label className={`inline-flex items-center gap-2 text-sm ${styles.secondaryText}`}>
                        <input
                            type="checkbox"
                            className={`h-4 w-4 rounded border ${styles.studyCheckbox} ${styles.studyAccent} ${styles.studyFocusRing}`}
                            checked={allVisibleSelected}
                            onChange={(event) => onSelectVisibleNotes(filteredNotes, event.target.checked)}
                            aria-label="Select all visible notes"
                        />
                        Select all
                    </label>
                )}
            </div>
            {notes.length > SEARCH_THRESHOLD && (
                <label className={`mt-3 flex items-center gap-2 rounded-lg border px-3 ${styles.studyInput}`}>
                    <Search className={`h-4 w-4 shrink-0 ${styles.studyMutedText}`} aria-hidden="true" />
                    <span className="sr-only">Search notes</span>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search notes"
                        className={`min-h-10 min-w-0 flex-1 bg-transparent text-sm outline-none ${styles.studyPlaceholder}`}
                    />
                </label>
            )}
            <div className={`modal-scroll mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2 ${styles.border}`}>
                {filteredNotes.length ? filteredNotes.map((note) => (
                    <label key={note.id} className={`flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm ${styles.secondaryBgHover}`}>
                        <input
                            type="checkbox"
                            className={`h-4 w-4 rounded border ${styles.studyCheckbox} ${styles.studyAccent} ${styles.studyFocusRing}`}
                            checked={selectedNoteIds.includes(note.id)}
                            onChange={(event) => onSelectNote(note.id, event.target.checked)}
                        />
                        <span className={`min-w-0 flex-1 truncate ${styles.primaryText}`}>{note.title || "Untitled note"}</span>
                    </label>
                )) : (
                    <p className={`px-3 py-5 text-center text-sm ${styles.studyMutedText}`}>
                        {notes.length ? "No notes match your search." : "This notebook has no notes yet."}
                    </p>
                )}
            </div>
        </section>
    );
}
