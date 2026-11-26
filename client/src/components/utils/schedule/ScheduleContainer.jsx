import {
  BadgePlus,
  CalendarDays,
  CalendarRange,
  List,
} from "lucide-react";
import { DAYS, minute, timeLabel } from "./ScheduleUtils";

const VIEW_OPTIONS = [
  ["Week", CalendarRange],
  ["Month", CalendarDays],
  ["Table", List],
];

const TABLE_COLUMNS = [
  "Subject",
  "Course code",
  "Weekday(s)",
  "Time",
  "Instructor",
  "Room / location",
  "Reminder",
  "Actions",
];

export default function ScheduleContainer({
  classes,
  loading,
  styles,
  view,
  onViewChange,
  onAdd,
  month,
  now,
  expandedMonthDay,
  setExpandedMonthDay,
  onEdit,
  actionButtons,
  subjectColor,
  todayClasses,
  nextClass,
  weekCount,
}) {
  const todayKey = DAYS[(now.getDay() + 6) % 7].key;
  const classesFor = (dayKey) =>
    classes
      .filter((item) => item.days?.includes(dayKey))
      .sort((first, second) => minute(first.startTime) - minute(second.startTime));

  return (
    <>
      <SummaryCards
        classes={classes}
        loading={loading}
        styles={styles}
        todayClasses={todayClasses}
        nextClass={nextClass}
        weekCount={weekCount}
      />

      <section
        className={`overflow-hidden rounded-lg border shadow-sm ${styles.border} ${styles.secondaryBg}`}
      >
        <ViewToolbar
          loading={loading}
          styles={styles}
          view={view}
          onViewChange={onViewChange}
          onAdd={onAdd}
        />

        {loading ? (
          <ViewSkeleton view={view} styles={styles} />
        ) : classes.length === 0 ? (
          <EmptySchedule styles={styles} onAdd={onAdd} />
        ) : view === "Table" ? (
          <ScheduleTable
            classes={classes}
            styles={styles}
            subjectColor={subjectColor}
            actionButtons={actionButtons}
            onEdit={onEdit}
          />
        ) : view === "Week" ? (
          <WeekView
            classesFor={classesFor}
            todayKey={todayKey}
            styles={styles}
            subjectColor={subjectColor}
            actionButtons={actionButtons}
            onEdit={onEdit}
          />
        ) : (
          <MonthView
            month={month}
            now={now}
            classesFor={classesFor}
            styles={styles}
            subjectColor={subjectColor}
            onEdit={onEdit}
            expandedMonthDay={expandedMonthDay}
            setExpandedMonthDay={setExpandedMonthDay}
          />
        )}
      </section>
    </>
  );
}

