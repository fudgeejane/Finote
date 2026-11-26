import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgePlus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Styling from "../../components/theme/Styling";
import ScheduleModal, { ScheduleDeleteModal } from "../../components/utils/schedule/ScheduleModal";
import ScheduleContainer from "../../components/utils/schedule/ScheduleContainer";
import { useAuth } from "../../auth/AuthContext";
import ScheduleActionMenu from "../../components/utils/schedule/ScheduleActionMenu";
import { countOccurrencesThisWeek, getNextClass, getTodayClasses, minute } from "../../components/utils/schedule/ScheduleUtils";

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
  reminderEnabled: false,
  reminder: 15,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

export default function SchedulePage() {
  const styles = Styling();
  const { apiRequest, user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [openActionId, setOpenActionId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modal, setModal] = useState(null);
  const [view, setView] = useState("Week");
  const [expandedMonthDay, setExpandedMonthDay] = useState(null);
  const [month] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [now, setNow] = useState(() => new Date());
  const requestSequence = useRef(0);

  const load = useCallback(async (signal) => {
    const requestId = ++requestSequence.current;
    const startedAt = Date.now();
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/schedules", { signal });
      if (signal?.aborted || requestId !== requestSequence.current) return;
      setClasses(result.schedules || []);
    } catch (e) {
      if (signal?.aborted || requestId !== requestSequence.current || e.name === "AbortError") return;
      setError(e.message || "Could not load schedules.");
    } finally {
      const remaining = Math.max(0, 2000 - (Date.now() - startedAt));
      if (remaining && !signal?.aborted) {
        await new Promise((resolve) => {
          const finish = () => {
            window.clearTimeout(timer);
            signal?.removeEventListener("abort", finish);
            resolve();
          };
          const timer = window.setTimeout(finish, remaining);
          signal?.addEventListener("abort", finish, { once: true });
        });
      }
      if (!signal?.aborted && requestId === requestSequence.current) setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      requestSequence.current += 1;
    };
  }, [load, user?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function saveClass(item) {
    if (!item.subject.trim() || !item.days.length || minute(item.endTime) <= minute(item.startTime)) {
      toast.error("Enter a subject, choose at least one day, and set a valid time range.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const isEdit = Boolean(item.id);
      const result = await apiRequest(
        isEdit ? `/schedules/${encodeURIComponent(item.id)}` : "/schedules",
        { method: isEdit ? "PUT" : "POST", body: JSON.stringify(item) },
      );
      setClasses((current) => isEdit
        ? current.map((row) => row.id === result.schedule.id ? result.schedule : row)
        : [...current, result.schedule]);
      setModal(null);
      toast.success(isEdit ? "Schedule updated." : "Schedule added.");
    } catch (e) {
      setError(e.message || "Could not save schedule.");
      toast.error(e.message || "Could not save schedule.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteClass(item) {
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/schedules/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      setClasses((current) => current.filter((row) => row.id !== item.id));
      setModal(null);
      setDeleteTarget(null);
      toast.success("Schedule deleted.");
    } catch (e) {
      setError(e.message || "Could not delete schedule.");
      toast.error(e.message || "Could not delete schedule.");
    } finally {
      setBusy(false);
    }
  }

  const requestDelete = (item) => setDeleteTarget(item);
  const subjectPalette = [
    `${styles.blueBg2} ${styles.blueBorder}`,
    `${styles.purpleBg2} ${styles.purpleBorder}`,
    `${styles.greenBg2} ${styles.greenBorder}`,
    `${styles.yellowBg2} ${styles.yellowBorder}`,
    `${styles.redBg2} ${styles.redBorder}`,
  ];
  const subjectColor = (item) => {
    const value = `${item.code || ""}:${item.subject || ""}`.toLowerCase();
    const hash = [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
    return subjectPalette[hash % subjectPalette.length];
  };
  const todayClasses = useMemo(() => getTodayClasses(classes, now), [classes, now]);
  const nextClass = useMemo(() => getNextClass(classes, now), [classes, now]);
  const weekCount = useMemo(() => countOccurrencesThisWeek(classes), [classes]);
  const openEdit = (item) => setModal({ mode: "form", initial: item });
  const actionButtons = (item, actionScope = item.id) => (
    <ScheduleActionMenu
      item={item}
      actionScope={actionScope}
      open={openActionId === actionScope}
      disabled={busy}
      styles={styles}
      onToggle={() => setOpenActionId((current) => current === actionScope ? null : actionScope)}
      onEdit={openEdit}
      onDelete={requestDelete}
      onClose={() => setOpenActionId(null)}
    />
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-serif text-2xl font-semibold sm:text-3xl md:text-4xl">My Schedule</h1>
            <p className={`mt-2 max-w-2xl text-base ${styles.secondaryText}`}>
              Click a class to update it, or use Add Schedule to create a new one.
            </p>
          </div>
          
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-center justify-between rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => load()} className="font-semibold underline">Retry</button>
        </div>
      )}

      <ScheduleContainer
        classes={classes}
        loading={loading}
        styles={styles}
        view={view}
        onViewChange={setView}
        onAdd={() => setModal({ mode: "form", initial: { ...EMPTY_CLASS } })}
        month={month}
        now={now}
        expandedMonthDay={expandedMonthDay}
        setExpandedMonthDay={setExpandedMonthDay}
        onEdit={openEdit}
        actionButtons={actionButtons}
        subjectColor={subjectColor}
        todayClasses={todayClasses}
        nextClass={nextClass}
        weekCount={weekCount}
      />

      {modal && (
        <ScheduleModal
          initial={modal.initial || {}}
          mode={modal.mode}
          classes={classes}
          styles={styles}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={saveClass}
          onDelete={requestDelete}
        />
      )}
      {deleteTarget && (
        <ScheduleDeleteModal
          item={deleteTarget}
          styles={styles}
          busy={busy}
          onClose={() => setDeleteTarget(null)}
          onConfirm={deleteClass}
        />
      )}
    </div>
  );
}
