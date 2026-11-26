import { useState } from "react";
import { Trash2, X } from "lucide-react";
import Styling from "../../theme/Styling";

export default function NotebookModal({ mode, notebook, onClose, onSubmit, onDelete, busy = false, error = "" }) {
    const styles = Styling();
    const [title, setTitle] = useState(mode === "edit" ? notebook?.title ?? "" : "");

    const isDelete = mode === "delete";
    const isEdit = mode === "edit";
    const heading = isDelete ? "Delete notebook?" : isEdit ? "Edit notebook" : "Create a new notebook";

    return (
        <div
            className="modal-overlay"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="notebook-modal-title"
                className={`w-full max-w-md rounded-xl border ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
            >
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!isDelete) onSubmit(title.trim());
                    }}
                >
                    <header className="flex items-start justify-between gap-4 p-6">
                        <div>
                            <h2 id="notebook-modal-title" className={`text-xl font-semibold ${styles.primaryText}`}>
                                {heading}
                            </h2>
                            {!isDelete && (
                                <p className={`mt-1 text-sm ${styles.secondaryText}`}>
                                    {isEdit ? "Update the name of this notebook." : "Give your new notebook a name."}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            aria-label="Close dialog"
                            className={`rounded-full p-1 ${styles.closeButton}`}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </header>

                    <div className="px-6 pb-2">
                        {isDelete ? (
                            <p className={`text-sm ${styles.secondaryText}`}>
                                Are you sure you want to delete this? 
                                <span className={`font-semibold ${styles.primaryText}`}>  {notebook?.title}</span> and its contents will be permanently deleted.
                            </p>
                        ) : (
                            <label className={`block text-sm font-semibold ${styles.primaryText}`}>
                                Notebook name
                                <input
                                    autoFocus
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    maxLength={120}
                                    placeholder="Untitled Notebook"
                                    className={`mt-2 w-full rounded-lg border px-3 py-2.5 font-normal ${styles.input} ${styles.border}`}
                                />
                            </label>
                        )}
                    </div>

                    {error && (
                        <p role="alert" className="mx-6 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <footer className="flex justify-end gap-2 px-6 py-5">
                        <button type="button" onClick={onClose} disabled={busy} className={`rounded-lg px-4 py-2 text-sm ${styles.buttonFrost}`}>
                            Cancel
                        </button>
                        {isDelete ? (
                            <button type="button" onClick={onDelete} disabled={busy} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${styles.redBg2} ${styles.redBg2Hover}`}>
                                Delete
                            </button>
                        ) : (
                            <button type="submit" disabled={!title.trim() || busy} className={`rounded-lg px-4 py-2 text-sm ${styles.blueBg2} ${styles.blueBg2hover}`}>
                                {isEdit ? "Save changes" : "Create notebook"}
                            </button>
                        )}
                    </footer>
                </form>
            </section>
        </div>
    );
}
