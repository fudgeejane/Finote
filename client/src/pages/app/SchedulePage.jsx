import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  BadgePlus,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Styling from "../../components/theme/Styling";

const STORAGE_KEY = "finote.student.schedule.v1";
const API_URL = "/api/schedules";
const DAYS = [
  { key: "Mon", label: "Monday" },
  { key: "Tue", label: "Tuesday" },
  { key: "Wed", label: "Wednesday" },
  { key: "Thu", label: "Thursday" },
  { key: "Fri", label: "Friday" },
  { key: "Sat", label: "Saturday" },
  { key: "Sun", label: "Sunday" },
];

const INITIAL_SCHEDULE = [
  {
    id: "demo-1",
    subject: "Cell Biology",
    code: "BIO 102",
    instructor: "Dr. Elaine Park",
    startTime: "08:30",
    endTime: "10:00",
    room: "B-204",
    building: "Science Hall",
    type: "Lecture",
    section: "A",
    notes: "Bring lab workbook.",
    days: ["Mon", "Wed", "Fri"],
    recurring: true,
    reminder: 15,
    color: "blue",
  },
  {
    id: "demo-2",
    subject: "Calculus I",
    code: "MATH 101",
    instructor: "Prof. James Liu",
    startTime: "10:30",
    endTime: "12:00",
    room: "A-118",
    building: "Main Building",
    type: "Lecture",
    section: "B",
    notes: "Midterm review.",
    days: ["Mon", "Wed"],
    recurring: true,
    reminder: 15,
    color: "purple",
  },
  {
    id: "demo-3",
    subject: "World History",
    code: "HIST 210",
    instructor: "Dr. Maria Santos",
    startTime: "13:00",
    endTime: "14:30",
    room: "C-302",
    building: "Humanities Wing",
    type: "Hybrid",
    section: "C",
    notes: "Join the online session after discussion.",
    days: ["Tue", "Thu"],
    recurring: true,
    reminder: 30,
    color: "orange",
  },
  {
    id: "demo-4",
    subject: "Chemistry Lab",
    code: "CHEM 103L",
    instructor: "Prof. Noah Kim",
    startTime: "09:00",
    endTime: "11:30",
    room: "Lab 3",
    building: "Science Hall",
    type: "Laboratory",
    section: "A",
    notes: "Closed-toe shoes required.",
    days: ["Tue", "Sat"],
    recurring: true,
    reminder: 30,
    color: "green",
  },
];

const EMPTY_CLASS = {
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
  recurring: true,
  reminder: 15,
  color: "blue",
};

const COLOR_CLASSES = {
  blue: "border-l-blue-500 bg-blue-500/10",
  purple: "border-l-purple-500 bg-purple-500/10",
  orange: "border-l-orange-500 bg-orange-500/10",
  green: "border-l-green-500 bg-green-500/10",
  red: "border-l-red-500 bg-red-500/10",
};

function minutes(time) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function formatTime(time) {
  const [hours, mins] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(mins).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

function readLocalSchedule() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : INITIAL_SCHEDULE;
  } catch {
    return INITIAL_SCHEDULE;
  }
}

