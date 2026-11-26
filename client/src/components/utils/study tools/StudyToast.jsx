import { X } from "lucide-react";
import toast from "react-hot-toast";
import Styling from "../../theme/Styling";

export default function StudyToast({ toastId, message, kind, actionLabel, onAction }) {
    const styles = Styling();
    const tone = kind === "error"
        ? styles.studyDanger
        : kind === "info"
            ? styles.studyInfo
            : styles.studySuccess;

    return (
        <div
            role={kind === "error" ? "alert" : "status"}
            aria-live={kind === "error" ? "assertive" : "polite"}
            className={`flex max-w-md items-center gap-3 rounded-xl border p-3 text-sm shadow-lg ${tone}`}
        >
            <span className="min-w-0 flex-1">{message}</span>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={() => {
                        toast.dismiss(toastId);
                        onAction();
                    }}
                    className={`min-h-9 rounded-md px-2 font-semibold ${styles.studyFocusRing}`}
                >
                    {actionLabel}
                </button>
            )}
            <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => toast.dismiss(toastId)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${styles.studyFocusRing}`}
            >
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
}