function SummaryCards({
  classes,
  loading,
  styles,
  todayClasses,
  nextClass,
  weekCount,
}) {
  if (loading) {
    return (
      <section
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Loading schedule summary"
      >
        <SummarySkeleton styles={styles} />
      </section>
    );
  }

  const cards = [
    { label: "Classes per week", value: weekCount },
    {
      label: "Next Class",
      value: nextClass
        ? nextClass.status === "Next Class"
          ? timeLabel(nextClass.item.startTime)
          : `Until ${timeLabel(nextClass.item.endTime)}`
        : "No upcoming classes",
    },
    {
      label: "Today",
      value: `${todayClasses.length} ${todayClasses.length === 1 ? "class" : "classes"}`,
    },
    {
      label: "Reminder emails",
      value: classes.filter((item) => item.reminderEnabled).length,
    },
  ];

  return (
    <section
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Schedule summary"
    >
      {cards.map(({ label, value }) => (
        <article
          key={label}
          className={`flex items-center gap-4 rounded-lg border p-4 shadow-sm ${styles.border} ${styles.secondaryBg}`}
        >
          <div className="min-w-0">
            <p className={`text-sm font-medium ${styles.secondaryText}`}>
              {label}
            </p>
            <p className="mt-1 truncate font-bold" title={String(value)}>
              {value}
            </p>
            {label === "Next Class" && nextClass && (
              <p className={`truncate text-xs ${styles.secondaryText}`}>
                {nextClass.date} · {nextClass.item.subject}
              </p>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

function ViewToolbar({ loading, styles, view, onViewChange, onAdd }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 ${styles.border}`}
    >
      <div
        role="group"
        aria-label="Schedule view"
        className={`inline-flex shrink-0 rounded-lg border ${styles.border}`}
      >
        {VIEW_OPTIONS.map(([mode, Icon], index) => (
          <button
            key={mode}
            type="button"
            aria-pressed={view === mode}
            onClick={() => onViewChange(mode)}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              index === 0
                ? "rounded-l-lg"
                : index === VIEW_OPTIONS.length - 1
                  ? "rounded-r-lg"
                  : "rounded-none"
            } ${
              view === mode
                ? styles.blueBg2
                : `${styles.secondaryText} ${styles.secondaryBgHover}`
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {mode}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          aria-hidden="true"
          className={`h-10 w-36 animate-pulse rounded-lg ${styles.tertiaryBg || "bg-gray-300/40"}`}
        />
      ) : (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add schedule"
          className={`flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${styles.blueBg2} ${styles.blueBg2hover}`}
        >
          <BadgePlus size={16} />
          Add Schedule
        </button>
      )}
    </div>
  );
}

function EmptySchedule({ styles, onAdd }) {
  return (
    <div className="p-10 text-center">
      <p className="font-semibold">No classes scheduled yet.</p>
      <p className={`mt-1 text-sm ${styles.secondaryText}`}>
        Add a class to see your week here.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className={`mt-4 min-h-11 rounded-md px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${styles.buttonBlue}`}
      >
        Add your first class
      </button>
    </div>
  );
}

function ScheduleTable({ classes, styles, subjectColor, actionButtons, onEdit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className={styles.secondaryBg}>
          <tr>
            {TABLE_COLUMNS.map((column) => (
              <th
                key={column}
                scope="col"
                className={`whitespace-nowrap border-b px-3 py-3 text-sm font-semibold ${styles.border} ${styles.secondaryText}`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {classes.map((item) => (
            <tr
              key={item.id}
              className={`border-b last:border-0 transition-colors hover:bg-blue-500/5 ${styles.border}`}
            >
              <td className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="flex items-center gap-2 text-left font-semibold"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full border ${subjectColor(item).split(" ")[0]}`}
                  />
                  {item.subject}
                </button>
              </td>
              <td className="px-3 py-3">
                <span
                  className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${subjectColor(item)}`}
                >
                  {item.code || "No code"}
                </span>
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {(item.days || []).map((day) => (
                    <span
                      key={day}
                      className={`rounded-full border px-2 py-1 text-xs font-medium ${styles.border} ${styles.secondaryText}`}
                    >
                      {DAYS.find((entry) => entry.key === day)?.label.slice(0, 3)}
                    </span>
                  ))}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                {timeLabel(item.startTime)} – {timeLabel(item.endTime)}
              </td>
              <td className="px-3 py-3">{item.instructor || "—"}</td>
              <td className="px-3 py-3">
                {[item.room, item.building].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-3 py-3">
                {item.reminderEnabled
                  ? `Email · ${item.reminder} min before`
                  : "Off"}
              </td>
              <td className="px-3 py-2">{actionButtons(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekView({
  classesFor,
  todayKey,
  styles,
  subjectColor,
  actionButtons,
  onEdit,
}) {
  const todayIndex = DAYS.findIndex((day) => day.key === todayKey);

  return (
    <div className="grid grid-cols-1 md:grid-cols-7">
      {DAYS.map((day, index) => {
        const dayClasses = classesFor(day.key);
        const isToday = day.key === todayKey;

        return (
          <section
            key={day.key}
            className={`min-h-36 border-x p-3 md:min-h-[400px] ${styles.border} ${
              index === DAYS.length - 1 ? "border-r-0" : ""
            } ${isToday ? "bg-blue-500/5" : ""} ${
              todayIndex > index ? "opacity-65" : ""
            }`}
          >
            <h3
              className={`mb-3 flex items-center justify-between rounded-lg px-2 py-2 text-sm font-bold ${isToday ? styles.blueText : ""}`}
            >
              {day.label}
            </h3>
            <div className="space-y-2">
              {dayClasses.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-lg border border-l-4 p-2.5 shadow-sm ${subjectColor(item)}`}
                >
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                  >
                    <p className="text-sm font-semibold">{item.subject}</p>
                    <p className="mt-1 text-xs font-medium opacity-90">
                      {timeLabel(item.startTime)} – {timeLabel(item.endTime)}
                    </p>
                    <p className="truncate text-xs opacity-90">
                      Room: {item.room || "Room not set"}
                    </p>
                  </button>
                  {actionButtons(item, `${day.key}:${item.id}`)}
                </article>
              ))}
              {dayClasses.length === 0 && (
                <p className={`pt-3 text-center text-xs ${styles.tertiaryText}`}>
                  No classes
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MonthView({
  month,
  now,
  classesFor,
  styles,
  subjectColor,
  onEdit,
  expandedMonthDay,
  setExpandedMonthDay,
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leadingDays = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const calendarDays = [
    ...Array(leadingDays).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className="overflow-x-auto p-3">
      <div className="min-w-[620px]">
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
          {calendarDays.map((day, index) => (
            <MonthDay
              key={day ?? `blank-${index}`}
              day={day}
              year={year}
              monthIndex={monthIndex}
              now={now}
              classesFor={classesFor}
              styles={styles}
              subjectColor={subjectColor}
              onEdit={onEdit}
              expandedMonthDay={expandedMonthDay}
              setExpandedMonthDay={setExpandedMonthDay}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthDay({
  day,
  year,
  monthIndex,
  now,
  classesFor,
  styles,
  subjectColor,
  onEdit,
  expandedMonthDay,
  setExpandedMonthDay,
}) {
  if (!day) {
    return (
      <div
        className={`h-28 border-b border-r ${styles.border}`}
        aria-hidden="true"
      />
    );
  }

  const date = new Date(year, monthIndex, day);
  const dateKey = date.toDateString();
  const dayKey = DAYS[(date.getDay() + 6) % 7].key;
  const dayClasses = classesFor(dayKey);
  const isToday = dateKey === now.toDateString();
  const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const visibleClasses = dayClasses.slice(
    0,
    expandedMonthDay === dateKey ? undefined : 2,
  );

  return (
    <div
      className={`min-h-28 border-b border-r p-1.5  ${
        isToday
          ? styles.blueBg2
          : isPast
            ? "opacity-55"
            : ""
      }`}
    >
      <span
        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-blue-600 text-white" : ""}`}
      >
        {day}
      </span>
      <div className="mt-1 space-y-1">
        {visibleClasses.map((item) => (
          <button
            key={item.id}
            type="button"
            title={`${timeLabel(item.startTime)} ${item.subject}`}
            onClick={() => onEdit(item)}
            className={`block min-h-8 w-full truncate rounded border-l-2 px-1.5 py-1 text-left text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${subjectColor(item)}`}
          >
            {timeLabel(item.startTime)} {item.subject}
          </button>
        ))}
        {dayClasses.length > 2 && (
          <button
            type="button"
            onClick={() =>
              setExpandedMonthDay((current) =>
                current === dateKey ? null : dateKey,
              )
            }
            className="block w-full rounded px-1 py-1 text-left text-xs font-semibold "
            aria-expanded={expandedMonthDay === dateKey}
          >
            {expandedMonthDay === dateKey
              ? "Show fewer"
              : `+${dayClasses.length - 2} more`}
          </button>
        )}
      </div>
    </div>
  );
}

function SummarySkeleton({ styles }) {
  return Array.from({ length: 4 }, (_, index) => (
    <article
      key={index}
      aria-hidden="true"
      className={`animate-pulse rounded-lg border p-4 shadow-sm ${styles.border} ${styles.secondaryBg}`}
    >
      <div
        className={`h-3 w-24 rounded ${styles.tertiaryBg || "bg-gray-300/40"}`}
      />
      <div
        className={`mt-3 h-5 w-32 rounded ${styles.tertiaryBg || "bg-gray-300/40"}`}
      />
    </article>
  ));
}

function ViewSkeleton({ view, styles }) {
  if (view === "Table") {
    return (
      <div
        role="status"
        aria-label="Loading schedule"
        className="animate-pulse space-y-3 p-5"
      >
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }, (_, cell) => (
              <div
                key={cell}
                className={`h-7 rounded ${styles.tertiaryBg || "bg-gray-300/40"}`}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (view === "Month") {
    return (
      <div
        role="status"
        aria-label="Loading schedule"
        className="animate-pulse p-4"
      >
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: 35 }, (_, cell) => (
            <div
              key={cell}
              className={`h-20 rounded border ${styles.border} ${styles.tertiaryBg || "bg-gray-300/20"}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading schedule"
      className="animate-pulse grid grid-cols-1 gap-px md:grid-cols-7"
    >
      {DAYS.map((day) => (
        <div
          key={day.key}
          className={`min-h-[260px] space-y-3 border p-3 ${styles.border}`}
        >
          <div
            className={`h-5 w-20 rounded ${styles.tertiaryBg || "bg-gray-300/40"}`}
          />
          {[0, 1, 2].map((card) => (
            <div
              key={card}
              className={`h-20 rounded-lg border ${styles.border} ${styles.tertiaryBg || "bg-gray-300/20"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
