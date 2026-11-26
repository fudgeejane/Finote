import { useRef, useState } from "react";
import { LoaderCircle, Minus, Plus, X } from "lucide-react";
import Styling from "../../theme/Styling";
import StudyNotePicker from "./StudyNotePicker";
import showStudyToast from "./StudyToast";
import useDialogFocus from "./useDialogFocus";

const QUESTION_PRESETS = [5, 10, 20, 30];

export default function MockExamModal({ notes, notebooks, onClose, onGenerate }) {
    const styles = Styling();
    const dialogRef = useRef(null);
    const [selectedNotebookId, setSelectedNotebookId] = useState(notebooks[0]?.id || "");
    const [selectedNoteIds, setSelectedNoteIds] = useState([]);
    const [titleEdited, setTitleEdited] = useState(false);
    const [title, setTitle] = useState("");
    const [totalQuestions, setTotalQuestions] = useState(10);
    const [instructions, setInstructions] = useState("");
    const [loading, setLoading] = useState(false);
    const [generationError, setGenerationError] = useState("");

    const notebookNotes = notes.filter((note) => note.notebookId === selectedNotebookId);
    const selectedNotebook = notebooks.find((notebook) => notebook.id === selectedNotebookId);
    const firstSelectedNote = notebookNotes.find((note) => selectedNoteIds.includes(note.id));
    const suggestedTitle = firstSelectedNote?.title || selectedNotebook?.name;
    const suggestedName = suggestedTitle ? `${suggestedTitle.slice(0, 85)}: Mock Exam` : "";
    const titleValue = titleEdited || !suggestedName ? title : suggestedName;
    const finalTitle = titleValue.trim();
    const validationMessage = !finalTitle
        ? "Enter a title for your mock exam."
        : !selectedNotebookId
            ? "Select a notebook."
            : !selectedNoteIds.length
                ? "Select at least one note."
                : !Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions > 100
                    ? "Enter a whole number of questions from 1 to 100."
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
                totalQuestions,
                instructions: instructions.trim(),
            });
            showStudyToast("Mock exam generated and saved.");
        } catch (error) {
            const message = error.message || "Unable to generate your mock exam. Please try again.";
            setGenerationError(message);
            showStudyToast(message, { kind: "error", actionLabel: "Retry", onAction: () => void generate() });
            setLoading(false);
        }
    };

    const inputClass = `mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm ${styles.studyInput}`;

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
                aria-labelledby="mock-exam-modal-title"
                className={`flex h-dvh w-full max-w-none flex-col overflow-hidden border-l ${styles.border} ${styles.secondaryBg} sm:max-w-lg`}
            >
                <header className={`flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-7 ${styles.border}`}>
                    <div>
                        <h2 id="mock-exam-modal-title" className={`text-xl font-semibold ${styles.primaryText}`}>
                            Create a mock exam
                        </h2>
                        <p className={`mt-1 text-sm ${styles.secondaryText}`}>
                            Choose a notebook, source notes, and the number of questions.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} disabled={loading} aria-label="Close dialog" className={`rounded-full p-1 ${styles.closeButton} ${styles.studyFocusRing} disabled:cursor-not-allowed`}>
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </header>

                <form noValidate onSubmit={(event) => { event.preventDefault(); void generate(); }} className="flex min-h-0 flex-1 flex-col">
                    <div className="modal-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
                        <label className={`block text-sm font-medium ${styles.primaryText}`}>
                            Exam title
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
                            headingId="mock-exam-source-notes-heading"
                        />

                        <section aria-labelledby="question-count-heading">
                            <h3 id="question-count-heading" className={`text-sm font-medium ${styles.primaryText}`}>Number of questions</h3>
                            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Question count presets">
                                {QUESTION_PRESETS.map((count) => (
                                    <button
                                        key={count}
                                        type="button"
                                        aria-pressed={totalQuestions === count}
                                        onClick={() => setTotalQuestions(count)}
                                        className={`min-h-10 rounded-lg border px-4 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${totalQuestions === count ? styles.studySelected : `${styles.border} ${styles.buttonFrost}`} ${styles.studyFocusRing}`}
                                    >
                                        {count}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3">
                                <span className={`text-sm ${styles.secondaryText}`}>Custom count</span>
                                <div className={`flex items-center rounded-lg border ${styles.border}`}>
                                    <button
                                        type="button"
                                        aria-label="Decrease question count"
                                        disabled={totalQuestions <= 1}
                                        onClick={() => setTotalQuestions((count) => Math.max(1, count - 1))}
                                        className={`flex h-10 w-10 items-center justify-center rounded-l-lg ${styles.secondaryText} ${styles.secondaryBgHover} ${styles.studyDisabled} ${styles.studyFocusRing}`}
                                    >
                                        <Minus className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={totalQuestions}
                                        onChange={(event) => setTotalQuestions(Number(event.target.value))}
                                        aria-label="Custom question count, from 1 to 100"
                                        className={`h-10 w-16 border-x text-center text-sm ${styles.studyInput} ${styles.border}`}
                                    />
                                    <button
                                        type="button"
                                        aria-label="Increase question count"
                                        disabled={totalQuestions >= 100}
                                        onClick={() => setTotalQuestions((count) => Math.min(100, count + 1))}
                                        className={`flex h-10 w-10 items-center justify-center rounded-r-lg ${styles.secondaryText} ${styles.secondaryBgHover} ${styles.studyDisabled} ${styles.studyFocusRing}`}
                                    >
                                        <Plus className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                            <p className={`mt-1 text-xs ${styles.studyMutedText}`}>
                                Choose 1–100 questions. Finnie Bot will select suitable question formats.
                            </p>
                        </section>

                        <label className={`block text-sm font-medium ${styles.primaryText}`}>
                            Additional instructions <span className={`font-normal ${styles.studyMutedText}`}>(optional)</span>
                            <textarea
                                value={instructions}
                                onChange={(event) => setInstructions(event.target.value)}
                                rows={3}
                                maxLength={1000}
                                placeholder="e.g. Include real-world scenarios and avoid repeating similar questions."
                                className={`${inputClass} ${styles.studyPlaceholder}`}
                            />
                        </label>
                    </div>

                    <footer className={`border-t p-4 ${styles.border}`}>
                        {generationError && (
                            <p role="alert" className={`mb-3 rounded-lg border px-3 py-2 text-sm ${styles.studyDanger}`}>
                                {generationError}
                            </p>
                        )}
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={onClose} disabled={loading} className={`min-h-11 px-4 py-2 text-sm ${styles.studyGhostButton} ${styles.studyFocusRing}`}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !canGenerate}
                                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${styles.studyPrimaryButton} ${styles.studyFocusRing}`}
                            >
                                {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {loading ? `Generating  Mock  Exam...` : "Generate mock exam"}
                            </button>
                        </div>
                        {!canGenerate && (
                            <p className={`mt-2 text-right text-xs ${styles.studyMutedText}`}>
                                {selectedNoteIds.length ? validationMessage : "Select at least one note"}
                            </p>
                        )}
                    </footer>
                </form>
            </section>
        </div>
    );
}
