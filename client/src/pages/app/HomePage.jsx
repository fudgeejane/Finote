import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Flame,
    BadgePlus,
    Ellipsis,
    ArrowUpDown,
} from "lucide-react";
import Styling from "../../components/theme/Styling";
import NotebookModal from "../../components/utils/notes/NotebookModal";
import { useAuth } from "../../auth/AuthContext";

const MIN_NOTEBOOK_LOADING_MS = 2000;
const NOTEBOOK_GRID_CLASSES = "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

function NotebookCard({ notebook, styles, menuOpen, onToggleMenu, onEdit, onDelete }) {
    return (
        <article
            className={`group relative rounded-lg transition border ${styles.border} ${menuOpen ? "z-20" : "z-0"}`}
        >
            <Link
                to={`/notes?notebookId=${encodeURIComponent(notebook.id)}`}
                className={`block overflow-hidden rounded-lg transition ${styles.secondaryBg} ${styles.secondaryBgHover}`}
            >
                {/* Header */}
                <div className="flex h-28 flex-col justify-between p-4">
                    <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${styles.blueText}`}>
                        Notebook
                    </span>

                    <span className={`truncate font-serif text-xl font-semibold ${styles.primaryText}`}>
                        {notebook.title}
                    </span>
                </div>

                {/* Footer - kasama sa hover */}
                <div className="flex items-center justify-between gap-2 px-4 py-4">
                    <p className={`truncate text-xs ${styles.secondaryText}`}>
                        {notebook.noteCount} {notebook.noteCount === 1 ? "note" : "notes"}
                    </p>
                </div>
            </Link>

            {/* Ellipsis */}
            <div className="absolute bottom-1.5 right-4 z-30">
                <button
                    type="button"
                    aria-label={`Actions for ${notebook.title}`}
                    aria-expanded={menuOpen}
                    className={`rounded-full p-1.5 transition ${styles.headerNavText} ${styles.secondaryBgHover}`}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleMenu();
                    }}
                >
                    <Ellipsis className="h-4 w-4" />
                </button>

                {menuOpen && (
                    <div
                        role="menu"
                        className={`absolute right-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-lg border ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
                    >
                        <button
                            type="button"
                            role="menuitem"
                            onClick={onEdit}
                            className={`w-full px-4 py-2 text-left text-sm cursor-pointer ${styles.secondaryBgHover}`}
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            role="menuitem"
                            onClick={onDelete}
                            className={`w-full px-4 py-2 text-left text-sm cursor-pointer ${styles.secondaryBgHover}`}
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
}

function NotebookGridSkeleton({ styles }) {
    const placeholders = Array.from({ length: 3 }, (_, index) => index);
    const shimmer = "motion-safe:animate-pulse rounded bg-current/10";

    return (
        <div role="status" aria-busy="true" className="space-y-3">
            <div aria-hidden="true" className={NOTEBOOK_GRID_CLASSES}>
                {placeholders.map((index) => (
                    <article
                        key={index}
                        className={`overflow-hidden rounded-lg border ${styles.border} ${styles.secondaryBg}`}
                    >
                        <div className={`flex h-28 flex-col justify-between p-4 ${styles.secondaryBg}`}>
                            <span className={`${shimmer} h-2.5 w-16`} />
                            <span className={`${shimmer} h-5 w-3/5`} />
                        </div>
                        <div className="flex items-center justify-between px-4 py-2">
                            <span className={`${shimmer} h-3 w-12`} />
                            <span className={`${shimmer} h-4 w-4`} />
                        </div>
                    </article>
                ))}
                <div className={`flex min-h-36 flex-col items-center justify-center gap-3 rounded-lg border border-dashed ${styles.border}`}>
                    <span className={`${shimmer} h-5 w-5 rounded-full`} />
                    <span className={`${shimmer} h-3 w-24`} />
                </div>
            </div>
        </div>
    );
}

function StudyStreakSkeleton() {
    const shimmer = "motion-safe:animate-pulse rounded bg-current/10";
    const days = Array.from({ length: 7 }, (_, index) => index);

    return (
        <div aria-hidden="true" className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-1.5">
                <span className={`${shimmer} h-6 w-6 rounded-full`} />
                <span className={`${shimmer} h-9 w-8`} />
                <span className={`${shimmer} h-4 w-12`} />
            </div>
            <div className="flex items-center gap-2">
                {days.map((day) => (
                    <div key={day} className="flex flex-col items-center gap-1">
                        <span className={`${shimmer} h-5 w-5 rounded-full`} />
                        <span className={`${shimmer} h-3 w-6`} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function getNotebookUpdateTime(notebook) {
    const time = Date.parse(notebook.lastEditedAt ?? notebook.updatedAt ?? notebook.createdAt ?? "");
    return Number.isNaN(time) ? 0 : time;
}

export default function HomePage() {
    const [notebooks, setNotebooks] = useState([]);
    const [sortBy, setSortBy] = useState("recent");
    const [openMenuId, setOpenMenuId] = useState(null);
    const [modal, setModal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [loadError, setLoadError] = useState("");
    const [reloadToken, setReloadToken] = useState(0);
    const [activity, setActivity] = useState(null);
    const [activityLoading, setActivityLoading] = useState(true);
    const [activityError, setActivityError] = useState("");
    const [activityRetry, setActivityRetry] = useState(0);
    const styles = Styling();
    const { user, apiRequest } = useAuth();

    const visibleNotebooks = [...notebooks].sort((left, right) => {
        const titleOrder = left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
        if (sortBy === "name-asc") return titleOrder;
        if (sortBy === "name-desc") return -titleOrder;

        const updateOrder = getNotebookUpdateTime(right) - getNotebookUpdateTime(left);
        if (updateOrder !== 0) return sortBy === "oldest" ? -updateOrder : updateOrder;
        return titleOrder;
    });
    const greetingName = user?.firstName || user?.email?.split("@")[0] || "there";
    useEffect(() => {
        let active = true;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        apiRequest(`/learning-activity?timezone=${encodeURIComponent(timezone)}`)
            .then((result) => { if (active) setActivity(result); })
            .catch((error) => { if (active) setActivityError(error.message); })
            .finally(() => { if (active) setActivityLoading(false); });
        return () => { active = false; };
    }, [apiRequest, activityRetry, user?.id]);
    useEffect(() => {
        let active = true;
        const loadNotebooks = async () => {
            const loadingStartedAt = Date.now();
            setLoading(true);
            setError("");
            setLoadError("");
            try {
                const response = await apiRequest("/notebooks");
                if (active) setNotebooks(response.notebooks);
            } catch (loadError) {
                if (active) {
                    setError(loadError.message);
                    setLoadError(loadError.message);
                }
            } finally {
                const remainingLoadingMs = MIN_NOTEBOOK_LOADING_MS - (Date.now() - loadingStartedAt);
                if (remainingLoadingMs > 0) {
                    await new Promise((resolve) => window.setTimeout(resolve, remainingLoadingMs));
                }
                if (active) setLoading(false);
            }
        };
        loadNotebooks();
        return () => { active = false; };
    }, [apiRequest, reloadToken, user?.id]);

    async function createNotebook(title) {
        setBusy(true);
        setError("");
        try {
            const response = await apiRequest("/notebooks", {
                method: "POST",
                body: JSON.stringify({ name: title }),
            });
            setNotebooks((items) => [response.notebook, ...items]);
            setModal(null);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    }

    async function editNotebook(title) {
        setBusy(true);
        setError("");
        try {
            const response = await apiRequest(`/notebooks/${modal.notebook.id}`, {
                method: "PATCH",
                body: JSON.stringify({ name: title }),
            });
            setNotebooks((items) =>
                items.map((item) => item.id === response.notebook.id ? response.notebook : item)
            );
            setModal(null);
            setOpenMenuId(null);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    }

    async function deleteNotebook() {
        setBusy(true);
        setError("");
        try {
            await apiRequest(`/notebooks/${modal.notebook.id}`, { method: "DELETE" });
            setNotebooks((items) => items.filter((item) => item.id !== modal.notebook.id));
            setModal(null);
            setOpenMenuId(null);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={`mx-auto w-full max-w-[1440px] space-y-4 ${styles.primaryText} ${styles.themeTransition}`}>
            <section className={`border-b pb-4 ${styles.border}`}>
                <h1 className={`mt-1 font-serif text-4xl font-semibold leading-tight sm:text-5xl ${styles.primaryText}`}>
                    Hello, {greetingName}
                </h1>
                <p className={`mt-1 text-sm sm:text-base ${styles.secondaryText}`}>
                    Let’s make room for your next great idea.
                </p>
            </section>

            <section aria-label="Study streak" className="flex flex-wrap items-center justify-between gap-x-4  gap-y-2 mt-8">
                {activityLoading ? (
                    <StudyStreakSkeleton />
                ) : activityError ? (
                    <div className={`flex flex-wrap items-center gap-3 text-sm ${styles.secondaryText}`}>
                        <span role="alert">Could not load study streak: {activityError}</span>
                        <button type="button" onClick={() => { setActivityLoading(true); setActivityError(""); setActivityRetry((value) => value + 1); }} className={`rounded-lg px-3 py-1.5 underline ${styles.headerNavText}`}>Retry</button>
                    </div>
                ) : (
                    <Link
                        to="/progress"
                        aria-label={`Current study streak: ${activity?.streak || 0} consecutive days. View progress.`}
                        className="flex flex-wrap items-center gap-x-5 gap-y-3 focus-visible:outline-2 focus-visible:outline-offset-4"
                    >
                        <div className="flex items-center gap-1.5">
                            <Flame className={`h-6 w-6 ${styles.streakIconText}`} fill="currentColor" aria-hidden="true" />
                            <span className="font-serif text-3xl font-bold leading-none">{activity?.streak || 0}</span>
                            <span className={`text-sm ${styles.secondaryText}`}>{(activity?.streak || 0) === 1 ? "day" : "days"}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                            <div role="group" aria-label="Study activity Monday through Sunday this week" className="flex items-center gap-2">
                                {(activity?.days || []).map((day) => (
                                    <div key={day.date} className="flex flex-col items-center gap-0.5" aria-label={`${new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}: ${day.active ? "study activity" : "no activity"}`}>
                                        <Flame className={`h-5 w-5 ${day.active ? "text-orange-500" : styles.tertiaryText}`} fill={day.active ? "currentColor" : "none"} aria-hidden="true" />
                                        <span className={`text-[11px] font-medium ${styles.tertiaryText}`}>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</span>
                                        <span className="sr-only">{day.active ? "Activity completed" : "No activity"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Link>
                )}
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className={`flex items-center gap-2 rounded-lg   px-3 ${styles.buttonFrost}`}>
                        <ArrowUpDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <select
                            id="notebook-sort"
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value)}
                            className={`min-w-0 bg-transparent cursor-pointer py-2 text-sm outline-none ${styles.primaryText}`}
                        >
                            <option value="recent">Recent</option>
                            <option value="oldest">Oldest</option>
                            <option value="name-asc">A–Z</option>
                            <option value="name-desc">Z–A</option>
                        </select>
                    </div>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => { setError(""); setModal({ mode: "create" }); }}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${styles.buttonFrost}`}
                    >
                        <BadgePlus className="h-4 w-4" />
                        Create Notebook
                    </button>
                </div>
            </section>

            <section className="mt-8">
                {error && !loadError && (
                    <p role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
                        {error}
                    </p>
                )}
                {loading ? (
                    <NotebookGridSkeleton styles={styles} />
                ) : loadError ? (
                    <div role="alert" className={`rounded-lg border px-5 py-8 text-center ${styles.border}`}>
                        <p className={`text-sm ${styles.secondaryText}`}>Notebooks could not be loaded: {loadError}</p>
                        <button
                            type="button"
                            onClick={() => setReloadToken((token) => token + 1)}
                            className={`mt-3 rounded-lg px-4 py-2 text-sm ${styles.buttonBlue}`}
                        >
                            Try again
                        </button>
                    </div>
                ) : (
                    <div className={NOTEBOOK_GRID_CLASSES}>
                        {visibleNotebooks.map((notebook) => (
                            <NotebookCard
                                key={notebook.id}
                                notebook={notebook}
                                styles={styles}
                                menuOpen={openMenuId === notebook.id}
                                onToggleMenu={() => setOpenMenuId((id) => id === notebook.id ? null : notebook.id)}
                                onEdit={() => {
                                    setOpenMenuId(null);
                                    setError("");
                                    setModal({ mode: "edit", notebook });
                                }}
                                onDelete={() => {
                                    setOpenMenuId(null);
                                    setError("");
                                    setModal({ mode: "delete", notebook });
                                }}
                            />
                        ))}
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => { setError(""); setModal({ mode: "create" }); }}
                            className={`flex min-h-36 flex-col items-center justify-center cursor-pointer 
                                        gap-2.5 rounded-lg border border-dashed p-4 text-center text-sm transition  
                                        disabled:cursor-not-allowed disabled:opacity-50
                                        ${styles.buttonFrost} `}
                        >
                            <BadgePlus className="h-5 w-5" />
                            <span>{visibleNotebooks.length ? "Create Notebook" : "Create your first notebook"}</span>
                            {!visibleNotebooks.length && (
                                <span className={`text-xs ${styles.tertiaryText}`}>
                                    Keep your notes organized by subject.
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </section>

            {modal && (
                <NotebookModal
                    key={`${modal.mode}-${modal.notebook?.id ?? "new"}`}
                    mode={modal.mode}
                    notebook={modal.notebook}
                    onClose={() => setModal(null)}
                    onSubmit={modal.mode === "edit" ? editNotebook : createNotebook}
                    onDelete={deleteNotebook}
                    busy={busy}
                    error={error}
                />
            )}
        </div>
    );
}
