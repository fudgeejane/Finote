import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Columns3,
    Equal,
    Eraser,
    Maximize2,
    Rows3,
    TableProperties,
    Trash2,
} from "lucide-react";

export default function NoteTableControls({
    activeTable,
    tableHandleMenu,
    styles,
    tableToolbarRef,
    tableHandleMenuRef,
    onContextAction,
    onHandleMenuAction,
    onHeaderColor,
    onClearActiveTable,
    canMoveCell,
    getColumnCount,
}) {
    const toolbarButton = (Icon, label, action, disabled = false) => (
        <button
            key={action}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onContextAction(action)}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={`note-table-toolbar-button ${styles.primaryText}`}
        >
            <Icon className="h-4 w-4" />
        </button>
    );

    const menuButton = (Icon, label, action, disabled = false) => (
        <button
            key={action}
            type="button"
            role="menuitem"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onHandleMenuAction(action)}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${styles.primaryText} ${styles.secondaryBgHover} disabled:cursor-not-allowed disabled:opacity-40`}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </button>
    );

    return (
        <>
            {activeTable?.table?.isConnected && (
                <div
                    ref={tableToolbarRef}
                    role="toolbar"
                    aria-label="Table controls"
                    className={`note-table-floating ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
                    style={{ left: activeTable.left, top: activeTable.top }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") onClearActiveTable();
                    }}
                >
                    {toolbarButton(Rows3, "Insert row above", "insert-row-above")}
                    {toolbarButton(Rows3, "Insert row below", "insert-row-below")}
                    {toolbarButton(Columns3, "Insert column left", "insert-column-left")}
                    {toolbarButton(Columns3, "Insert column right", "insert-column-right")}
                    {toolbarButton(
                        Trash2,
                        "Delete this row",
                        "delete-row",
                        activeTable.table.rows.length <= 1
                    )}
                    {toolbarButton(
                        Trash2,
                        "Delete this column",
                        "delete-column",
                        getColumnCount(activeTable.table) <= 1
                    )}
                    {toolbarButton(Trash2, "Delete table", "delete-table")}
                    {toolbarButton(
                        TableProperties,
                        activeTable.hasHeader ? "Turn header row off" : "Turn header row on",
                        "toggle-header",
                        !activeTable.hasHeader && activeTable.table.rows.length === 0
                    )}
                    <label className="note-table-color-swatch" title="Header color for this table">
                        <input
                            type="color"
                            value={activeTable.headerColor}
                            onChange={onHeaderColor}
                            aria-label="Header color for this table"
                            disabled={!activeTable.hasHeader}
                        />
                    </label>
                    {toolbarButton(Maximize2, "Fit table to width", "fit-width")}
                    {toolbarButton(Equal, "Equal column widths", "equal-columns")}
                </div>
            )}
            {tableHandleMenu?.table?.isConnected && (
                <div
                    ref={tableHandleMenuRef}
                    role="menu"
                    aria-label={`${tableHandleMenu.axis === "row" ? "Row" : "Column"} options`}
                    className={`note-table-menu ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
                    style={{ left: tableHandleMenu.left, top: tableHandleMenu.top }}
                >
                    {menuButton(
                        tableHandleMenu.axis === "row" ? ArrowUp : ArrowLeft,
                        tableHandleMenu.axis === "row" ? "Insert above" : "Insert left",
                        "insert-before"
                    )}
                    {menuButton(
                        tableHandleMenu.axis === "row" ? ArrowDown : ArrowRight,
                        tableHandleMenu.axis === "row" ? "Insert below" : "Insert right",
                        "insert-after"
                    )}
                    {menuButton(
                        tableHandleMenu.axis === "row" ? ArrowUp : ArrowLeft,
                        tableHandleMenu.axis === "row" ? "Move up" : "Move left",
                        "move-before",
                        !canMoveCell(
                            tableHandleMenu.table,
                            tableHandleMenu.axis,
                            tableHandleMenu.index,
                            -1
                        )
                    )}
                    {menuButton(
                        tableHandleMenu.axis === "row" ? ArrowDown : ArrowRight,
                        tableHandleMenu.axis === "row" ? "Move down" : "Move right",
                        "move-after",
                        !canMoveCell(
                            tableHandleMenu.table,
                            tableHandleMenu.axis,
                            tableHandleMenu.index,
                            1
                        )
                    )}
                    {menuButton(Eraser, "Clear contents", "clear")}
                    {menuButton(
                        Trash2,
                        tableHandleMenu.axis === "row" ? "Delete row" : "Delete column",
                        "delete",
                        tableHandleMenu.axis === "row"
                            ? tableHandleMenu.table.rows.length <= 1
                            : getColumnCount(tableHandleMenu.table) <= 1
                    )}
                </div>
            )}
        </>
    );
}
