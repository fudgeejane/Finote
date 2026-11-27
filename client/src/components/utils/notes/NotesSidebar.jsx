import { BookOpen, BadgePlus, ClipboardList, Search, X } from "lucide-react";
import { textFromHtml } from "./noteEditorUtils";

export default function NotesSidebar({
    styles,
    notebookName,
    visibleNotes,
    activeId,
    setActiveId,
    query,
    setQuery,
    createNote,
    onStudy,
    setMobileNotesOpen,
    setMobileEditorOpen,
    mobileNotesOpen,
}) {
    return (
        <aside className={`notes-sidebar-drawer z-[71] flex min-h-0 flex-col rounded-xl border ${styles.secondaryBg} ${styles.border} p-3 lg:w-[300px] lg:shrink-0 max-[1023px]:hidden max-[1023px]:max-h-[calc(100dvh-24px)] max-[1023px]:w-[300px] max-[1023px]:rounded-none max-[1023px]:p-4 max-[639px]:!static max-[639px]:!flex max-[639px]:!h-full max-[639px]:!w-full max-[639px]:!max-h-none max-[639px]:!rounded-none max-[639px]:!border-0 max-[639px]:!bg-transparent ${mobileNotesOpen ? "max-[1023px]:!flex max-[1023px]:!fixed max-[1023px]:!left-3 max-[1023px]:!top-3 max-[1023px]:!bottom-3 max-[1023px]:!rounded-[20px] max-[1023px]:!bg-[var(--surface)]" : ""}`}>
            <div className="mb-4 flex items-center justify-between p-1">
                <div>
                    <h1 className="max-w-[190px] text-wrap truncate font-[Fraunces,serif] text-2xl font-bold max-[639px]:text-[30px]">My Notes</h1>
                    {notebookName && (
                        <p className={`mt-1 max-w-[190px] truncate text-sm ${styles.tertiaryText}`} title={notebookName}>
                            {notebookName}
                        </p>
                    )}
                </div>
               
                <button
                    type="button"
                    onClick={() => setMobileNotesOpen(false)}
                    aria-label="Close notes sidebar"
                    className="hidden h-11 w-11 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--accent)] max-[1023px]:flex max-[639px]:hidden"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

           <div className="px-1 pb-3 flex items-stretch gap-1.5">
                <label className="relative flex-1 min-w-0">
                    <Search
                        className={`absolute left-3 top-4.5 -translate-y-1/2 h-4 w-4 ${styles.tertiaryText}`}
                        aria-hidden="true"
                    />

                    <span className="sr-only">Search notes</span>

                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search notes"
                        className={`border rounded-md w-full px-4 py-2  text-sm pl-9 pr-2 ${styles.input}`}
                    />
                </label>
                <button 
                    type="button"
                    aria-label="Create a new note" 
                    title="Create a new note" 
                    onClick={() => { createNote(); setMobileEditorOpen(true); }} 
                    className={`px-2.5 py-2 rounded-md ${styles.buttonFrost}`}
                >
                    <BadgePlus size={16}/>
                </button>


                <button
                    type="button"
                        onClick={() => { createNote(); setMobileEditorOpen(true); }}
                    aria-label="Create a new note"
                    title="Create a new note"
                    className={`hidden h-11 w-11 shrink-0 items-center justify-center px-2.5 py-2 rounded-md ${styles.buttonFrost}`}
                >
                    <BadgePlus className="h-4 w-4" />
                </button>
            </div>

            <nav className="modal-scroll min-h-0 flex-1 space-y-1 overflow-y-auto px-1 pb-3 max-[639px]:space-y-2" aria-label="Notes">
                {visibleNotes.map((note) => (
                    <div
                        key={note.id}
                        className="w-full rounded-xl"
                    >
                        <div className={`flex items-center rounded-lg transition-colors duration-150 ${activeId === note.id ? `${styles.secondaryBgActive} border ${styles.border} max-[639px]:bg-transparent`: styles.secondaryBgHover}`}>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveId(note.id);
                                    setMobileNotesOpen(false);
                                    setMobileEditorOpen(true);
                                }}
                                aria-current={activeId === note.id ? "true" : undefined}
                                className="min-h-11 min-w-0 flex-1 cursor-pointer rounded-xl px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-[var(--accent)] max-[639px]:px-4 max-[639px]:py-4"
                            >
                                <span className={`block truncate text-[15px] font-semibold max-[639px]:text-base ${activeId === note.id ? styles.blueText : "" }`}>
                                    {note.title || "Untitled note"}
                                </span>
                                <span className="mt-1 block truncate text-[13px] text-[var(--text-muted)] max-[639px]:text-sm">
                                    {textFromHtml(note.content) || "Empty page"}
                                </span>
                            </button>
                        </div>
                    </div>
                ))}
                {visibleNotes.length === 0 && (
                    <p className={`px-3 py-8 text-center text-sm ${styles.tertiaryText}`}>No notes found</p>
                )}
            </nav>

            <div className="mt-auto border-t border-[var(--border)] pt-4 max-[1023px]:hidden">
                <p className={`mb-2 text-[11px] font-semibold ${styles.secondaryText}`}>STUDY THIS NOTE</p>
                <div className="flex gap-2">
                     <button 
                        type="button" 
                        onClick={() => onStudy("flashcards")} 
                        className={`w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-xs ${styles.buttonFrost}`}
                    >
                        <BookOpen size={14}/>Flashcards
                    </button>
                    <button 
                        type="button" 
                        onClick={() => onStudy("mock-exams")} 
                        className={`w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-xs ${styles.buttonFrost}`}
                    >
                        <ClipboardList size={14}/>Mock Exam
                    </button>
                </div>
            </div>
        </aside>
    );
}
