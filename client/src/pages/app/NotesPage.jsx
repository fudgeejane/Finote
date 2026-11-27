import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useBlocker, useNavigate, useSearchParams } from "react-router-dom";
import { BadgePlus } from "lucide-react";
import Styling from "../../components/theme/Styling";
import { useDarkMode } from "../../components/theme/DarkModeContext";
import { useAuth } from "../../auth/AuthContext";
import NoteTableControls from "../../components/utils/notes/NoteTableControls";
import NotesSidebar from "../../components/utils/notes/NotesSidebar";
import NotesActionsFooter from "../../components/utils/notes/NotesActionsFooter";
import NotesPageSkeleton from "../../components/utils/notes/NotesPageSkeleton";
import NotesPageDialogs from "../../components/utils/notes/NotesPageDialogs";
import NotesDocumentEditor from "../../components/utils/notes/NotesDocumentEditor";
import NotebookHeader from "../../components/utils/notes/NotebookHeader";
import useDialogFocus from "../../components/utils/study tools/useDialogFocus";
import {
    clearListItemIndent,
    cleanEditorHtml,
    getSelectedListItems,
    getActiveCell,
    getActiveListItem,
    indentBlock,
    indentListItems,
    outdentListItems,
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

const formatPainterCursor = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="m14 6 4 4M3 21l5.2-1.1a2 2 0 0 0 1-.5L21 7.6a2 2 0 0 0-2.8-2.8L6.4 16.6a2 2 0 0 0-.5 1L5 23" fill="#f8fafc" stroke="#111827" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>')}") 3 20, copy`;

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

const compareNotesByCreatedAt = (left, right) => {
    const leftCreatedAt = Date.parse(left.createdAt ?? "");
    const rightCreatedAt = Date.parse(right.createdAt ?? "");
    const leftOrder = Number.isFinite(leftCreatedAt) ? leftCreatedAt : Number.POSITIVE_INFINITY;
    const rightOrder = Number.isFinite(rightCreatedAt) ? rightCreatedAt : Number.POSITIVE_INFINITY;
    return leftOrder - rightOrder;
};

const sanitizeFormattedHtml = (html) => {
    const parsed = new DOMParser().parseFromString(String(html || ""), "text/html");
    const allowed = new Set(["H1", "H2", "H3", "P", "BR", "STRONG", "B", "EM", "I", "U", "OL", "UL", "LI", "BLOCKQUOTE"]);
    const cleanNode = (node) => {
        Array.from(node.children).forEach(cleanNode);
        if (node !== parsed.body && !allowed.has(node.tagName)) {
            node.replaceWith(...Array.from(node.childNodes));
            return;
        }
        if (node !== parsed.body) Array.from(node.attributes).forEach((attribute) => node.removeAttribute(attribute.name));
    };
    cleanNode(parsed.body);
    return parsed.body.innerHTML;
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

export default function NotesPage() {
    const styles = Styling();
    const { darkMode } = useDarkMode();
    const { apiRequest } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const notebookId = searchParams.get("notebookId");
    const editorRef = useRef(null);
    const textColorMenuRef = useRef(null);
    const tableToolbarRef = useRef(null);
    const tableHandleMenuRef = useRef(null);
    const activeTableRef = useRef(null);
    const editorSelectionRef = useRef(null);
    const editorHistoryRef = useRef({});
    const noteVersionsRef = useRef(new Map());
    const persistedNotesRef = useRef(new Map());
    const unsavedNoteIdsRef = useRef(new Set());
    const hasUnsavedChangesRef = useRef(false);
    const confirmedNavigationRef = useRef(false);
    const pendingSaveCountRef = useRef(0);
    const pendingNoteSaveCountsRef = useRef(new Map());
    const saveQueueRef = useRef(Promise.resolve());
    const createNoteOperationRef = useRef("");
    const latestNotesRef = useRef([]);
    const navigationDialogRef = useRef(null);
    const savingBeforeNavigationRef = useRef(false);
    const [notes, setNotes] = useState([]);
    const [notebookName, setNotebookName] = useState("");
    const [activeId, setActiveId] = useState(null);
    const [query, setQuery] = useState("");
    const [deleteId, setDeleteId] = useState(null);
    const [mobileNotesOpen, setMobileNotesOpen] = useState(false);
    const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
    const [textColor, setTextColor] = useState("#1f2937");
    const [textColorOpen, setTextColorOpen] = useState(false);
    const [formatPainterActive, setFormatPainterActive] = useState(false);
    const formatPainterStyleRef = useRef(null);
    const [activeTable, setActiveTable] = useState(null);
    const [tableHandleMenu, setTableHandleMenu] = useState(null);
    const [loadedNotebookKey, setLoadedNotebookKey] = useState(undefined);
    const loading = loadedNotebookKey !== notebookId;
    const [saveError, setSaveError] = useState("");
    const latestSaveErrorRef = useRef("");
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [unsavedNoteIds, setUnsavedNoteIds] = useState(() => new Set());
    const [pendingNoteSaveIds, setPendingNoteSaveIds] = useState(() => new Set());
    const [savingNoteCount, setSavingNoteCount] = useState(0);
    const [savingBeforeNavigation, setSavingBeforeNavigation] = useState(false);
    const [navigationSaveError, setNavigationSaveError] = useState("");
    const [, setExportStatus] = useState("");
    const [formattingNote, setFormattingNote] = useState(false);
    const [formatStatus, setFormatStatus] = useState("");
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const exportMenuRef = useRef(null);
    const exportButtonRef = useRef(null);
    const blocker = useBlocker(({ currentLocation, nextLocation }) =>
        hasUnsavedChangesRef.current &&
        (
            currentLocation.pathname !== nextLocation.pathname ||
            currentLocation.search !== nextLocation.search ||
            currentLocation.hash !== nextLocation.hash
        )
    );

    const replaceNotes = useCallback((updater) => {
        const next = typeof updater === "function" ? updater(latestNotesRef.current) : updater;
        latestNotesRef.current = next;
        setNotes(next);
    }, []);

    const updateUnsavedState = useCallback((noteId, unsaved) => {
        if (unsaved) unsavedNoteIdsRef.current.add(noteId);
        else unsavedNoteIdsRef.current.delete(noteId);
        setUnsavedNoteIds((current) => {
            const next = new Set(current);
            if (unsaved) next.add(noteId);
            else next.delete(noteId);
            return next;
        });
        const hasChanges = unsavedNoteIdsRef.current.size > 0;
        hasUnsavedChangesRef.current = hasChanges;
        setHasUnsavedChanges(hasChanges);
    }, []);

    useEffect(() => {
        confirmedNavigationRef.current = false;
        let active = true;
        let redirected = false;
        let minimumTimer = null;
        let finishMinimumWait = null;
        const startedAt = window.performance.now();
        const loadNotes = async () => {
            setNotebookName("");
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
                    setUnsavedNoteIds(new Set());
                    hasUnsavedChangesRef.current = false;
                    setHasUnsavedChanges(false);
                    return;
                }
                const { notes: loadedNotes } = await apiRequest(
                    `/notes?notebookId=${encodeURIComponent(notebookId)}`
                );
                if (!active) return;
                let loadedNotebookName = loadedNotes[0]?.notebookTitle || "";
                if (!loadedNotebookName) {
                    const { notebook } = await apiRequest(
                        `/notebooks/${encodeURIComponent(notebookId)}`
                    );
                    loadedNotebookName = notebook.name;
                }
                if (!active) return;
                setNotebookName(loadedNotebookName);
                latestNotesRef.current = loadedNotes;
                noteVersionsRef.current = new Map(loadedNotes.map((note) => [note.id, 0]));
                persistedNotesRef.current = new Map(
                    loadedNotes.map((note) => [note.id, { ...note }])
                );
                unsavedNoteIdsRef.current.clear();
                setUnsavedNoteIds(new Set());
                hasUnsavedChangesRef.current = false;
                setHasUnsavedChanges(false);
                const orderedNotes = [...loadedNotes].sort(compareNotesByCreatedAt);
                setNotes(orderedNotes);
                setActiveId(orderedNotes[0]?.id ?? null);
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
            if (confirmedNavigationRef.current) return;
            if (!hasUnsavedChangesRef.current) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warnBeforeUnload);
        return () => window.removeEventListener("beforeunload", warnBeforeUnload);
    }, []);

    useEffect(() => {
        if (blocker.state === "blocked" && !hasUnsavedChanges && !savingBeforeNavigation) {
            blocker.proceed();
        }
    }, [blocker, blocker.state, hasUnsavedChanges, savingBeforeNavigation]);

    useEffect(() => {
        if (!mobileNotesOpen) return undefined;
        const drawer = document.querySelector(".notes-sidebar-drawer");
        const focusable = () => Array.from(drawer?.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex="0"]') ?? []);
        focusable()[0]?.focus();
        const handleKey = (event) => {
            if (event.key === "Escape") { setMobileNotesOpen(false); document.querySelector('[aria-label="Open notes list"]')?.focus(); }
            if (event.key !== "Tab") return;
            const items = focusable();
            if (!items.length) return;
            if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
            else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [mobileNotesOpen]);

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

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return undefined;
        if (formatPainterActive) {
            editor.dataset.formatPainter = "active";
            editor.style.cursor = formatPainterCursor;
        } else if (editor.dataset.formatPainter) {
            delete editor.dataset.formatPainter;
            editor.style.cursor = "";
        }
        return () => {
            if (editor.dataset.formatPainter) {
                delete editor.dataset.formatPainter;
                editor.style.cursor = "";
            }
        };
    }, [formatPainterActive, activeId]);

    useEffect(() => {
        if (!formatPainterActive) return undefined;
        const cancelOnEscape = (event) => {
            if (event.key === "Escape") {
                setFormatPainterActive(false);
                formatPainterStyleRef.current = null;
            }
        };
        document.addEventListener("keydown", cancelOnEscape);
        return () => document.removeEventListener("keydown", cancelOnEscape);
    }, [formatPainterActive]);

    useEffect(() => {
        if (!exportMenuOpen) return undefined;
        window.requestAnimationFrame(() => document.querySelector('[data-notes-toolbar-menu="export"] [role="menuitem"]')?.focus());
        const closeOnOutsideClick = (event) => {
            if (!exportMenuRef.current?.contains(event.target)) setExportMenuOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") {
                setExportMenuOpen(false);
                exportButtonRef.current?.focus();
            }
        };
        document.addEventListener("pointerdown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [exportMenuOpen]);

    const visibleNotes = [...notes].sort(compareNotesByCreatedAt).filter((note) =>
        `${note.title} ${textFromHtml(note.content)}`.toLowerCase().includes(query.toLowerCase())
    );
    const activeNote = notes.find((note) => note.id === activeId) ?? null;
    const activeNoteHasUnsavedChanges = Boolean(activeNote && unsavedNoteIds.has(activeNote.id));

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
                if (response?.note?.id !== note.id || response.note.content !== note.content) {
                    throw new Error("The server did not confirm that the latest note content was saved.");
                }
                const savedNote = { ...note, ...response.note };
                persistedNotesRef.current.set(note.id, savedNote);
                if (noteVersionsRef.current.get(note.id) === version) {
                    replaceNotes((current) => current.map((item) =>
                        item.id === note.id ? savedNote : item
                    ));
                    updateUnsavedState(note.id, false);
                    latestSaveErrorRef.current = "";
                    setSaveError("");
                }
                return noteVersionsRef.current.get(note.id) === version;
            } catch (error) {
                latestSaveErrorRef.current = error.message;
                setSaveError(error.message);
                if (blocker.state === "blocked") setNavigationSaveError(`Could not save your changes: ${error.message}`);
                return false;
            }
        });
        saveQueueRef.current = saveRequest;
        pendingSaveCountRef.current += 1;
        pendingNoteSaveCountsRef.current.set(note.id, (pendingNoteSaveCountsRef.current.get(note.id) || 0) + 1);
        setPendingNoteSaveIds((current) => new Set(current).add(note.id));
        setSavingNoteCount(pendingSaveCountRef.current);
        return saveRequest.finally(() => {
            pendingSaveCountRef.current -= 1;
            const pendingForNote = pendingNoteSaveCountsRef.current.get(note.id) || 0;
            if (pendingForNote <= 1) pendingNoteSaveCountsRef.current.delete(note.id);
            else pendingNoteSaveCountsRef.current.set(note.id, pendingForNote - 1);
            if (pendingForNote <= 1) setPendingNoteSaveIds((current) => {
                const next = new Set(current);
                next.delete(note.id);
                return next;
            });
            setSavingNoteCount(pendingSaveCountRef.current);
        });
    }, [apiRequest, blocker.state, notebookId, replaceNotes, updateUnsavedState]);

    const saveActiveNote = async () => {
        if (!activeNote || pendingNoteSaveCountsRef.current.has(activeNote.id)) return false;
        let note = latestNotesRef.current.find((item) => item.id === activeNote.id);
        if (!note) return false;
        if (editorRef.current) {
            const editorContent = cleanEditorHtml(editorRef.current.innerHTML);
            if (editorContent !== note.content) {
                updateActiveNote({ content: editorContent });
                note = latestNotesRef.current.find((item) => item.id === activeNote.id) || { ...note, content: editorContent };
            }
        }
        if (!unsavedNoteIdsRef.current.has(note.id)) return true;
        latestSaveErrorRef.current = "";
        setSaveError("");
        return persistNote(note);
    };

    const formatActiveNote = async () => {
        if (!activeNote || formattingNote || !editorRef.current) return;
        const currentHtml = cleanEditorHtml(editorRef.current.innerHTML);
        if (!textFromHtml(currentHtml).trim()) {
            setFormatStatus("Add some note content before formatting.");
            return;
        }
        const formattingNoteId = activeNote.id;
        const formattingVersion = noteVersionsRef.current.get(formattingNoteId) ?? 0;
        setFormattingNote(true);
        setFormatStatus("");
        try {
            const { html } = await apiRequest("/study-materials/format-note", {
                method: "POST",
                body: JSON.stringify({ title: activeNote.title, content: currentHtml }),
            });
            const formattedHtml = sanitizeFormattedHtml(html);
            if (!formattedHtml.trim()) throw new Error("The formatter returned an empty note.");
            if (!editorRef.current || activeId !== formattingNoteId ||
                (noteVersionsRef.current.get(formattingNoteId) ?? 0) !== formattingVersion) {
                setFormatStatus("The note changed while formatting. Run Format note again to use the latest content.");
                return;
            }
            editorRef.current.innerHTML = formattedHtml;
            enhanceTables(editorRef.current);
            const range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            saveEditorChange(editorRef.current.innerHTML);
            setFormatStatus("Note formatted. Review the changes and save when ready.");
        } catch (error) {
            setFormatStatus(error.message || "Could not format this note.");
        } finally {
            setFormattingNote(false);
        }
    };
    void formatActiveNote;

    const stayOnPage = () => {
        confirmedNavigationRef.current = false;
        blocker.reset();
        setNavigationSaveError("");
    };

    const discardAndProceed = () => {
        if (pendingSaveCountRef.current > 0) return;
        const dirtyIds = new Set(unsavedNoteIdsRef.current);
        dirtyIds.forEach((noteId) => {
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
        setUnsavedNoteIds(new Set());
        hasUnsavedChangesRef.current = false;
        setHasUnsavedChanges(false);
        latestSaveErrorRef.current = "";
        setSaveError("");
        setNavigationSaveError("");
        replaceNotes(revertedNotes);
        confirmedNavigationRef.current = true;
        blocker.proceed();
    };

    const saveAndProceed = async () => {
        if (savingBeforeNavigationRef.current) return;
        savingBeforeNavigationRef.current = true;
        setSavingBeforeNavigation(true);
        setNavigationSaveError("");
        latestSaveErrorRef.current = "";
        try {
            await saveQueueRef.current.catch(() => false);
            while (unsavedNoteIdsRef.current.size > 0) {
                const dirtyIds = Array.from(unsavedNoteIdsRef.current);
                for (const noteId of dirtyIds) {
                    let note = latestNotesRef.current.find((item) => item.id === noteId);
                    if (note && noteId === activeId && editorRef.current) {
                        const editorContent = cleanEditorHtml(editorRef.current.innerHTML);
                        if (editorContent !== note.content) {
                            updateActiveNote({ content: editorContent });
                            note = latestNotesRef.current.find((item) => item.id === noteId) || { ...note, content: editorContent };
                        }
                    }
                    if (!note) {
                        setNavigationSaveError("Your changes could not be saved. Please try again or leave without saving.");
                        return;
                    }
                    const version = noteVersionsRef.current.get(noteId) ?? 0;
                    if (!(await persistNote(note))) {
                        if ((noteVersionsRef.current.get(noteId) ?? 0) !== version) continue;
                        setNavigationSaveError(latestSaveErrorRef.current ? `Could not save your changes: ${latestSaveErrorRef.current}` : "Your changes could not be saved. Please try again or leave without saving.");
                        return;
                    }
                }
            }
            if (unsavedNoteIdsRef.current.size > 0) {
                setNavigationSaveError("Some changes are still unsaved. Please try again.");
                return;
            }
            confirmedNavigationRef.current = true;
            blocker.proceed();
        } finally {
            savingBeforeNavigationRef.current = false;
            setSavingBeforeNavigation(false);
        }
    };

    useDialogFocus(
        navigationDialogRef,
        stayOnPage,
        savingBeforeNavigation,
        blocker.state === "blocked" && hasUnsavedChanges
    );

    useLayoutEffect(() => {
        if (
            !loading &&
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
    }, [activeId, activeNote, loading]);

    const updateActiveNote = (changes) => {
        if (!activeId) return;
        let changedNote = null;
        const version = (noteVersionsRef.current.get(activeId) ?? 0) + 1;
        noteVersionsRef.current.set(activeId, version);
        replaceNotes((current) => current.map((note) => {
            if (note.id !== activeId) return note;
            changedNote = { ...note, ...changes, updatedAt: new Date().toISOString() };
            return changedNote;
        }));
        if (changedNote) {
            const persisted = persistedNotesRef.current.get(activeId);
            const matchesSavedContent = persisted &&
                persisted.title === changedNote.title &&
                persisted.content === changedNote.content;
            if (matchesSavedContent && !pendingNoteSaveCountsRef.current.has(activeId)) {
                latestSaveErrorRef.current = "";
                updateUnsavedState(activeId, false);
                setSaveError("");
            } else {
                updateUnsavedState(activeId, true);
            }
        }
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
        if (!createNoteOperationRef.current || createNoteOperationRef.current.notebookId !== notebookId) createNoteOperationRef.current = { notebookId, id: crypto.randomUUID() };
        try {
            const { note } = await apiRequest("/notes", {
                method: "POST",
                body: JSON.stringify({ notebookId, title: "Untitled note", content: "", createId: createNoteOperationRef.current.id, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }),
            });
            createNoteOperationRef.current = "";
            editorHistoryRef.current[note.id] = { stack: [""], index: 0, lastInputAt: 0 };
            noteVersionsRef.current.set(note.id, 0);
            persistedNotesRef.current.set(note.id, { ...note });
            replaceNotes((current) => [note, ...current]);
            setActiveId(note.id);
            setQuery("");
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
            let note = latestNotesRef.current.find((item) => item.id === activeNote.id);
            if (note && editorRef.current) note = { ...note, content: cleanEditorHtml(editorRef.current.innerHTML) };
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

    const toggleFormatPainter = () => {
        if (formatPainterActive) {
            setFormatPainterActive(false);
            formatPainterStyleRef.current = null;
            return;
        }

        const editor = editorRef.current;
        const selection = window.getSelection();
        let selectedRange = editorSelectionRef.current ??
            (selection?.rangeCount ? selection.getRangeAt(0) : null);
        if (!editor || !selectedRange ||
            !editor.contains(selectedRange.commonAncestorContainer)) return;

        if (selectedRange.collapsed && selectedRange.startContainer.nodeType === Node.TEXT_NODE) {
            const sourceTextNode = selectedRange.startContainer;
            const sourceText = sourceTextNode.textContent;
            const caret = selectedRange.startOffset;
            let start = caret;
            let end = caret;
            while (start > 0 && /[\p{L}\p{N}_]/u.test(sourceText[start - 1])) start -= 1;
            while (end < sourceText.length && /[\p{L}\p{N}_]/u.test(sourceText[end])) end += 1;
            if (start < end) {
                selectedRange = document.createRange();
                selectedRange.setStart(sourceTextNode, start);
                selectedRange.setEnd(sourceTextNode, end);
            }
        }

        const sourceNode = selectedRange.startContainer.nodeType === Node.ELEMENT_NODE
            ? selectedRange.startContainer
            : selectedRange.startContainer.parentElement;
        const sourceElement = sourceNode?.closest?.("span, strong, b, em, i, u, mark, a, p, li, h1, h2, h3") ?? sourceNode;
        if (!sourceElement) return;
        const computed = window.getComputedStyle(sourceElement);
        formatPainterStyleRef.current = {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontWeight: computed.fontWeight,
            fontStyle: computed.fontStyle,
            textDecoration: computed.textDecorationLine,
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
        };
        editorSelectionRef.current = selectedRange.cloneRange();
        setFormatPainterActive(true);
    };

    const handleEditorMouseUp = () => {
        rememberEditorSelection();
        if (!formatPainterActive || !formatPainterStyleRef.current) return;

        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || selection.isCollapsed) return;
        const range = selection.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) return;

        const styleValues = formatPainterStyleRef.current;
        const wrapper = document.createElement("span");
        const setCopiedStyle = (element) => {
            Object.entries(styleValues).forEach(([property, value]) => {
                element.style.setProperty(property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), value, "important");
            });
        };
        setCopiedStyle(wrapper);
        const fragment = range.extractContents();
        fragment.querySelectorAll?.("*").forEach(setCopiedStyle);
        wrapper.append(fragment);
        range.insertNode(wrapper);

        const paintedRange = document.createRange();
        paintedRange.selectNodeContents(wrapper);
        selection.removeAllRanges();
        selection.addRange(paintedRange);
        editorSelectionRef.current = paintedRange.cloneRange();
        saveEditorChange(editor.innerHTML);
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
        if (formatPainterActive) {
            if (editor) editor.style.cursor = formatPainterCursor;
            return;
        }
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
        const listItems = getSelectedListItems(editor);
        if (listItems.length) {
            const changed = event.shiftKey
                ? outdentListItems(listItems)
                : indentListItems(listItems);
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

    const handleSaveShortcut = (event) => {
        if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
        event.preventDefault();
        if (activeNoteHasUnsavedChanges) saveActiveNote();
    };

    if (loading) return <NotesPageSkeleton styles={styles} />;

    return (
        <div
            onKeyDownCapture={handleSaveShortcut}
            style={styles.notesCssVars}
            className={`mx-auto flex h-[calc(100dvh-140px)] min-h-[520px] w-full overflow-hidden
                        [font-family:Inter,sans-serif] max-[1023px]:h-[calc(100dvh-140px)] 
                        max-[1023px]:min-h-[520px] max-[1023px]:gap-0 max-[1023px]:p-0 
                        max-[639px]:-mx-4 max-[639px]:w-[calc(100%+2rem)] max-[639px]:h-[calc(100dvh-120px)] max-[639px]:min-h-0 max-[639px]:p-0
                         ${mobileNotesOpen ? 
                            "max-[1023px]:[&>div>aside]:fixed max-[1023px]:[&>div>aside]:left-0 max-[1023px]:[&>div>aside]:top-0 max-[1023px]:[&>div>aside]:flex" : ""} 
                        ${mobileEditorOpen ? "max-[639px]:[&>div>aside]:!hidden" : "max-[639px]:[&>div>main]:hidden"}`}
        >
            <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)] gap-2.5 max-[1023px]:grid-cols-1 max-[1023px]:gap-0">
                {mobileNotesOpen && <button type="button" className="fixed inset-0 z-[70] bg-black/60" aria-label="Close notes sidebar" onClick={() => setMobileNotesOpen(false)} />}
                <NotesSidebar
                    styles={styles}
                    notebookName={notebookName}
                    visibleNotes={visibleNotes}
                    activeId={activeId}
                    setActiveId={setActiveId}
                    query={query}
                    setQuery={setQuery}
                    createNote={createNote}
                    onStudy={(tab) => navigate("/study-tools", { state: { tab } })}
                    setMobileNotesOpen={setMobileNotesOpen}
                    setMobileEditorOpen={setMobileEditorOpen}
                    mobileNotesOpen={mobileNotesOpen}
                />

                <main className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border ${styles.border} max-[639px]:h-full`}>
                    {saveError && (
                        <div role="alert" className="flex items-center justify-between gap-3 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">
                            <span>{saveError}</span>
                            {activeNote && <button type="button" onClick={saveActiveNote} className="shrink-0 font-semibold underline">Retry save</button>}
                        </div>
                    )}
                    {formatStatus && (
                        <div role={formattingNote ? "status" : "alert"} className={`border-b px-4 py-2 text-sm ${formatStatus.startsWith("Note formatted") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "border-[var(--border)] text-[var(--text-muted)]"}`}>
                            {formatStatus}
                        </div>
                    )}
                    {loading ? (
                        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">Loading notes…</div>
                    ) : activeNote ? (
                        <>
                            <NotebookHeader
                                styles={styles}
                                onOpenNotes={() => setMobileNotesOpen(true)}
                                onBackToNotes={() => setMobileEditorOpen(false)}
                                saved={!activeNoteHasUnsavedChanges && !pendingNoteSaveIds.has(activeNote.id)}
                                onSave={saveActiveNote}
                                onDelete={() => setDeleteId(activeNote.id)}
                                onExport={exportNote}
                                exportMenuOpen={exportMenuOpen}
                                setExportMenuOpen={setExportMenuOpen}
                                exportMenuRef={exportMenuRef}
                                exportButtonRef={exportButtonRef}
                                savingNoteCount={savingNoteCount}
                                editorRef={editorRef}
                                textColorMenuRef={textColorMenuRef}
                                textColorOpen={textColorOpen}
                                setTextColorOpen={setTextColorOpen}
                                textColor={textColor}
                                rememberEditorSelection={rememberEditorSelection}
                                applyTextColor={applyTextColor}
                                applyFormat={applyFormat}
                                highlightSelection={highlightSelection}
                                removeHighlightSelection={removeHighlightSelection}
                                insertTable={insertTable}
                                formatPainterActive={formatPainterActive}
                                onFormatPainter={toggleFormatPainter}
                            />

                            <NotesDocumentEditor
                                activeNote={activeNote}
                                styles={styles}
                                darkMode={darkMode}
                                editorRef={editorRef}
                                editorSelectionRef={editorSelectionRef}
                                updateActiveNote={updateActiveNote}
                                handleEditorInput={handleEditorInput}
                                handleEditorPaste={handleEditorPaste}
                                handleEditorKeyDown={handleEditorKeyDown}
                                handleEditorMouseUp={handleEditorMouseUp}
                                rememberEditorSelection={rememberEditorSelection}
                                handleTableAction={handleTableAction}
                                resizeTableColumn={resizeTableColumn}
                                updateTableResizeCursor={updateTableResizeCursor}
                            /><NoteTableControls
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
                            <NotesActionsFooter onStudy={(tab) => navigate("/study-tools", { state: { tab } })} />
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

            <NotesPageDialogs
                showUnsavedChanges={blocker.state === "blocked" && hasUnsavedChanges}
                navigationDialogRef={navigationDialogRef}
                styles={styles}
                savingNoteCount={savingNoteCount}
                savingBeforeNavigation={savingBeforeNavigation}
                navigationSaveError={navigationSaveError}
                onStay={stayOnPage}
                onDiscard={discardAndProceed}
                onSaveAndLeave={saveAndProceed}
                deleteId={deleteId}
                setDeleteId={setDeleteId}
                onDelete={deleteNote}
            />
        </div>
    );
}
