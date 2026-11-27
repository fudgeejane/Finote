import { Link } from "react-router-dom";
import { ArrowRight, Award, BookOpenCheck, ClipboardCheck, Flame, FilePlus2 } from "lucide-react";
import Styling from "../../components/theme/Styling";
import useLearningActivitySummary from "../../hooks/useLearningActivitySummary";

const eventNames = {
  "note-created": "Note created",
  "flashcards-completed": "Flashcard round completed",
  "mock-exam-submitted": "Mock exam submitted",
};

function toDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
}

function dateLabel(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  return new Intl.DateTimeFormat(undefined, options).format(toDate(value));
}

function dateTimeLabel(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function Panel({ styles, title, children, className = "" }) {
  return (
    <section className={`rounded-xl border p-5 ${styles.border} ${styles.secondaryBg} ${className}`}>
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

function NextSteps({ styles }) {
  const links = [
    { label: "Create a note", to: "/notes", Icon: FilePlus2 },
    { label: "Practice flashcards", to: "/study-tools?tab=flashcards", Icon: BookOpenCheck },
    { label: "Take a mock exam", to: "/study-tools?tab=mock-exams", Icon: ClipboardCheck },
  ];
  return (
    <Panel styles={styles} title="Choose a next step">
      <p className={`mt-1 text-sm ${styles.secondaryText}`}>You have little activity this week. Any of these saved learning actions will count toward your streak.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map(({ label, to, Icon }) => (
          <Link key={to} to={to} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${styles.studyGhostButton} ${styles.studyFocusRing}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </Panel>
  );
}

export default function ProgressPage() {
  const styles = Styling();
  const { summary, status, error, retry } = useLearningActivitySummary();
  if (status === "loading") return <div className="space-y-4" aria-busy="true"><h1 className="text-2xl font-bold">Learning Progress</h1><p role="status" className={styles.secondaryText}>Loading your saved learning activity…</p></div>;
  if (status === "error") return <div className="space-y-3"><h1 className="text-2xl font-bold">Learning Progress</h1><p role="alert" className={styles.studyDanger}>Your progress could not be loaded: {error}</p><button type="button" onClick={retry} className={`rounded-lg px-4 py-2 ${styles.buttonBlue} ${styles.studyFocusRing}`}>Retry</button></div>;

  const exams = summary.exams;
  const flashcards = summary.flashcards;
  const trend = exams.trend || [];
  const feed = summary.recentActivity || [];
  const activeDays = summary.days.filter((day) => day.active).length;
  const trendSummary = trend.length < 2
    ? "At least two scored submissions are needed to describe a trend."
    : trend.at(-1).score === trend[0].score
      ? `Scores are unchanged across ${trend.length} scored submissions.`
      : `Scores ${trend.at(-1).score > trend[0].score ? "rose" : "fell"} from ${trend[0].score}% to ${trend.at(-1).score}% across ${trend.length} scored submissions.`;

  return (
    <main className={` space-y-4 ${styles.primaryText}`}>
      <header>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl md:text-4xl">Learning Progress</h1>
        <p className={`mt-1 text-sm ${styles.secondaryText}`}>A record of your saved notes, completed flashcard rounds, and submitted exams.</p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Learning summary">
        {[
          { label: "Current streak", value: `${summary.streak} ${summary.streak === 1 ? "day" : "days"}`, Icon: Flame },
          { label: "Exam submissions", value: exams.total, Icon: ClipboardCheck },
          { label: "Average scored exam", value: exams.average == null ? "—" : `${exams.average}%`, Icon: Award },
          { label: "Flashcard rounds", value: flashcards.sessions, Icon: BookOpenCheck },
        ].map(({ label, value, Icon }) => (
          <article key={label} className={`rounded-xl border p-4 ${styles.border} ${styles.secondaryBg}`}>
            <Icon className={`h-5 w-5 ${styles.blueText}`} aria-hidden="true" />
            <p className={`mt-3 text-xs ${styles.secondaryText}`}>{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </article>
        ))}
      </section>

      {activeDays < 2 && <NextSteps styles={styles} />}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
        <Panel styles={styles} title="Exam score trend">
          <p className={`mt-2 text-sm ${styles.secondaryText}`}>{exams.total} submitted {exams.total === 1 ? "exam" : "exams"}; average {exams.average == null ? "not available" : `${exams.average}% among ${exams.scored} scored submissions`}.</p>
          <p className={`mt-1 text-xs ${styles.secondaryText}`}>Submissions without an automatic score count as assessments but are excluded from averages and trends.</p>
          {trend.length ? (
            <>
              <p className="mt-4 text-sm font-medium" role="status">{trendSummary}</p>
              <p className={`mt-4 text-xs ${styles.tertiaryText}`}>Score scale</p>
              <div className={`flex justify-between border-b pb-1 text-xs ${styles.tertiaryText}`} aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
              <ol className="mt-2 space-y-2" aria-label="Chronological scored exam trend from 0 to 100 percent">
                {trend.map((point, index) => (
                  <li key={`${point.date}-${index}`} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.75rem] items-center gap-2 text-sm sm:grid-cols-[7rem_minmax(0,1fr)_3rem]" aria-label={`${dateLabel(point.date)}: ${point.score}%`}>
                    <time dateTime={point.date} className={`truncate text-xs sm:text-sm ${styles.secondaryText}`}>{dateLabel(point.date, { month: "short", day: "numeric" })}</time>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true"><div className={`h-full rounded-full ${styles.blueBg2}`} style={{ width: `${point.score}%` }} /></div>
                    <span className="text-right font-semibold">{point.score}%</span>
                  </li>
                ))}
              </ol>
              <p className={`mt-2 text-xs ${styles.tertiaryText}`}>Earlier submissions are shown first; scale runs from 0% to 100%.</p>
            </>
          ) : <p className={`mt-4 text-sm ${styles.secondaryText}`}>No scored exam submissions yet.</p>}
        </Panel>

        <Panel styles={styles} title="Flashcard practice">
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><dt className={styles.secondaryText}>Completed rounds</dt><dd className="font-semibold">{flashcards.sessions}</dd></div>
            <div><dt className={styles.secondaryText}>Cards reviewed</dt><dd className="font-semibold">{flashcards.cardsReviewed}</dd></div>
            <div><dt className={styles.secondaryText}>Self-rated “Got it”</dt><dd className="font-semibold">{flashcards.gotIt}</dd></div>
            <div><dt className={styles.secondaryText}>Self-rated “Review again”</dt><dd className="font-semibold">{flashcards.reviewAgain}</dd></div>
          </dl>
          <p className={`mt-3 text-xs ${styles.secondaryText}`}>Ratings are self-reported and do not prove mastery or long-term retention.</p>
        </Panel>
      </div>

      <Panel styles={styles} title="Weekly activity">
        <p className={`mt-1 text-sm ${styles.secondaryText}`}>{summary.week.label}: {dateLabel(summary.week.start)} – {dateLabel(summary.week.end)} · {summary.timezone}</p>
        <p className={`mt-2 text-xs ${styles.secondaryText}`}>A streak counts qualifying actions: creating a note, submitting an exam, or completing a rated flashcard round. Multiple actions in one local day count as one day.</p>
        <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2" role="list" aria-label="Qualifying activity Monday through Sunday">
          {summary.days.map((day) => {
            const details = Object.entries(day.counts).filter(([, count]) => count).map(([type, count]) => `${count} ${eventNames[type]}`).join(", ");
            return (
              <article key={day.date} role="listitem" aria-label={`${day.weekday}, ${dateLabel(day.date)}: ${day.active ? details : "no activity"}`} className={`min-w-0 rounded-lg border p-2 text-center ${styles.border}`}>
                <p className={`text-[11px] ${styles.secondaryText}`}>{day.weekday.slice(0, 3)}</p>
                <p className="text-sm font-semibold">{dateLabel(day.date, { day: "numeric" })}</p>
                <p className={`mt-1 text-xs ${day.active ? styles.blueText : styles.tertiaryText}`}>{day.active ? "Active" : "—"}</p>
                {day.active && <p className={`mt-1 hidden text-[10px] sm:block ${styles.secondaryText}`}>{details}</p>}
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel styles={styles} title="Recent learning activity">
        {feed.length ? (
          <ol className={`mt-2 divide-y ${styles.divide}`}>
            {feed.map((item, index) => (
              <li key={`${item.type}-${item.occurredAt}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{item.href ? <Link className={`underline ${styles.headerNavText}`} to={item.href}>{item.title}</Link> : item.title}</p>
                  <p className={`text-xs ${styles.secondaryText}`}>{eventNames[item.type]} · {dateTimeLabel(item.occurredAt)}</p>
                </div>
                <p className={`shrink-0 text-xs sm:text-sm ${styles.secondaryText}`}>{item.detail}</p>
              </li>
            ))}
          </ol>
        ) : <p className={`mt-3 text-sm ${styles.secondaryText}`}>No saved learning activity yet. Create a note, submit an exam, or complete a flashcard round to start your history.</p>}
      </Panel>
    </main>
  );
}
