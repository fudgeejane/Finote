import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    BookOpen,
    Bold,
    ClipboardList,
    Eraser,
    Highlighter,
    Italic,
    List as ListIcon,
    ListOrdered,
    MoreHorizontal,
    BadgePlus,
    Search,
    Trash2,
    Underline,
} from "lucide-react";
import Styling from "../../components/theme/Styling";
import { useDarkMode } from "../../components/theme/DarkModeContext";
import { useAuth } from "../../auth/AuthContext";
import { importLegacyNotes } from "../../api/legacyNotesMigration";

const typingInputTypes = new Set([
    "insertText",
    "insertCompositionText",
    "insertParagraph",
    "insertLineBreak",
    "deleteContentBackward",
    "deleteContentForward",
]);

const textFromHtml = (html) => {
    if (!html) return "";
    const element = document.createElement("div");
    element.innerHTML = html;
    return element.textContent || "";
};

export default function NotesPage() {
    const styles = Styling();
    const { darkMode } = useDarkMode();
    const { user, apiRequest } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const notebookId = searchParams.get("notebookId");
    const editorRef = useRef(null);
    const menuRef = useRef(null);
    const editorHistoryRef = useRef({});
    const dirtyNotesRef = useRef(new Set());
    const noteVersionsRef = useRef({});
    const notesRef = useRef([]);
    const saveQueueRef = useRef(Promise.resolve());
    const latestNoteRef = useRef(null);
    const saveNoteRef = useRef(null);
    const [notebook, setNotebook] = useState(null);
    const [notes, setNotes] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [query, setQuery] = useState("");
    const [deleteId, setDeleteId] = useState(null);
    const [menuId, setMenuId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [saveError, setSaveError] = useState("");
    const [migrationError, setMigrationError] = useState("");

    const replaceNotes = useCallback((updater) => {
        setNotes((current) => {
            const next = typeof updater === "function" ? updater(current) : updater;
            notesRef.current = next;
            return next;
        });
    }, []);

    useEffect(() => {
        let active = true;
        setNotebook(null);
        setNotes([]);
        notesRef.current = [];
        dirtyNotesRef.current.clear();
        noteVersionsRef.current = {};
        editorHistoryRef.current = {};
        setActiveId(null);
        setLoadError("");
        setSaveError("");
        setMigrationError("");
        setLoading(true);

        if (!notebookId) {
            setLoading(false);
            return () => { active = false; };
        }

        const loadNotebook = async () => {
            try {
                try {
                    await importLegacyNotes(apiRequest, user?.id);
                } catch (migrationError) {
                    if (active) setMigrationError(migrationError.message);
                }
                const notebookResponse = await apiRequest(`/notebooks/${encodeURIComponent(notebookId)}`);
                const notesResponse = await apiRequest(`/notes?notebookId=${encodeURIComponent(notebookId)}`);
                if (!active) return;
                setNotebook(notebookResponse.notebook);
                notesRef.current = notesResponse.notes;
                setNotes(notesResponse.notes);
                setActiveId(notesResponse.notes[0]?.id ?? null);
            } catch (error) {
                if (active) setLoadError(error.message);
            } finally {
                if (active) setLoading(false);
            }
        };
        loadNotebook();
        return () => { active = false; };
    }, [apiRequest, notebookId, user?.id]);

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

    const notebookIsCurrent = Boolean(notebookId && notebook?.id === notebookId);
    const currentNotes = notebookIsCurrent ? notes : [];
    const visibleNotes = currentNotes.filter((note) =>
        `${note.title} ${textFromHtml(note.content)}`.toLowerCase().includes(query.toLowerCase())
    );
    const activeNote = notebookIsCurrent
        ? notes.find((note) => note.id === activeId) ?? null
        : null;

    useEffect(() => {
        latestNoteRef.current = activeNote;
    }, [activeNote]);

    useEffect(() => {
        if (
            editorRef.current &&
            activeNote &&
            document.activeElement !== editorRef.current
        ) {
            editorRef.current.innerHTML = activeNote.content;
        }
    }, [activeId, activeNote]);

    const persistNote = useCallback((note) => {
        if (!note || !dirtyNotesRef.current.has(note.id)) return Promise.resolve(true);
        const version = noteVersionsRef.current[note.id];
        const payload = { title: note.title, content: note.content };
        const save = saveQueueRef.current.catch(() => {}).then(async () => {
            if (noteVersionsRef.current[note.id] !== version) return;
            const response = await apiRequest(`/notes/${encodeURIComponent(note.id)}`, {
                method: "PATCH",
                body: JSON.stringify(payload),
            });
            replaceNotes((current) => current.map((item) =>
                item.id === note.id && noteVersionsRef.current[note.id] === version
                    ? { ...item, updatedAt: response.note.updatedAt }
                    : item
            ));
            if (noteVersionsRef.current[note.id] === version) {
                dirtyNotesRef.current.delete(note.id);
            }
            setSaveError("");
        });
        saveQueueRef.current = save.then(() => true).catch((error) => {
            setSaveError(error.message);
            return false;
        });
        return saveQueueRef.current;
    }, [apiRequest, replaceNotes]);

    useEffect(() => {
        saveNoteRef.current = persistNote;
    }, [persistNote]);

    useEffect(() => {
        if (!activeNote || !dirtyNotesRef.current.has(activeNote.id)) return undefined;
        const timeout = window.setTimeout(() => persistNote(activeNote), 650);
        return () => window.clearTimeout(timeout);
    }, [activeNote, persistNote]);

    useEffect(() => () => {
        const note = latestNoteRef.current;
        if (note && dirtyNotesRef.current.has(note.id)) {
            saveNoteRef.current?.(note);
        }
    }, [activeId, notebookId]);

    const updateActiveNote = (changes) => {
        if (!activeId) return;
        dirtyNotesRef.current.add(activeId);
        noteVersionsRef.current[activeId] = (noteVersionsRef.current[activeId] || 0) + 1;
        replaceNotes((current) => current.map((note) =>
            note.id === activeId ? { ...note, ...changes } : note
        ));
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

        const now = Date.now();
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
        recordEditorChange(content, coalesceTyping);
        updateActiveNote({ content });
    };

    const restoreEditorHistory = (redo) => {
        const editor = editorRef.current;
        const history = editorHistoryRef.current[activeId];
        if (!editor || !history) return;

        if (redo && history.index < history.stack.length - 1) history.index += 1;
        else if (!redo && history.index > 0) history.index -= 1;
        else return;

        const content = history.stack[history.index];
        editor.innerHTML = content;
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
        if (!notebook || loading) return;
        setSaveError("");
        try {
            const response = await apiRequest("/notes", {
                method: "POST",
                body: JSON.stringify({
                    notebookId: notebook.id,
                    title: "Untitled note",
                    content: "",
                }),
            });
            const note = response.note;
            replaceNotes((current) => [note, ...current]);
            setActiveId(note.id);
            setQuery("");
            window.requestAnimationFrame(() => editorRef.current?.focus());
        } catch (error) {
            setSaveError(error.message);
        }
    };

    const deleteNote = async () => {
        if (!deleteId) return;
        setSaveError("");
        try {
            await apiRequest(`/notes/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
            const remaining = notesRef.current.filter((note) => note.id !== deleteId);
            replaceNotes(remaining);
            dirtyNotesRef.current.delete(deleteId);
            delete noteVersionsRef.current[deleteId];
            delete editorHistoryRef.current[deleteId];
            if (activeId === deleteId) setActiveId(remaining[0]?.id ?? null);
            setDeleteId(null);
        } catch (error) {
            setSaveError(error.message);
        }
    };

    const openStudyTools = async (path) => {
        if (activeNote && !(await persistNote(activeNote))) return;
        navigate(path);
    };

    const applyFormat = (command, value = null) => {
        const editor = editorRef.current;
        if (!editor || !activeNote) return;
        editor.focus();
        document.execCommand(command, false, value);
        saveEditorChange(editor.innerHTML);
    };

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
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
            event.preventDefault();
            restoreEditorHistory(true);
            return;
        }
        if (event.key !== "Tab") return;
        const editor = editorRef.current;
        if (!editor) return;
        event.preventDefault();
        document.execCommand(event.shiftKey ? "outdent" : "indent", false, null);
        saveEditorChange(editor.innerHTML);
    };

    const handleEditorInput = (event) => {
        saveEditorChange(
            event.currentTarget.innerHTML,
            typingInputTypes.has(event.nativeEvent.inputType)
        );
    };

    return (
        <div className={`mx-auto flex min-h-[calc(100dvh-120px)] w-full max-w-7xl overflow-hidden rounded-xl border md:h-[calc(100dvh-140px)] md:min-h-[520px] ${styles.border} ${styles.secondaryBg}`}>
            <div className="grid min-h-[calc(100dvh-120px)] flex-1 grid-rows-1 md:h-full md:min-h-0 md:grid-cols-[280px_minmax(0,1fr)]">
                <aside className={`hidden min-h-0 flex-col border-b md:flex md:max-h-none md:border-b-0 md:border-r ${styles.border}`}>
                    <div className="flex items-center justify-between px-4 py-4">
                        <div>
                            <h1 className={`text-lg font-semibold ${styles.primaryText}`}>{notebookIsCurrent ? notebook.title : "My Notes"}</h1>
                            <p className={`mt-0.5 text-xs ${styles.tertiaryText}`}>{currentNotes.length} notes</p>
                        </div>
                        <button
                            type="button"
                            onClick={createNote}
                            disabled={!notebook || loading}
                            aria-label="Create a new note"
                            className={`flex h-9 w-9 items-center justify-center rounded-full ${styles.buttonBlue}`}
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
                                            if (activeId !== note.id) persistNote(activeNote);
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
                            <p className={`px-3 py-8 text-center text-sm ${styles.tertiaryText}`}>
                                {query ? "No notes found" : "This notebook has no notes yet"}
                            </p>
                        )}
                    </nav>
                </aside>

                <main className="flex min-h-0 flex-col">
                    {migrationError && (
                        <p role="alert" className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700">
                            Existing browser-saved notes could not be imported: {migrationError}
                        </p>
                    )}
                    {saveError && (
                        <div role="alert" className="flex items-center justify-between gap-3 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">
                            <span>{saveError}</span>
                            {activeNote && (
                                <button
                                    type="button"
                                    onClick={() => persistNote(activeNote)}
                                    className="shrink-0 font-semibold underline"
                                >
                                    Retry save
                                </button>
                            )}
                        </div>
                    )}
                    {loading ? (
                        <div className="flex h-full items-center justify-center px-6 text-center">
                            <p className={`text-sm ${styles.secondaryText}`}>Loading notebook…</p>
                        </div>
                    ) : loadError ? (
                        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                            <h2 className={`font-serif text-2xl font-semibold ${styles.primaryText}`}>Could not open this notebook</h2>
                            <p role="alert" className={`mt-2 text-sm ${styles.secondaryText}`}>{loadError}</p>
                            <Link to="/home" className={`mt-5 rounded-lg px-4 py-2 text-sm ${styles.buttonBlue}`}>Back to notebooks</Link>
                        </div>
                    ) : !notebook ? (
                        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                            <h2 className={`font-serif text-2xl font-semibold ${styles.primaryText}`}>Choose a notebook</h2>
                            <p className={`mt-2 text-sm ${styles.secondaryText}`}>Open a notebook from Home to create and manage its notes.</p>
                            <Link to="/home" className={`mt-5 rounded-lg px-4 py-2 text-sm ${styles.buttonBlue}`}>Go to Home</Link>
                        </div>
                    ) : activeNote ? (
                        <>
                            <header className={`flex flex-col gap-2 border-b px-3 py-2 sm:px-5 sm:py-3 md:flex-row md:items-center md:justify-between ${styles.border}`}>
                                <div className="flex items-center gap-2 md:hidden">
                                    <select
                                        value={activeNote.id}
                                        onChange={(event) => {
                                            persistNote(activeNote);
                                            setActiveId(event.target.value);
                                        }}
                                        className={`min-w-0 flex-1 rounded-md border px-2 py-2 text-xs ${styles.input} ${styles.border}`}
                                        aria-label="Select note"
                                    >
                                        {currentNotes.map((note) => (
                                            <option key={note.id} value={note.id}>{note.title || "Untitled note"}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={createNote}
                                        disabled={loading}
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
                                    <span className={`mx-1 h-5 w-px shrink-0 ${styles.grayBg}`} />
                                    <button type="button" onClick={() => setDeleteId(activeNote.id)} aria-label={`Delete ${activeNote.title}`} title="Delete note" className="shrink-0 rounded p-2 text-gray-400 hover:bg-red-500/10 hover:text-red-500">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    </div>
                                </div>
                            </header>

                            <div className="modal-scroll flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-6 sm:py-7 lg:px-10 lg:py-9">
                                <input
                                    value={activeNote.title}
                                    onChange={(event) => updateActiveNote({ title: event.target.value })}
                                    onBlur={() => persistNote(activeNote)}
                                    maxLength={120}
                                    placeholder="Untitled note"
                                    aria-label="Note title"
                                    className={`w-full min-w-0 bg-transparent text-2xl font-serif font-semibold outline-none sm:text-3xl lg:text-4xl ${styles.primaryText}`}
                                />
                                <div
                                    ref={editorRef}
                                    key={activeNote.id}
                                    contentEditable
                                    suppressContentEditableWarning
                                    onInput={handleEditorInput}
                                    onKeyDown={handleEditorKeyDown}
                                    onBlur={() => persistNote({
                                        ...activeNote,
                                        content: editorRef.current?.innerHTML ?? activeNote.content,
                                    })}
                                    data-placeholder="Start writing..."
                                    aria-label="Note content"
                                    className={`note-editor ${darkMode ? "note-editor-dark" : "note-editor-light"} mt-6 min-h-[12rem] w-full min-w-0 max-w-full flex-1 bg-transparent text-base leading-7 outline-none ${styles.primaryText}`}
                                />
                            </div>
                            <footer className={`flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-3 py-3 sm:px-5 ${styles.border}`}>
                                <p className={`hidden text-xs sm:block ${styles.tertiaryText}`}>Keep your learning active</p>
                                <div className="flex w-full gap-2 sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => openStudyTools("/study-tools?tab=mock-exams")}
                                        className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:flex-none sm:px-4 ${styles.border} ${styles.primaryText} ${styles.secondaryBgHover}`}
                                    >
                                        <ClipboardList className="h-4 w-4 text-blue-600" />
                                        Mock Exam
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openStudyTools("/study-tools?tab=flashcards")}
                                        className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:flex-none sm:px-4 ${styles.buttonBlue}`}
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
                                <h2 className={`font-serif text-2xl font-semibold ${styles.primaryText}`}>{query ? "No notes found" : "Create your first note"}</h2>
                                <p className={`mt-2 text-sm ${styles.secondaryText}`}>{query ? "Try a different search." : "A blank page is ready when you are."}</p>
                                {!query && <button type="button" onClick={createNote} className={`mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${styles.buttonBlue}`}>
                                    <BadgePlus className="h-4 w-4" />
                                    New note
                                </button>}
                            </div>
                        </div>
                    )}
                </main>
            </div>

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
