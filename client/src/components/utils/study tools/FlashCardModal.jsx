import { useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import Styling from "../../theme/Styling";
import StudyNotePicker from "./StudyNotePicker";
import showStudyToast from "./studyToast.js";
import useDialogFocus from "./useDialogFocus";

export default function FlashCardModal({ notes, notebooks, onClose, onGenerate }) {
    const styles = Styling();
    const dialogRef = useRef(null);
    const [selectedNotebookId, setSelectedNotebookId] = useState(notebooks[0]?.id || "");
    const [selectedNoteIds, setSelectedNoteIds] = useState([]);
    const [titleEdited, setTitleEdited] = useState(false);
    const [title, setTitle] = useState("");
    const [instructions, setInstructions] = useState("");
    const [loading, setLoading] = useState(false);
    const [generationError, setGenerationError] = useState("");

    const notebookNotes = notes.filter((note) => note.notebookId === selectedNotebookId);
    const selectedNotebook = notebooks.find((notebook) => notebook.id === selectedNotebookId);
    const firstSelectedNote = notebookNotes.find((note) => selectedNoteIds.includes(note.id));
    const suggestedTitle = firstSelectedNote?.title || selectedNotebook?.name;
    const suggestedName = suggestedTitle ? `${suggestedTitle.slice(0, 85)}: Flashcards` : "";
    const titleValue = titleEdited || !suggestedName ? title : suggestedName;
    const finalTitle = titleValue.trim();
    const validationMessage = !finalTitle
        ? "Enter a name for your flashcard set."
        : !selectedNotebookId
            ? "Select a notebook."
            : !selectedNoteIds.length
                ? "Select at least one note."
                : "";
    const canGenerate = !validationMessage;

    useDialogFocus(dialogRef, onClose, loading);

    const selectNote = (noteId, checked) => {
        setSelectedNoteIds((current) => checked
            ? [...current, noteId]
            : current.filter((id) => id !== noteId));
    };

    const selectVisibleNotes = (visibleNotes, checked) => {
        const visibleIds = new Set(visibleNotes.map((note) => note.id));
        setSelectedNoteIds((current) => {
            const retained = current.filter((id) => !visibleIds.has(id));
            return checked ? [...retained, ...visibleIds] : retained;
        });
    };

    const generate = async () => {
        if (loading || !canGenerate) return;
        setGenerationError("");
        setLoading(true);
        try {
            await onGenerate({
                title: finalTitle,
                notebookId: selectedNotebookId,
                noteIds: selectedNoteIds,
                instructions: instructions.trim(),
            });
            showStudyToast("Flashcards generated and saved.");
        } catch (error) {
            const message = error.message || "Unable to generate your flashcards. Please try again.";
            setGenerationError(message);
            showStudyToast(message, { kind: "error", actionLabel: "Retry", onAction: () => void generate() });
            setLoading(false);
        }
    };

    const inputClass = `mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm ${styles.input}`;

    return (
        <div
            className="drawer-overlay"
            style={styles.studyOverlayStyle}
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) onClose();
            }}
        >
            <section
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="flashcard-modal-title"
                className={`flex h-dvh w-full max-w-none flex-col overflow-hidden border-l ${styles.border} ${styles.secondaryBg} sm:max-w-lg`}
            >
                <header className={`flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-7 ${styles.border}`}>
                    <div>
                        <h2 id="flashcard-modal-title" className={`text-xl font-semibold ${styles.primaryText}`}>
                            Create a flashcard set
                        </h2>
                        <p className={`mt-1 text-sm ${styles.secondaryText}`}>
                            Choose a notebook and the notes to turn into study cards.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} disabled={loading} aria-label="Close dialog" className={`rounded-full p-1 ${styles.closeButton} ${styles.studyFocusRing} disabled:cursor-not-allowed`}>
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </header>

                <form noValidate onSubmit={(event) => { event.preventDefault(); void generate(); }} className="flex min-h-0 flex-1 flex-col">
                    <div className="modal-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
                        <label className={`block text-sm font-medium ${styles.primaryText}`}>
                            Deck name
                            <input
                                autoFocus
                                value={titleValue}
                                onChange={(event) => {
                                    setTitle(event.target.value);
                                    setTitleEdited(true);
                                }}
                                className={inputClass}
                                maxLength={100}
                                required
                            />
                        </label>

                        <label className={`block text-sm font-medium ${styles.primaryText}`}>
                            Select notebook
                            <select
                                value={selectedNotebookId}
                                onChange={(event) => {
                                    setSelectedNotebookId(event.target.value);
                                    setSelectedNoteIds([]);
                                }}
                                className={inputClass}
                                required
                            >
                                <option value="" disabled>Choose a notebook</option>
                                {notebooks.map((notebook) => (
                                    <option key={notebook.id} value={notebook.id}>{notebook.name}</option>
                                ))}
                            </select>
                        </label>

                        <StudyNotePicker
                            notes={notebookNotes}
                            selectedNoteIds={selectedNoteIds}
                            onSelectNote={selectNote}
                            onSelectVisibleNotes={selectVisibleNotes}
                            headingId="flashcard-source-notes-heading"
                        />

                        <label className={`block text-sm font-medium ${styles.primaryText}`}>
                            Additional instructions <span className={`font-normal ${styles.studyMutedText}`}>(optional)</span>
                            <textarea
                                value={instructions}
                                onChange={(event) => setInstructions(event.target.value)}
                                rows={3}
                                maxLength={1000}
                                placeholder="e.g. Focus on important definitions and key concepts."
                                className={`${inputClass} resize-none`}
                            />
                        </label>
                    </div>

                    <footer className={`border-t px-4 py-3 flex items-center gap-2 justify-between ${styles.border}`}>
                        {generationError && (
                            <p role="alert" className={`mb-3 rounded-lg border px-3 py-2 text-sm ${styles.studyDanger}`}>
                                {generationError}
                            </p>
                        )}

                        {!canGenerate && (
                            <p className={`mt-2 text-right text-xs ${styles.studyMutedText}`}>
                                {selectedNoteIds.length ? validationMessage : "Select at least one note"}
                            </p>
                        )}

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            
                            <button 
                                type="button" 
                                onClick={onClose} 
                                disabled={loading} 
                                className={`rounded-lg px-4 py-2 text-xs ${styles.buttonFrost}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !canGenerate}
                                className={`rounded-lg px-4 py-2 text-xs ${styles.buttonPrimary}`}
                            >
                                {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {loading ? "Generating flashcards..." : "Generate flashcards"}
                            </button>
                        </div>
                        
                    </footer>
                </form>
            </section>
        </div>
    );
}