export default function SchedulePage() {
  const styles = Styling();
  const now = new Date();
  const jsDay = new Date().getDay();
  const currentDay = DAYS[(jsDay + 6) % 7]?.key;
  const [classes, setClasses] = useState(readLocalSchedule);
  const [modal, setModal] = useState(null);
  const [viewMode, setViewMode] = useState("Week");
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );

  useEffect(() => {
    let cancelled = false;
    fetch(API_URL)
      .then((response) => (response.ok ? response.json() : null))
      .then((items) => {
        if (!cancelled && Array.isArray(items) && items.length)
          setClasses(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
  }, [classes]);

  const todayClasses = classes
    .filter((item) => item.days.includes(currentDay))
    .sort((a, b) => minutes(a.startTime) - minutes(b.startTime));

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = todayClasses.find(
    (item) => minutes(item.endTime) >= nowMinutes,
  );

  const saveClass = (item) => {
    if (!item.subject.trim() || !item.startTime || !item.endTime) {
      toast.error("Subject and class times are required.");
      return;
    }
    if (minutes(item.endTime) <= minutes(item.startTime)) {
      toast.error("End time must be after the start time.");
      return;
    }
    const overlap = item.days.some((day) =>
      classes.some(
        (existing) =>
          existing.id !== item.id &&
          existing.days.includes(day) &&
          minutes(item.startTime) < minutes(existing.endTime) &&
          minutes(item.endTime) > minutes(existing.startTime),
      ),
    );
    if (overlap) {
      toast.error(
        "This overlaps with another class. Choose another time or day.",
      );
      return;
    }

    if (item.id) {
      setClasses((current) =>
        current.map((entry) => (entry.id === item.id ? item : entry)),
      );
      if (!String(item.id).startsWith("demo-")) {
        fetch(`${API_URL}/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        }).catch(() => {});
      }
    } else {
      const saved = { ...item, id: `${Date.now()}` };
      setClasses((current) => [...current, saved]);
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saved),
      }).catch(() => {});
    }
    setModal(null);
    toast.success(item.id ? "Schedule updated." : "Schedule added.");
  };

  const gaps = [];
  let cursor = 480;
  todayClasses.forEach((item) => {
    if (minutes(item.startTime) > cursor)
      gaps.push({ start: cursor, end: minutes(item.startTime) });
    cursor = Math.max(cursor, minutes(item.endTime));
  });

  return (
    <div className="space-y-4">
      <header className={`border-b pb-4 sm:pb-6 ${styles.border}`}>
        <div className="mt-2 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-serif text-2xl font-semibold sm:text-3xl md:text-4xl">
              My Schedule
            </h1>
            <p className={`mt-2 text-sm ${styles.secondaryText}`}>
              Manage your daily study schedule.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setModal({ mode: "edit", selectedId: null });
              }}
              className={`px-4 py-2 text-sm rounded-md ${styles.buttonFrost}`}
            >
              Edit Schedule
            </button>
            <button
              type="button"
              onClick={() => {
                setModal({ ...EMPTY_CLASS });
              }}
              className={`px-4 py-2 text-sm rounded-md ${styles.buttonBlue}`}
            >
              Add Schedule
            </button>
          </div>
        </div>
      </header>

      <section className="grid  gap-2 grid-cols-2 lg:grid-cols-4">
        <article
          className={`flex min-h-20 items-center rounded-lg border px-4 sm:min-h-[92px] sm:px-5 ${styles.border} ${styles.secondaryBg}`}
        >
          <div>
            <p className={`text-[11px] ${styles.secondaryText}`}>
              Classes this week
            </p>
            <p className="mt-1 truncate text-[17px] font-bold">
              {classes.length}
            </p>
          </div>
        </article>
        <article
          className={`flex min-h-20 items-center rounded-lg border px-4 sm:min-h-[92px] sm:px-5 ${styles.border} ${styles.secondaryBg}`}
        >
          <div className="min-w-0">
            <p className={`text-[11px] ${styles.secondaryText}`}>Next Class</p>
            <p className="mt-1 truncate text-[17px] font-bold">
              {upcoming ? formatTime(upcoming.startTime) : "No class remaining"}
            </p>
            {upcoming && (
              <p
                className={`mt-0.5 truncate text-[11px] ${styles.secondaryText}`}
              >
                {upcoming.subject}
              </p>
            )}
          </div>
        </article>
        <article
          className={`flex min-h-20 items-center rounded-lg border px-4 sm:min-h-[92px] sm:px-5 ${styles.border} ${styles.secondaryBg}`}
        >
          <div>
            <p className={`text-[11px] ${styles.secondaryText}`}>
              Free Time Today
            </p>
            <p className="mt-1 truncate text-[17px] font-bold">
              {gaps.length
                ? `${Math.floor(gaps.reduce((sum, gap) => sum + gap.end - gap.start, 0) / 60)}h ${gaps.reduce((sum, gap) => sum + gap.end - gap.start, 0) % 60}m`
                : "12h 00m"}
            </p>
          </div>
        </article>
        <article
          className={`flex min-h-20 items-center rounded-lg border px-4 sm:min-h-[92px] sm:px-5 ${styles.border} ${styles.secondaryBg}`}
        >
          <div>
            <p className={`text-[11px] ${styles.secondaryText}`}>
              Schedule is clear.
            </p>
            <p className="mt-1 truncate text-[17px] font-bold">No Conflicts</p>
          </div>
        </article>
      </section>

      <section
        className={`overflow-hidden rounded-md border ${styles.border} ${styles.secondaryBg}`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 ${styles.border}`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`flex rounded-md border ${styles.border}`}
              aria-label="Schedule view"
            >
              {["Week", "Month"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`h-8 px-3 text-xs font-semibold ${viewMode === mode ? `${styles.blueBg2} ${styles.blueText} ${mode === "Week" ? "rounded-l-md" : "rounded-r-md"}` : styles.secondaryText}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {viewMode === "Month" && (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMonthCursor(
                      (date) =>
                        new Date(date.getFullYear(), date.getMonth() - 1, 1),
                    )
                  }
                  aria-label="Previous month"
                  className={`flex h-8 w-8 items-center justify-center rounded-md ${styles.buttonFrost}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-28 text-center text-xs font-semibold sm:min-w-36 sm:text-sm">
                  {monthCursor.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setMonthCursor(
                      (date) =>
                        new Date(date.getFullYear(), date.getMonth() + 1, 1),
                    )
                  }
                  aria-label="Next month"
                  className={`flex h-8 w-8 items-center justify-center rounded-md ${styles.buttonFrost}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {viewMode === "Week" && (
          <div className="p-2 sm:p-3 md:overflow-x-auto md:p-4">
            <div className="grid grid-cols-1 gap-2 md:min-w-[840px] md:grid-cols-7">
              {DAYS.map((day) => {
                const dayClasses = classes
                  .filter((item) => item.days.includes(day.key))
                  .sort((a, b) => minutes(a.startTime) - minutes(b.startTime));
                const isCurrent = day.key === currentDay;
                return (
                  <section
                    key={day.key}
                    className={`min-h-32 rounded-lg border p-2 md:min-h-[520px] ${isCurrent ? "border-blue-500" : styles.border}`}
                  >
                    <div className="mb-3 w-full text-left">
                      <span
                        className={`block text-xs font-bold ${isCurrent ? "text-blue-600" : ""}`}
                      >
                        {day.label}
                      </span>
                      {isCurrent && (
                        <span
                          className={`mt-1 block text-[10px] ${styles.secondaryText}`}
                        >
                          Today
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {dayClasses.map((item) => (
                        <article
                          key={item.id}
                          className={`rounded-md border-l-4 p-2 ${COLOR_CLASSES[item.color] || COLOR_CLASSES.blue}`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ mode: "edit", selectedId: item.id })
                            }
                            className="w-full text-left"
                          >
                            <p className="text-[11px] font-bold">
                              {item.subject}
                            </p>
                            <p
                              className={`mt-1 text-[9px] ${styles.secondaryText}`}
                            >
                              {formatTime(item.startTime)} -{" "}
                              {formatTime(item.endTime)}
                            </p>
                            <p
                              className={`mt-0.5 truncate text-[9px] ${styles.secondaryText}`}
                            >
                              {item.room || "Room not set"}
                            </p>
                          </button>
                        </article>
                      ))}
                      {!dayClasses.length && (
                        <p
                          className={`pt-3 text-center text-[10px] ${styles.tertiaryText}`}
                        >
                          No classes
                        </p>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "Month" && (
          <div className="overflow-x-auto p-2 sm:p-4">
            <div className="min-w-[620px] sm:min-w-[700px]">
              <div className="grid grid-cols-7">
                {DAYS.map((day) => (
                  <div
                    key={day.key}
                    className={`border-b px-2 py-2 text-center text-xs font-semibold ${styles.border} ${styles.secondaryText}`}
                  >
                    {day.label.slice(0, 3)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {(() => {
                  const year = monthCursor.getFullYear();
                  const month = monthCursor.getMonth();
                  const first = new Date(year, month, 1);
                  const leading = (first.getDay() + 6) % 7;
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const cells = [];
                  for (let i = 0; i < leading; i++) cells.push(null);
                  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
                  while (cells.length % 7) cells.push(null);
                  return cells.map((day, index) => {
                    if (!day)
                      return (
                        <div
                          key={`blank-${index}`}
                          className={`h-24 border-b border-r sm:h-32 ${styles.border} ${styles.secondaryBg}`}
                        />
                      );
                    const date = new Date(year, month, day);
                    const dayKey = DAYS[(date.getDay() + 6) % 7].key;
                    const dayClasses = classes
                      .filter((item) => item.days.includes(dayKey))
                      .sort(
                        (a, b) => minutes(a.startTime) - minutes(b.startTime),
                      );
                    const isToday = date.toDateString() === now.toDateString();
                    return (
                      <div
                        key={day}
                        className={`h-24 overflow-hidden border-b border-r p-1.5 sm:h-32 sm:p-2 ${styles.border}`}
                      >
                        <span
                          className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-blue-600 text-white" : ""}`}
                        >
                          {day}
                        </span>
                        <div className="space-y-1">
                          {dayClasses.slice(0, 3).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                setModal({ mode: "edit", selectedId: item.id })
                              }
                              className={`block w-full truncate rounded px-1.5 py-1 text-left text-[9px] font-semibold ${item.color === "purple" ? "bg-purple-100 text-purple-800" : item.color === "green" ? "bg-green-100 text-green-800" : item.color === "orange" ? "bg-orange-100 text-orange-800" : item.color === "red" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}
                            >
                              {formatTime(item.startTime)} {item.subject}
                            </button>
                          ))}
                          {dayClasses.length > 3 && (
                            <p className={`text-[9px] ${styles.secondaryText}`}>
                              +{dayClasses.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}
      </section>

      {modal && (
        <ScheduleModal
          initial={modal}
          classes={classes}
          styles={styles}
          onClose={() => setModal(null)}
          onSave={saveClass}
        />
      )}
    </div>
  );
}

function ScheduleModal({ initial, classes, styles, onClose, onSave }) {
  const [step, setStep] = useState(initial.mode === "edit" ? "select" : "form");
  const [form, setForm] = useState(
    initial.selectedId
      ? classes.find((item) => item.id === initial.selectedId) || initial
      : initial,
  );
  const set = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const toggleDay = (day) =>
    setForm((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((item) => item !== day)
        : [...current.days, day],
    }));

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
        aria-labelledby="schedule-modal-title"
        className={`modal-scroll flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
      >
        <header
          className={`sticky top-0 z-10 flex items-start justify-between border-b px-5 py-4 ${styles.border} ${styles.secondaryBg}`}
        >
          <div>
            <h2 id="schedule-modal-title" className="text-xl font-bold">
              {step === "select"
                ? "Select a course"
                : form.id
                  ? "Edit class"
                  : "Add new class"}
            </h2>
            <p className={`mt-1 text-xs ${styles.secondaryText}`}>
              {step === "select"
                ? "Choose the subject schedule you want to edit."
                : "Set the class details and recurring days."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={styles.closeButton}
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        {step === "select" ? (
          <div className="space-y-2 p-5">
            {classes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setForm({ ...item });
                  setStep("form");
                }}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left ${styles.border} ${styles.secondaryBgHover}`}
              >
                <span>
                  <span className="block font-semibold">{item.subject}</span>
                  <span
                    className={`mt-1 block text-xs ${styles.secondaryText}`}
                  >
                    {item.code || "No course code"} ·{" "}
                    {item.days.map((day) => day).join(", ")}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ))}
            {!classes.length && (
              <p className={`py-8 text-center text-sm ${styles.secondaryText}`}>
                No scheduled courses available.
              </p>
            )}
            <div className={`flex justify-end border-t pt-4 ${styles.border}`}>
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
            className="space-y-4 p-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Course / subject name"
                value={form.subject}
                onChange={(value) => set("subject", value)}
                required
              />
              <Field
                label="Course code"
                value={form.code}
                onChange={(value) => set("code", value)}
              />
              <Field
                label="Instructor"
                value={form.instructor}
                onChange={(value) => set("instructor", value)}
              />
              <Field
                label="Section"
                value={form.section}
                onChange={(value) => set("section", value)}
              />
              <Field
                label="Start time"
                type="time"
                value={form.startTime}
                onChange={(value) => set("startTime", value)}
                required
              />
              <Field
                label="End time"
                type="time"
                value={form.endTime}
                onChange={(value) => set("endTime", value)}
                required
              />
              <Field
                label="Room / classroom"
                value={form.room}
                onChange={(value) => set("room", value)}
              />
              <Field
                label="Building / location"
                value={form.building}
                onChange={(value) => set("building", value)}
              />
              <label className="text-sm">
                <span
                  className={`mb-1.5 block font-medium ${styles.secondaryText}`}
                >
                  Class type
                </span>
                <select
                  value={form.type}
                  onChange={(event) => set("type", event.target.value)}
                  className={`w-full rounded-lg border px-3 py-2.5 ${styles.border} ${styles.input}`}
                >
                  <option>Lecture</option>
                  <option>Laboratory</option>
                  <option>Online</option>
                  <option>Hybrid</option>
                </select>
              </label>
              <label className="text-sm">
                <span
                  className={`mb-1.5 block font-medium ${styles.secondaryText}`}
                >
                  Card color
                </span>
                <select
                  value={form.color}
                  onChange={(event) => set("color", event.target.value)}
                  className={`w-full rounded-lg border px-3 py-2.5 ${styles.border} ${styles.input}`}
                >
                  <option value="blue">Blue</option>
                  <option value="purple">Purple</option>
                  <option value="orange">Orange</option>
                  <option value="green">Green</option>
                  <option value="red">Red</option>
                </select>
              </label>
            </div>
            <div>
              <span
                className={`mb-2 block text-sm font-medium ${styles.secondaryText}`}
              >
                Recurring days
              </span>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold ${form.days.includes(day.key) ? "border-blue-500 bg-blue-500 text-white" : `${styles.border} ${styles.secondaryText}`}`}
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
            </div>
            <label className="block text-sm">
              <span
                className={`mb-1.5 block font-medium ${styles.secondaryText}`}
              >
                Additional notes
              </span>
              <textarea
                value={form.notes}
                onChange={(event) => set("notes", event.target.value)}
                rows="3"
                placeholder="Reminders or class instructions..."
                className={`w-full resize-none rounded-lg border px-3 py-2.5 ${styles.border} ${styles.input}`}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span
                  className={`mb-1.5 block font-medium ${styles.secondaryText}`}
                >
                  Remind me
                </span>
                <select
                  value={form.reminder}
                  onChange={(event) =>
                    set("reminder", Number(event.target.value))
                  }
                  className={`w-full rounded-lg border px-3 py-2.5 ${styles.border} ${styles.input}`}
                >
                  <option value={10}>10 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                </select>
              </label>
              <label
                className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm ${styles.border}`}
              >
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(event) => set("recurring", event.target.checked)}
                  className="h-4 w-4"
                />
                <span>Repeat every week</span>
              </label>
            </div>
            <div
              className={`flex justify-end gap-2 border-t pt-4 ${styles.border}`}
            >
              <button
                type="button"
                onClick={onClose}
                className={`rounded-lg px-4 py-2 text-sm ${styles.buttonGray}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!form.days.length}
                className={`rounded-lg px-4 py-2 text-sm ${styles.buttonBlue}`}
              >
                {form.id ? "Save changes" : "Add class"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, required }) {
  const styles = Styling();
  return (
    <label className="text-sm">
      <span className={`mb-1.5 block font-medium ${styles.secondaryText}`}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border px-3 py-2.5 ${styles.border} ${styles.input}`}
      />
    </label>
  );
}
