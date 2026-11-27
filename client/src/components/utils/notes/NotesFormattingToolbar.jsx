import {
    Bold,
    ChevronDown,
    Download,
    Eraser,
    Highlighter,
    Italic,
    List as ListIcon,
    ListOrdered,
    Paintbrush,
    Save,
    Table2,
    Trash2,
    Underline,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TEXT_COLOR_OPTIONS = [
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

const BLOCK_STYLES = [
    { value: "p", symbol: "P", label: "Paragraph" },
    { value: "h1", symbol: "H1", label: "Heading 1" },
    { value: "h2", symbol: "H2", label: "Heading 2" },
    { value: "h3", symbol: "H3", label: "Heading 3" },
];

const INITIAL_ACTIVE_FORMATS = {
    bold: false,
    italic: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
};

function ToolbarDivider({ styles }) {
    return <span aria-hidden="true" className={`mx-1 h-6 border-l ${styles.border}`} />;
}

function ToolbarIconButton({
    label,
    title = label,
    pressed,
    active = false,
    styles,
    onMouseDown,
    onClick,
    icon: Icon,
    disabled = false,
}) {
    const activeClass = active ? styles.buttonFrost : "";

    return (
        <button
            type="button"
            onMouseDown={onMouseDown}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={pressed}
            title={title}
            className={`shrink-0 rounded p-1.5 ${styles.headerNavText} ${styles.secondaryBgHover} ${activeClass}`}
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}

function ParagraphStyleMenu({
    styles,
    blockStyle,
    activeFormats,
    paragraphOpen,
    paragraphMenuRef,
    paragraphPopupRef,
    paragraphButtonRef,
    paragraphMenuPosition,
    rememberEditorSelection,
    onToggle,
    onSelect,
}) {
    const selectedStyle = BLOCK_STYLES.find((item) => item.value === blockStyle);
    const hasActiveFormat = blockStyle !== "p" || Object.values(activeFormats).some(Boolean);

    return (
        <div ref={paragraphMenuRef} className="relative z-20 shrink-0">
            <button
                ref={paragraphButtonRef}
                type="button"
                onMouseDown={(event) => {
                    event.preventDefault();
                    rememberEditorSelection();
                }}
                onClick={onToggle}
                aria-label={`Text style: ${selectedStyle?.label || "Paragraph"}`}
                aria-haspopup="menu"
                aria-expanded={paragraphOpen}
                aria-pressed={hasActiveFormat}
                title={selectedStyle?.label || "Paragraph"}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs ${styles.buttonFrost}`}
            >
                <span className="font-semibold">{selectedStyle?.symbol || "P"}</span>
                <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {paragraphOpen && createPortal((
                <div
                    ref={paragraphPopupRef}
                    role="menu"
                    aria-label="Text style"
                    data-notes-toolbar-menu="true"
                    style={{
                        "--notes-menu-top": `${paragraphMenuPosition.top}px`,
                        "--notes-menu-left": `${paragraphMenuPosition.left}px`,
                    }}
                    className={`fixed left-[var(--notes-menu-left)] top-[var(--notes-menu-top)] z-[20000] m-0 min-w-40 rounded-lg border p-1.5 shadow-xl ${styles.border} ${styles.secondaryBg}`}
                >
                    {BLOCK_STYLES.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            role="menuitem"
                            onMouseDown={(event) => {
                                event.preventDefault();
                                rememberEditorSelection();
                            }}
                            onClick={() => onSelect(item.value)}
                            aria-current={blockStyle === item.value ? "true" : undefined}
                            className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm ${styles.primaryText} ${styles.secondaryBgHover}`}
                        >
                            <span className="w-7 font-semibold text-[var(--accent)]">{item.symbol}</span>
                            {item.label}
                        </button>
                    ))}
                </div>
            ), document.body)}
        </div>
    );
}

function TextColorMenu({
    styles,
    textColorMenuRef,
    textColorOpen,
    textColor,
    setTextColorOpen,
    rememberEditorSelection,
    applyTextColor,
}) {
    const buttonRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 12 });

    const toggleMenu = () => {
        if (!textColorOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + 6,
                left: Math.max(12, Math.min(rect.left, window.innerWidth - 220)),
            });
        }
        setTextColorOpen((open) => !open);
    };

    return (
        <div className="relative shrink-0" ref={textColorMenuRef}>
            <button
                ref={buttonRef}
                type="button"
                onMouseDown={(event) => {
                    event.preventDefault();
                    rememberEditorSelection();
                }}
                onClick={toggleMenu}
                aria-label="Text color"
                aria-haspopup="menu"
                aria-expanded={textColorOpen}
                title="Text color"
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs ${styles.buttonFrost}`}
            >
                <span
                    className="border-b-2 px-0.5 font-bold leading-5"
                    style={{ borderColor: textColor }}
                >
                    A
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {textColorOpen && createPortal((
                <div
                    data-notes-toolbar-menu="true"
                    role="menu"
                    aria-label="Text colors"
                    onPointerDown={(event) => event.stopPropagation()}
                    style={{ position: "fixed", top: menuPosition.top, left: menuPosition.left, zIndex: 20000 }}
                    className={`w-52 rounded-lg border p-3 ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
                >
                    <div className="grid grid-cols-3 gap-1">
                        {TEXT_COLOR_OPTIONS.map((option) => (
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
            ), document.body)}
        </div>
    );
}

