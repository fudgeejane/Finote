const tableUiSelectors = [
    ".note-table-actions",
    ".note-table-row-handle",
    ".note-table-column-handle",
    ".note-table-resizer",
    "[data-note-table-action]",
    "[data-note-table-handle]",
];

export const stripTableUi = (element) => {
    tableUiSelectors.forEach((selector) => {
        element.querySelectorAll(selector).forEach((node) => node.remove());
    });
    element.querySelectorAll(
        ".note-table-active-cell, .note-table-active-row, .note-table-active-column, .note-table-resizing, .note-table-resize-boundary"
    )
        .forEach((node) => node.classList.remove(
            "note-table-active-cell",
            "note-table-active-row",
            "note-table-active-column",
            "note-table-resizing",
            "note-table-resize-boundary"
        ));
    element.querySelectorAll(".note-table-selected").forEach((wrapper) => {
        wrapper.classList.remove("note-table-selected");
    });
};

export const cleanEditorHtml = (html) => {
    const element = document.createElement("div");
    element.innerHTML = html || "";
    stripTableUi(element);
    return element.innerHTML;
};

export const textFromHtml = (html) => {
    const element = document.createElement("div");
    element.innerHTML = cleanEditorHtml(html);
    return element.textContent || "";
};

const getSelectionElement = () => {
    const node = window.getSelection()?.anchorNode;
    return node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
};

export const getActiveCell = (editor) => {
    const cell = getSelectionElement()?.closest("td, th");
    return cell && editor.contains(cell) ? cell : null;
};

export const getActiveListItem = (editor) => {
    const item = getSelectionElement()?.closest("li");
    return item && editor.contains(item) ? item : null;
};

const getListDepth = (list) => {
    let depth = 0;
    let ancestor = list.parentElement;
    while (ancestor) {
        if (ancestor.matches("ul, ol")) depth += 1;
        ancestor = ancestor.parentElement;
    }
    return depth;
};

const setListItemIndent = (item, level) => {
    if (level <= 0) {
        delete item.dataset.noteIndentLevel;
        item.style.removeProperty("margin-inline-start");
        item.style.removeProperty("list-style-type");
        return;
    }

    item.dataset.noteIndentLevel = String(level);
    item.style.marginInlineStart = `${level * 24}px`;
    const styles = item.parentElement.tagName === "OL"
        ? ["decimal", "lower-alpha", "lower-roman"]
        : ["disc", "circle", "square"];
    item.style.listStyleType = styles[(getListDepth(item.parentElement) + level) % styles.length];
};

export const clearListItemIndent = (item) => setListItemIndent(item, 0);

export const indentListItem = (item) => {
    const currentIndent = Number.parseInt(item.dataset.noteIndentLevel || "0", 10);
    if (currentIndent > 0) {
        setListItemIndent(item, currentIndent + 1);
        return true;
    }

    const previousItem = item.previousElementSibling;
    if (!previousItem || previousItem.tagName !== "LI") {
        setListItemIndent(item, 1);
        return true;
    }
    const list = item.parentElement;
    let nestedList = Array.from(previousItem.children).find(
        (child) => child.tagName === list.tagName
    );
    if (!nestedList) {
        nestedList = document.createElement(list.tagName.toLowerCase());
        previousItem.append(nestedList);
    }
    nestedList.append(item);
    return true;
};

export const outdentListItem = (item) => {
    const currentIndent = Number.parseInt(item.dataset.noteIndentLevel || "0", 10);
    if (currentIndent > 0) {
        setListItemIndent(item, currentIndent - 1);
        return true;
    }

    const list = item.parentElement;
    const parentItem = list?.parentElement;
    const outerList = parentItem?.parentElement;
    if (parentItem?.tagName !== "LI" ||
        !["OL", "UL"].includes(outerList?.tagName)) return false;
    outerList.insertBefore(item, parentItem.nextSibling);
    if (!list.children.length) list.remove();
    return true;
};

export const indentBlock = (editor, outdent = false) => {
    const blockTags = "p, h1, h2, h3, blockquote, pre, div";
    const block = getSelectionElement()?.closest(blockTags);
    if (!block || !editor.contains(block)) return false;

    const currentIndent = Number.parseFloat(block.style.marginInlineStart) || 0;
    const nextIndent = Math.max(0, currentIndent + (outdent ? -24 : 24));
    if (nextIndent === currentIndent) return false;
    block.style.marginInlineStart = `${nextIndent}px`;
    return true;
};

export const syncListStyles = (editor) => {
    editor.querySelectorAll("ul, ol").forEach((list) => {
        const styles = list.tagName === "OL"
            ? ["decimal", "lower-alpha", "lower-roman"]
            : ["disc", "circle", "square"];
        list.style.listStyleType = styles[getListDepth(list) % styles.length];
    });

    editor.querySelectorAll("li[data-note-indent-level]").forEach((item) => {
        const level = Number.parseInt(item.dataset.noteIndentLevel || "0", 10);
        if (level > 0 && item.parentElement.matches("ul, ol")) {
            setListItemIndent(item, level);
        }
    });
};

export const preserveEditorScroll = (editor) => {
    const scrollPositions = [];
    let ancestor = editor.parentElement;
    while (ancestor) {
        scrollPositions.push({
            element: ancestor,
            left: ancestor.scrollLeft,
            top: ancestor.scrollTop,
        });
        ancestor = ancestor.parentElement;
    }
    const windowPosition = { left: window.scrollX, top: window.scrollY };

    return () => {
        window.requestAnimationFrame(() => {
            scrollPositions.forEach(({ element, left, top }) => {
                if (!element.isConnected) return;
                element.scrollLeft = left;
                element.scrollTop = top;
            });
            window.scrollTo(windowPosition.left, windowPosition.top);
        });
    };
};
