import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker, useNavigate, useSearchParams } from "react-router-dom";
import {
    BookOpen,
    Bold,
    ChevronDown,
    ClipboardList,
    Eraser,
    Highlighter,
    Italic,
    List as ListIcon,
    ListOrdered,
    MoreHorizontal,
    BadgePlus,
    Search,
    Table2,
    Trash2,
    Underline,
    Download,
} from "lucide-react";
import Styling from "../../components/theme/Styling";
import { activityRequest } from "../../utils/learningActivity";
import { useDarkMode } from "../../components/theme/DarkModeContext";
import { useAuth } from "../../auth/AuthContext";
import NoteTableControls from "../../components/utils/notes/NoteTableControls";
import useDialogFocus from "../../components/utils/study tools/useDialogFocus";
import {
    clearListItemIndent,
    cleanEditorHtml,
    getActiveCell,
    getActiveListItem,
    indentBlock,
    indentListItem,
    outdentListItem,
    preserveEditorScroll,
    stripTableUi,
    syncListStyles,
    textFromHtml,
} from "../../components/utils/notes/noteEditorUtils";

const typingInputTypes = new Set([
    "insertText",
    "insertCompositionText",
    "insertParagraph",
    "insertLineBreak",
    "deleteContentBackward",
    "deleteContentForward",
]);

const textColorOptions = [
    { label: "Default", value: "#1f2937" },
    { label: "Red", value: "#dc2626" },
    { label: "Orange", value: "#ea580c" },
    { label: "Yellow", value: "#ca8a04" },
    { label: "Green", value: "#16a34a" },
    { label: "Teal", value: "#0d9488" },
    { label: "Blue", value: "#2563eb" },
    { label: "Purple", value: "#9333ea" },
    { label: "Pink", value: "#db2777" },
];

const isSimpleTable = (table) =>
    Array.from(table.rows).every((row) =>
        Array.from(row.cells).every((cell) => cell.colSpan === 1 && cell.rowSpan === 1)
    );

const getColumnCount = (table) => table.rows[0]?.cells.length ?? 0;

const getColGroup = (table) =>
    Array.from(table.children).find((child) => child.tagName === "COLGROUP") ?? null;

const getResizeBoundary = (table, clientX) => {
    const firstRow = table.rows[0];
    if (!firstRow) return -1;
    let closestIndex = -1;
    let closestDistance = 8.1;
    for (let index = 0; index < firstRow.cells.length - 1; index += 1) {
        const distance = Math.abs(firstRow.cells[index].getBoundingClientRect().right - clientX);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
        }
    }
    return closestIndex;
};

const syncColGroup = (table) => {
    if (!table.rows.length) return;
    const columnCount = Math.max(...Array.from(table.rows, (row) => row.cells.length));
    Array.from(table.rows).forEach((row) => {
        const cellTag = row.parentElement.tagName === "THEAD" ? "th" : "td";
        while (row.cells.length > columnCount) row.deleteCell(row.cells.length - 1);
        while (row.cells.length < columnCount) {
            const cell = document.createElement(cellTag);
            if (cellTag === "th") {
                cell.scope = "col";
                cell.textContent = `Header ${row.cells.length + 1}`;
                cell.style.backgroundColor = getTableHeaderColor(table);
            } else {
                cell.innerHTML = "<br>";
            }
            row.append(cell);
        }
    });

    const colGroups = Array.from(table.children).filter((child) => child.tagName === "COLGROUP");
    let colGroup = colGroups[0] ?? null;
    colGroups.slice(1).forEach((extraGroup) => extraGroup.remove());
    if (!colGroup) {
        colGroup = document.createElement("colgroup");
        const firstSection = Array.from(table.children).find((child) =>
            ["THEAD", "TBODY", "TFOOT"].includes(child.tagName)
        );
        table.insertBefore(colGroup, firstSection ?? null);
    }

    while (colGroup.children.length > columnCount) {
        colGroup.lastElementChild.remove();
    }
    while (colGroup.children.length < columnCount) {
        colGroup.append(document.createElement("col"));
    }

    const columns = Array.from(colGroup.children);
    const widths = columns.map((col) => Number.parseFloat(col.style.width) || 0);
    const defaultWidth = widths.reduce((sum, width) => sum + width, 0) /
        (widths.filter((width) => width > 0).length || 1) || 1;
    const normalizedWidths = widths.map((width) => width || defaultWidth);
    const totalWidth = normalizedWidths.reduce((sum, width) => sum + width, 0);
    columns.forEach((col, index) => {
        col.style.width = `${(normalizedWidths[index] / totalWidth) * 100}%`;
    });
};

const getTableHeaderColor = (table) => {
    const header = table.tHead?.rows[0]?.cells[0];
    return header?.style.backgroundColor || table.dataset.noteHeaderColor || "#dbeafe";
};

const colorToHex = (color) => {
    if (/^#[0-9a-f]{6}$/i.test(color)) return color;
    const values = color.match(/\d+/g);
    if (!values || values.length < 3) return "#dbeafe";
    return `#${values.slice(0, 3).map((value) =>
        Number(value).toString(16).padStart(2, "0")
    ).join("")}`;
};

const insertRow = (table, at) => {
    syncColGroup(table);
    const rows = Array.from(table.rows);
    const index = Math.max(0, Math.min(at, rows.length));
    const reference = rows[index] ?? null;
    const section = reference?.parentElement ?? table.tBodies[table.tBodies.length - 1] ?? table.createTBody();
    const localIndex = reference ? Array.from(section.rows).indexOf(reference) : section.rows.length;
    const row = section.insertRow(localIndex);
    const isHeader = section.tagName === "THEAD";

    for (let columnIndex = 0; columnIndex < getColumnCount(table); columnIndex += 1) {
        const cell = document.createElement(isHeader ? "th" : "td");
        if (isHeader) {
            cell.scope = "col";
            cell.textContent = `Header ${columnIndex + 1}`;
            cell.style.backgroundColor = getTableHeaderColor(table);
        } else {
            cell.innerHTML = "<br>";
        }
        row.append(cell);
    }
    return row;
};

const deleteRow = (table, at) => {
    const rows = Array.from(table.rows);
    if (rows.length <= 1 || at < 0 || at >= rows.length) return false;
    const section = rows[at].parentElement;
    rows[at].remove();
    if (section.tagName === "THEAD" && !section.rows.length) section.remove();
    syncColGroup(table);
    return true;
};

const insertColumn = (table, at) => {
    syncColGroup(table);
    const colGroup = getColGroup(table);
    const columnCount = colGroup.children.length;
    const index = Math.max(0, Math.min(at, columnCount));
    const col = document.createElement("col");
    colGroup.insertBefore(col, colGroup.children[index] ?? null);

    Array.from(table.rows).forEach((row) => {
        const isHeader = row.parentElement.tagName === "THEAD";
        const cell = document.createElement(isHeader ? "th" : "td");
        if (isHeader) {
            cell.scope = "col";
            cell.textContent = `Header ${index + 1}`;
            cell.style.backgroundColor = getTableHeaderColor(table);
        } else {
            cell.innerHTML = "<br>";
        }
        row.insertBefore(cell, row.cells[index] ?? null);
    });
    syncColGroup(table);
};

const deleteColumn = (table, at) => {
    syncColGroup(table);
    const colGroup = getColGroup(table);
    if (colGroup.children.length <= 1 || at < 0 || at >= colGroup.children.length) return false;
    colGroup.children[at].remove();
    Array.from(table.rows).forEach((row) => {
        if (row.cells[at]) row.deleteCell(at);
    });
    syncColGroup(table);
    return true;
};

const moveCell = (table, axis, index, direction) => {
    syncColGroup(table);
    if (axis === "row") {
        const rows = Array.from(table.rows);
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= rows.length) return false;
        const row = rows[index];
        const target = rows[targetIndex];
        if (row.parentElement !== target.parentElement) return false;
        row.parentElement.insertBefore(row, direction < 0 ? target : target.nextSibling);
        return true;
    }

    const colGroup = getColGroup(table);
    const cols = Array.from(colGroup?.children ?? []);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= cols.length) return false;
    const col = cols[index];
    const target = cols[targetIndex];
    colGroup.insertBefore(col, direction < 0 ? target : target.nextSibling);
    Array.from(table.rows).forEach((row) => {
        const cell = row.cells[index];
        const targetCell = row.cells[targetIndex];
        row.insertBefore(cell, direction < 0 ? targetCell : targetCell.nextSibling);
    });
    return true;
};

const canMoveCell = (table, axis, index, direction) => {
    if (axis === "row") {
        const rows = Array.from(table.rows);
        const target = rows[index + direction];
        return Boolean(target && rows[index]?.parentElement === target.parentElement);
    }
    return index + direction >= 0 && index + direction < getColumnCount(table);
};

