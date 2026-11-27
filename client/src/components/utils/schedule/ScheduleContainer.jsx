import {
  BadgePlus,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
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
  "Day(s)",
  "Time",
  "Instructor",
  "Room",
  "Reminder",
  "",
];

export default function ScheduleContainer({
  classes,
  loading,
  styles,
  view,
  onViewChange,
  onAdd,
  month,
  setMonth,
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
            setMonth={setMonth}
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
          className={`flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm ${styles.buttonFrost}`}
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
              <td className="min-w-48 px-3 py-3">
               
                  <span className="min-w-0">
                    <span className="block font-semibold">{item.subject}</span>
                    <span className={`mt-1 text-[11px]`}>
                      {item.code || "No course code"}
                    </span>
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
              <div>Room: {item.room}</div>
              <div className="text-[11px] mt-1">{item.building}</div>
            </td>
                    <td className="px-3 py-3">
                {item.reminderEnabled
                  ? `${item.reminder} min before`
                  : "None"}
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
            className={`min-h-36 border-b p-3 md:min-h-[400px] md:border-b-0 md:border-r ${styles.border} ${
              index === DAYS.length - 1 ? "md:border-r-0" : ""
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
                      Room: {item.room || "Not set"}
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
  setMonth,
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
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = index - leadingDays + 1;
    return day < 1 || day > daysInMonth ? null : day;
  });
  const monthTitle = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1 sm:mb-4">
        <div>
          <h2 className={`font-serif text-xl font-semibold sm:text-2xl ${styles.primaryText}`}>{monthTitle}</h2>
          <p className={`mt-0.5 text-xs ${styles.secondaryText}`}>Your recurring classes at a glance</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Previous month" onClick={() => { setExpandedMonthDay(null); setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)); }} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${styles.border} ${styles.secondaryBgHover} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500`}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => { setExpandedMonthDay(null); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); }} disabled={year === now.getFullYear() && monthIndex === now.getMonth()} className={`h-9 rounded-lg border px-3 text-sm font-medium ${styles.border} ${styles.secondaryBgHover} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-default disabled:opacity-50`}>
            Today
          </button>
          <button type="button" aria-label="Next month" onClick={() => { setExpandedMonthDay(null); setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)); }} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${styles.border} ${styles.secondaryBgHover} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500`}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={`overflow-x-auto rounded-md border ${styles.border}`}>
        <div className="min-w-[680px]">
        <div className={`grid grid-cols-7 ${styles.secondaryBg}`}>
          {DAYS.map((day) => (
            <div
              key={day.key}
              className={`border-b px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide sm:text-xs ${day.key !== "Sun" ? "border-r" : ""} ${styles.border} ${styles.secondaryText}`}
            >
              <abbr title={day.label} className="no-underline">{day.label.slice(0, 3)}</abbr>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <MonthDay
              key={day ?? `blank-${index}`}
              day={day}
              index={index}
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
    </div>
  );
}

function MonthDay({
  day,
  index,
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
  const cellBorder = `${index % 7 === 6 ? "" : "border-r"} ${index >= 35 ? "" : "border-b"} ${styles.border}`;
  if (!day) {
    return (
      <div
        className={`min-h-24 p-1.5 sm:min-h-28 ${cellBorder}`}
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
      role="group"
      className={`group min-h-24 p-1.5 transition-colors sm:min-h-28 ${cellBorder} ${isToday ? `${styles.blueBg2} ring-1 ring-inset ring-blue-500/40` : ""}`}
      aria-label={`${date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${dayClasses.length ? `, ${dayClasses.length} ${dayClasses.length === 1 ? "class" : "classes"}` : ", no classes"}`}
    >
      <div className="flex items-center justify-between gap-1">
        <time dateTime={`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`} className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-semibold sm:text-sm ${isToday ? "bg-blue-600 text-white" : isPast ? styles.secondaryText : styles.primaryText}`}>
          {day}
        </time>
        {dayClasses.length > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${styles.secondaryBg} ${styles.secondaryText}`}>{dayClasses.length}</span>}
      </div>
      <div className="mt-1 space-y-1">
        {visibleClasses.map((item) => (
          <button
            key={item.id}
            type="button"
            title={`${timeLabel(item.startTime)} ${item.subject}`}
            onClick={() => onEdit(item)}
            aria-label={`${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}: ${item.subject}, ${timeLabel(item.startTime)} to ${timeLabel(item.endTime)}. Edit schedule.`}
            className={`block min-h-8 w-full truncate rounded-md border-l-2 px-1.5 py-1 text-left text-[10px] font-semibold transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 sm:text-xs ${subjectColor(item)}`}
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
            className={`block w-full rounded-md px-1.5 py-1 text-left text-[10px] font-semibold ${styles.blueText} ${styles.secondaryBgHover} focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 sm:text-xs`}
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
      <div role="status" aria-label="Loading schedule" aria-busy="true" className="animate-pulse overflow-x-auto">
        <div className="min-w-[900px] space-y-3 p-5">
          <div className="grid grid-cols-[minmax(190px,2fr)_repeat(6,minmax(90px,1fr))] gap-4 border-b pb-3">
            {TABLE_COLUMNS.map((column) => (
              <div key={column} className={`h-4 rounded ${styles.tertiaryBg || "bg-gray-300/40"}`} />
            ))}
          </div>
          {Array.from({ length: 6 }, (_, row) => (
            <div key={row} className="grid grid-cols-[minmax(190px,2fr)_repeat(6,minmax(90px,1fr))] items-center gap-4 py-2">
              {TABLE_COLUMNS.map((column, cell) => (
                <div key={column} className="space-y-1.5">
                  <div className={`h-6 rounded ${styles.tertiaryBg || "bg-gray-300/35"}`} />
                  {cell === 0 && <div className={`h-4 w-2/3 rounded ${styles.tertiaryBg || "bg-gray-300/25"}`} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "Month") {
    return (
      <div
        role="status"
        aria-label="Loading monthly schedule"
        aria-busy="true"
        className="animate-pulse p-3 sm:p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-3 px-1 sm:mb-4">
          <div className="space-y-2">
            <div className={`h-6 w-36 rounded ${styles.tertiaryBg || "bg-gray-300/40"}`} />
            <div className={`h-3 w-48 rounded ${styles.tertiaryBg || "bg-gray-300/30"}`} />
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((button) => (
              <div key={button} className={`h-9 ${button === 1 ? "w-16" : "w-9"} rounded-lg ${styles.tertiaryBg || "bg-gray-300/40"}`} />
            ))}
          </div>
        </div>
        <div className={`overflow-hidden rounded-xl border ${styles.border}`}>
          <div className="min-w-[680px]">
            <div className={`grid grid-cols-7 ${styles.secondaryBg}`}>
              {DAYS.map((day) => <div key={day.key} className={`h-10 border-b ${styles.border}`} />)}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: 42 }, (_, cell) => (
                <div key={cell} className={`min-h-24 border-b border-r p-1.5 sm:min-h-28 ${styles.border}`}>
                  <div className={`h-6 w-6 rounded-full ${styles.tertiaryBg || "bg-gray-300/35"}`} />
                  {cell % 5 === 1 && <div className={`mt-2 h-7 rounded-md ${styles.tertiaryBg || "bg-gray-300/30"}`} />}
                  {cell % 9 === 3 && <div className={`mt-1 h-7 rounded-md ${styles.tertiaryBg || "bg-gray-300/30"}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading schedule"
      className="animate-pulse grid grid-cols-1 md:grid-cols-7"
    >
      {DAYS.map((day, index) => (
        <div
          key={day.key}
          className={`min-h-[260px] space-y-3 border-b p-3 md:border-b-0 md:border-r ${styles.border} ${index === DAYS.length - 1 ? "md:border-r-0" : ""}`}
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
