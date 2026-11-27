import { useLayoutEffect, useRef } from "react";

export default function NotesDocumentEditor({
    activeNote,
    styles,
    darkMode,
    editorRef,
    editorSelectionRef,
    updateActiveNote,
    handleEditorInput,
    handleEditorPaste,
    handleEditorKeyDown,
    handleEditorMouseUp,
    rememberEditorSelection,
    handleTableAction,
    resizeTableColumn,
    updateTableResizeCursor,
}) {
    const scrollRef = useRef(null);
    useLayoutEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [activeNote.id]);

    return (
        <div className="relative flex min-h-0 flex-1">
        <div
             ref={scrollRef} 
             className={`modal-scroll flex min-h-0 w-full flex-col items-center overflow-x-hidden overflow-y-auto ${styles.secondaryBg}
                        overscroll-contain px-5 py-6 text-[var(--text-body)] [scrollbar-color:#514c43_transparent] 
                        [scrollbar-width:thin] max-[1023px]:px-6 max-[1023px]:py-7 max-[639px]:px-5 max-[639px]:py-[22px]`}
        >
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
                onFocus={() => { editorSelectionRef.current = null; }}
                placeholder="Untitled note"
                aria-label="Note title"
                className={`block w-full font-serif font-medium text-3xl sm:text-4xl resize-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-y-auto text-wrap mb-4`}
            />
            <div
                ref={editorRef}
                key={activeNote.id}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onPaste={handleEditorPaste}
                onKeyDown={handleEditorKeyDown}
                onMouseUp={handleEditorMouseUp}
                onDoubleClick={handleEditorMouseUp}
                onKeyUp={rememberEditorSelection}
                onClick={handleTableAction}
                onPointerDown={resizeTableColumn}
                onPointerMove={updateTableResizeCursor}
                onPointerLeave={() => {
                    if (editorRef.current) editorRef.current.style.cursor = "";
                }}
                data-placeholder="Start writing..."
                aria-label="Note content"
                className={`note-editor ${darkMode ? "note-editor-dark" : "note-editor-light"} border-t ${styles.border}  min-h-[12rem] w-full max-w-[700px] flex-1 bg-transparent text-base leading-[1.7] text-[var(--text-body)] outline-none [&_h1]:mb-5 [&_h1]:text-[30px] [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:text-[var(--text)] [&_h1]:[font-family:Fraunces,serif] [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:ms-6 [&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:text-[var(--text)] [&_h2]:[font-family:Fraunces,serif] [&_h3]:ms-12 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[var(--text)] [&_h3]:[font-family:Fraunces,serif] [&_p]:leading-[1.7] [&_li]:leading-[1.8] [&>p:has(:is(strong,b))]:mb-0 [&>p:has(:is(strong,b))]:rounded-t-[14px] [&>p:has(:is(strong,b))]:px-[22px] [&>p:has(:is(strong,b))]:pt-[18px] [&>p:has(:is(strong,b))]:pb-1 [&>p:has(:is(strong,b))]:text-xs [&>p:has(:is(strong,b))]:font-semibold [&>p:has(:is(strong,b))]:uppercase [&>p:has(:is(strong,b))]:tracking-[.12em] [&>p:has(:is(strong,b))+ul]:mt-0 [&>p:has(:is(strong,b))+ul]:rounded-b-[14px] [&>p:has(:is(strong,b))+ul]:px-[22px] [&>p:has(:is(strong,b))+ul]:pt-1 [&>p:has(:is(strong,b))+ul]:pb-[22px] [&>p:has(:is(strong,b))+ul]:pl-[42px] [&>p:has(:is(strong,b))+ul]:text-[15px] min-[640px]:[&_h1]:text-[40px] min-[640px]:[&_h2]:text-2xl min-[1024px]:[&_h1]:text-[44px] min-[1024px]:[&_h2]:text-[26px] [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-1 [&_table]:w-full [&_td]:border [&_td]:border-[var(--border)] [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--surface-2)]`}
            />
        </div>
        </div>
    );
}
