import { useEffect, useRef } from "react";

const FOCUSABLE = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function useDialogFocus(dialogRef, onClose, busy = false, open = true) {
    const closeRef = useRef(onClose);
    const busyRef = useRef(busy);

    useEffect(() => {
        closeRef.current = onClose;
        busyRef.current = busy;
    });

    useEffect(() => {
        if (!open) return undefined;
        const dialog = dialogRef.current;
        if (!dialog) return undefined;
        const previousFocus = document.activeElement;
        const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE))
            .filter((element) => element.getClientRects().length > 0);
        (focusable[0] || dialog).focus();

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                if (!busyRef.current) closeRef.current();
                return;
            }
            if (event.key !== "Tab") return;
            const items = Array.from(dialog.querySelectorAll(FOCUSABLE))
                .filter((element) => element.getClientRects().length > 0);
            if (!items.length) {
                event.preventDefault();
                dialog.focus();
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        };
    }, [dialogRef, open]);
}
