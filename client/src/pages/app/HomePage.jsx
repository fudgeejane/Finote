import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Flame,
    BadgePlus,
    Ellipsis,
    Pencil,
    Trash2
} from "lucide-react";
import Styling from "../../components/theme/Styling";
import NotebookModal from "../../components/utils/NotebookModal";
import { useAuth } from "../../auth/AuthContext";

const INITIAL_NOTEBOOKS = [
    { id: 1, title: "Biology", sections: 2, notes: 4 },
    { id: 2, title: "Mathematics", sections: 2, notes: 4 },
    { id: 3, title: "Chemistry", sections: 2, notes: 4 },
    { id: 4, title: "History", sections: 2, notes: 4 },
];

function NotebookCard({ notebook, styles, toneIndex, menuOpen, onToggleMenu, onEdit, onDelete }) {
    const accent = styles.notebookAccentTones[toneIndex % styles.notebookAccentTones.length];

    return (
        <article className={`group overflow-hidden rounded-xl border transition ${styles.border} ${styles.secondaryBg} ${styles.secondaryBgHover} ${styles.themeTransition}`}>
            <Link
                to="/notes"
                className={`relative flex h-24 flex-col justify-between overflow-hidden p-3.5 ${styles.notebookCardTones[toneIndex % styles.notebookCardTones.length]}`}
            >
                <span className={`text-[9px] font-bold uppercase tracking-[0.14em] ${accent.text}`}>
                    Notebook
                </span>
                <span className={`font-serif text-xl font-semibold ${styles.primaryText}`}>
                    {notebook.title}
                </span>
                <span className={`absolute inset-x-0 bottom-0 h-0.5 ${accent.line}`} />
            </Link>

            <div className="flex items-center justify-between px-3.5 py-2">
                <p className={`text-[11px] ${styles.secondaryText}`}>
                    {notebook.sections} sections
                </p>
                <p className={`text-[10px] ${styles.tertiaryText}`}>Edited today</p>
                <div className="relative">
                    <button
                    type="button"
                    aria-label={`Actions for ${notebook.title}`}
                    aria-expanded={menuOpen}
                    className={`rounded-full p-2 transition ${styles.headerNavText} ${styles.secondaryBgHover}`}
                    onClick={onToggleMenu}
                    >
                        <Ellipsis className="h-4 w-4" />
                    </button>
                    {menuOpen && (
                        <div className={`absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-lg border py-1 ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}>
                            <button type="button" onClick={onEdit} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${styles.primaryText} ${styles.secondaryBgHover}`}>
                                <Pencil className="h-4 w-4" />
                                Edit
                            </button>
                            <button type="button" onClick={onDelete} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10">
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

export default function HomePage() {
    const [notebooks, setNotebooks] = useState(INITIAL_NOTEBOOKS);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [modal, setModal] = useState(null);
    const styles = Styling();
    const { user } = useAuth();

    const visibleNotebooks = notebooks;
    const greetingName = user?.firstName || user?.email?.split("@")[0] || "there";

    function createNotebook(title) {
        setNotebooks((items) => [
            {
                id: Date.now(),
                title,
                sections: 0,
                notes: 0,
            },
            ...items,
        ]);
        setModal(null);
    }

    function editNotebook(title) {
        setNotebooks((items) =>
            items.map((item) => item.id === modal.notebook.id ? { ...item, title } : item)
        );
        setModal(null);
        setOpenMenuId(null);
    }

    function deleteNotebook() {
        setNotebooks((items) => items.filter((item) => item.id !== modal.notebook.id));
        setModal(null);
        setOpenMenuId(null);
    }

    return (
        <div className={`mx-auto max-w-[1440px] space-y-6 ${styles.primaryText} ${styles.themeTransition}`}>
            <section className="flex items-start justify-between pb-2">
                <div>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${styles.tertiaryText}`}>Your study space</p>
                    <h1 className={`mt-2 font-serif text-3xl font-semibold sm:text-4xl ${styles.primaryText}`}>
                        Hello, {greetingName}
                    </h1>
                    <p className={`mt-1 text-sm ${styles.secondaryText}`}>Let’s make room for your next great idea.</p>
                </div>
            </section>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <section className="min-w-0">
                    <div className="flex items-center justify-between gap-4">
                        <p className={`hidden text-xs sm:block ${styles.secondaryText}`}>
                            A place for every subject. A page for every thought.
                        </p>
                        <button
                            type="button"
                            onClick={() => setModal({ mode: "create" })}
                            className={`flex  shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${styles.buttonFrost}`}
                        >
                            <BadgePlus className="h-4 w-4" />
                            <span className="">New Notebook</span>
                        </button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {visibleNotebooks.map((notebook, index) => (
                            <NotebookCard
                                key={notebook.id}
                                notebook={notebook}
                                styles={styles}
                                toneIndex={index}
                                menuOpen={openMenuId === notebook.id}
                                onToggleMenu={() => setOpenMenuId((id) => id === notebook.id ? null : notebook.id)}
                                onEdit={() => {
                                    setOpenMenuId(null);
                                    setModal({ mode: "edit", notebook });
                                }}
                                onDelete={() => {
                                    setOpenMenuId(null);
                                    setModal({ mode: "delete", notebook });
                                }}
                            />
                        ))}
                        <button
                            type="button"
                            onClick={() => setModal({ mode: "create" })}
                            className={`flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-xs font-medium transition ${styles.border} ${styles.secondaryText} ${styles.secondaryBgHover}`}
                        >
                            <BadgePlus className="h-5 w-5" />
                            Add notebook
                        </button>
                    </div>
                </section>

                <aside className="space-y-2.5 lg:sticky lg:top-24">
                    
                    <section className={`rounded-xl border p-4 ${styles.border} ${styles.secondaryBg} ${styles.themeTransition}`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className={`text-xs font-semibold ${styles.secondaryText}`}>
                                    Study streak
                                </p>
                                <div className="mt-1 flex items-baseline gap-1.5">
                                    <p className="font-serif text-3xl font-bold">7</p>
                                    <span className={`text-sm ${styles.secondaryText}`}>
                                        days
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                <Link to="/progress" className={`text-xs cursor-pointer ${styles.headerNavText}`}>
                                    View
                                </Link>
                                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${styles.streakIconBg} ${styles.streakIconText}`}>
                                    <Flame className="h-5 w-5" fill="currentColor" />
                                </span>
                            </div>
                        </div>

                        {/* Weekly streak */}
                        <div className="mt-5">
                            <div className="mb-2 flex items-center justify-between">
                                <p className={`text-xs font-medium ${styles.secondaryText}`}>
                                    This week
                                </p>
                                <p className="text-xs font-semibold text-orange-500">
                                    7/7 completed
                                </p>
                            </div>

                            <div className="grid grid-cols-7 gap-2" aria-label="Seven day study streak">
                                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                                    <div key={`${day}-${index}`} className="flex flex-col items-center gap-1.5">
                                        <span aria-label={`${day} completed`} className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 shadow-sm">
                                            <span className="sr-only">Completed</span>
                                        </span>
                                        <span className={`text-[10px] font-medium ${styles.tertiaryText}`}>
                                            {day}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </aside>
            </div>

            {modal && (
                <NotebookModal
                    key={`${modal.mode}-${modal.notebook?.id ?? "new"}`}
                    mode={modal.mode}
                    notebook={modal.notebook}
                    onClose={() => setModal(null)}
                    onSubmit={modal.mode === "edit" ? editNotebook : createNotebook}
                    onDelete={deleteNotebook}
                />
            )}
        </div>
    );
}
