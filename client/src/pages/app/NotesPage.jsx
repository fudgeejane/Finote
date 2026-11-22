import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { NOTES_STORAGE_KEY, readStoredItems } from "../../components/utils/studyTools";

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
    const navigate = useNavigate();
    const editorRef = useRef(null);
    const menuRef = useRef(null);
    const editorHistoryRef = useRef({});
    const [notes, setNotes] = useState(() => readStoredItems(NOTES_STORAGE_KEY));
    const [activeId, setActiveId] = useState(() => readStoredItems(NOTES_STORAGE_KEY)[0]?.id ?? null);
    const [query, setQuery] = useState("");
    const [deleteId, setDeleteId] = useState(null);
    const [menuId, setMenuId] = useState(null);

    useEffect(() => {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    }, [notes]);

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

    const visibleNotes = notes.filter((note) =>
        `${note.title} ${textFromHtml(note.content)}`.toLowerCase().includes(query.toLowerCase())
    );
    const activeNote = notes.find((note) => note.id === activeId) ?? null;

    useEffect(() => {
        if (
            editorRef.current &&
            activeNote &&
            document.activeElement !== editorRef.current
        ) {
            editorRef.current.innerHTML = activeNote.content;
        }
    }, [activeId, activeNote]);

    const updateActiveNote = (changes) => {
        setNotes((current) =>
            current.map((note) =>
                note.id === activeId ? { ...note, ...changes, updated: "Just now" } : note
            )
        );
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

    const createNote = () => {
        const id = Date.now();
        const note = {
            id,
            title: "Untitled note",
            subject: "General",
            content: "",
            updated: "Just now",
        };
        editorHistoryRef.current[id] = { stack: [""], index: 0, lastInputAt: 0 };
        setNotes((current) => [note, ...current]);
        setActiveId(id);
        setQuery("");
        window.requestAnimationFrame(() => editorRef.current?.focus());
    };

    const deleteNote = () => {
        const remaining = notes.filter((note) => note.id !== deleteId);
        setNotes(remaining);
        if (activeId === deleteId) setActiveId(remaining[0]?.id ?? null);
        setDeleteId(null);
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
                            <h1 className={`text-lg font-semibold ${styles.primaryText}`}>My Notes</h1>
                            <p className={`mt-0.5 text-xs ${styles.tertiaryText}`}>{notes.length} pages</p>
                        </div>
                        <button
                            type="button"
                            onClick={createNote}
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

                <main className="flex min-h-0 flex-col">
                    {activeNote ? (
                        <>
                            <header className={`flex flex-col gap-2 border-b px-3 py-2 sm:px-5 sm:py-3 md:flex-row md:items-center md:justify-between ${styles.border}`}>
                                <div className="flex items-center gap-2 md:hidden">
                                    <select
                                        value={activeNote.id}
                                        onChange={(event) => setActiveId(Number(event.target.value))}
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
                                        onClick={() => navigate("/study-tools?tab=mock-exams")}
                                        className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:flex-none sm:px-4 ${styles.border} ${styles.primaryText} ${styles.secondaryBgHover}`}
                                    >
                                        <ClipboardList className="h-4 w-4 text-blue-600" />
                                        Mock Exam
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/study-tools?tab=flashcards")}
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
                                <h2 className={`font-serif text-2xl font-semibold ${styles.primaryText}`}>Create your first note</h2>
                                <p className={`mt-2 text-sm ${styles.secondaryText}`}>A blank page is ready when you are.</p>
                                <button type="button" onClick={createNote} className={`mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${styles.buttonBlue}`}>
                                    <BadgePlus className="h-4 w-4" />
                                    New note
                                </button>
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
