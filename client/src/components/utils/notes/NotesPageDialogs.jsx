export default function NotesPageDialogs({
    showUnsavedChanges,
    navigationDialogRef,
    styles,
    savingNoteCount,
    savingBeforeNavigation,
    navigationSaveError,
    onStay,
    onDiscard,
    onSaveAndLeave,
    deleteId,
    setDeleteId,
    onDelete,
}) {
    return (
        <>
            {showUnsavedChanges && (
                <div className="modal-overlay" role="presentation">
                    <div
                        ref={navigationDialogRef}
                        tabIndex={-1}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="unsaved-note-title"
                        aria-describedby="unsaved-note-description"
                        className={`w-full max-w-md rounded-xl border p-6 ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
                    >
                        <h2 id="unsaved-note-title" className={`text-xl font-semibold ${styles.primaryText}`}>
                            You have unsaved changes
                        </h2>
                        <p id="unsaved-note-description" className={`mt-3 text-sm ${styles.secondaryText}`}>
                            Your latest note edits haven’t been saved. Save them before you leave, or discard them to continue without those changes.
                        </p>
                        {savingNoteCount > 0 && (
                            <p role="status" className={`mt-3 text-sm ${styles.secondaryText}`}>
                                A save is in progress. Please wait before discarding changes.
                            </p>
                        )}
                        {navigationSaveError && (
                            <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
                                {navigationSaveError}
                            </p>
                        )}
                        <div className="mt-8 flex flex-wrap justify-end gap-1.5">
                            <button type="button" onClick={onStay} className={`rounded-md px-4 py-2 text-sm ${styles.buttonFrost}`}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={savingNoteCount > 0 || savingBeforeNavigation}
                                onClick={onDiscard}
                                className={`rounded-md px-4 py-2 text-sm ${styles.buttonFrost}`}
                            >
                                Don't Save
                            </button>
                            <button
                                type="button"
                                disabled={savingNoteCount > 0 || savingBeforeNavigation}
                                onClick={onSaveAndLeave}
                                className={`rounded-md px-4 py-2 text-sm ${styles.buttonPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                {savingBeforeNavigation ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setDeleteId(null);
                }}>
                    <div role="dialog" aria-modal="true" aria-labelledby="delete-note-title" className={`w-full max-w-sm rounded-xl border p-6 ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}>
                        <h2 id="schedule-modal-title" className="text-xl font-bold">Delete this note?</h2>
                        <p className={`mt-2 text-sm ${styles.secondaryText}`}>
                            Do you want to delete this note? This action cannot be undone.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button 
                                type="button" 
                                onClick={() => setDeleteId(null)} 
                                className={`rounded-lg px-4 py-2 text-sm ${styles.buttonFrost}`}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={onDelete} 
                                className={`rounded-lg px-4 py-2 text-sm ${styles.buttonDanger}`}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
