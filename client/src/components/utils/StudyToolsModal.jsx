import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import Styling from "../theme/Styling";
import toast from "react-hot-toast";
import { countStudyFacts, getNoteSections, QUESTION_TYPES } from "./studyTools";

const templates = [
    { name: "Quick Quiz", counts: { "Multiple Choice": 6, "True or False": 4 } },
    { name: "Practice Exam", counts: { "Multiple Choice": 8, "True or False": 6, Identification: 6, "Short Answer": 6, Essay: 4 } },
    { name: "Comprehensive Exam", counts: { "Multiple Choice": 8, "True or False": 6, Identification: 6, "Fill in the Blanks": 6, "Matching Type": 6, Enumeration: 4, "Short Answer": 4, Essay: 4, "Problem Solving": 4, "Situational Questions": 2 } },
    { name: "Identification Test", counts: { Identification: 12, "Fill in the Blanks": 8 } },
    { name: "Problem-Solving Exam", counts: { "Problem Solving": 12, "Short Answer": 8 } },
    { name: "Essay Exam", counts: { Essay: 10 } },
];

const sectionKey = (noteId, sectionId) => JSON.stringify([noteId, sectionId]);

export default function StudyToolsModal({ mode, notes, onClose, onGenerate }) {
    const styles = Styling();
    const isExam = mode === "mock-exams";
    const [title, setTitle] = useState(isExam ? "Untitled Mock Exam" : "Untitled Flashcard Deck");
    const [selectedNoteIds, setSelectedNoteIds] = useState([]);
    const [selectedSectionKeys, setSelectedSectionKeys] = useState([]);
    const [instructions, setInstructions] = useState("");
    const [selectedTypes, setSelectedTypes] = useState(["Multiple Choice", "True or False"]);
    const [questionCounts, setQuestionCounts] = useState({ "Multiple Choice": 5, "True or False": 5 });
    const [loading, setLoading] = useState(false);

    const selectedNotes = notes.filter((note) => selectedNoteIds.includes(note.id));
    const availableSections = useMemo(() => selectedNotes.flatMap((note) =>
        getNoteSections(note).map((section) => ({ ...section, noteId: note.id, noteTitle: note.title || "Untitled note" }))
    ), [selectedNotes]);
    const selectedSections = availableSections.filter((section) =>
        selectedSectionKeys.includes(sectionKey(section.noteId, section.id))
    );
    const factLimit = countStudyFacts(selectedSections);
    const totalQuestions = selectedTypes.reduce((total, type) => total + (Number(questionCounts[type]) || 0), 0);
    const exceedsSourceContent = isExam && selectedSections.length > 0 &&
        selectedTypes.some((type) => Number(questionCounts[type]) > factLimit);
    const canGenerate = title.trim() && selectedNotes.length > 0 && selectedSections.length > 0 &&
        (!isExam || (selectedTypes.length > 0 && totalQuestions > 0 && !exceedsSourceContent));

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !loading) onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [loading, onClose]);

    const selectNote = (note, checked) => {
        const sections = getNoteSections(note);
        setSelectedNoteIds((current) => checked
            ? [...current, note.id]
            : current.filter((id) => id !== note.id));
        setSelectedSectionKeys((current) => {
            const keys = sections.map((section) => sectionKey(note.id, section.id));
            return checked
                ? [...new Set([...current, ...keys])]
                : current.filter((key) => !keys.includes(key));
        });
    };

    const selectAllNotes = (checked) => {
        setSelectedNoteIds(checked ? notes.map((note) => note.id) : []);
        setSelectedSectionKeys(checked
            ? notes.flatMap((note) => getNoteSections(note).map((section) => sectionKey(note.id, section.id)))
            : []);
    };

    const applyTemplate = (template) => {
        setSelectedTypes(Object.keys(template.counts));
        setQuestionCounts(template.counts);
    };

    const updateQuestionCount = (type, value) => {
        setQuestionCounts((current) => ({ ...current, [type]: Math.max(0, Number(value) || 0) }));
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!canGenerate || loading) return;
        setLoading(true);
        try {
            await new Promise((resolve) => window.setTimeout(resolve, 0));
            await onGenerate({
                title: title.trim(),
                sections: selectedSections,
                instructions: instructions.trim(),
                questionCounts: Object.fromEntries(selectedTypes.map((type) => [type, Number(questionCounts[type]) || 0])),
            });
        } catch (generationError) {
            toast.error(generationError.message || "Unable to generate your study material. Please try again.");
            setLoading(false);
        }
    };

    const inputClass = `mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm ${styles.input} ${styles.border}`;
    const checkClass = "h-4 w-4 rounded border-gray-300 accent-blue-600";

    return (
        <div
            className="modal-overlay"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="study-tools-modal-title"
                className={`flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
            >
                <header className={`flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-7 ${styles.border}`}>
                    <div>
                        <h2 id="study-tools-modal-title" className={`text-xl font-semibold ${styles.primaryText}`}>
                            {isExam ? "Create a mock exam" : "Create a flashcard deck"}
                        </h2>
                        <p className={`mt-1 text-sm ${styles.secondaryText}`}>
                            Choose the notes and topics you want to study.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} disabled={loading} aria-label="Close dialog" className={`rounded-full p-1 ${styles.closeButton}`}>
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                    <div className="modal-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
                        <label className={`block text-sm font-medium ${styles.primaryText}`}>
                            {isExam ? "Exam title" : "Deck name"}
                            <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} maxLength={100} required />
                        </label>

                        <section aria-labelledby="source-notes-heading">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 id="source-notes-heading" className={`text-sm font-semibold ${styles.primaryText}`}>Select notes</h3>
                                    <p className={`mt-0.5 text-xs ${styles.secondaryText}`}>Choose one or more of your saved notes.</p>
                                </div>
                                {notes.length > 0 && (
                                    <label className={`inline-flex items-center gap-2 text-sm ${styles.secondaryText}`}>
                                        <input
                                            type="checkbox"
                                            className={checkClass}
                                            checked={selectedNoteIds.length === notes.length}
                                            onChange={(event) => selectAllNotes(event.target.checked)}
                                            aria-label="Select all notes"
                                        />
                                        Select all
                                    </label>
                                )}
                            </div>
                            <div className={`mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2 ${styles.border}`}>
                                {notes.length ? notes.map((note) => (
                                    <label key={note.id} className={`flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm ${styles.secondaryBgHover}`}>
                                        <input
                                            type="checkbox"
                                            className={checkClass}
                                            checked={selectedNoteIds.includes(note.id)}
                                            onChange={(event) => selectNote(note, event.target.checked)}
                                        />
                                        <span className={`min-w-0 flex-1 truncate ${styles.primaryText}`}>{note.title || "Untitled note"}</span>
                                        <span className={`shrink-0 text-xs ${styles.tertiaryText}`}>{getNoteSections(note).length} topics</span>
                                    </label>
                                )) : (
                                    <p className={`px-3 py-5 text-center text-sm ${styles.secondaryText}`}>
                                        No notes yet. Create a note first to build study materials from it.
                                    </p>
                                )}
                            </div>
                        </section>

                        <section aria-labelledby="source-sections-heading">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 id="source-sections-heading" className={`text-sm font-semibold ${styles.primaryText}`}>Select sections</h3>
                                    <p className={`mt-0.5 text-xs ${styles.secondaryText}`}>Choose specific topics from the selected notes.</p>
                                </div>
                                {availableSections.length > 0 && (
                                    <label className={`inline-flex items-center gap-2 text-sm ${styles.secondaryText}`}>
                                        <input
                                            type="checkbox"
                                            className={checkClass}
                                            checked={selectedSections.length === availableSections.length}
                                            onChange={(event) => setSelectedSectionKeys(event.target.checked
                                                ? availableSections.map((section) => sectionKey(section.noteId, section.id))
                                                : [])}
                                            aria-label="Select all sections"
                                        />
                                        Select all sections
                                    </label>
                                )}
                            </div>
                            <div className={`mt-3 max-h-44 space-y-1 overflow-y-auto rounded-lg border p-2 ${styles.border}`}>
                                {availableSections.length ? availableSections.map((section) => {
                                    const key = sectionKey(section.noteId, section.id);
                                    return (
                                        <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-md px-2.5 py-2 text-sm ${styles.secondaryBgHover}`}>
                                            <input
                                                type="checkbox"
                                                className={`${checkClass} mt-0.5`}
                                                checked={selectedSectionKeys.includes(key)}
                                                onChange={(event) => setSelectedSectionKeys((current) => event.target.checked
                                                    ? [...current, key]
                                                    : current.filter((selected) => selected !== key))}
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className={`block font-medium ${styles.primaryText}`}>{section.title}</span>
                                                <span className={`block truncate text-xs ${styles.tertiaryText}`}>{section.noteTitle}</span>
                                            </span>
                                        </label>
                                    );
                                }) : (
                                    <p className={`px-3 py-5 text-center text-sm ${styles.secondaryText}`}>
                                        {selectedNotes.length ? "No written sections or topics were found in these notes yet." : "Select a note to see its sections."}
                                    </p>
                                )}
                            </div>
                        </section>

                        {isExam && (
                            <>
                                <section aria-labelledby="exam-templates-heading">
                                    <h3 id="exam-templates-heading" className={`text-sm font-semibold ${styles.primaryText}`}>Suggested configurations</h3>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {templates.map((template) => (
                                            <button
                                                key={template.name}
                                                type="button"
                                                onClick={() => applyTemplate(template)}
                                                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${styles.border} ${styles.secondaryBgHover} ${styles.primaryText}`}
                                            >
                                                {template.name}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section aria-labelledby="question-types-heading">
                                    <h3 id="question-types-heading" className={`text-sm font-semibold ${styles.primaryText}`}>Question types and distribution</h3>
                                    <div className={`mt-3 divide-y rounded-lg border px-3 ${styles.border} ${styles.divide}`}>
                                        {QUESTION_TYPES.map((type) => {
                                            const checked = selectedTypes.includes(type);
                                            return (
                                                <div key={type} className="flex items-center gap-3 py-2.5">
                                                    <label className={`flex min-w-0 flex-1 items-center gap-2 text-sm ${styles.primaryText}`}>
                                                        <input
                                                            type="checkbox"
                                                            className={checkClass}
                                                            checked={checked}
                                                            onChange={(event) => {
                                                                setSelectedTypes((current) => event.target.checked
                                                                    ? [...current, type]
                                                                    : current.filter((item) => item !== type));
                                                                if (event.target.checked && !questionCounts[type]) {
                                                                    setQuestionCounts((current) => ({ ...current, [type]: 5 }));
                                                                }
                                                            }}
                                                        />
                                                        <span className="truncate">{type === "Other" ? "Other (subject-appropriate)" : type}</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="100"
                                                        value={checked ? questionCounts[type] ?? 1 : ""}
                                                        onChange={(event) => updateQuestionCount(type, event.target.value)}
                                                        disabled={!checked}
                                                        aria-label={`${type} question count`}
                                                        className={`w-20 rounded-md border px-2 py-1.5 text-sm ${styles.input} ${styles.border}`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className={`mt-2 text-right text-sm font-medium ${styles.primaryText}`}>Total questions: {totalQuestions}</p>
                                </section>

                            </>
                        )}

                        <label className={`block text-sm font-medium ${styles.primaryText}`}>
                            Additional instructions <span className={`font-normal ${styles.tertiaryText}`}>(optional)</span>
                            <textarea
                                value={instructions}
                                onChange={(event) => setInstructions(event.target.value)}
                                rows={3}
                                maxLength={1000}
                                placeholder={isExam
                                    ? "e.g. Include real-world scenarios and avoid repeating similar questions."
                                    : "e.g. Focus on important definitions and key concepts."}
                                className={inputClass}
                            />
                        </label>
                        {exceedsSourceContent && (
                            <p role="status" className={`rounded-lg px-3 py-2 text-sm ${styles.yellowBg2} ${styles.primaryText}`}>
                                The selected sections contain {factLimit} distinct facts. Reduce each question type to {factLimit} questions or select more note content.
                            </p>
                        )}
                    </div>

                    <footer className={`p-4 border-t ${styles.border}`}>
                        
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={onClose} disabled={loading} className={`rounded-lg px-4 py-2 text-sm ${styles.buttonFrost}`}>Cancel</button>
                            <button type="submit" disabled={!canGenerate || loading} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${styles.buttonBlue}`}>
                                {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                {loading ? "Generating…" : isExam ? "Generate Mock Exam" : "Generate Flashcards"}
                            </button>
                        </div>
                    </footer>
                </form>
            </section>
        </div>
    );
}
