import { useState } from "react";
import { ChevronRight } from "lucide-react";
import Styling from "../../theme/Styling";

const DAYS = [
  { key: "Mon", label: "Mon" },
  { key: "Tue", label: "Tue" },
  { key: "Wed", label: "Wed" },
  { key: "Thu", label: "Thu" },
  { key: "Fri", label: "Fri" },
  { key: "Sat", label: "Sat" },
  { key: "Sun", label: "Sun" },
];
const DEFAULTS = {
  subject: "",
  code: "",
  instructor: "",
  startTime: "09:00",
  endTime: "10:00",
  room: "",
  building: "",
  type: "Lecture",
  section: "",
  notes: "",
  days: ["Mon"],
  reminderEnabled: false,
  reminder: 15,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

export default function ScheduleModal({
  initial = {},
  mode = "form",
  classes = [],
  styles: providedStyles,
  busy = false,
  onClose,
  onSave,
}) {
  const localStyles = Styling();
  const styles = providedStyles || localStyles;
  const [step, setStep] = useState(mode === "select" ? "select" : mode === "view" ? "view" : "form");
  const [form, setForm] = useState({ ...DEFAULTS, ...initial });
  const canSave =
    Boolean(form.subject?.trim()) &&
    Boolean(form.startTime) &&
    Boolean(form.endTime) &&
    Boolean(form.days?.length);
  const set = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const toggleDay = (day) =>
    setForm((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((d) => d !== day)
        : [...current.days, day],
    }));

  return (
    <div
      className="drawer-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
        className={`flex h-dvh min-h-0 w-full max-w-md flex-col overflow-hidden border-l ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
      >
        <header
          className={`z-10 flex shrink-0 items-start border-b p-4 ${styles.border} ${styles.secondaryBg}`}
        >
          <div>
            <h2 id="schedule-modal-title" className="text-xl font-bold">
              {step === "select"
                ? "Select a class"
                : step === "view"
                  ? form.subject || "Class details"
                : form.id
                  ? "Edit class"
                  : "Add new class"}
            </h2>
            <p className={`mt-1 text-xs ${styles.secondaryText}`}>
              {step === "select"
                ? "Choose the class you want to edit."
                : step === "view"
                  ? "Schedule details"
                : "Set the class details and recurring days."}
            </p>
          </div>
          
        </header>
        {step === "view" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="modal-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              <div className={`rounded-lg border p-4 ${styles.border}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${styles.secondaryText}`}>Course</p>
                <p className="mt-1 text-lg font-semibold">{form.subject}</p>
                <p className={`mt-1 text-sm ${styles.secondaryText}`}>{form.code || "No course code"}{form.section ? ` · ${form.section}` : ""}</p>
              </div>
              <Detail label="Instructor" value={form.instructor} styles={styles} />
              <Detail label="Days" value={(form.days || []).join(", ")} styles={styles} />
              <Detail label="Time" value={`${form.startTime} – ${form.endTime}`} styles={styles} />
              <Detail label="Room / location" value={[form.room, form.building].filter(Boolean).join(", ")} styles={styles} />
              <Detail label="Class type" value={form.type} styles={styles} />
              {form.notes && <Detail label="Notes" value={form.notes} styles={styles} />}
              <Detail label="Email reminder" value={form.reminderEnabled ? `${form.reminder || 15} minutes before` : "Off"} styles={styles} />
            </div>
            <div className={`flex justify-end gap-2 border-t p-4 ${styles.border}`}>
              <button type="button" onClick={onClose} className={`rounded-lg px-4 py-2 text-sm ${styles.buttonFrost}`}>Close</button>
              <button type="button" onClick={() => setStep("form")} className={`rounded-lg px-4 py-2 text-sm ${styles.buttonPrimary}`}>Edit class</button>
            </div>
          </div>
        ) : step === "select" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="modal-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-6">
              {classes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setForm({ ...DEFAULTS, ...item });
                    setStep("form");
                  }}
                  className={`flex w-full items-center justify-between rounded-lg border p-4 text-left ${styles.border} ${styles.secondaryBgHover}`}
                >
                  <span>
                    <span className="block font-semibold">{item.subject}</span>
                    <span
                      className={`mt-1 block text-xs ${styles.secondaryText}`}
                    >
                      {item.code || "No course code"} · {item.days.join(", ")}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}
              {!classes.length && (
                <p
                  className={`py-8 text-center text-sm ${styles.secondaryText}`}
                >
                  No scheduled classes available.
                </p>
              )}
            </div>
            <div className={`flex justify-end border-t p-4 ${styles.border}`}>
              <button
                type="button"
                onClick={onClose}
                className={`rounded-lg px-4 py-2 text-sm ${styles.buttonGray}`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSave(form);
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="modal-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              <Field
                label="Course / subject name"
                value={form.subject}
                onChange={(v) => set("subject", v)}
                required
                placeholder="e.g. Introduction to Computer Science"
                styles={styles}
              />
              <Field
                label="Course code"
                value={form.code}
                onChange={(v) => set("code", v)}
                placeholder="e.g. CS101"
                styles={styles}
              />
              <Field
                label="Instructor"
                value={form.instructor}
                onChange={(v) => set("instructor", v)}
                placeholder="e.g. Dr. John Doe"
                styles={styles}
              />
              <Field
                label="Section"
                value={form.section}
                onChange={(v) => set("section", v)}
                placeholder="e.g. BSCS 2A"
                styles={styles}
              />
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Start time"
                  type="time"
                  value={form.startTime}
                  onChange={(v) => set("startTime", v)}
                  required
                  styles={styles}
                />
                <Field
                  label="End time"
                  type="time"
                  value={form.endTime}
                  onChange={(v) => set("endTime", v)}
                  required
                  styles={styles}
                />
              </div>
              <Field
                label="Room / classroom"
                value={form.room}
                onChange={(v) => set("room", v)}
                placeholder="e.g. Room 204"
                styles={styles}
              />
              <Field
                label="Building / location"
                value={form.building}
                onChange={(v) => set("building", v)}
                placeholder="e.g. Science Building"
                styles={styles}
              />
              <div className="grid grid-cols-1 gap-2">
                <label className="text-sm">
                  <span
                    className={`mb-1.5 block font-medium ${styles.secondaryText}`}
                  >
                    Class type
                  </span>
                  <select
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2.5 ${styles.border} ${styles.input}`}
                  >
                    <option>Lecture</option>
                    <option>Laboratory</option>
                    <option>Online</option>
                    <option>Hybrid</option>
                  </select>
                </label>
              </div>
              <fieldset>
                <legend
                  className={`mb-2 text-sm font-medium ${styles.secondaryText}`}
                >
                  Recurring days
                </legend>
                <div className="flex flex-wrap gap-1">
                  {DAYS.map((day) => (
                    <button
                      key={day.key}
                      type="button"
                      aria-pressed={form.days.includes(day.key)}
                      onClick={() => toggleDay(day.key)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${form.days.includes(day.key) ? "border-blue-500 bg-blue-500 text-white" : `${styles.border} ${styles.secondaryText}`}`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {!form.days.length && (
                  <p className="mt-2 text-xs text-red-500">
                    Select at least one day.
                  </p>
                )}
              </fieldset>
              <label className="block text-sm">
                <span
                  className={`mb-1.5 block font-medium ${styles.secondaryText}`}
                >
                  Additional notes
                </span>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows="3"
                  placeholder="Class instructions..."
                  className={`w-full resize-none rounded-lg border px-3 py-2.5 ${styles.border} ${styles.input}`}
                />
              </label>
              <fieldset className={`rounded-lg border p-3 ${styles.border}`}>
                <legend
                  className={`px-1 text-sm font-medium ${styles.secondaryText}`}
                >
                  Email reminders
                </legend>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form.reminderEnabled)}
                    onChange={(e) => set("reminderEnabled", e.target.checked)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <span>
                    <span className="block font-medium">
                      Email me a reminder
                    </span>
                    <span
                      className={`mt-0.5 block text-xs ${styles.secondaryText}`}
                    >
                      Sent to your verified account email.
                    </span>
                  </span>
                </label>
                {form.reminderEnabled && (
                  <label className="mt-3 block text-sm">
                    <span
                      className={`mb-1.5 block font-medium ${styles.secondaryText}`}
                    >
                      Send reminder
                    </span>
                    <select
                      value={form.reminder || 15}
                      onChange={(e) => set("reminder", Number(e.target.value))}
                      className={`w-full rounded-lg border px-3 py-2.5 ${styles.border} ${styles.input}`}
                    >
                      <option value={10}>10 minutes before</option>
                      <option value={15}>15 minutes before</option>
                      <option value={30}>30 minutes before</option>
                      <option value={60}>1 hour before</option>
                    </select>
                  </label>
                )}
              </fieldset>
            </div>
            <div
              className={`flex shrink-0 items-center justify-end gap-2 border-t p-4 ${styles.border}`}
            >
             
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`rounded-lg px-4 py-2 text-sm ${styles.buttonFrost}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSave || busy}
                  className={`rounded-lg px-4 py-2 text-sm ${styles.buttonPrimary} disabled:opacity-50`}
                >
                  {busy ? "Saving…" : form.id ? "Save changes" : "Add class"}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export function ScheduleDeleteModal({ item, styles: providedStyles, busy = false, onClose, onConfirm }) {
  const localStyles = Styling();
  const styles = providedStyles || localStyles;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-schedule-title"
        aria-describedby="delete-schedule-description"
        className={`w-full max-w-sm rounded-lg border p-6 shadow-2xl ${styles.border} ${styles.secondaryBg}`}
      >
        <div className="flex items-start gap-3">
          
          <div>
            <h2 id="schedule-modal-title" className="text-xl font-bold mb-4">
              Delete this class?
            </h2>
            <p id="delete-schedule-description" className={`mt-1 text-sm ${styles.secondaryText}`}>
              <strong className={styles.primaryText}>{item.subject}</strong>{" "}
              will be permanently removed from your schedule, and its future reminders will be cancelled.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button 
            type="button" 
            disabled={busy} 
            onClick={onClose} 
            aria-label="Cancel deletion"
            className={`rounded-lg px-4 py-2 text-sm ${styles.buttonFrost}`}
          >
            Cancel
          </button>
          <button 
            type="button" 
            disabled={busy} 
            onClick={() => onConfirm(item)} 
            aria-label="Confirm deletion"
            className={`rounded-lg px-4 py-2 text-sm ${styles.buttonDanger} cursor-pointer`}
          >
            {busy ? "Deleting…" : "Delete class"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value, styles }) {
  return (
    <div>
      <p className={`text-xs font-medium ${styles.secondaryText}`}>{label}</p>
      <p className="mt-1 text-sm">{value || "Not set"}</p>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value = "",
  onChange,
  required = false,
  placeholder,
  styles,
}) {
  return (
    <label className="block text-sm">
      <span className={`mb-1.5 block font-medium ${styles.secondaryText}`}>
        {label}
      </span>
      <input
        type={type}
        value={value || ""}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm ${styles.border} ${styles.input}`}
      />
    </label>
  );
}