export default function NotesFormattingToolbar({
    styles,
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
    saved,
    onSave,
    onDelete,
    onExport,
    exportMenuOpen,
    setExportMenuOpen,
    exportMenuRef,
    exportButtonRef,
    savingNoteCount,
}) {
    const paragraphMenuRef = useRef(null);
    const paragraphPopupRef = useRef(null);
    const paragraphButtonRef = useRef(null);
    const [paragraphOpen, setParagraphOpen] = useState(false);
    const [paragraphMenuPosition, setParagraphMenuPosition] = useState({ top: 0, left: 12 });
    const [exportMenuPosition, setExportMenuPosition] = useState({ top: 0, left: 12 });
    const [blockStyle, setBlockStyle] = useState("p");
    const [activeFormats, setActiveFormats] = useState(INITIAL_ACTIVE_FORMATS);

    const preserveSelection = useCallback((event) => event.preventDefault(), []);

    const updateActiveFormats = useCallback(() => {
        const editor = editorRef?.current;
        const selection = window.getSelection();

        if (!editor || !selection?.rangeCount || !editor.contains(selection.anchorNode)) {
            return;
        }

        const anchor = selection.anchorNode.nodeType === Node.ELEMENT_NODE
            ? selection.anchorNode
            : selection.anchorNode.parentElement;
        const activeBlock = anchor?.closest("h1, h2, h3, p, li, blockquote, div");
        const blockTag = activeBlock?.tagName?.toLowerCase();
        const nextBlockStyle = ["h1", "h2", "h3"].includes(blockTag) ? blockTag : "p";
        const listItem = anchor?.closest("li");
        const parentList = listItem?.parentElement;

        setBlockStyle((current) => (current === nextBlockStyle ? current : nextBlockStyle));
        setActiveFormats({
            bold: document.queryCommandState("bold") || Boolean(anchor?.closest("b, strong")),
            italic: document.queryCommandState("italic") || Boolean(anchor?.closest("i, em")),
            underline: document.queryCommandState("underline") || Boolean(anchor?.closest("u")),
            unorderedList: parentList?.tagName === "UL",
            orderedList: parentList?.tagName === "OL",
        });
    }, [editorRef]);

    useEffect(() => {
        document.addEventListener("selectionchange", updateActiveFormats);
        return () => document.removeEventListener("selectionchange", updateActiveFormats);
    }, [updateActiveFormats]);

    useEffect(() => {
        if (!paragraphOpen) {
            return undefined;
        }

        const closeOnOutsideClick = (event) => {
            if (!paragraphMenuRef.current?.contains(event.target) &&
                !paragraphPopupRef.current?.contains(event.target)) {
                setParagraphOpen(false);
            }
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") {
                setParagraphOpen(false);
            }
        };

        document.addEventListener("pointerdown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("pointerdown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [paragraphOpen]);

    const runFormat = (command, value = null) => {
        applyFormat(command, value);
        window.requestAnimationFrame(updateActiveFormats);
    };

    const toggleParagraphMenu = () => {
        const nextOpen = !paragraphOpen;

        if (nextOpen && paragraphButtonRef.current) {
            const rect = paragraphButtonRef.current.getBoundingClientRect();
            setParagraphMenuPosition({
                top: rect.bottom + 6,
                left: Math.max(12, Math.min(rect.left, window.innerWidth - 172)),
            });
        }

        setParagraphOpen(nextOpen);
    };

    const selectBlockStyle = (value) => {
        setBlockStyle(value);
        runFormat("formatBlock", value);
        setParagraphOpen(false);
    };

    const isSaveDisabled = saved || savingNoteCount > 0;
    const areExportsDisabled = savingNoteCount > 0;

    return (
        <div
            role="region"
            aria-label="Note formatting tools"
            tabIndex={0}
            className="w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
            <div className="flex w-max min-w-full flex-nowrap items-center gap-1 py-1.5">
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaveDisabled}
                    aria-label="Save note"
                    title="Save note"
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs ${styles.buttonFrost}`}
                >
                    <Save size={14} />
                    Save
                </button>

                <div className="relative shrink-0" ref={exportMenuRef}>
                    <button
                        ref={exportButtonRef}
                        type="button"
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs ${styles.buttonFrost}`}
                        onClick={() => {
                            if (!exportMenuOpen && exportButtonRef.current) {
                                const rect = exportButtonRef.current.getBoundingClientRect();
                                setExportMenuPosition({
                                    top: rect.bottom + 6,
                                    left: Math.max(12, Math.min(rect.right - 176, window.innerWidth - 188)),
                                });
                            }
                            setExportMenuOpen((open) => !open);
                        }}
                        disabled={areExportsDisabled}
                        aria-haspopup="menu"
                        aria-expanded={exportMenuOpen}
                    >
                        <Download size={14} />
                        Export
                        <ChevronDown size={13} />
                    </button>

                    {exportMenuOpen && createPortal((
                        <div
                            data-notes-toolbar-menu="export"
                            role="menu"
                            onPointerDown={(event) => event.stopPropagation()}
                            style={{ position: "fixed", top: exportMenuPosition.top, left: exportMenuPosition.left, zIndex: 20000 }}
                            className={`w-36 min-w-0 rounded-lg border ${styles.border} ${styles.secondaryBg} shadow-xl`}
                        >
                            <button
                                type="button"
                                className={`w-full rounded-t-lg px-2.5 py-2 text-left text-sm ${styles.secondaryBgHover}`}
                                role="menuitem"
                                onClick={() => {
                                    setExportMenuOpen(false);
                                    onExport("docx");
                                }}
                            >
                                Download .docx
                            </button>
                            <button
                                type="button"
                                className={`w-full rounded-b-lg px-2.5 py-2 text-left text-sm ${styles.secondaryBgHover}`}
                                role="menuitem"
                                onClick={() => {
                                    setExportMenuOpen(false);
                                    onExport("pdf");
                                }}
                            >
                                Download as PDF
                            </button>
                        </div>
                    ), document.body)}
                </div>

                <button
                    type="button"
                    className={`inline-flex items-center gap-2 rounded-md p-2 text-xs ${styles.buttonFrost}`}
                    aria-label="Delete note"
                    title="Delete note"
                    onClick={onDelete}
                >
                    <Trash2 size={16} />
                </button>

                <ToolbarDivider styles={styles} />

                <ParagraphStyleMenu
                    styles={styles}
                    blockStyle={blockStyle}
                    activeFormats={activeFormats}
                    paragraphOpen={paragraphOpen}
                    paragraphMenuRef={paragraphMenuRef}
                    paragraphPopupRef={paragraphPopupRef}
                    paragraphButtonRef={paragraphButtonRef}
                    paragraphMenuPosition={paragraphMenuPosition}
                    rememberEditorSelection={rememberEditorSelection}
                    onToggle={toggleParagraphMenu}
                    onSelect={selectBlockStyle}
                />

                <TextColorMenu
                    styles={styles}
                    textColorMenuRef={textColorMenuRef}
                    textColorOpen={textColorOpen}
                    textColor={textColor}
                    setTextColorOpen={setTextColorOpen}
                    rememberEditorSelection={rememberEditorSelection}
                    applyTextColor={applyTextColor}
                />

                <ToolbarDivider styles={styles} />

                <ToolbarIconButton
                    label="Bold"
                    pressed={activeFormats.bold}
                    active={activeFormats.bold}
                    styles={styles}
                    onMouseDown={preserveSelection}
                    onClick={() => runFormat("bold")}
                    icon={Bold}
                />
                <ToolbarIconButton
                    label="Italic"
                    pressed={activeFormats.italic}
                    active={activeFormats.italic}
                    styles={styles}
                    onMouseDown={preserveSelection}
                    onClick={() => runFormat("italic")}
                    icon={Italic}
                />
                <ToolbarIconButton
                    label="Underline"
                    pressed={activeFormats.underline}
                    active={activeFormats.underline}
                    styles={styles}
                    onMouseDown={preserveSelection}
                    onClick={() => runFormat("underline")}
                    icon={Underline}
                />
                <ToolbarIconButton
                    label={formatPainterActive ? "Turn off format painter" : "Format painter"}
                    title={formatPainterActive ? "Turn off format painter (Esc)" : "Copy formatting"}
                    pressed={formatPainterActive}
                    active={formatPainterActive}
                    styles={styles}
                    onMouseDown={preserveSelection}
                    onClick={onFormatPainter}
                    icon={Paintbrush}
                />
                <ToolbarIconButton
                    label="Highlight selected text"
                    title="Highlight selected text"
                    styles={styles}
                    onMouseDown={preserveSelection}
                    onClick={highlightSelection}
                    icon={Highlighter}
                />
                <ToolbarIconButton
                    label="Remove highlight from selected text"
                    title="Remove highlight"
                    styles={styles}
                    onMouseDown={preserveSelection}
                    onClick={removeHighlightSelection}
                    icon={Eraser}
                />

                <ToolbarDivider styles={styles} />

                <ToolbarIconButton
                    label="Bulleted list"
                    pressed={activeFormats.unorderedList}
                    active={activeFormats.unorderedList}
                    styles={styles}
                    onMouseDown={preserveSelection}
                    onClick={() => runFormat("insertUnorderedList")}
                    icon={ListIcon}
                />
                <ToolbarIconButton
                    label="Numbered list"
                    pressed={activeFormats.orderedList}
                    active={activeFormats.orderedList}
                    styles={styles}
                    onMouseDown={preserveSelection}
                    onClick={() => runFormat("insertOrderedList")}
                    icon={ListOrdered}
                />
                <ToolbarIconButton
                    label="Insert table"
                    styles={styles}
                    onMouseDown={preserveSelection}
                    onClick={insertTable}
                    icon={Table2}
                />
            </div>
        </div>
    );
}
