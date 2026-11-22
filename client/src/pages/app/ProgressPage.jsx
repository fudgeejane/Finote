import { Award, BarChart3, Target, TrendingUp } from "lucide-react";
import Styling from "../../components/theme/Styling";

export default function ProgressPage() {
    const styles = Styling();
    const scores = [68, 72, 76, 74, 82, 86, 88];

    return (
        <div className="space-y-5">
            <div><h1 className="text-2xl font-bold">Learning Progress</h1><p className={`mt-1 text-sm ${styles.secondaryText}`}>Your performance and assessment history.</p></div>

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { label: "Study streak", value: "7 days", icon: TrendingUp, color: "text-orange-600" },
                    { label: "Average score", value: "82%", icon: BarChart3, color: "text-blue-600" },
                    { label: "Assessments", value: "12", icon: Target, color: "text-green-600" },
                    { label: "Top subject", value: "Biology", icon: Award, color: "text-purple-600" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <article key={label} className={`rounded-xl border p-4 ${styles.border} ${styles.secondaryBg}`}>
                        <Icon className={`h-5 w-5 ${color}`} />
                        <p className={`mt-3 text-xs ${styles.secondaryText}`}>{label}</p><p className="mt-1 text-xl font-bold">{value}</p>
                    </article>
                ))}
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,.5fr)]">
                <section className={`rounded-xl border p-5 ${styles.border} ${styles.secondaryBg}`}>
                    <div className="flex items-center justify-between"><h2 className="font-bold">Quiz Score Trend</h2><span className="text-sm font-semibold text-green-600">+12%</span></div>
                    <div className="mt-6 flex h-52 items-end gap-3" aria-label="Quiz score trend over seven assessments">
                        {scores.map((score, index) => (
                            <div key={index} className="flex h-full flex-1 items-end">
                                <div className="w-full rounded-t-md bg-blue-500" style={{ height: `${score}%` }} title={`${score}%`} />
                            </div>
                        ))}
                    </div>
                    <div className={`mt-2 flex justify-between text-xs ${styles.tertiaryText}`}><span>Assessment 1</span><span>Assessment 7</span></div>
                </section>

                <aside className="space-y-5">
                    <section className={`rounded-xl border p-5 ${styles.border} ${styles.secondaryBg}`}><h2 className="font-bold">Strengths & Weaknesses</h2><div className="mt-4 space-y-3 text-sm"><div><p className="font-medium text-green-600">Strengths</p><p className={styles.secondaryText}>Cell biology, terminology</p></div><div><p className="font-medium text-orange-600">Weaknesses</p><p className={styles.secondaryText}>Word problems, time management</p></div></div></section>
                    <section className={`rounded-xl border p-5 ${styles.border} ${styles.secondaryBg}`}><h2 className="font-bold">Recommended Topics</h2><ul className={`mt-3 space-y-2 text-sm ${styles.secondaryText}`}><li>Photosynthesis stages</li><li>Solving systems of equations</li><li>Cold War timeline</li></ul></section>
                </aside>
            </div>

            <section className={`rounded-xl border p-5 ${styles.border} ${styles.secondaryBg}`}>
                <h2 className="font-bold">Recent Assessments</h2>
                <div className={`mt-3 divide-y ${styles.divide}`}>
                    {[
                        ["Photosynthesis Quiz", "92%", "Nov 18"],
                        ["Quadratic Functions", "78%", "Nov 16"],
                        ["World War II Review", "85%", "Nov 12"],
                    ].map(([name, score, date]) => (
                        <div key={name} className="flex items-center justify-between py-3 text-sm"><div><p className="font-medium">{name}</p><p className={`text-xs ${styles.secondaryText}`}>{date}</p></div><span className="font-bold text-blue-600">{score}</span></div>
                    ))}
                </div>
            </section>
        </div>
    );
}
