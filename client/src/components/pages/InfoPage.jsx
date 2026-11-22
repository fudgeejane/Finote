import { Link } from "react-router-dom";
import Styling from "../theme/Styling";

const relatedPages = [
    { label: "Terms of Service", to: "/terms-of-services" },
    { label: "Contact Us", to: "/contact" },
    { label: "Privacy Policy", to: "/privacy-policy" },
];

export default function InfoPage({ icon: Icon, title, description, notice, children }) {
    const styles = Styling();

    return (
        <div className={`min-h-dvh px-4 py-12 sm:px-6 sm:py-16 ${styles.primaryBg} ${styles.primaryText}`}>
            <main className="mx-auto w-full max-w-4xl">
                <header className="mb-8 sm:mb-10">
                    <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${styles.blueBg2} ${styles.blueText}`}>
                        <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
                    <p className={`mt-3 max-w-2xl text-sm leading-6 sm:text-base ${styles.secondaryText}`}>
                        {description}
                    </p>
                </header>

                {notice && (
                    <aside className={`mb-8 rounded-xl border p-4 text-sm leading-6 ${styles.border} ${styles.secondaryBg}`}>
                        {notice}
                    </aside>
                )}

                <div className="space-y-4">{children}</div>

                <nav aria-label="Related information" className={`mt-10 border-t pt-6 ${styles.border}`}>
                    <p className={`mb-3 text-xs font-semibold uppercase tracking-wide ${styles.secondaryText}`}>
                        Related
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                        {relatedPages.map((page) => (
                            <Link
                                key={page.to}
                                to={page.to}
                                className={`${styles.blueText} underline-offset-4 transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500`}
                            >
                                {page.label}
                            </Link>
                        ))}
                    </div>
                </nav>
            </main>
        </div>
    );
}