const toggleHeaderRow = (table) => {
    const headerColor = getTableHeaderColor(table);
    table.dataset.noteHeaderColor = headerColor;
    if (table.tHead) {
        const head = table.tHead;
        let body = table.tBodies[0] ?? table.createTBody();
        Array.from(head.rows).reverse().forEach((row) => {
            Array.from(row.cells).forEach((cell) => {
                const td = document.createElement("td");
                td.innerHTML = cell.innerHTML;
                td.style.cssText = cell.style.cssText;
                cell.replaceWith(td);
            });
            body.insertBefore(row, body.firstChild);
        });
        head.remove();
        return false;
    }

    const body = table.tBodies[0];
    if (!body?.rows.length) return false;
    const head = table.createTHead();
    const row = body.rows[0];
    Array.from(row.cells).forEach((cell, index) => {
        const th = document.createElement("th");
        th.scope = "col";
        th.innerHTML = cell.innerHTML;
        th.style.cssText = cell.style.cssText;
        if (!th.textContent.trim()) th.textContent = `Header ${index + 1}`;
        if (!th.style.backgroundColor) th.style.backgroundColor = headerColor;
        cell.replaceWith(th);
    });
    head.append(row);
    return true;
};

const ensureTableControls = (wrapper) => {
    const table = wrapper.querySelector("table");
    if (!table || !isSimpleTable(table)) return;
    if (!table.rows.length) {
        const row = table.createTBody().insertRow();
        const columnCount = Math.max(getColGroup(table)?.children.length ?? 0, 1);
        for (let index = 0; index < columnCount; index += 1) {
            row.insertCell().innerHTML = "<br>";
        }
    }
    syncColGroup(table);
    wrapper.querySelectorAll(
        ".note-table-actions, .note-table-row-handle, .note-table-column-handle, .note-table-resizer"
    )
        .forEach((node) => node.remove());

    Array.from(table.rows).forEach((row) => {
        const firstCell = row.cells[0];
        if (!firstCell) return;
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "note-table-row-handle";
        handle.dataset.noteTableHandle = "row";
        handle.setAttribute("contenteditable", "false");
        handle.setAttribute("aria-label", `Row ${row.rowIndex + 1} options`);
        handle.title = `Row ${row.rowIndex + 1} options`;
        firstCell.append(handle);
    });

    const firstRow = table.rows[0];
    Array.from(firstRow.cells).forEach((cell, index) => {
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "note-table-column-handle";
        handle.dataset.noteTableHandle = "column";
        handle.setAttribute("contenteditable", "false");
        handle.setAttribute("aria-label", `Column ${index + 1} options`);
        handle.title = `Column ${index + 1} options`;
        cell.append(handle);
    });

    const actions = document.createElement("div");
    actions.className = "note-table-actions";
    actions.setAttribute("contenteditable", "false");
    actions.setAttribute("role", "toolbar");
    actions.setAttribute("aria-label", "Table row and column actions");
    [
        ["row", "Add row"],
        ["column", "Add column"],
    ].forEach(([action, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.noteTableAction = action;
        button.setAttribute("aria-label", label);
        button.title = label;
        actions.append(button);
    });
    wrapper.append(actions);
};

const enhanceTables = (editor) => {
    stripTableUi(editor);
    syncListStyles(editor);
    editor.querySelectorAll("table").forEach((table) => {
        let wrapper = table.closest(".note-table-scroll");
        if (!wrapper || wrapper.querySelector("table") !== table) {
            wrapper = document.createElement("div");
            wrapper.className = "note-table-scroll";
            table.parentNode.insertBefore(wrapper, table);
            wrapper.append(table);
        }
        if (isSimpleTable(table)) {
            ensureTableControls(wrapper);
        } else {
            wrapper.querySelectorAll(
                ".note-table-actions, .note-table-row-handle, .note-table-column-handle, .note-table-resizer"
            ).forEach((node) => node.remove());
        }
    });
};

function NotesPageSkeleton({ styles }) {
    const bar = "animate-pulse rounded-md bg-gray-500/15";
    const toolbarButton = "h-8 w-8 animate-pulse rounded-md bg-gray-500/15";

    return (
        <div
            role="status"
            aria-label="Loading notes"
            aria-busy="true"
            className={`mx-auto flex min-h-[calc(100dvh-120px)] w-full max-w-7xl overflow-hidden rounded-xl border md:h-[calc(100dvh-140px)] md:min-h-[520px] ${styles.border} ${styles.secondaryBg}`}
        >
            <span className="sr-only">Loading notes…</span>
            <div className="grid min-h-[calc(100dvh-120px)] flex-1 grid-rows-1 md:h-full md:min-h-0 md:grid-cols-[280px_minmax(0,1fr)]">
                <aside aria-hidden="true" className={`hidden min-h-0 flex-col border-r md:flex ${styles.border}`}>
                    <div className="flex items-center justify-between px-4 py-4">
                        <div className="space-y-2">
                            <div className={`${bar} h-5 w-28`} />
                            <div className={`${bar} h-3 w-14`} />
                        </div>
                        <div className={`${bar} h-9 w-9 rounded-full`} />
                    </div>
                    <div className="px-4 pb-3">
                        <div className={`${bar} h-10 w-full rounded-lg`} />
                    </div>
                    <div className="space-y-2 px-2">
                        {[0, 1, 2].map((item) => (
                            <div key={item} className="space-y-2 rounded-lg px-3 py-3">
                                <div className={`${bar} h-4 w-3/4`} />
                                <div className={`${bar} h-3 w-full`} />
                            </div>
                        ))}
                    </div>
                </aside>

                <main aria-hidden="true" className="flex min-h-0 min-w-0 flex-col">
                    <header className={`flex flex-col gap-2 border-b px-3 py-2 sm:px-5 sm:py-3 md:flex-row md:items-center ${styles.border}`}>
                        <div className="flex items-center gap-2 md:hidden">
                            <div className={`${bar} h-9 flex-1 rounded-md`} />
                            <div className={`${bar} h-9 w-9 rounded-full`} />
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5 md:flex-1">
                            <div className={`${bar} h-9 w-24 rounded-md`} />
                            <div className={`${bar} h-8 w-12 rounded-md`} />
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
                                <div key={item} className={toolbarButton} />
                            ))}
                        </div>
                    </header>

                    <section className="modal-scroll flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-5 sm:px-8 sm:py-7 lg:px-10">
                        <div className={`${bar} h-9 w-3/4 max-w-2xl sm:h-10`} />
                        <div className={`mt-4 h-px w-full ${styles.border} border-t`} />
                        <div className="mt-5 space-y-3">
                            <div className={`${bar} h-4 w-full`} />
                            <div className={`${bar} h-4 w-11/12`} />
                            <div className={`${bar} h-4 w-4/5`} />
                        </div>
                        <div className={`${bar} mt-7 h-6 w-48`} />
                        <div className="mt-4 space-y-3 pl-4 sm:pl-6">
                            {["w-full", "w-11/12", "w-4/5"].map((width, item) => (
                                <div key={item} className="flex items-center gap-3">
                                    <div className={`${bar} h-2 w-2 shrink-0 rounded-full`} />
                                    <div className={`${bar} h-4 ${width}`} />
                                </div>
                            ))}
                        </div>
                        <div className={`${bar} mt-7 h-6 w-56`} />
                        <div className="mt-4 space-y-3">
                            {["w-full", "w-10/12", "w-3/4", "w-11/12", "w-2/3"].map((width, item) => (
                                <div key={item} className={`${bar} h-4 ${width}`} />
                            ))}
                        </div>
                    </section>

                    <footer className={`flex shrink-0 justify-end gap-2 border-t px-3 py-2 sm:px-5 ${styles.border}`}>
                        <div className={`${bar} h-8 w-32 rounded-lg`} />
                        <div className={`${bar} h-8 w-32 rounded-lg`} />
                    </footer>
                </main>
            </div>
        </div>
    );
}

