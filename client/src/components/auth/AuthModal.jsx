import { useEffect, useRef, useState } from "react";
import { privacySections, terms } from "../../data/legalContent";
import Styling from "../theme/Styling";
import { X } from "lucide-react";

function LegalSections({ sections }) {
    return (
        <ol className="list-decimal space-y-4 pl-5">
            {sections.map(({ title, paragraphs }) => (
                <li key={title}>
                    <span className="font-semibold">{title}</span>
                    {paragraphs.map((paragraph, index) => (
                        <p key={index} className="mt-2 text-gray-600 dark:text-gray-300">
                            {paragraph}
                        </p>
                    ))}
                </li>
            ))}
        </ol>
    );
}

export default function AuthModal({ mode, onClose, onSwitch }) {
    const isSignUp = mode === "signup";
    const [showLegalReview, setShowLegalReview] = useState(false);
    const [hasReadToEnd, setHasReadToEnd] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const legalContentRef = useRef(null);
    const styles = Styling();

    useEffect(() => {
        if (!showLegalReview) return undefined;

        const frame = requestAnimationFrame(() => {
            const element = legalContentRef.current;
            if (element && element.scrollHeight <= element.clientHeight + 8) {
                setHasReadToEnd(true);
            }
        });

        return () => cancelAnimationFrame(frame);
    }, [showLegalReview]);

    const openLegalReview = () => {
        setHasReadToEnd(false);
        setShowLegalReview(true);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (isSignUp && !acceptedTerms) return;
        if (isSignUp) onClose();
    };

    return (
        <div
            className="modal-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-title"
                className={`flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden 
                            rounded-2xl border ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
            >
                <header className="flex shrink-0 items-start justify-between gap-4 px-6 py-4">
                    <div>
                        <h2 id="auth-title" className="text-xl font-semibold">
                            {showLegalReview
                                ? "Terms of Service and Privacy Policy"
                                : isSignUp
                                  ? "Create your account"
                                  : "Welcome to Finote"}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {showLegalReview
                                ? "Review both documents from top to bottom to continue."
                                : isSignUp
                                  ? "Enter your details, then review and confirm the documents."
                                  : "Sign in to continue to Finote."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close dialog"
                        className={`auto p-4 ${styles.closeButton}`}
                    >
                        <X  size={20} />
                    </button>
                </header>

                {showLegalReview ? (
                    <>
                        <div
                            ref={legalContentRef}
                            onScroll={(event) => {
                                const element = event.currentTarget;
                                if (
                                    element.scrollTop + element.clientHeight >=
                                    element.scrollHeight - 8
                                ) {
                                    setHasReadToEnd(true);
                                }
                            }}
                            className="modal-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-4 text-sm leading-6"
                            aria-label="Terms of Service followed by Privacy Policy"
                        >
                            <section aria-labelledby="modal-terms-heading">
                                <h3 id="modal-terms-heading" className="mb-3 text-lg font-semibold">
                                    Terms of Service
                                </h3>
                                <LegalSections sections={terms} />
                            </section>

                            <section aria-labelledby="modal-privacy-heading">
                                <h3 id="modal-privacy-heading" className="mb-3 text-lg font-semibold">
                                    Privacy Policy
                                </h3>
                                <LegalSections sections={privacySections} />
                            </section>
                        </div>

                        <footer className="shrink-0 space-y-4 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                            <label className="flex items-start gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={acceptedTerms}
                                    disabled={!hasReadToEnd}
                                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                                    className="mt-1"
                                />
                                <span>
                                    I have read and agree to the Terms of Service and acknowledge the Privacy Policy.
                                </span>
                            </label>

                            <div className="flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowLegalReview(false)}
                                    className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                                >
                                    Back to sign up
                                </button>
                                <button
                                    type="button"
                                    disabled={!hasReadToEnd || !acceptedTerms}
                                    onClick={() => {
                                        setShowLegalReview(false);
                                    }}
                                    className="rounded-md bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Confirm
                                </button>
                            </div>
                        </footer>
                    </>
                ) : (
                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="modal-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                            {isSignUp && (
                                <label className="block text-sm font-medium">
                                    Name
                                    <input
                                        required
                                        autoComplete="name"
                                        className={`mt-1 w-full rounded-md border ${styles.input} px-4 py-2`}
                                        placeholder="Your name"
                                    />
                                </label>
                            )}

                            <label className="block text-sm font-medium">
                                Email
                                <input
                                    required
                                    type="email"
                                    autoComplete="email"
                                    className={`mt-1 w-full rounded-md border ${styles.input} px-4 py-2`}
                                    placeholder="you@example.com"
                                />
                            </label>

                            <label className="block text-sm font-medium">
                                Password
                                <input
                                    required
                                    type="password"
                                    autoComplete={isSignUp ? "new-password" : "current-password"}
                                    className={`mt-1 w-full rounded-md border ${styles.input} px-4 py-2`}
                                    placeholder="Enter your password"
                                />
                            </label>

                            {isSignUp && (
                                <>
                                    <label className="block text-sm font-medium">
                                        Confirm password
                                        <input
                                            required
                                            type="password"
                                            autoComplete="new-password"
                                            className={`mt-1 w-full rounded-md border ${styles.input} px-4 py-2`}
                                            placeholder="Confirm your password"
                                        />
                                    </label>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-start gap-2">
                                            <input
                                                id="signup-legal-consent"
                                                type="checkbox"
                                                checked={acceptedTerms}
                                                onChange={(event) =>
                                                    setAcceptedTerms(event.target.checked)
                                                }
                                                className="mt-1"
                                                aria-label="I agree to Finote's Terms of Service and Privacy Policy"
                                            />
                                            <span>
                                                I agree to Finote&apos;s{" "}
                                                <button
                                                    type="button"
                                                    onClick={openLegalReview}
                                                    className="text-blue-600 underline underline-offset-2 hover:text-blue-500"
                                                >
                                                    Terms of Service
                                                </button>
                                                {" and "}
                                                <button
                                                    type="button"
                                                    onClick={openLegalReview}
                                                    className="text-blue-600 underline underline-offset-2 hover:text-blue-500"
                                                >
                                                    Privacy Policy
                                                </button>
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <footer className="shrink-0 space-y-4  px-6 py-4 dark:border-gray-700">
                            <button
                                type="submit"
                                disabled={isSignUp && !acceptedTerms}
                                className={`w-full rounded-md px-4 py-2 text-sm sm:text-base ${styles.buttonBlue}`}
                            >
                                {isSignUp ? "Confirm and sign up" : "Sign in"}
                            </button>

                            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                                {isSignUp ? "Already have an account?" : "Don’t have an account?"}{" "}
                                <button
                                    type="button"
                                    onClick={onSwitch}
                                    className="font-semibold text-blue-600 cursor-pointer hover:underline"
                                >
                                    {isSignUp ? "Sign in" : "Sign up"}
                                </button>
                            </p>
                        </footer>
                    </form>
                )}
            </section>
        </div>
    );
}
