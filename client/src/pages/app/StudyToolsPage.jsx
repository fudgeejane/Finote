import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Plus, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Styling from "../../components/theme/Styling";
import StudyToolsModal from "../../components/utils/StudyToolsModal";
import { useAuth } from "../../auth/AuthContext";
import { importLegacyNotes } from "../../api/legacyNotesMigration";
import {
    EXAM_STORAGE_KEY,
    FLASHCARD_STORAGE_KEY,
    generateFlashcards,
    generateMockExam,
    readStoredItems,
} from "../../components/utils/studyTools";

const tabs = [
    { id: "flashcards", label: "Flashcards" },
    { id: "mock-exams", label: "Mock Exams" },
];

function StudyMaterialViewer({ mode, item, onClose, styles }) {
    const [cardIndex, setCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const isFlashcards = mode === "flashcards";

    return (
        <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="study-material-title"
                className={`flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
            >
                <header className={`flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-7 ${styles.border}`}>
                    <div className="min-w-0">
                        <h2 id="study-material-title" className={`truncate text-xl font-semibold ${styles.primaryText}`}>{item.title}</h2>
                        <p className={`mt-1 text-sm ${styles.secondaryText}`}>
                            {isFlashcards ? `${item.cards.length} flashcards` : `${item.questions.length} questions`}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close dialog" className={`rounded-full p-1 ${styles.closeButton}`}>
                        <X className="h-5 w-5" />
                    </button>
                </header>

                {isFlashcards ? (
                    <div className="modal-scroll flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-5 sm:p-8">
                        {item.cards.length ? (
                            <>
                                <p className={`mb-3 text-xs font-medium uppercase tracking-wide ${styles.tertiaryText}`}>
                                    Card {cardIndex + 1} of {item.cards.length}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowAnswer((visible) => !visible)}
                                    className={`min-h-56 w-full max-w-xl rounded-2xl border p-7 text-center shadow-sm sm:p-10 ${styles.border} ${styles.secondaryBgHover}`}
                                >
                                    <span className={`mb-4 block text-xs font-semibold uppercase tracking-wide ${styles.blueText}`}>
                                        {showAnswer ? "Answer" : "Question"}
                                    </span>
                                    <span className={`text-lg font-medium leading-relaxed ${styles.primaryText}`}>
                                        {showAnswer ? item.cards[cardIndex].answer : item.cards[cardIndex].question}
                                    </span>
                                    {!showAnswer && <span className={`mt-5 block text-xs ${styles.tertiaryText}`}>Select to reveal the answer</span>}
                                </button>
                                <div className="mt-5 flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={cardIndex === 0}
                                        onClick={() => { setCardIndex((current) => current - 1); setShowAnswer(false); }}
                                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${styles.buttonFrost}`}
                                    >
                                        <ChevronLeft className="h-4 w-4" /> Previous
                                    </button>
                                    <button
                                        type="button"
                                        disabled={cardIndex === item.cards.length - 1}
                                        onClick={() => { setCardIndex((current) => current + 1); setShowAnswer(false); }}
                                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${styles.buttonBlue}`}
                                    >
                                        Next <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </>
                        ) : <p className={`py-12 text-center ${styles.secondaryText}`}>This deck has no cards.</p>}
                    </div>
                ) : (
                    <form
                        onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="modal-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
                            {item.questions.map((question, index) => (
                                <fieldset key={question.id} className={`rounded-xl border p-4 ${styles.border}`}>
                                    <legend className={`px-1 text-xs font-semibold uppercase tracking-wide ${styles.blueText}`}>
                                        Question {index + 1} · {question.type}
                                    </legend>
                                    <p className={`mt-1 text-sm leading-6 ${styles.primaryText}`}>{question.prompt}</p>
                                    {question.options ? (
                                        <div className="mt-3 space-y-2">
                                            {question.options.map((option) => (
                                                <label key={option} className={`flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm ${styles.secondaryBgHover}`}>
                                                    <input
                                                        type="radio"
                                                        name={question.id}
                                                        value={option}
                                                        checked={answers[question.id] === option}
                                                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                                                    />
                                                    <span className={styles.primaryText}>{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <textarea
                                            value={answers[question.id] || ""}
                                            onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                                            disabled={submitted}
                                            rows={question.type === "Essay" ? 4 : 2}
                                            placeholder="Write your answer..."
                                            aria-label={`Your answer to question ${index + 1}`}
                                            className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm ${styles.input} ${styles.border}`}
                                        />
                                    )}
                                    {submitted && (
                                        <p className={`mt-3 rounded-lg p-3 text-sm ${styles.correct}`}>
                                            <span className="font-semibold">Suggested answer: </span>{question.answer}
                                        </p>
                                    )}
                                </fieldset>
                            ))}
                        </div>
                        <footer className={`flex justify-end border-t px-5 py-4 sm:px-7 ${styles.border}`}>
                            <button type="submit" disabled={submitted} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${styles.buttonBlue}`}>
                                <CheckCircle2 className="h-4 w-4" /> {submitted ? "Answers submitted" : "Submit exam"}
                            </button>
                        </footer>
                    </form>
                )}
            </section>
        </div>
    );
}

export default function StudyToolsPage() {
    const styles = Styling();
    const { user, apiRequest } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = tabs.find((tab) => tab.id === searchParams.get("tab"))?.id || "flashcards";
    const isFlashcards = activeTab === "flashcards";
    const [notes, setNotes] = useState([]);
    const [notesLoading, setNotesLoading] = useState(true);
    const [notesError, setNotesError] = useState("");
    const [decks, setDecks] = useState(() => readStoredItems(FLASHCARD_STORAGE_KEY));
    const [exams, setExams] = useState(() => readStoredItems(EXAM_STORAGE_KEY));
    const [modalOpen, setModalOpen] = useState(false);
    const [activeItem, setActiveItem] = useState(null);
    const materials = isFlashcards ? decks : exams;
    const ItemIcon = isFlashcards ? BookOpen : ClipboardCheck;

    useEffect(() => {
        let active = true;
        const loadNotes = async () => {
            setNotesLoading(true);
            setNotesError("");
            let migrationError = "";
            try {
                await importLegacyNotes(apiRequest, user?.id);
            } catch (error) {
                migrationError = error.message;
            }
            try {
                const response = await apiRequest("/notes");
                if (active) {
                    setNotes(response.notes);
                    if (migrationError) setNotesError(migrationError);
                }
            } catch (error) {
                if (active) setNotesError(error.message);
            } finally {
                if (active) setNotesLoading(false);
            }
        };
        loadNotes();
        return () => { active = false; };
    }, [apiRequest, user?.id]);

    const generateMaterial = async (configuration) => {
        if (isFlashcards) {
            const deck = generateFlashcards(configuration.title, configuration.sections, configuration.instructions);
            if (!deck.cards.length) throw new Error("The selected sections do not contain enough written content to make flashcards.");
            const updatedDecks = [deck, ...decks];
            localStorage.setItem(FLASHCARD_STORAGE_KEY, JSON.stringify(updatedDecks));
            setDecks(updatedDecks);
            setModalOpen(false);
            setActiveItem({ mode: "flashcards", item: deck });
            return;
        }

        const exam = generateMockExam(configuration);
        if (!exam.questions.length) throw new Error("The selected sections do not contain enough written content to make an exam.");
        const updatedExams = [exam, ...exams];
        localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(updatedExams));
        setExams(updatedExams);
        setModalOpen(false);
        setActiveItem({ mode: "mock-exams", item: exam });
    };

    const dateLabel = (value) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "Saved study material" : `Created ${date.toLocaleDateString()}`;
    };

    return (
        <div className={`mx-auto max-w-5xl space-y-8 ${styles.primaryText}`}>
            <header className={`border-b pb-6 ${styles.border}`}>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="font-serif text:2xl sm:text-3xl font-semibold md:text-4xl">Study tools</h1>
                        <p className={`mt-2 text-sm ${styles.secondaryText}`}>Pick up where you left off or choose a new session.</p>
                    </div>
                    <button
                        type="button"
                        disabled={notesLoading || !notes.length}
                        onClick={() => setModalOpen(true)}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${styles.buttonBlue}`}
                    >
                        <Plus className="h-4 w-4" />
                        {isFlashcards ? "Create a deck" : "Create Mock Exam"}
                    </button>
                </div>
            </header>

            {notesError && (
                <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
                    {notesError}
                </p>
            )}
            {!notesLoading && !notes.length && !notesError && (
                <p className={`rounded-lg border px-4 py-3 text-sm ${styles.border} ${styles.secondaryText}`}>
                    Create a note in one of your notebooks before generating study materials. <Link to="/home" className={styles.blueText}>Go to notebooks</Link>
                </p>
            )}

            <section aria-label="Study materials">
                <div className={`flex gap-6 border-b ${styles.border}`} role="tablist" aria-label="Study tools">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            id={`study-tools-tab-${tab.id}`}
                            aria-controls="study-tools-panel"
                            aria-selected={activeTab === tab.id}
                            onClick={() => setSearchParams({ tab: tab.id })}
                            className={`-mb-px border-b-2 py-3 text-sm transition ${
                                activeTab === tab.id
                                    ? "border-blue-600 font-medium text-blue-600"
                                    : `border-transparent ${styles.secondaryText}`
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div
                    id="study-tools-panel"
                    role="tabpanel"
                    aria-labelledby={`study-tools-tab-${activeTab}`}
                    className={`divide-y ${styles.divide}`}
                >
                    {materials.length ? materials.map((item) => (
                        <article key={item.id} className="flex flex-wrap items-center gap-4 py-4 sm:flex-nowrap">
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${styles.grayBg} ${styles.secondaryText}`}>
                                <ItemIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="truncate text-sm font-medium">{item.title}</h2>
                                <p className={`mt-1 text-sm ${styles.secondaryText}`}>
                                    {isFlashcards ? `${item.cards.length} cards` : `${item.questions.length} questions`} <span aria-hidden="true">·</span> {dateLabel(item.createdAt)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveItem({ mode: activeTab, item })}
                                className={`inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700`}
                            >
                                {isFlashcards ? "Study deck" : "Begin exam"}
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </article>
                    )) : (
                        <div className="py-16 text-center">
                            <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${styles.grayBg} ${styles.blueText}`}>
                                <ItemIcon className="h-6 w-6" aria-hidden="true" />
                            </span>
                            <h2 className="mt-4 font-medium">{isFlashcards ? "Your flashcard library is ready" : "Your mock exam library is ready"}</h2>
                            <p className={`mx-auto mt-2 max-w-md text-sm ${styles.secondaryText}`}>
                                Create study material from your own notes and choose exactly which topics to include.
                            </p>
                            <button
                                type="button"
                                disabled={notesLoading || !notes.length}
                                onClick={() => setModalOpen(true)}
                                className={`mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${styles.buttonBlue}`}
                            >
                                <Plus className="h-4 w-4" />
                                {isFlashcards ? "Create a deck" : "Create Mock Exam"}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {modalOpen && (
                <StudyToolsModal
                    mode={activeTab}
                    notes={notes}
                    onClose={() => setModalOpen(false)}
                    onGenerate={generateMaterial}
                />
            )}
            {activeItem && (
                <StudyMaterialViewer
                    key={activeItem.item.id}
                    mode={activeItem.mode}
                    item={activeItem.item}
                    onClose={() => setActiveItem(null)}
                    styles={styles}
                />
            )}
        </div>
    );
}
