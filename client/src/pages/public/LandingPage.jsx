import { motion, useReducedMotion } from "motion/react";
import { useOutletContext } from "react-router-dom";
import {
    FileText,
    Sparkles,
    Save,
    TrendingUp,
} from "lucide-react";
import Styling from "../../components/theme/Styling"
import WaveBackground from "../../components/ui/WaveBackground";
import { useDarkMode } from "../../components/theme/DarkModeContext";

const features = [
    {
        title: "Smart Note-Taking",
        description:
            "Easily create, edit, and organize notes in one convenient place. Keep important information accessible anytime.",
        icon: FileText,
    },
    {
        title: "AI-Powered Assistant",
        description:
            "Generate ideas, summarize long notes, and improve your writing to make note-taking faster and easier.",
        icon: Sparkles,
    },
    {
        title: "Save and Manage Notes",
        description:
            "Save, update, and delete notes whenever needed, giving you control over your personal information.",
        icon: Save,
    },
    {
        title: "Improved Productivity",
        description:
            "Manage thoughts, tasks, and ideas with helpful tools designed to make everyday note-taking easier.",
        icon: TrendingUp,
    },
];

export default function LandingPage() {
    const { openAuth } = useOutletContext();
    const styles = Styling();
    const { darkMode } = useDarkMode();
    const shouldReduceMotion = useReducedMotion();
    const sectionMotion = shouldReduceMotion
        ? { initial: false, whileInView: { opacity: 1, y: 0 } }
        : {
              initial: { opacity: 0, y: 32 },
              whileInView: { opacity: 1, y: 0 },
          };

    return (
        <main>
            <motion.section
                id="home"
                initial={sectionMotion.initial}
                whileInView={sectionMotion.whileInView}
                viewport={{ once: false, amount: "some" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="relative isolate flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4 py-16"
            >
                <WaveBackground />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-[1]"
                    style={{
                        background: darkMode
                            ? "radial-gradient(ellipse at center, rgba(28,28,28,0.82) 0%, rgba(28,28,28,0.46) 42%, transparent 78%)"
                            : "radial-gradient(ellipse at center, rgba(245,245,245,0.82) 0%, rgba(245,245,245,0.46) 42%, transparent 78%)",
                    }}
                />
                <div className={`relative z-10 flex max-w-4xl flex-col items-center justify-center ${styles.primaryText}`}>
                    <h1 className="mb-2 text-center text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
                        Meet{" "}
                        <span className={`font-serif italic font-medium ${styles.blueText}`}>
                            Finote
                        </span>
                    </h1>

                    <h2 className="mb-4 text-center text-2xl font-semibold leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
                        Your Smart Study Companion
                    </h2>

                    <p className={`max-w-xl text-center text-sm leading-6 sm:text-base md:text-lg ${styles.secondaryText}`}>
                        A smarter way to turn your study materials into reviewers, practice
                        tests, and personalized learning tools.
                    </p>

                    <div className="mt-6 flex  gap-2.5">
                        <button
                            onClick={() => openAuth("signin")}
                            className={`text-sm sm:text-base font-semibold px-4 py-2 rounded-full transition-colors duration-200 ${styles.buttonFrost}`}
                        >
                            Start Studying
                        </button>
                        <button
                            onClick={() => openAuth("signup")}
                            className={`text-sm sm:text-base font-semibold px-8 py-2 rounded-full transition-colors duration-200 ${styles.buttonBlue}`}
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </motion.section>

            <motion.section
                id="about"
                initial={sectionMotion.initial}
                whileInView={sectionMotion.whileInView}
                viewport={{ once: false, amount: "some" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="flex min-h-dvh items-center justify-center p-4"
            >
                <div className="mx-auto flex max-w-2xl flex-col items-center justify-center text-center">
                    <h1
                        className={`mb-8 text-xl sm:text-2xl md:text-3xl lg:text-5xl font-medium ${styles.blueText}`}
                    >
                        How      Does <span className="font-serif italic">Finote Works?</span>
                    </h1>
                    <p className="mb-4 text-sm sm:text-lg">
                        Finote is a simple and user-friendly note-taking application designed to help users
                        organize their thoughts, ideas, and important information in one place. It provides
                        a convenient way to create, edit, and manage notes anytime.
                    </p>
                    <p className="mb-4 text-sm sm:text-lg">
                        With Finote, users can keep their notes organized, save important reminders, and
                        easily access their information whenever needed. Its goal is to make note-taking 
                        easier, faster, and more efficient.
                    </p>
                    <p className="text-sm sm:text-lg">
                        <span className={`${styles.blueText} italic`}>
                            Why Choose <span className="font-serif">Finote? </span>
                        </span>
                        Finote offers a convenient way to keep important information in one place. With its simple design and easy-to-use features, users can focus on their ideas without unnecessary complications.
                    </p>
                </div>
            </motion.section>

            <motion.section
    id="features"
    initial={sectionMotion.initial}
    whileInView={sectionMotion.whileInView}
    viewport={{ once: false, amount: "some" }}
    transition={{ duration: 0.7, ease: "easeOut" }}
    className="flex min-h-dvh flex-col items-center justify-center px-4 py-20 sm:py-28"
>
    <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
            <h2
                className={`text-3xl font-medium leading-tight tracking-tight sm:text-4xl lg:text-5xl ${styles.blueText}`}
            >
                Turn Your Notes Into <br />
                <span className="font-serif italic">A Study Plan</span>
            </h2>
            <p
                className={`mx-auto mt-5 max-w-md text-sm leading-6 sm:text-base sm:leading-7 ${styles.secondaryText}`}
            >
                Simple tools to help you capture ideas and make the most of your notes.
            </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            {features.map(({ title, description, icon: Icon }, i) => (
                <motion.article
                    key={title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                    className="group relative flex flex-col rounded-2xl border border-black/5 bg-white/60 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/5 dark:border-white/10 dark:bg-white/5"
                >
                    <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/10 transition-colors duration-300 group-hover:bg-blue-500/15">
                        <Icon
                            aria-hidden="true"
                            className={`h-5 w-5 ${styles.blueText}`}
                            strokeWidth={1.75}
                        />
                    </div>
                    <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                    <p className={`mt-2 text-sm leading-6 ${styles.secondaryText}`}>
                        {description}
                    </p>
                </motion.article>
            ))}
        </div>
    </div>
</motion.section>
        </main>
    );
}