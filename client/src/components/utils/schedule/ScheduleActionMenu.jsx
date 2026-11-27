import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { createPortal } from "react-dom";

export default function ScheduleActionMenu({ item, actionScope, open, disabled, styles, onToggle, onEdit, onDelete, onClose }) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const firstActionRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuHeight = 88;
      const placeAbove = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
      setMenuPosition({
        left: Math.max(8, Math.min(rect.right - 128, window.innerWidth - 136)),
        top: placeAbove ? rect.top - menuHeight : rect.bottom,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    firstActionRef.current?.focus();
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) onClose(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose(true);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const close = (restoreFocus = false) => {
    onClose(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };
  return (
    <div className="relative flex justify-end" ref={rootRef}>
      <button 
        ref={triggerRef} 
        type="button" 
        aria-label={`Actions for ${item.subject}`} 
        aria-expanded={open} 
        aria-controls={open ? `schedule-actions-${String(actionScope).replace(/[^a-zA-Z0-9_-]/g, "-")}` : undefined} 
        disabled={disabled} onClick={onToggle} 
        className={`flex p-1 items-center justify-center rounded-md cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${styles.secondaryText}`}>
        <MoreVertical size={14} />
      </button>
      {open && menuPosition && createPortal(
        <div 
          ref={menuRef} 
          id={`schedule-actions-${String(actionScope).replace(/[^a-zA-Z0-9_-]/g, "-")}`} 
          style={{ position: "fixed", left: menuPosition.left, top: menuPosition.top, width: 128 }} 
          className={`z-[10000] rounded-lg border shadow-lg ${styles.border} ${styles.secondaryBg}`}
        >
          <button 
            ref={firstActionRef} 
            type="button" 
            onClick={() => { close(); onEdit(item); }} 
            className={`flex w-full items-center gap-2 rounded-t-lg px-4 py-2 text-left text-sm ${styles.secondaryBgHover}`}
          >
            Edit
          </button>
          <button 
            type="button" 
            onClick={() => { close(); onDelete(item); }} 
            className={`flex w-full items-center gap-2 rounded-b-lg px-4 py-2 text-left text-sm ${styles.secondaryBgHover}`}
          >
            Delete
          </button>
        </div>
      , document.body)}
    </div>
  );
}
