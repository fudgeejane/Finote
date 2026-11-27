import { ArrowLeft, Menu } from "lucide-react";
import NotesFormattingToolbar from "./NotesFormattingToolbar";

export default function NotebookHeader({
    styles,
    onOpenNotes,
    onBackToNotes,
    saved = true,
    onSave,
    onDelete,
    onExport,
    exportMenuOpen,
    setExportMenuOpen,
    exportMenuRef,
    exportButtonRef,
    savingNoteCount = 0,
    editorRef,
    textColorMenuRef,
    textColorOpen,
    setTextColorOpen,
    textColor,
    rememberEditorSelection,
    applyTextColor,
    applyFormat,
    highlightSelection,
    removeHighlightSelection,
    insertTable,
    formatPainterActive,
    onFormatPainter,
}) {
    return (
        <header className="relative z-30 flex min-h-16 flex-wrap items-center justify-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 max-[639px]:min-h-14">
            <div className="order-1 flex w-full items-center justify-between gap-2 lg:absolute lg:inset-x-4 lg:top-2 lg:w-auto">
                <button
                    type="button"
                    className={`hidden p-2 ${styles.buttonFrost} items-center gap-2 rounded-lg  max-[1023px]:flex max-[639px]:hidden`}
                    onClick={onOpenNotes}
                    aria-label="Open notes list"
                >
                    <Menu size={16} />
                     
                </button>
                <button
                    type="button"
                    className="hidden h-10 items-center gap-2 rounded-lg px-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--accent)] max-[639px]:flex"
                    onClick={onBackToNotes}
                >
                    <ArrowLeft size={18} />
                    Notes
                </button>
            </div>

            <div className="order-2 flex w-full justify-center overflow-visible max-[639px]:overflow-x-auto max-[639px]:[scrollbar-width:none]">
                <NotesFormattingToolbar
                    styles={styles}
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
                    onFormatPainter={onFormatPainter}
                    saved={saved}
                    onSave={onSave}
                    onDelete={onDelete}
                    onExport={onExport}
                    exportMenuOpen={exportMenuOpen}
                    setExportMenuOpen={setExportMenuOpen}
                    exportMenuRef={exportMenuRef}
                    exportButtonRef={exportButtonRef}
                    savingNoteCount={savingNoteCount}
                />
            </div>
        </header>
    );
}
