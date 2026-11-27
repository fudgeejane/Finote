import { useEffect, useRef, useState } from "react";
import { BookOpen, ClipboardCheck, MoreHorizontal, BadgePlus } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Styling from "../../components/theme/Styling";
import { useDarkMode } from "../../components/theme/DarkModeContext";
import FlashCardModal from "../../components/utils/study tools/FlashCardModal";
import MockExamModal from "../../components/utils/study tools/MockExamModal";
import useDialogFocus from "../../components/utils/study tools/useDialogFocus";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";

const EMPTY_LOCATION_STATE = {};
const MIN_LOADING_DURATION_MS = 2000;

export default function StudyToolsPage() {
    const styles = Styling();
    const { darkMode } = useDarkMode();
    const { user, apiRequest } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const requestedTab = location.state?.tab || new URLSearchParams(location.search).get("tab");
    const activeTab = requestedTab === "mock-exams" ? "mock-exams" : "flashcards";
    const locationState = location.state && typeof location.state === "object"
        ? location.state
        : EMPTY_LOCATION_STATE;
    const skeletonFill = darkMode ? "bg-white/10" : "bg-gray-200";
    const [notes, setNotes] = useState([]);
    const [notebooks, setNotebooks] = useState([]);
    const [notesLoading, setNotesLoading] = useState(true);
    const [notesError, setNotesError] = useState("");
    const [decks, setDecks] = useState([]);
    const [exams, setExams] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteItem, setDeleteItem] = useState(null);
    const [menuItemId, setMenuItemId] = useState(null);
    const [sortOrder, setSortOrder] = useState("recent");
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const deleteDialogRef = useRef(null);
    const itemMenuRef = useRef(null);
    const materials = activeTab === "flashcards" ? decks : exams;
    const canCreate = !notesLoading && notes.length > 0;
    const sortedMaterials = [...materials].sort((first, second) => {
        if (sortOrder === "title") return first.title.localeCompare(second.title);
        if (sortOrder === "title-desc") return second.title.localeCompare(first.title);
        const firstCreated = Date.parse(first.createdAt) || 0;
        const secondCreated = Date.parse(second.createdAt) || 0;
        return sortOrder === "oldest"
            ? firstCreated - secondCreated
            : secondCreated - firstCreated;
    });

    useDialogFocus(deleteDialogRef, () => setDeleteItem(null), deleting);

    useEffect(() => {
        if (menuItemId === null) return undefined;
        const closeOnOutsideClick = (event) => {
            if (!itemMenuRef.current?.contains(event.target)) setMenuItemId(null);
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setMenuItemId(null);
        };
        document.addEventListener("pointerdown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [menuItemId]);

    useEffect(() => {
        if (location.search) {
            navigate(location.pathname, {
                replace: true,
                state: { ...locationState, tab: activeTab },
            });
        }
    }, [activeTab, location.pathname, location.search, locationState, navigate]);

    useEffect(() => {
        let active = true;
        const loadNotes = async () => {
            const loadingStartedAt = Date.now();
            setNotesLoading(true);
            setNotesError("");
            try {
                const [notebookResponse, noteResponse, deckResponse, examResponse] = await Promise.all([
                    apiRequest("/notebooks"),
                    apiRequest("/notes"),
                    apiRequest("/study-materials?type=flashcards"),
                    apiRequest("/study-materials?type=mock-exams"),
                ]);
                if (active) {
                    setNotebooks(notebookResponse.notebooks);
                    setNotes(noteResponse.notes);
                    setDecks(deckResponse.materials);
                    setExams(examResponse.materials);
                }
            } catch (error) {
                if (active) setNotesError(error.message);
            } finally {
                const remainingLoadingTime = MIN_LOADING_DURATION_MS - (Date.now() - loadingStartedAt);
                if (active && remainingLoadingTime > 0) {
                    await new Promise((resolve) => window.setTimeout(resolve, remainingLoadingTime));
                }
                if (active) setNotesLoading(false);
            }
        };
        loadNotes();
        return () => { active = false; };
    }, [apiRequest, user?.id]);

    const generateMaterial = async (configuration, type) => {
        const { material } = await apiRequest("/study-materials/generate", {
            method: "POST",
            body: JSON.stringify({ ...configuration, type }),
        });
        if (type === "flashcards") setDecks((currentDecks) => [material, ...currentDecks]);
        else setExams((currentExams) => [material, ...currentExams]);
        setModalOpen(false);
        navigate(`/${type}/${encodeURIComponent(material.id)}`);
    };

    const deleteMaterial = async () => {
        if (!deleteItem || deleting) return;
        setDeleting(true);
        setDeleteError("");
        try {
            await apiRequest(`/study-materials/${encodeURIComponent(deleteItem.id)}`, { method: "DELETE" });
            if (deleteItem.type === "flashcards") {
                setDecks((currentDecks) => currentDecks.filter((deck) => deck.id !== deleteItem.id));
            } else {
                setExams((currentExams) => currentExams.filter((exam) => exam.id !== deleteItem.id));
            }
            setDeleteItem(null);
            toast.success("Study material deleted.");
        } catch (error) {
            setDeleteError(error.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className={`mx-auto space-y-4 ${styles.primaryText}`}>
            <header className={`border-b pb-4 sm:pb-6 ${styles.border}`}>
                <h1 className="font-serif text-2xl font-semibold sm:text-3xl md:text-4xl">
                    Study Tools
                </h1>
                <p className={`mt-2 text-sm ${styles.secondaryText}`}>
                    Generate flashcard decks and mock exams from your notes to help you study and retain information.
                </p>
            </header>

        
         
            <section aria-label="Study materials">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div
                        className={`inline-flex w-fit items-center rounded-lg border ${styles.border} ${styles.secondaryBg}`}
                        role="tablist"
                        aria-label="Study tools"
                    >
                        {[
                            { id: "flashcards", label: "Flashcards", Icon: BookOpen },
                            { id: "mock-exams", label: "Mock exams", Icon: ClipboardCheck },
                        ].map(({ id, label, Icon }, index) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                id={`study-tools-tab-${id}`}
                                aria-controls="study-tools-panel"
                                aria-selected={activeTab === id}
                                onClick={() => navigate(location.pathname, {
                                    replace: true,
                                    state: { ...locationState, tab: id },
                                })}
                                className={`inline-flex  items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                                    index === 0 ? "rounded-l-lg" : ""
                                } ${
                                    index === 1 ? "rounded-r-lg" : ""
                                } ${styles.studyFocusRing} ${
                                    activeTab === id
                                        ? darkMode
                                            ? `${styles.blueBg2}`
                                            : "bg-white text-gray-900 shadow-sm"
                                        : `${styles.secondaryText} ${styles.secondaryBgHover} cursor-pointer`
                                }`}
                            >
                                <Icon className="h-3 w-3" aria-hidden="true" />
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="sr-only" htmlFor="study-tools-sort">Sort study materials</label>
                        <select
                            id="study-tools-sort"
                            value={sortOrder}
                            onChange={(event) => setSortOrder(event.target.value)}
                            className={`rounded-lg border px-3 py-1.5 text-sm ${styles.input} ${styles.border}`}
                        >
                            <option value="recent">Recent</option>
                            <option value="oldest">Oldest</option>
                            <option value="title">A to Z</option>
                            <option value="title-desc">Z to A</option>
                        </select>
                        <button
                            type="button"
                            disabled={!canCreate}
                            onClick={() => setModalOpen(true)}
                            className={`inline-flex  items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed ${styles.blueBg2} ${styles.blueBg2hover}`}
                        >
                            <BadgePlus className="h-4 w-4" aria-hidden="true" />
                            {activeTab === "flashcards" ? "Create Deck" : "Create Exam"}
                        </button>
                    </div>
                </div>

                <div
                    id="study-tools-panel"
                    role="tabpanel"
                    aria-labelledby={`study-tools-tab-${activeTab}`}
                    className="mt-4"
                >
                    {notesLoading ? (
                        <div
                            role="status"
                            aria-label="Loading study materials"
                            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            <span className="sr-only">Loading study materials...</span>
                            {Array.from({ length: 3 }, (_, index) => (
                                <div
                                    key={index}
                                    aria-hidden="true"
                                    className={`min-h-[150px] rounded-xl border p-4 ${styles.border} ${styles.secondaryBg}`}
                                >
                                    <div className="animate-pulse">
                                        <div className={`h-3 w-24 rounded ${skeletonFill}`} />
                                        <div className={`mt-3 h-4 w-3/4 rounded ${skeletonFill}`} />
                                        <div className={`mt-2 h-3 w-1/2 rounded ${skeletonFill}`} />
                                        <div className={`mt-7 h-6 w-20 rounded-full ${skeletonFill}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notesError ? (
                        <div
                            role="alert"
                            className={`rounded-xl border p-4 text-sm ${styles.border} ${styles.secondaryBg} ${styles.studyDanger}`}
                        >
                            {notesError}
                        </div>
                    ) : sortedMaterials.length ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {sortedMaterials.map((item) => {
                                const notebook = notebooks.find((entry) => entry.id === item.sourceNotebookId);
                                const count = activeTab === "flashcards"
                                    ? `${item.cards.length} cards`
                                    : `${item.questions.length} questions`;
                                return (
                                    
                                    <Link
                                        key={item.id}
                                        to={`/${activeTab}/${encodeURIComponent(item.id)}`}
                                        className={`relative flex min-h-[150px] flex-col justify-between gap-5 rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ${styles.border} ${styles.secondaryBg}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${styles.studyMutedText}`}>
                                                    {activeTab === "flashcards" ? "Flashcard deck" : "Mock exam"}
                                                </p>

                                                <h1 className="block truncate text-sm font-semibold sm:text-base">
                                                    {item.title}
                                                </h1>

                                                <p className={`mt-2 min-w-0 truncate text-xs ${styles.studyMutedText}`}>
                                                    {notebook?.name || "Source unavailable"}
                                                </p>
                                            </div>

                                            {/* Dropdown menu */}
                                            <div
                                                ref={menuItemId === item.id ? itemMenuRef : null}
                                                className="relative z-20 shrink-0"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();

                                                        setMenuItemId((current) =>
                                                            current === item.id ? null : item.id
                                                        );
                                                    }}
                                                    aria-label={`More actions for ${item.title}`}
                                                    aria-haspopup="menu"
                                                    aria-expanded={menuItemId === item.id}
                                                    className={`flex cursor-pointer items-center justify-center rounded-md p-1 ${styles.secondaryText} ${styles.headerHover} ${styles.studyFocusRing}`}
                                                >
                                                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                                </button>

                                                {menuItemId === item.id && (
                                                    <div
                                                        role="menu"
                                                        className={`absolute right-0 top-full z-50 mt-1 min-w-32 rounded-lg border p-1 shadow-lg ${styles.border} ${styles.secondaryBg}`}
                                                    >
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();

                                                                setDeleteError("");
                                                                setDeleteItem({
                                                                    ...item,
                                                                    type: item.type || activeTab,
                                                                });

                                                                setMenuItemId(null);
                                                            }}
                                                            className={`w-full rounded-md px-3 py-2 text-left text-xs ${styles.secondaryBgHover} ${styles.primaryText}`}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles.border} ${styles.secondaryText}`}>
                                                {count}
                                            </span>
                                        </div>
                                    </Link>

                                );
                            })}
                        </div>
                    ) : notesLoading ? null : (
                        <div className={`flex min-h-[250px] w-full items-center justify-center text-center gap-3 rounded-xl border border-dashed px-4 py-3 ${styles.border} ${styles.secondaryBg}`}>
                            <div className="min-w-0">
                                <h2 className="text-base sm:text-lg  font-semibold">
                                    {activeTab === "flashcards" ? "No flashcard decks yet" : "No mock exams yet"}
                                </h2>
                                <p className={`mt-2 max-w-md text-sm  ${styles.secondaryText}`}>
                                    Create a note in one of your notebooks before generating study materials. <Link to="/home" className={`${styles.blueText} ${styles.studyFocusRing}`}>Go to notebooks</Link>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {modalOpen && (
                activeTab === "flashcards" ? (
                    <FlashCardModal
                        notes={notes}
                        notebooks={notebooks}
                        onClose={() => setModalOpen(false)}
                        onGenerate={(configuration) => generateMaterial(configuration, "flashcards")}
                    />
                ) : (
                    <MockExamModal
                        notes={notes}
                        notebooks={notebooks}
                        onClose={() => setModalOpen(false)}
                        onGenerate={(configuration) => generateMaterial(configuration, "mock-exams")}
                    />
                )
            )}

            {deleteItem && (
                <div
                    className="modal-overlay"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !deleting) setDeleteItem(null);
                    }}
                >
                    <div
                        ref={deleteDialogRef}
                        tabIndex={-1}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-material-title"
                        aria-describedby="delete-material-description"
                        className={`w-full max-w-sm rounded-xl border p-5 ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
                    >
                        <h2 id="delete-material-title" className={`font-semibold ${styles.primaryText}`}>
                            Delete this {deleteItem.type === "flashcards" ? "flashcard set" : "mock exam"}?
                        </h2>
                        <p id="delete-material-description" className={`mt-2 text-sm ${styles.secondaryText}`}>
                            "{deleteItem.title}" will be permanently deleted. This action cannot be undone.
                        </p>
                        {deleteError && (
                            <p role="alert" className={`mt-3 rounded-lg border px-3 py-2 text-sm ${styles.studyDanger}`}>{deleteError}</p>
                        )}
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={() => setDeleteItem(null)}
                                className={`min-h-10 rounded-lg px-4 py-2 text-sm ${styles.buttonGray} ${styles.studyFocusRing}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={deleteMaterial}
                                className={`min-h-10 rounded-lg px-4 py-2 text-sm ${styles.buttonRed} ${styles.studyFocusRing}`}
                            >
                                {deleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