export default function NotesPage() {
    const styles = Styling();
    const { darkMode } = useDarkMode();
    const { apiRequest } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const notebookId = searchParams.get("notebookId");
    const editorRef = useRef(null);
    const menuRef = useRef(null);
    const textColorMenuRef = useRef(null);
    const tableToolbarRef = useRef(null);
    const tableHandleMenuRef = useRef(null);
    const activeTableRef = useRef(null);
    const editorSelectionRef = useRef(null);
    const editorHistoryRef = useRef({});
    const saveTimersRef = useRef(new Map());
    const noteVersionsRef = useRef(new Map());
    const persistedNotesRef = useRef(new Map());
    const unsavedNoteIdsRef = useRef(new Set());
    const hasUnsavedChangesRef = useRef(false);
    const pendingSaveCountRef = useRef(0);
    const saveQueueRef = useRef(Promise.resolve());
    const latestNotesRef = useRef([]);
    const navigationDialogRef = useRef(null);
    const [notes, setNotes] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [query, setQuery] = useState("");
    const [deleteId, setDeleteId] = useState(null);
    const [menuId, setMenuId] = useState(null);
    const [textColor, setTextColor] = useState("#1f2937");
    const [textColorOpen, setTextColorOpen] = useState(false);
    const [activeTable, setActiveTable] = useState(null);
    const [tableHandleMenu, setTableHandleMenu] = useState(null);
    const [loadedNotebookKey, setLoadedNotebookKey] = useState(undefined);
    const loading = loadedNotebookKey !== notebookId;
    const [saveError, setSaveError] = useState("");
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [savingNoteCount, setSavingNoteCount] = useState(0);
    const [savingBeforeNavigation, setSavingBeforeNavigation] = useState(false);
    const [navigationSaveError, setNavigationSaveError] = useState("");
    const [exportStatus, setExportStatus] = useState("");
    const [activityRetryNote, setActivityRetryNote] = useState(null);
    const blocker = useBlocker(({ currentLocation, nextLocation }) =>
        hasUnsavedChangesRef.current &&
        (
            currentLocation.pathname !== nextLocation.pathname ||
            currentLocation.search !== nextLocation.search ||
            currentLocation.hash !== nextLocation.hash
        )
    );

    const replaceNotes = useCallback((updater) => {
        setNotes((current) => {
            const next = typeof updater === "function" ? updater(current) : updater;
            latestNotesRef.current = next;
            return next;
        });
    }, []);

    const updateUnsavedState = useCallback((noteId, unsaved) => {
        if (unsaved) unsavedNoteIdsRef.current.add(noteId);
        else unsavedNoteIdsRef.current.delete(noteId);
        const hasChanges = unsavedNoteIdsRef.current.size > 0;
        hasUnsavedChangesRef.current = hasChanges;
        setHasUnsavedChanges(hasChanges);
    }, []);

    useEffect(() => {
        let active = true;
        let redirected = false;
        let minimumTimer = null;
        let finishMinimumWait = null;
        const startedAt = window.performance.now();
        const loadNotes = async () => {
            try {
                if (!notebookId) {
                    const { notebooks } = await apiRequest("/notebooks");
                    if (!active) return;
                    if (notebooks.length) {
                        redirected = true;
                        setSearchParams({ notebookId: notebooks[0].id }, { replace: true });
                        return;
                    }
                    replaceNotes([]);
                    persistedNotesRef.current.clear();
                    noteVersionsRef.current.clear();
                    unsavedNoteIdsRef.current.clear();
                    hasUnsavedChangesRef.current = false;
                    setHasUnsavedChanges(false);
                    return;
                }
                const { notes: loadedNotes } = await apiRequest(
                    `/notes?notebookId=${encodeURIComponent(notebookId)}`
                );
                if (!active) return;
                latestNotesRef.current = loadedNotes;
                noteVersionsRef.current = new Map(loadedNotes.map((note) => [note.id, 0]));
                persistedNotesRef.current = new Map(
                    loadedNotes.map((note) => [note.id, { ...note }])
                );
                unsavedNoteIdsRef.current.clear();
                hasUnsavedChangesRef.current = false;
                setHasUnsavedChanges(false);
                setNotes(loadedNotes);
                setActiveId(loadedNotes[0]?.id ?? null);
            } catch (error) {
                if (active) setSaveError(error.message);
            } finally {
                if (active && !redirected) {
                    const remaining = Math.max(0, 2000 - (window.performance.now() - startedAt));
                    if (remaining > 0) {
                        await new Promise((resolve) => {
                            finishMinimumWait = resolve;
                            minimumTimer = window.setTimeout(resolve, remaining);
                        });
                    }
                    if (active) setLoadedNotebookKey(notebookId);
                }
            }
        };
        loadNotes();
        return () => {
            active = false;
            if (minimumTimer) window.clearTimeout(minimumTimer);
            finishMinimumWait?.();
        };
    }, [apiRequest, notebookId, replaceNotes, setSearchParams]);

    useEffect(() => {
        const warnBeforeUnload = (event) => {
            if (!hasUnsavedChangesRef.current) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warnBeforeUnload);
        return () => window.removeEventListener("beforeunload", warnBeforeUnload);
    }, []);

    useEffect(() => {
        if (blocker.state !== "blocked") return;
        unsavedNoteIdsRef.current.forEach((noteId) => {
            const timer = saveTimersRef.current.get(noteId);
            if (timer) window.clearTimeout(timer);
            saveTimersRef.current.delete(noteId);
        });
    }, [blocker.state]);

    useEffect(() => {
        if (blocker.state === "blocked" && !hasUnsavedChanges && !savingBeforeNavigation) {
            blocker.proceed();
        }
    }, [blocker, hasUnsavedChanges, savingBeforeNavigation]);

    useEffect(() => {
        if (menuId === null) return undefined;
        const closeMenu = (event) => {
            if (!menuRef.current?.contains(event.target)) setMenuId(null);
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setMenuId(null);
        };
        document.addEventListener("pointerdown", closeMenu);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeMenu);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [menuId]);

    useEffect(() => {
        if (!textColorOpen) return undefined;
        const closeOnOutsideClick = (event) => {
            if (!textColorMenuRef.current?.contains(event.target)) setTextColorOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setTextColorOpen(false);
        };
        document.addEventListener("pointerdown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [textColorOpen]);

    const visibleNotes = notes.filter((note) =>
        `${note.title} ${textFromHtml(note.content)}`.toLowerCase().includes(query.toLowerCase())
    );
    const activeNote = notes.find((note) => note.id === activeId) ?? null;

    const persistNote = useCallback((note) => {
        if (!note?.id || !notebookId) return Promise.resolve(false);
        const version = noteVersionsRef.current.get(note.id) ?? 0;
        const saveRequest = saveQueueRef.current.catch(() => false).then(async () => {
            if (noteVersionsRef.current.get(note.id) !== version) return false;
            try {
                const response = await apiRequest(`/notes/${encodeURIComponent(note.id)}`, {
                    method: "PATCH",
                    body: JSON.stringify({ title: note.title, content: note.content }),
                });
                const savedNote = { ...note, ...response.note };
                persistedNotesRef.current.set(note.id, savedNote);
                if (noteVersionsRef.current.get(note.id) === version) {
                    replaceNotes((current) => current.map((item) =>
                        item.id === note.id ? savedNote : item
                    ));
                    updateUnsavedState(note.id, false);
                    setSaveError("");
                }
                return noteVersionsRef.current.get(note.id) === version;
            } catch (error) {
                setSaveError(error.message);
                return false;
            }
        });
        saveQueueRef.current = saveRequest;
        pendingSaveCountRef.current += 1;
        setSavingNoteCount(pendingSaveCountRef.current);
        return saveRequest.finally(() => {
            pendingSaveCountRef.current -= 1;
            setSavingNoteCount(pendingSaveCountRef.current);
        });
    }, [apiRequest, notebookId, replaceNotes, updateUnsavedState]);

    const queueNoteSave = useCallback((note, version) => {
        const existingTimer = saveTimersRef.current.get(note.id);
        if (existingTimer) window.clearTimeout(existingTimer);
        const timer = window.setTimeout(() => {
            saveTimersRef.current.delete(note.id);
            if (noteVersionsRef.current.get(note.id) === version) persistNote(note);
        }, 600);
        saveTimersRef.current.set(note.id, timer);
    }, [persistNote]);

    const flushNoteSave = useCallback((note) => {
        if (!note?.id) return;
        const timer = saveTimersRef.current.get(note.id);
        if (timer) window.clearTimeout(timer);
        saveTimersRef.current.delete(note.id);
        return persistNote(note);
    }, [persistNote]);

    const stayOnPage = () => {
        blocker.reset();
        setNavigationSaveError("");
        unsavedNoteIdsRef.current.forEach((noteId) => {
            const note = latestNotesRef.current.find((item) => item.id === noteId);
            if (note) queueNoteSave(note, noteVersionsRef.current.get(noteId) ?? 0);
        });
    };

    const discardAndProceed = () => {
        if (pendingSaveCountRef.current > 0) return;
        const dirtyIds = new Set(unsavedNoteIdsRef.current);
        dirtyIds.forEach((noteId) => {
            const timer = saveTimersRef.current.get(noteId);
            if (timer) window.clearTimeout(timer);
            saveTimersRef.current.delete(noteId);
            noteVersionsRef.current.set(noteId, (noteVersionsRef.current.get(noteId) ?? 0) + 1);
        });
        const revertedNotes = latestNotesRef.current.map((note) => {
            if (!dirtyIds.has(note.id)) return note;
            const savedNote = persistedNotesRef.current.get(note.id);
            if (!savedNote) return note;
            editorHistoryRef.current[note.id] = {
                stack: [savedNote.content],
                index: 0,
                lastInputAt: 0,
            };
            return { ...savedNote };
        });
        unsavedNoteIdsRef.current.clear();
        hasUnsavedChangesRef.current = false;
        setHasUnsavedChanges(false);
        setSaveError("");
        setNavigationSaveError("");
        replaceNotes(revertedNotes);
        blocker.proceed();
    };

    const saveAndProceed = async () => {
        setSavingBeforeNavigation(true);
        setNavigationSaveError("");
        try {
            const dirtyIds = Array.from(unsavedNoteIdsRef.current);
            for (const noteId of dirtyIds) {
                const timer = saveTimersRef.current.get(noteId);
                if (timer) window.clearTimeout(timer);
                saveTimersRef.current.delete(noteId);
                const note = latestNotesRef.current.find((item) => item.id === noteId);
                if (!note || !(await persistNote(note))) {
                    setNavigationSaveError("Your changes could not be saved. Please try again or leave without saving.");
                    return;
                }
            }
            if (unsavedNoteIdsRef.current.size > 0) {
                setNavigationSaveError("Some changes are still unsaved. Please try again.");
                return;
            }
            blocker.proceed();
        } finally {
            setSavingBeforeNavigation(false);
        }
    };

    useDialogFocus(
        navigationDialogRef,
        stayOnPage,
        savingBeforeNavigation,
        blocker.state === "blocked" && hasUnsavedChanges
    );

    useEffect(() => {
        if (
            editorRef.current &&
            activeNote &&
            document.activeElement !== editorRef.current
        ) {
            activeTableRef.current = null;
            setActiveTable(null);
            setTableHandleMenu(null);
            editorRef.current.innerHTML = activeNote.content;
            enhanceTables(editorRef.current);
        }
    }, [activeId, activeNote]);

    const updateActiveNote = (changes) => {
        if (!activeId) return;
        let changedNote = null;
        const version = (noteVersionsRef.current.get(activeId) ?? 0) + 1;
        noteVersionsRef.current.set(activeId, version);
        updateUnsavedState(activeId, true);
        replaceNotes((current) => current.map((note) => {
            if (note.id !== activeId) return note;
            changedNote = { ...note, ...changes, updatedAt: new Date().toISOString() };
            return changedNote;
        }));
        if (changedNote) queueNoteSave(changedNote, version);
    };

    const recordEditorChange = (content, coalesceTyping = false) => {
        if (!activeNote) return;
        const histories = editorHistoryRef.current;
        const history = histories[activeId] ?? {
            stack: [activeNote.content],
            index: 0,
            lastInputAt: 0,
        };
        histories[activeId] = history;
        if (history.stack[history.index] === content) return;

        const now = window.performance.now();
        if (coalesceTyping && history.lastInputAt && now - history.lastInputAt < 750) {
            history.stack[history.index] = content;
        } else {
            history.stack = history.stack.slice(0, history.index + 1);
            history.stack.push(content);
            history.index += 1;
            if (history.stack.length > 100) {
                history.stack.shift();
                history.index -= 1;
            }
        }
        history.lastInputAt = coalesceTyping ? now : 0;
    };

    const saveEditorChange = (content, coalesceTyping = false) => {
        const savedContent = cleanEditorHtml(content);
        recordEditorChange(savedContent, coalesceTyping);
        updateActiveNote({ content: savedContent });
    };

    const restoreEditorHistory = (redo) => {
        const editor = editorRef.current;
        const history = editorHistoryRef.current[activeId];
        if (!editor || !history) return;

        if (redo && history.index < history.stack.length - 1) history.index += 1;
        else if (!redo && history.index > 0) history.index -= 1;
        else return;

        const content = cleanEditorHtml(history.stack[history.index]);
        history.stack[history.index] = content;
        editor.innerHTML = content;
        enhanceTables(editor);
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        history.lastInputAt = 0;
        updateActiveNote({ content });
    };

    const createNote = async () => {
        if (!notebookId) {
            navigate("/home");
            return;
        }
        if (loading) return;
        setSaveError("");
        try {
            const { note } = await apiRequest("/notes", {
                method: "POST",
                body: JSON.stringify({ notebookId, title: "Untitled note", content: "" }),
            });
            editorHistoryRef.current[note.id] = { stack: [""], index: 0, lastInputAt: 0 };
            noteVersionsRef.current.set(note.id, 0);
            persistedNotesRef.current.set(note.id, { ...note });
            replaceNotes((current) => [note, ...current]);
            setActiveId(note.id);
            setQuery("");
            setActivityRetryNote(note);
            await apiRequest("/learning-activity", activityRequest("note-created", note.id, `note:${note.id}`));
            setActivityRetryNote(null);
            window.requestAnimationFrame(() => editorRef.current?.focus());
        } catch (error) {
            setSaveError(error.message);
        }
    };

    const exportNote = async (format) => {
        if (!activeNote) return;
        const printWindow = format === "pdf" ? window.open("", "_blank") : null;
        if (format === "pdf" && !printWindow) { setExportStatus("Allow pop-ups to print this note or save it as PDF."); return; }
        setExportStatus("Preparing export…");
        try {
            if (unsavedNoteIdsRef.current.has(activeNote.id) || saveTimersRef.current.has(activeNote.id)) {
                const saved = await flushNoteSave(activeNote);
                if (!saved || unsavedNoteIdsRef.current.has(activeNote.id)) throw new Error("Save this note successfully before exporting.");
            }
            const note = persistedNotesRef.current.get(activeNote.id);
            if (!note) throw new Error("Saved note content is not available yet.");
            const doc = new DOMParser().parseFromString(note.content || "", "text/html");
            doc.querySelectorAll("script,style,iframe,object,embed,form,button,svg,math,link,meta,.note-table-actions,.note-table-row-handle,.note-table-column-handle,.note-table-resizer").forEach((node) => node.remove());
            doc.querySelectorAll("*").forEach((node) => {
                [...node.attributes].forEach((attribute) => {
                    if (attribute.name.toLowerCase().startsWith("on") || ["contenteditable", "class", "id", "style"].includes(attribute.name.toLowerCase())) node.removeAttribute(attribute.name);
                    else if (["href", "src"].includes(attribute.name.toLowerCase()) && !/^(https?:|mailto:|tel:|\/|#)/i.test(attribute.value.trim())) node.removeAttribute(attribute.name);
                });
            });
            const safeTitle = (note.title || "Untitled note").replace(/[\\/:*?"<>|]/g, "-").trim() || "Untitled note";
            if (format === "pdf") {
                printWindow.document.write(`<!doctype html><html><head><title>${safeTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title><style>body{font:11pt Arial,sans-serif;max-width:760px;margin:40px auto;line-height:1.6;color:#111}h1,h2,h3{font-family:Georgia,serif}table{border-collapse:collapse;width:100%}td,th{border:1px solid #888;padding:6px}img{max-width:100%} @media print{body{margin:18mm;max-width:none}}</style></head><body><h1>${safeTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</h1>${doc.body.innerHTML}</body></html>`);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
                setExportStatus("In the print dialog, choose Save as PDF to download a PDF.");
            } else {
                const { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import("docx");
                const inline = (node, inherited = {}) => [...node.childNodes].flatMap((child) => {
                    if (child.nodeType === Node.TEXT_NODE) return [new TextRun({ text: child.textContent || "", ...inherited })];
                    if (child.nodeType !== Node.ELEMENT_NODE) return [];
                    const tag = child.tagName.toLowerCase();
                    return inline(child, { ...inherited, bold: inherited.bold || ["b", "strong"].includes(tag), italics: inherited.italics || ["i", "em"].includes(tag), underline: inherited.underline || tag === "u" });
                });
                const blocks = [];
                [...doc.body.children].forEach((node) => {
                    const tag = node.tagName.toLowerCase();
                    const tableNode = tag === "table" ? node : node.querySelector("table");
                    if (tableNode) {
                        const rows = [...tableNode.rows].map((row) => new TableRow({ children: [...row.cells].map((cell) => new TableCell({ children: [new Paragraph({ children: inline(cell) })] })) }));
                        if (rows.length) blocks.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
                    } else if (["ul", "ol"].includes(tag)) [...node.children].forEach((li, index) => blocks.push(new Paragraph({ children: [new TextRun(`${tag === "ul" ? "•" : `${index + 1}.`} `), ...inline(li)] })));
                    else blocks.push(new Paragraph({ heading: ({ h1: HeadingLevel.HEADING_1, h2: HeadingLevel.HEADING_2, h3: HeadingLevel.HEADING_3 })[tag], children: inline(node) }));
                });
                const blob = await Packer.toBlob(new Document({ sections: [{ children: [new Paragraph({ text: note.title || "Untitled note", heading: HeadingLevel.TITLE }), ...blocks] }] }));
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${safeTitle}.docx`; anchor.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                setExportStatus("Word document downloaded.");
            }
        } catch (error) { printWindow?.close(); setExportStatus(error.message); }
    };

    const deleteNote = async () => {
        if (!deleteId) return;
        setSaveError("");
        try {
            await apiRequest(`/notes/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
            const timer = saveTimersRef.current.get(deleteId);
            if (timer) window.clearTimeout(timer);
            saveTimersRef.current.delete(deleteId);
            const remaining = latestNotesRef.current.filter((note) => note.id !== deleteId);
            replaceNotes(remaining);
            noteVersionsRef.current.delete(deleteId);
            persistedNotesRef.current.delete(deleteId);
            updateUnsavedState(deleteId, false);
            delete editorHistoryRef.current[deleteId];
            if (activeId === deleteId) setActiveId(remaining[0]?.id ?? null);
            setDeleteId(null);
        } catch (error) {
            setSaveError(error.message);
        }
    };

    const applyFormat = (command, value = null) => {
        const editor = editorRef.current;
        if (!editor || !activeNote) return;
        editor.focus();
        document.execCommand(command, false, value);
        syncListStyles(editor);
        saveEditorChange(editor.innerHTML);
    };

    const rememberEditorSelection = () => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
            editorSelectionRef.current = range.cloneRange();
        }
    };

    const applyTextColor = (color) => {
        const editor = editorRef.current;
        const range = editorSelectionRef.current;
        if (!editor || !activeNote || !range || range.collapsed ||
            !editor.contains(range.commonAncestorContainer)) return;

        setTextColor(color);
        setTextColorOpen(false);
        editor.focus();
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand("foreColor", false, color);
        saveEditorChange(editor.innerHTML);
        rememberEditorSelection();
    };

    const clearActiveTable = useCallback(() => {
        editorRef.current?.querySelectorAll(
            ".note-table-active-cell, .note-table-active-row, .note-table-active-column, .note-table-selected"
        ).forEach((cell) => {
            cell.classList.remove(
                "note-table-active-cell",
                "note-table-active-row",
                "note-table-active-column",
                "note-table-selected"
            );
        });
        activeTableRef.current = null;
        setActiveTable(null);
        setTableHandleMenu(null);
    }, []);

    const updateActiveTable = useCallback((cell, mode = "cell") => {
        const editor = editorRef.current;
        const table = cell?.closest("table");
        if (!editor || !cell || !table || !editor.contains(table) || !isSimpleTable(table)) {
            clearActiveTable();
            return;
        }

        editor.querySelectorAll(
            ".note-table-active-cell, .note-table-active-row, .note-table-active-column, .note-table-selected"
        ).forEach((node) => {
            node.classList.remove(
                "note-table-active-cell",
                "note-table-active-row",
                "note-table-active-column",
                "note-table-selected"
            );
        });

        const row = cell.parentElement;
        const columnIndex = cell.cellIndex;
        cell.classList.add("note-table-active-cell");
        table.closest(".note-table-scroll")?.classList.add("note-table-selected");
        if (mode !== "column") {
            Array.from(row.cells).forEach((rowCell) => rowCell.classList.add("note-table-active-row"));
        }
        if (mode !== "row") {
            Array.from(table.rows).forEach((tableRow) => {
                tableRow.cells[columnIndex]?.classList.add("note-table-active-column");
            });
        }

        const rect = cell.getBoundingClientRect();
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - 360));
        const top = rect.top >= 56 ? rect.top - 48 : rect.bottom + 8;
        const context = {
            cell,
            table,
            mode,
            rowIndex: Array.from(table.rows).indexOf(row),
            columnIndex,
            left,
            top,
            headerColor: colorToHex(getTableHeaderColor(table)),
            hasHeader: Boolean(table.tHead),
        };
        activeTableRef.current = context;
        setActiveTable(context);
    }, [clearActiveTable]);

    const updateActiveTableFromSelection = useCallback(() => {
        const editor = editorRef.current;
        const cell = editor ? getActiveCell(editor) : null;
        const activeElement = document.activeElement;
        if (tableToolbarRef.current?.contains(activeElement) ||
            tableHandleMenuRef.current?.contains(activeElement) ||
            activeElement?.closest?.("[data-note-table-handle]")) return;
        if (cell) updateActiveTable(cell);
        else clearActiveTable();
    }, [clearActiveTable, updateActiveTable]);

    const focusTableCell = (cell) => {
        const editor = editorRef.current;
        if (!editor || !cell?.isConnected) return;
        editor.focus({ preventScroll: true });
        const range = document.createRange();
        range.selectNodeContents(cell);
        const isPlaceholder = /^Header \d+$/.test(cell.textContent.trim());
        if (!isPlaceholder) range.collapse(cell.textContent.trim() ? false : true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        rememberEditorSelection();
        updateActiveTable(cell);
    };

    const finishTableMutation = (table, cell = null, restoreScroll = null) => {
        const editor = editorRef.current;
        if (!editor) return;
        if (table?.isConnected) syncColGroup(table);
        enhanceTables(editor);
        saveEditorChange(editor.innerHTML);
        setTableHandleMenu(null);
        if (cell?.isConnected) focusTableCell(cell);
        else updateActiveTableFromSelection();
        restoreScroll?.();
    };

    const insertTable = () => {
        const editor = editorRef.current;
        if (!editor || !activeNote) return;

        const restoreScroll = preserveEditorScroll(editor);
        editor.focus();
        const headers = Array.from(
            { length: 3 },
            (_, index) => `<th scope="col" style="background-color:#dbeafe">Header ${index + 1}</th>`
        ).join("");
        const bodyRows = Array.from(
            { length: 2 },
            () => `<tr>${"<td><br></td>".repeat(3)}</tr>`
        ).join("");
        const columns = '<col style="width:160px">'.repeat(3);
        const tableHtml = `<div class="note-table-scroll"><table><colgroup>${columns}</colgroup><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table></div><p><br></p>`;

        document.execCommand("insertHTML", false, tableHtml);
        enhanceTables(editor);
        saveEditorChange(editor.innerHTML);
        updateActiveTableFromSelection();
        restoreScroll();
    };

    const handleTableAction = (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const editor = editorRef.current;
        if (!target || !editor) return;

        const handle = target.closest("[data-note-table-handle]");
        if (handle) {
            event.preventDefault();
            const cell = handle.closest("td, th");
            const table = cell?.closest("table");
            if (!cell || !table || !isSimpleTable(table)) return;
            const axis = handle.dataset.noteTableHandle;
            updateActiveTable(cell, axis);
            const rect = handle.getBoundingClientRect();
            setTableHandleMenu({
                table,
                axis,
                index: axis === "row"
                    ? Array.from(table.rows).indexOf(cell.parentElement)
                    : cell.cellIndex,
                left: Math.max(8, Math.min(rect.left, window.innerWidth - 220)),
                top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 250)),
            });
            return;
        }

        const button = target.closest("[data-note-table-action]");
        const table = button?.closest(".note-table-scroll")?.querySelector("table");
        if (!button || !table || !isSimpleTable(table)) return;
        event.preventDefault();
        const restoreScroll = preserveEditorScroll(editor);

        let nextCell = null;
        if (button.dataset.noteTableAction === "row") {
            const row = insertRow(table, table.rows.length);
            nextCell = row.cells[0];
        } else if (button.dataset.noteTableAction === "column") {
            const index = getColumnCount(table);
            insertColumn(table, index);
            nextCell = table.rows[0]?.cells[index] ?? null;
        }
        finishTableMutation(table, nextCell, restoreScroll);
    };

    const getCurrentTableContext = () => {
        const context = activeTableRef.current;
        return context?.cell?.isConnected && context.table?.isConnected ? context : null;
    };

    const runContextTableAction = (action) => {
        const context = getCurrentTableContext();
        const editor = editorRef.current;
        if (!context || !editor) return;
        const { table, cell } = context;
        const restoreScroll = preserveEditorScroll(editor);
        const rowIndex = Array.from(table.rows).indexOf(cell.parentElement);
        const columnIndex = cell.cellIndex;
        let nextCell = cell;

        switch (action) {
            case "insert-row-above":
                nextCell = insertRow(table, rowIndex).cells[columnIndex];
                break;
            case "insert-row-below":
                nextCell = insertRow(table, rowIndex + 1).cells[columnIndex];
                break;
            case "insert-column-left":
                insertColumn(table, columnIndex);
                nextCell = table.rows[rowIndex].cells[columnIndex];
                break;
            case "insert-column-right":
                insertColumn(table, columnIndex + 1);
                nextCell = table.rows[rowIndex].cells[columnIndex + 1];
                break;
            case "delete-row": {
                if (!deleteRow(table, rowIndex)) return;
                const nextRow = table.rows[Math.min(rowIndex, table.rows.length - 1)];
                nextCell = nextRow?.cells[Math.min(columnIndex, nextRow.cells.length - 1)] ?? null;
                break;
            }
            case "delete-column": {
                if (!deleteColumn(table, columnIndex)) return;
                nextCell = table.rows[rowIndex]?.cells[
                    Math.min(columnIndex, table.rows[rowIndex].cells.length - 1)
                ] ?? null;
                break;
            }
            case "delete-table": {
                table.closest(".note-table-scroll")?.remove();
                saveEditorChange(editor.innerHTML);
                clearActiveTable();
                editor.focus({ preventScroll: true });
                restoreScroll();
                return;
            }
            case "toggle-header": {
                toggleHeaderRow(table);
                syncColGroup(table);
                nextCell = table.rows[Math.min(rowIndex, table.rows.length - 1)]
                    ?.cells[Math.min(columnIndex, getColumnCount(table) - 1)] ?? null;
                break;
            }
            case "fit-width": {
                table.style.width = "100%";
                table.style.minWidth = "0";
                break;
            }
            case "equal-columns": {
                const count = getColumnCount(table);
                table.style.width = "100%";
                table.style.minWidth = "0";
                Array.from(getColGroup(table)?.children ?? []).forEach((col) => {
                    col.style.width = `${100 / count}%`;
                });
                break;
            }
            default:
                return;
        }

        finishTableMutation(table, nextCell, restoreScroll);
    };

    const runHandleMenuAction = (action) => {
        const menu = tableHandleMenu;
        if (!menu?.table?.isConnected) return;
        const editor = editorRef.current;
        if (!editor) return;
        const restoreScroll = preserveEditorScroll(editor);
        const { table, axis, index } = menu;
        let nextCell = null;

        if (action === "insert-before" || action === "insert-after") {
            if (axis === "row") {
                const row = insertRow(table, index + (action === "insert-after" ? 1 : 0));
                nextCell = row.cells[0];
            } else {
                const targetIndex = index + (action === "insert-after" ? 1 : 0);
                insertColumn(table, targetIndex);
                nextCell = table.rows[0]?.cells[targetIndex] ?? null;
            }
        } else if (action === "delete") {
            const deleted = axis === "row"
                ? deleteRow(table, index)
                : deleteColumn(table, index);
            if (!deleted) return;
            if (axis === "row") {
                const row = table.rows[Math.min(index, table.rows.length - 1)];
                nextCell = row?.cells[0] ?? null;
            } else {
                nextCell = table.rows[0]?.cells[Math.min(index, getColumnCount(table) - 1)] ?? null;
            }
        } else if (action === "move-before" || action === "move-after") {
            const direction = action === "move-before" ? -1 : 1;
            if (!moveCell(table, axis, index, direction)) return;
            const nextIndex = index + direction;
            nextCell = axis === "row"
                ? table.rows[nextIndex]?.cells[0] ?? null
                : table.rows[0]?.cells[nextIndex] ?? null;
        } else if (action === "clear") {
            const cells = axis === "row"
                ? Array.from(table.rows[index]?.cells ?? [])
                : Array.from(table.rows).map((row) => row.cells[index]).filter(Boolean);
            cells.forEach((cell) => {
                cell.innerHTML = "<br>";
            });
            nextCell = cells[0] ?? null;
        }

        finishTableMutation(table, nextCell, restoreScroll);
    };

    const applyTableHeaderColor = (event) => {
        const context = getCurrentTableContext();
        const editor = editorRef.current;
        if (!context?.table.tHead || !editor) return;
        const restoreScroll = preserveEditorScroll(editor);
        const color = event.target.value;
        context.table.dataset.noteHeaderColor = color;
        Array.from(context.table.tHead.rows).forEach((row) => {
            Array.from(row.cells).forEach((header) => {
                header.style.backgroundColor = color;
            });
        });
        finishTableMutation(context.table, context.cell, restoreScroll);
    };

    const resizeTableColumn = (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target || target.closest("[data-note-table-handle], [data-note-table-action]")) return;
        const editor = editorRef.current;
        const table = target.closest("table");
        if (!editor || !table || !isSimpleTable(table)) return;

        const columns = Array.from(getColGroup(table)?.children ?? []);
        const columnIndex = getResizeBoundary(table, event.clientX);
        if (columnIndex < 0 || columnIndex >= columns.length - 1) return;

        event.preventDefault();
        const restoreScroll = preserveEditorScroll(editor);
        const initialWidths = columns.map((col) => col.getBoundingClientRect().width);
        const initialWidth = initialWidths[columnIndex];
        const initialNextWidth = initialWidths[columnIndex + 1];
        const startX = event.clientX;
        const minimumWidth = Math.min(72, initialWidth, initialNextWidth);
        table.classList.add("note-table-resizing");
        Array.from(table.rows).forEach((row) => {
            row.cells[columnIndex]?.classList.add("note-table-resize-boundary");
        });
        editor.style.cursor = "col-resize";

        const stopResizing = () => {
            document.removeEventListener("pointermove", resize);
            document.removeEventListener("pointerup", stopResizing);
            document.removeEventListener("pointercancel", stopResizing);
            table.classList.remove("note-table-resizing");
            table.querySelectorAll(".note-table-resize-boundary").forEach((cell) => {
                cell.classList.remove("note-table-resize-boundary");
            });
            editor.style.cursor = "";
            finishTableMutation(
                table,
                table.rows[0]?.cells[columnIndex] ?? null,
                restoreScroll
            );
        };
        const resize = (moveEvent) => {
            const delta = Math.max(
                minimumWidth - initialWidth,
                Math.min(initialNextWidth - minimumWidth, moveEvent.clientX - startX)
            );
            const widths = [...initialWidths];
            widths[columnIndex] = initialWidth + delta;
            widths[columnIndex + 1] = initialNextWidth - delta;
            const totalWidth = widths.reduce((sum, width) => sum + width, 0);
            columns.forEach((col, index) => {
                col.style.width = `${(widths[index] / totalWidth) * 100}%`;
            });
        };

        document.addEventListener("pointermove", resize);
        document.addEventListener("pointerup", stopResizing);
        document.addEventListener("pointercancel", stopResizing);
    };

    const updateTableResizeCursor = (event) => {
        const editor = editorRef.current;
        const target = event.target instanceof Element ? event.target : null;
        const table = target?.closest("table");
        if (target?.closest("[data-note-table-handle], [data-note-table-action]")) {
            if (editor) editor.style.cursor = "";
            return;
        }
        const nearDivider = table && isSimpleTable(table)
            ? getResizeBoundary(table, event.clientX) >= 0
            : false;
        if (editor) editor.style.cursor = nearDivider ? "col-resize" : "";
    };

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return undefined;
        const syncSelection = () => updateActiveTableFromSelection();
        const repositionToolbar = () => {
            const context = activeTableRef.current;
            if (context?.cell?.isConnected) updateActiveTable(context.cell, context.mode);
        };
        document.addEventListener("selectionchange", syncSelection);
        document.addEventListener("scroll", repositionToolbar, true);
        window.addEventListener("resize", repositionToolbar);
        editor.addEventListener("click", syncSelection);
        editor.addEventListener("keyup", syncSelection);
        editor.addEventListener("mouseup", syncSelection);
        return () => {
            document.removeEventListener("selectionchange", syncSelection);
            document.removeEventListener("scroll", repositionToolbar, true);
            window.removeEventListener("resize", repositionToolbar);
            editor.removeEventListener("click", syncSelection);
            editor.removeEventListener("keyup", syncSelection);
            editor.removeEventListener("mouseup", syncSelection);
        };
    }, [activeId, updateActiveTable, updateActiveTableFromSelection]);

    useEffect(() => {
        if (!tableHandleMenu) return undefined;
        const closeOnOutsideClick = (event) => {
            if (!tableHandleMenuRef.current?.contains(event.target)) setTableHandleMenu(null);
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setTableHandleMenu(null);
        };
        document.addEventListener("pointerdown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [tableHandleMenu]);

    const highlightSelection = () => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || selection.isCollapsed || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) return;

        const highlight = document.createElement("span");
        highlight.className = "note-highlight";
        highlight.append(range.extractContents());
        range.insertNode(highlight);

        const highlightedRange = document.createRange();
        highlightedRange.selectNodeContents(highlight);
        selection.removeAllRanges();
        selection.addRange(highlightedRange);
        saveEditorChange(editor.innerHTML);
    };

    const removeHighlightSelection = () => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || selection.isCollapsed || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) return;

        const fragment = range.extractContents();
        fragment.querySelectorAll(".note-highlight").forEach((highlight) => {
            highlight.classList.remove("note-highlight");
        });
        range.insertNode(fragment);
        selection.removeAllRanges();
        selection.addRange(range);
        saveEditorChange(editor.innerHTML);
    };

    const handleEditorKeyDown = (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
            event.preventDefault();
            restoreEditorHistory(event.shiftKey);
            clearActiveTable();
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
            event.preventDefault();
            restoreEditorHistory(true);
            clearActiveTable();
            return;
        }
        if (event.target instanceof Element &&
            event.target.closest("[data-note-table-handle], [data-note-table-action]")) return;
        const editor = editorRef.current;
        if (!editor) return;

        const cell = getActiveCell(editor);
        const table = cell?.closest("table");
        if (cell && table && isSimpleTable(table)) {
            const rows = Array.from(table.rows);
            const rowIndex = rows.indexOf(cell.parentElement);
            const columnIndex = cell.cellIndex;

            if (event.key === "Enter") {
                event.preventDefault();
                document.execCommand("insertLineBreak");
                saveEditorChange(editor.innerHTML);
                return;
            }

            if (event.key === "Tab") {
                event.preventDefault();
                const cells = rows.flatMap((row) => Array.from(row.cells));
                const currentIndex = cells.indexOf(cell);
                const nextCell = cells[currentIndex + (event.shiftKey ? -1 : 1)];
                if (nextCell) {
                    focusTableCell(nextCell);
                } else if (!event.shiftKey && currentIndex === cells.length - 1) {
                    const restoreScroll = preserveEditorScroll(editor);
                    const row = insertRow(table, table.rows.length);
                    enhanceTables(editor);
                    saveEditorChange(editor.innerHTML);
                    focusTableCell(row.cells[0]);
                    restoreScroll();
                }
                return;
            }

            if ((event.key === "ArrowUp" || event.key === "ArrowDown") &&
                window.getSelection()?.isCollapsed) {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                if (!cell.contains(range.startContainer)) return;
                const preceding = range.cloneRange();
                preceding.selectNodeContents(cell);
                preceding.setEnd(range.startContainer, range.startOffset);
                const offset = preceding.toString().length;
                const length = cell.textContent.length;
                const targetRow = event.key === "ArrowUp" && offset === 0
                    ? rows[rowIndex - 1]
                    : event.key === "ArrowDown" && offset >= length
                        ? rows[rowIndex + 1]
                        : null;
                if (targetRow?.cells[columnIndex]) {
                    event.preventDefault();
                    focusTableCell(targetRow.cells[columnIndex]);
                }
                return;
            }
        }

        if (event.key === "Enter") {
            const currentItem = getActiveListItem(editor);
            if (currentItem?.dataset.noteIndentLevel) {
                window.setTimeout(() => {
                    if (editor !== editorRef.current) return;
                    const nextItem = getActiveListItem(editor);
                    if (nextItem === currentItem ||
                        nextItem?.parentElement !== currentItem.parentElement ||
                        !nextItem.dataset.noteIndentLevel) return;
                    clearListItemIndent(nextItem);
                    syncListStyles(editor);
                    saveEditorChange(editor.innerHTML);
                }, 0);
            }
        }

        if (event.key !== "Tab") return;
        event.preventDefault();
        const listItem = getActiveListItem(editor);
        if (listItem) {
            const changed = event.shiftKey
                ? outdentListItem(listItem)
                : indentListItem(listItem);
            syncListStyles(editor);
            if (changed) saveEditorChange(editor.innerHTML);
            return;
        }
        if (indentBlock(editor, event.shiftKey)) saveEditorChange(editor.innerHTML);
    };

    const handleEditorPaste = () => {
        const editor = editorRef.current;
        if (!editor) return;
        window.setTimeout(() => {
            if (editor !== editorRef.current) return;
            enhanceTables(editor);
            saveEditorChange(editor.innerHTML);
        }, 0);
    };

    const handleEditorInput = (event) => {
        syncListStyles(event.currentTarget);
        if (event.nativeEvent.inputType === "insertFromPaste") {
            enhanceTables(event.currentTarget);
        }
        saveEditorChange(
            event.currentTarget.innerHTML,
            typingInputTypes.has(event.nativeEvent.inputType)
        );
    };

    if (loading) return <NotesPageSkeleton styles={styles} />;

    return (
        <div
            className={`mx-auto flex min-h-[calc(100dvh-120px)] w-full max-w-7xl overflow-hidden rounded-xl
            border md:h-[calc(100dvh-140px)] md:min-h-[520px] ${styles.border} ${styles.secondaryBg}`}
        >
            <div className="grid min-h-[calc(100dvh-120px)] flex-1 grid-rows-1 md:h-full md:min-h-0 md:grid-cols-[280px_minmax(0,1fr)]">
                <aside className={`hidden min-h-0 flex-col border-b md:flex md:max-h-none md:border-b-0 md:border-r ${styles.border}`}>
                    <div className="flex items-center justify-between px-4 py-4">
                        <div>
                            <h1 className={`max-w-[190px] truncate text-lg font-semibold ${styles.primaryText}`}>{notes[0]?.notebookTitle || "My Notes"}</h1>
                            <p className={`mt-0.5 text-xs ${styles.tertiaryText}`}>{notes.length} pages</p>
                        </div>
                        <button
                            type="button"
                            onClick={createNote}
                            aria-label="Create a new note"
                            className={`flex h-9 w-9 items-center justify-center rounded-full ${styles.buttonFrost}`}
                        >
                            <BadgePlus className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="px-4 pb-3">
                        <label className="relative block">
                            <Search className={`absolute left-3 top-2.5 h-4 w-4 ${styles.tertiaryText}`} />
                            <span className="sr-only">Search notes</span>
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search notes"
                                className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm ${styles.input} ${styles.border}`}
                            />
                        </label>
                    </div>

                    <nav className="modal-scroll min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3" aria-label="Notes">
                        {visibleNotes.map((note) => (
                            <div
                                key={note.id}
                                ref={menuId === note.id ? menuRef : null}
                                className="w-full rounded-lg"
                            >
                                <div className={`flex items-center rounded-lg ${
                                    activeId === note.id ? "bg-blue-600/10" : styles.secondaryBgHover
                                }`}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (activeNote?.id !== note.id) flushNoteSave(activeNote);
                                            setActiveId(note.id);
                                            setMenuId(null);
                                        }}
                                        className="min-w-0 flex-1 px-3 py-2.5 text-left md:py-3"
                                    >
                                        <span className={`block truncate text-sm font-semibold ${activeId === note.id ? styles.blueText : styles.primaryText}`}>
                                            {note.title || "Untitled note"}
                                        </span>
                                        <span className={`mt-1 block truncate text-xs ${styles.tertiaryText}`}>
                                            {textFromHtml(note.content) || "Empty page"}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMenuId((openId) => openId === note.id ? null : note.id)}
                                        aria-label={`More options for ${note.title || "Untitled note"}`}
                                        aria-haspopup="menu"
                                        aria-expanded={menuId === note.id}
                                        className={`mr-1 shrink-0 rounded-md p-2 ${styles.headerNavText} ${styles.secondaryBgHover}`}
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                </div>
                                {menuId === note.id && (
                                    <div role="menu" className={`mt-1 rounded-lg border  ${styles.border} ${styles.secondaryBg}`}>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setDeleteId(note.id);
                                                setMenuId(null);
                                            }}
                                            className={`flex w-full rounded-lg px-4 py-2 text-sm cursor-pointer ${styles.secondaryBgHover}`}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {visibleNotes.length === 0 && (
                            <p className={`px-3 py-8 text-center text-sm ${styles.tertiaryText}`}>No notes found</p>
                        )}
                    </nav>
                </aside>

                <main className="flex min-h-0 min-w-0 flex-col">
                    {saveError && (
                        <div role="alert" className="flex items-center justify-between gap-3 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">
                            <span>{saveError}</span>
                            {activeNote && <button type="button" onClick={() => flushNoteSave(activeNote)} className="shrink-0 font-semibold underline">Retry save</button>}
                        </div>
                    )}
                    {activityRetryNote && (
                        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">
                            <span>Note saved, but study activity could not be recorded.</span>
                            <button type="button" onClick={async () => { try { await apiRequest("/learning-activity", activityRequest("note-created", activityRetryNote.id, `note:${activityRetryNote.id}`)); setActivityRetryNote(null); } catch (error) { setSaveError(error.message); } }} className="font-semibold underline">Retry activity</button>
                        </div>
                    )}
                    {loading ? (
                        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">Loading notes…</div>
                    ) : activeNote ? (
                        <>
                            <header className={`flex flex-col gap-2 border-b px-3 py-2 sm:px-5 sm:py-3 md:flex-row md:items-center md:justify-between ${styles.border}`}>
                                <div className="flex items-center gap-2 md:hidden">
                                    <select
                                        value={activeNote.id}
                                        onChange={(event) => {
                                            flushNoteSave(activeNote);
                                            setActiveId(event.target.value);
                                        }}
                                        className={`min-w-0 flex-1 rounded-md border px-2 py-2 text-xs ${styles.input} ${styles.border}`}
                                        aria-label="Select note section"
                                    >
                                        {notes.map((note) => (
                                            <option key={note.id} value={note.id}>{note.title || "Untitled note"}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={createNote}
                                        aria-label="Create a new note"
                                        title="Create a new note"
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.buttonBlue}`}
                                    >
                                        <BadgePlus className="h-4 w-4" />
                                    </button>
                                </div>
                               
                                <div className="note-toolbar w-full min-w-0 md:flex-1">
                                    <div className="flex flex-wrap items-center justify-start gap-0.5 sm:gap-1">
                                    
                                    <select
                                        defaultValue="p"
                                        onChange={(event) => applyFormat("formatBlock", event.target.value)}
                                        aria-label="Text style"
                                        className={`mr-1 shrink-0 rounded-md border px-2 py-2 text-xs ${styles.input} ${styles.border}`}
                                    >
                                        <option value="p">Paragraph</option>
                                        <option value="h1">Heading 1</option>
                                        <option value="h2">Heading 2</option>
                                        <option value="h3">Heading 3</option>
                                    </select>
                                     <div className="relative shrink-0" ref={textColorMenuRef}>
                                        <button
                                            type="button"
                                            onMouseDown={(event) => {
                                                event.preventDefault();
                                                rememberEditorSelection();
                                            }}
                                            onClick={() => setTextColorOpen((open) => !open)}
                                            aria-label="Text color"
                                            aria-haspopup="menu"
                                            aria-expanded={textColorOpen}
                                            title="Text color"
                                            className={`flex h-8 items-center gap-1 rounded border px-1.5 ${styles.border} ${styles.headerNavText} ${styles.secondaryBgHover}`}
                                        >
                                            <span className="border-b-2 px-0.5 font-bold leading-5" style={{ borderColor: textColor }}>A</span>
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        </button>
                                        {textColorOpen && (
                                            <div role="menu" aria-label="Text colors" className={`absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border p-3 ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}>
                                                <div className="grid grid-cols-3 gap-1">
                                                    {textColorOptions.map((option) => (
                                                        <button
                                                            key={option.value}
                                                            type="button"
                                                            role="menuitem"
                                                            onMouseDown={(event) => {
                                                                event.preventDefault();
                                                                rememberEditorSelection();
                                                            }}
                                                            onClick={() => applyTextColor(option.value)}
                                                            aria-label={`${option.label} text`}
                                                            title={option.label}
                                                            className={`flex h-8 items-center gap-2 rounded px-2 text-xs ${styles.secondaryBgHover} ${styles.primaryText}`}
                                                        >
                                                            <span className="font-bold" style={{ color: option.value }}>A</span>
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <label className={`mt-2 flex items-center justify-between border-t pt-2 text-xs ${styles.border} ${styles.secondaryText}`}>
                                                    Custom color
                                                    <input
                                                        type="color"
                                                        value={textColor}
                                                        onPointerDown={rememberEditorSelection}
                                                        onChange={(event) => applyTextColor(event.target.value)}
                                                        aria-label="Custom text color"
                                                        className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("bold")} aria-label="Bold" title="Bold" className={`shrink-0 rounded p-2 ${styles.headerNavText} ${styles.secondaryBgHover}`}>
                                        <Bold className="h-4 w-4" />
                                    </button>
                                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("italic")} aria-label="Italic" title="Italic" className={`shrink-0 rounded p-2 ${styles.headerNavText} ${styles.secondaryBgHover}`}>
                                        <Italic className="h-4 w-4" />
                                    </button>
                                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("underline")} aria-label="Underline" title="Underline" className={`shrink-0 rounded p-2 ${styles.headerNavText} ${styles.secondaryBgHover}`}>
                                        <Underline className="h-4 w-4" />
                                    </button>
                                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={highlightSelection} aria-label="Highlight selected text" title="Highlight selected text" className={`shrink-0 rounded p-2 ${styles.headerNavText} ${styles.secondaryBgHover}`}>
                                        <Highlighter className="h-4 w-4" />
                                    </button>
                                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={removeHighlightSelection} aria-label="Remove highlight from selected text" title="Remove highlight" className={`shrink-0 rounded p-2 ${styles.headerNavText} ${styles.secondaryBgHover}`}>
                                        <Eraser className="h-4 w-4" />
                                    </button>
                                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("insertUnorderedList")} aria-label="Bulleted list" title="Bulleted list" className={`shrink-0 rounded p-2 ${styles.headerNavText} ${styles.secondaryBgHover}`}>
                                        <ListIcon className="h-4 w-4" />
                                    </button>
                                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyFormat("insertOrderedList")} aria-label="Numbered list" title="Numbered list" className={`shrink-0 rounded p-2 ${styles.headerNavText} ${styles.secondaryBgHover}`}>
                                        <ListOrdered className="h-4 w-4" />
                                    </button>
                                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={insertTable} aria-label="Insert table" title="Insert table" className={`shrink-0 rounded p-2 ${styles.headerNavText} ${styles.secondaryBgHover}`}>
                                        <Table2 className="h-4 w-4" />
                                    </button>

                                   
                                    <button type="button" onClick={() => exportNote("docx")} disabled={!activeNote || savingNoteCount > 0} aria-label="Download saved note as Word document" className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-2 text-xs font-medium ${styles.border} ${styles.secondaryBgHover} disabled:opacity-50`}><Download className="h-3.5 w-3.5" aria-hidden="true" />Word</button>
                                    <button type="button" onClick={() => exportNote("pdf")} disabled={!activeNote || savingNoteCount > 0} aria-label="Print note or save as PDF" className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-2 text-xs font-medium ${styles.border} ${styles.secondaryBgHover} disabled:opacity-50`}><Download className="h-3.5 w-3.5" aria-hidden="true" />Print / Save PDF</button>
                                    <span className={`mx-1 h-5 w-px shrink-0 ${styles.grayBg}`} />
                                    <button type="button" onClick={() => setDeleteId(activeNote.id)} aria-label={`Delete ${activeNote.title}`} title="Delete note" className="shrink-0 rounded p-2 text-gray-400 hover:bg-red-500/10 hover:text-red-500">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    </div>
                                    {exportStatus && <p role="status" className={`basis-full px-2 text-xs ${styles.secondaryText}`}>{exportStatus}</p>}
                                </div>
                            </header>

                            <div className="modal-scroll flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-6 sm:py-7 lg:px-10 lg:py-9">
                                <textarea
                                    rows={1}
                                    value={activeNote.title}
                                    ref={(element) => {
                                        if (!element) return;
                                        element.style.height = "auto";
                                        element.style.height = `${element.scrollHeight}px`;
                                    }}
                                    onChange={(event) => {
                                        event.currentTarget.style.height = "auto";
                                        event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                                        updateActiveNote({ title: event.target.value });
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") event.preventDefault();
                                    }}
                                    onFocus={() => {
                                        editorSelectionRef.current = null;
                                    }}
                                    placeholder="Untitled note"
                                    aria-label="Note title"
                                    className={`block w-full resize-none overflow-hidden whitespace-pre-wrap break-words border-b pb-4 ${styles.border} min-w-0 bg-transparent text-xl font-serif font-semibold outline-none sm:text-2xl lg:text-3xl ${styles.primaryText}`}
                                />
                                <div
                                    ref={editorRef}
                                    key={activeNote.id}
                                    contentEditable
                                    suppressContentEditableWarning
                                    onInput={handleEditorInput}
                                    onPaste={handleEditorPaste}
                                    onKeyDown={handleEditorKeyDown}
                                    onMouseUp={rememberEditorSelection}
                                    onKeyUp={rememberEditorSelection}
                                    onClick={handleTableAction}
                                    onPointerDown={resizeTableColumn}
                                    onPointerMove={updateTableResizeCursor}
                                    onPointerLeave={() => {
                                        if (editorRef.current) editorRef.current.style.cursor = "";
                                    }}
                                    data-placeholder="Start writing..."
                                    aria-label="Note content"
                                    className={`note-editor ${darkMode ? "note-editor-dark" : "note-editor-light"} mt-4 min-h-[12rem] w-full min-w-0 max-w-full flex-1 bg-transparent text-base leading-7 outline-none ${styles.primaryText}`}
                                />
                            </div>
                            <NoteTableControls
                                activeTable={activeTable}
                                tableHandleMenu={tableHandleMenu}
                                styles={styles}
                                tableToolbarRef={tableToolbarRef}
                                tableHandleMenuRef={tableHandleMenuRef}
                                onContextAction={runContextTableAction}
                                onHandleMenuAction={runHandleMenuAction}
                                onHeaderColor={applyTableHeaderColor}
                                onClearActiveTable={clearActiveTable}
                                canMoveCell={canMoveCell}
                                getColumnCount={getColumnCount}
                            />
                            <footer className={`flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-3 py-2 ${styles.border}`}>
                                <div className="flex w-full gap-2 sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/study-tools", { state: { tab: "mock-exams" } })}
                                        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg
                                                    px-3 py-2 text-sm font-semibold transition-colors active:scale-[0.98]
                                                    focus-visible:outline-2 focus-visible:outline-offset-2
                                                    focus-visible:outline-blue-500 sm:flex-none sm:px-4 ${styles.buttonFrost}`}
                                    >
                                        <ClipboardList className="h-4 w-4" />
                                        Mock Exam
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/study-tools", { state: { tab: "flashcards" } })}
                                        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2
                                             text-sm font-semibold transition-colors active:scale-[0.98] focus-visible:outline-2
                                             focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:flex-none sm:px-4
                                             ${styles.blueBg2} ${styles.blueBg2hover}  ${styles.blueBorder}`}
                                    >
                                        <BookOpen className="h-4 w-4" />
                                        Flashcards
                                    </button>
                                </div>
                            </footer>
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center">
                            <div>
                                <h2 className={`font-serif text-2xl font-semibold ${styles.primaryText}`}>
                                    Create your first note
                                </h2>
                                <p className={`mt-2 text-sm ${styles.secondaryText}`}>A blank page is ready when you are.</p>
                                <button type="button" onClick={createNote} className={`mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${styles.buttonFrost}`}>
                                    <BadgePlus className="h-4 w-4" />
                                    New note
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {blocker.state === "blocked" && hasUnsavedChanges && (
                <div className="modal-overlay" role="presentation">
                    <div
                        ref={navigationDialogRef}
                        tabIndex={-1}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="unsaved-note-title"
                        aria-describedby="unsaved-note-description"
                        className={`w-full max-w-md rounded-xl border p-5 ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
                    >
                        <h2 id="unsaved-note-title" className={`font-semibold ${styles.primaryText}`}>
                            Save your changes before leaving?
                        </h2>
                        <p id="unsaved-note-description" className={`mt-2 text-sm ${styles.secondaryText}`}>
                            This note has unsaved changes. You can save them before leaving or discard them.
                        </p>
                        {savingNoteCount > 0 && (
                            <p role="status" className={`mt-3 text-sm ${styles.secondaryText}`}>
                                A save is in progress. Please wait before discarding changes.
                            </p>
                        )}
                        {navigationSaveError && (
                            <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
                                {navigationSaveError}
                            </p>
                        )}
                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={stayOnPage}
                                className={`min-h-10 px-4 py-2 text-sm ${styles.buttonGray}`}
                            >
                                Stay on page
                            </button>
                            <button
                                type="button"
                                disabled={savingNoteCount > 0 || savingBeforeNavigation}
                                onClick={discardAndProceed}
                                className={`min-h-10 px-4 py-2 text-sm ${styles.buttonGray} disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                Leave without saving
                            </button>
                            <button
                                type="button"
                                disabled={savingNoteCount > 0 || savingBeforeNavigation}
                                onClick={saveAndProceed}
                                className={`min-h-10 px-4 py-2 text-sm ${styles.buttonBlue} disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                {savingBeforeNavigation ? "Saving..." : "Save and leave"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setDeleteId(null);
                }}>
                    <div role="dialog" aria-modal="true" aria-labelledby="delete-note-title" className={`w-full max-w-sm rounded-xl border p-5 ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}>
                        <h2 id="delete-note-title" className={`font-semibold ${styles.primaryText}`}>Delete this note?</h2>
                        <p className={`mt-2 text-sm ${styles.secondaryText}`}>This action cannot be undone.</p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setDeleteId(null)} className={`rounded-lg px-4 py-2 text-sm ${styles.buttonGray}`}>Cancel</button>
                            <button type="button" onClick={deleteNote} className={`rounded-lg px-4 py-2 text-sm ${styles.buttonRed}`}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
