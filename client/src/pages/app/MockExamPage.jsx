import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useBlocker, useParams } from "react-router-dom";
import Styling from "../../components/theme/Styling";
import useDialogFocus from "../../components/utils/useDialogFocus";
import { useAuth } from "../../auth/AuthContext";

const normalizeAnswer = (value) =>
    String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase();

const formatAttemptDate = (value) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    const parts = formatter.formatToParts(new Date(value));
    const part = (type) =>
        parts.find((item) => item.type === type)?.value || "";
    return `${part("month")}. ${part("day")}, ${part("year")}`;
};

const isAutomaticallyGradable = (question) =>
    Boolean(question.options) ||
    [
        "True or False",
        "Fill in the Blanks",
        "Identification",
        "Matching Type",
    ].includes(question.type);

export default function MockExamPage() {
    const styles = Styling();
    const { materialId } = useParams();
    const { apiRequest } = useAuth();
    const [loadState, setLoadState] = useState(null);
    const [progress, setProgress] = useState({
        materialId: null,
        answers: {},
        submitted: false,
    });
    const [confirmSubmit, setConfirmSubmit] = useState(false);
    const [leaveError, setLeaveError] = useState("");
    const [savingLeave, setSavingLeave] = useState(false);
    const [attempts, setAttempts] = useState([]);
    const [viewedAttemptKey, setViewedAttemptKey] = useState("");
    const [actionError, setActionError] = useState("");
    const [activeQuestion, setActiveQuestion] = useState(0);
    const confirmDialogRef = useRef(null);
    const leaveDialogRef = useRef(null);
    const isCurrentMaterial = loadState?.materialId === materialId;
    const material = isCurrentMaterial ? loadState.material : null;
    const loading = !isCurrentMaterial || loadState.status === "loading";
    const error = isCurrentMaterial ? loadState.error : "";
    const answers = progress.materialId === materialId ? progress.answers : {};
    const submitted = progress.materialId === materialId && progress.submitted;
    const answeredCount = material
        ? material.questions.filter((question) =>
              String(answers[question.id || question.prompt] || "").trim()
          ).length
        : 0;
    const currentQuestion = material?.questions[activeQuestion];
    const currentQuestionKey = currentQuestion?.id || currentQuestion?.prompt;
    const isCurrentQuestionAnswered = Boolean(
        String(answers[currentQuestionKey] || "").trim()
    );
    const blocker = useBlocker(
        Boolean(material && !submitted && answeredCount > 0)
    );
    const gradableQuestions = useMemo(
        () => material?.questions.filter(isAutomaticallyGradable) || [],
        [material]
    );
    const correctCount = gradableQuestions.filter(
        (question) =>
            normalizeAnswer(answers[question.id || question.prompt]) ===
            normalizeAnswer(question.answer)
    ).length;
    const score = gradableQuestions.length
        ? Math.round((correctCount / gradableQuestions.length) * 100)
        : null;
    const viewedAttempt = attempts.find(
        (attempt, index) =>
            `${attempt.completedAt}-${index}` === viewedAttemptKey
    );
    const viewedAnswers = viewedAttempt?.answers || {};
    const viewedCorrectCount = gradableQuestions.filter((question) => {
        const key = question.id || question.prompt;
        return (
            normalizeAnswer(viewedAnswers[key]) ===
            normalizeAnswer(question.answer)
        );
    }).length;
    const displayScore = viewedAttempt ? viewedAttempt.score : score;
    const displayCorrectCount = viewedAttempt
        ? viewedCorrectCount
        : correctCount;

    useDialogFocus(
        confirmDialogRef,
        () => setConfirmSubmit(false),
        false,
        confirmSubmit
    );
    useDialogFocus(
        leaveDialogRef,
        () => blocker.reset?.(),
        false,
        blocker.state === "blocked"
    );

    useEffect(() => {
        if (!material || submitted || answeredCount === 0) return undefined;
        const warnBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warnBeforeUnload);
        return () =>
            window.removeEventListener("beforeunload", warnBeforeUnload);
    }, [answeredCount, material, submitted]);

    useEffect(() => {
        let active = true;
        apiRequest(`/study-materials/${encodeURIComponent(materialId)}`)
            .then(async ({ material: savedMaterial }) => {
                if (!active) return;
                if (savedMaterial.type !== "mock-exams") {
                    setLoadState({
                        materialId,
                        status: "error",
                        material: null,
                        error: "This saved item is not a mock exam.",
                    });
                    return;
                }
                setLoadState({
                    materialId,
                    status: "success",
                    material: savedMaterial,
                    error: "",
                });
                const saved = await apiRequest(
                    `/study-materials/${encodeURIComponent(materialId)}/progress`
                );
                setProgress({
                    materialId,
                    answers: saved.state?.answers || {},
                    submitted: Boolean(saved.state?.submitted),
                });
                setAttempts(saved.attempts || []);
            })
            .catch((loadError) => {
                if (active)
                    setLoadState({
                        materialId,
                        status: "error",
                        material: null,
                        error: loadError.message,
                    });
            });
        return () => {
            active = false;
        };
    }, [apiRequest, materialId]);

    useEffect(() => {
        if (!material || progress.materialId !== materialId || submitted)
            return;
        const timer = setTimeout(() => {
            apiRequest(
                `/study-materials/${encodeURIComponent(materialId)}/progress`,
                {
                    method: "PUT",
                    body: JSON.stringify({ state: progress }),
                }
            ).catch(() => {});
        }, 400);
        return () => clearTimeout(timer);
    }, [apiRequest, material, materialId, progress, submitted]);

    const setAnswer = (question, value) => {
        const key = question.id || question.prompt;
        setProgress((current) => ({
            materialId,
            answers: {
                ...(current.materialId === materialId ? current.answers : {}),
                [key]: value,
            },
            submitted: false,
        }));
    };

    const submitExam = () => {
        const next = {
            materialId,
            answers,
            submitted: true,
        };
        setProgress(next);
        apiRequest(
            `/study-materials/${encodeURIComponent(materialId)}/progress`,
            {
                method: "PUT",
                body: JSON.stringify({ state: next }),
            }
        ).catch(() => {});
        apiRequest(
            `/study-materials/${encodeURIComponent(materialId)}/attempts`,
            {
                method: "POST",
                body: JSON.stringify({ answers, score }),
            }
        )
            .then(({ attempts: saved }) => setAttempts(saved || []))
            .catch((saveError) => setActionError(saveError.message));
        setConfirmSubmit(false);
    };

    const requestSubmit = () => {
        if (answeredCount < material.questions.length) setConfirmSubmit(true);
        else submitExam();
    };

    const goToQuestion = (index) => {
        setActiveQuestion(index);
    };

    const retake = () => {
        setActiveQuestion(0);
        setViewedAttemptKey("");
        setProgress({ materialId, answers: {}, submitted: false });
        window.scrollTo({
            top: 0,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
        });
    };

    const confirmLeave = async () => {
        setLeaveError("");
        setSavingLeave(true);
        try {
            await apiRequest(
                `/study-materials/${encodeURIComponent(materialId)}/progress`,
                {
                    method: "PUT",
                    body: JSON.stringify({ state: progress }),
                }
            );
            blocker.proceed?.();
        } catch (saveError) {
            setLeaveError(`Could not save your answers: ${saveError.message}`);
        } finally {
            setSavingLeave(false);
        }
    };

    const makeFlashcards = async () => {
        setActionError("");
        try {
            const { material: cards } = await apiRequest(
                `/study-materials/${encodeURIComponent(materialId)}/missed-flashcards`,
                { method: "POST", body: JSON.stringify({ answers }) }
            );
            window.location.assign(`/flashcards/${cards.id}`);
        } catch (requestError) {
            setActionError(requestError.message);
        }
    };

    return (
        <div
            className={`study-tools-motion mx-auto w-full max-w-7xl space-y-6 ${styles.primaryText}`}
        >
            {material && (
                <>
                    <header className={``}>
                        <h1 className="font-serif text-2xl font-semibold sm:text-3xl md:text-4xl">
                            {material.title}
                        </h1>
                        <p
                            className={`mt-2 text-sm w-full max-w-lg ${styles.secondaryText}`}
                        >
                            Answer the questions to complete the mock exam. You can submit anytime and review your results afterward.
                        </p>
                    </header>

                    <div className="grid items-start gap-2.5 lg:grid-cols-[17rem_minmax(0,1fr)]">
                        <aside
                            className="order-2 space-y-2.5 lg:sticky lg:top-20 lg:order-1"
                            aria-label="Exam overview"
                        >
                            <section
                                className={`rounded-lg border p-4 ${styles.border} ${styles.secondaryBg}`}
                                aria-label="Question progress"
                            >
                                <div className="flex items-center justify-between text-sm">
                                    <span
                                        className={`font-medium ${styles.blueText}`}
                                    >
                                        Questions
                                    </span>
                                    <span className={styles.studyMutedText}>
                                        {answeredCount}/
                                        {material.questions.length} answered
                                    </span>
                                </div>
                                <div
                                    role="progressbar"
                                    aria-label="Exam completion"
                                    aria-valuemin={0}
                                    aria-valuemax={material.questions.length}
                                    aria-valuenow={answeredCount}
                                    className={`mt-3 h-1.5 overflow-hidden rounded-full ${styles.stepTrack}`}
                                >
                                    <div
                                        className={`h-full rounded-full transition-[width] duration-150 motion-reduce:transition-none ${styles.stepProgress}`}
                                        style={{
                                            width: `${
                                                material.questions.length
                                                    ? (answeredCount /
                                                          material.questions
                                                              .length) *
                                                      100
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                </div>
                                <nav
                                    className="mt-4 grid grid-cols-5 gap-1 sm:grid-cols-6"
                                    aria-label="Question navigator"
                                >
                                    {material.questions.map(
                                        (question, index) => {
                                            const key =
                                                question.id || question.prompt;
                                            const isAnswered = Boolean(
                                                String(
                                                    answers[key] || ""
                                                ).trim()
                                            );
                                            const isCurrent =
                                                activeQuestion === index;
                                            const blockedAhead =
                                                index > activeQuestion &&
                                                !isCurrentQuestionAnswered;

                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    disabled={blockedAhead}
                                                    aria-current={
                                                        isCurrent
                                                            ? "step"
                                                            : undefined
                                                    }
                                                    aria-label={`Go to question ${index + 1}, ${isAnswered ? "answered" : "not answered"}${blockedAhead ? ", answer the current question first" : ""}`}
                                                    onClick={() =>
                                                        goToQuestion(index)
                                                    }
                                                    className={`flex h-10 items-center justify-center rounded-lg border text-sm font-semibold ${isCurrent ? styles.studySelected : isAnswered ? styles.studySuccess : `${styles.border} ${styles.secondaryText} ${styles.secondaryBgHover}`} ${styles.studyFocusRing} disabled:cursor-not-allowed disabled:opacity-40`}
                                                >
                                                    {index + 1}
                                                </button>
                                            );
                                        }
                                    )}
                                </nav>

                                {attempts.length > 0 && (
                                    <details className="mt-4">
                                        <summary className="cursor-pointer text-xs font-medium hover:text-blue-500 hover:underline">
                                            Past attempts ({attempts.length})
                                        </summary>
                                        <ol className="mt-2 space-y-2 text-sm">
                                            {[...attempts]
                                                .reverse()
                                                .map((attempt, index) => {
                                                    const attemptIndex =
                                                        attempts.length -
                                                        index -
                                                        1;
                                                    const attemptKey = `${attempt.completedAt}-${attemptIndex}`;
                                                    const isSelected =
                                                        viewedAttemptKey ===
                                                        attemptKey;
                                                    return (
                                                        <li key={attemptKey}>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setViewedAttemptKey(
                                                                        attemptKey
                                                                    )
                                                                }
                                                                aria-pressed={
                                                                    isSelected
                                                                }
                                                                className={`w-full rounded-lg border p-2 text-left ${styles.border} ${isSelected ? styles.studySelected : styles.secondaryBgHover} ${styles.studyFocusRing}`}
                                                            >
                                                                <span className="block">
                                                                    {formatAttemptDate(
                                                                        attempt.completedAt
                                                                    )}
                                                                </span>
                                                                <span
                                                                    className={`mt-1 block text-xs ${styles.studyMutedText}`}
                                                                >
                                                                    {attempt.score ===
                                                                    null
                                                                        ? "Self-review"
                                                                        : `${attempt.score}%`}{" "}
                                                                    · View
                                                                    answers
                                                                </span>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                        </ol>
                                    </details>
                                )}
                            </section>

                            {(submitted || viewedAttempt) && (
                                <section
                                    className={`rounded-lg border p-4 ${styles.border} ${styles.secondaryBg}`}
                                    aria-labelledby="sidebar-exam-results"
                                >
                                    <h2
                                        id="sidebar-exam-results"
                                        className={`font-semibold ${styles.blueText}`}
                                    >
                                        Exam results
                                    </h2>
                                    <p className="mt-2 text-xl font-semibold">
                                        {displayScore === null
                                            ? "Self-review"
                                            : `${displayScore}%`}
                                    </p>
                                    {displayScore !== null && (
                                        <p
                                            className={`mt-1 text-sm ${styles.secondaryText}`}
                                        >
                                            {displayCorrectCount} of{" "}
                                            {gradableQuestions.length} graded
                                            correct
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        onClick={retake}
                                        className={`mt-4 min-h-10 w-full rounded-lg px-3 text-sm font-medium ${styles.buttonFrost}`}
                                    >
                                        Retake exam
                                    </button>
                                </section>
                            )}
                        </aside>

                        <div className="order-1 min-w-0 space-y-4 lg:order-2">
                            {actionError && (
                                <p
                                    role="alert"
                                    className={`rounded-lg px-4 py-3 text-sm ${styles.studyDanger}`}
                                >
                                    {actionError}
                                </p>
                            )}
                            {viewedAttempt ? (
                                <section
                                    className="space-y-4"
                                    aria-labelledby="attempt-review-heading"
                                >
                                    {material.questions.map(
                                        (question, index) => {
                                            const key =
                                                question.id || question.prompt;
                                            const response =
                                                viewedAnswers[key] || "";
                                            const gradable =
                                                isAutomaticallyGradable(
                                                    question
                                                );
                                            const isCorrect =
                                                gradable &&
                                                normalizeAnswer(response) ===
                                                    normalizeAnswer(
                                                        question.answer
                                                    );

                                            return (
                                                <article
                                                    key={key}
                                                    className={`rounded-lg border p-4 sm:p-6 ${styles.border} ${styles.secondaryBg}`}
                                                >
                                                    <p
                                                        className={`text-xs font-semibold uppercase tracking-wide ${styles.blueText}`}
                                                    >
                                                        Question{" "}
                                                        {String(
                                                            index + 1
                                                        ).padStart(2, "0")}{" "}
                                                        · {question.type}
                                                    </p>
                                                    <p className="mt-2 text-sm leading-6">
                                                        {question.prompt}
                                                    </p>
                                                    {question.options && (
                                                        <ol
                                                            className="mt-4 space-y-2"
                                                            aria-label={`Choices for question ${index + 1}`}
                                                        >
                                                            {question.options.map(
                                                                (option) => {
                                                                    const isCorrectChoice =
                                                                        normalizeAnswer(
                                                                            option
                                                                        ) ===
                                                                        normalizeAnswer(
                                                                            question.answer
                                                                        );
                                                                    const isSelectedChoice =
                                                                        normalizeAnswer(
                                                                            option
                                                                        ) ===
                                                                        normalizeAnswer(
                                                                            response
                                                                        );
                                                                    const choiceStyle =
                                                                        isCorrectChoice
                                                                            ? `${styles.greenBg2} ${styles.greenBg2Hover} ${styles.greenBorder}`
                                                                            : isSelectedChoice
                                                                              ? `${styles.redBg2} ${styles.redBg2Hover} ${styles.redBorder}`
                                                                              : `${styles.border} ${styles.secondaryBg} border`;

                                                                    return (
                                                                        <li
                                                                            key={
                                                                                option
                                                                            }
                                                                            className={`flex min-h-10 items-center justify-between gap-3 rounded-lg  p-3 text-sm ${choiceStyle}`}
                                                                        >
                                                                            <span>
                                                                                {
                                                                                    option
                                                                                }
                                                                            </span>
                                                                            <span className="shrink-0 text-xs font-semibold">
                                                                                {isCorrectChoice
                                                                                    ? "Correct answer"
                                                                                    : isSelectedChoice
                                                                                      ? "Your answer"
                                                                                      : ""}
                                                                            </span>
                                                                        </li>
                                                                    );
                                                                }
                                                            )}
                                                        </ol>
                                                    )}
                                                </article>
                                            );
                                        }
                                    )}
                                </section>
                            ) : (
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        if (!submitted) requestSubmit();
                                    }}
                                    className="space-y-4"
                                >
                                    {material.questions.map(
                                        (question, index) => {
                                            if (index !== activeQuestion)
                                                return null;
                                            const key =
                                                question.id || question.prompt;
                                            const userAnswer =
                                                answers[key] || "";
                                            const isAnswered = Boolean(
                                                String(userAnswer).trim()
                                            );
                                            const isGradable =
                                                isAutomaticallyGradable(
                                                    question
                                                );
                                            const isCorrect =
                                                isGradable &&
                                                normalizeAnswer(userAnswer) ===
                                                    normalizeAnswer(
                                                        question.answer
                                                    );
                                            return (
                                                <fieldset
                                                    key={key}
                                                    id={`exam-question-${index}`}
                                                    className={`relative flex flex-col scroll-mt-44 rounded-lg border p-4 sm:p-6 ${styles.border} ${styles.secondaryBg}`}
                                                >
                                                    <p
                                                        className={`text-xs uppercase font-bold text-blue-500 mb-4`}
                                                    >
                                                        Question{" "}
                                                        {String(
                                                            index + 1
                                                        ).padStart(2, "0")}
                                                    </p>
                                                    <p className="mt-1 text-sm leading-6">
                                                        {question.prompt}
                                                    </p>
                                                    {question.options ? (
                                                        <div
                                                            className="mt-3 space-y-1.5"
                                                            role="radiogroup"
                                                            aria-label={`Answers for question ${index + 1}`}
                                                        >
                                                            {question.options.map(
                                                                (option) => {
                                                                    const selected =
                                                                        userAnswer ===
                                                                        option;
                                                                    const answerStyle =
                                                                        submitted
                                                                            ? option ===
                                                                              question.answer
                                                                                ? `${styles.greenBg2} ${styles.greenBg2Hover} ${styles.greenBorder}`
                                                                                : selected
                                                                                  ? `${styles.redBg2} ${styles.redBg2Hover} ${styles.redBorder}`
                                                                                  : `${styles.border} ${styles.secondaryBg}`
                                                                            : selected
                                                                              ? `${styles.blueBg2} ${styles.blueBorder}`
                                                                              : `${styles.border} ${styles.secondaryBgHover}`;
                                                                    return (
                                                                        <label
                                                                            key={
                                                                                option
                                                                            }
                                                                            className={`flex min-h-10 items-start gap-3 rounded-lg border p-2.5 text-sm transition-colors 
                                                                                        duration-150 motion-reduce:transition-none ${submitted ? "cursor-default" : "cursor-pointer"}
                                                                                         ${answerStyle} ${styles.studyFocusRing}`}
                                                                        >
                                                                            <input
                                                                                type="radio"
                                                                                name={`question-${index}`}
                                                                                value={
                                                                                    option
                                                                                }
                                                                                checked={
                                                                                    selected
                                                                                }
                                                                                disabled={
                                                                                    submitted
                                                                                }
                                                                                onChange={() =>
                                                                                    setAnswer(
                                                                                        question,
                                                                                        option
                                                                                    )
                                                                                }
                                                                                className={`mt-0.5 h-4 w-4 shrink-0 ${styles.studyAccent} ${styles.studyFocusRing}`}
                                                                            />
                                                                            <span className="min-w-0 flex-1">
                                                                                {
                                                                                    option
                                                                                }
                                                                            </span>
                                                                        </label>
                                                                    );
                                                                }
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <textarea
                                                            value={userAnswer}
                                                            onChange={(event) =>
                                                                setAnswer(
                                                                    question,
                                                                    event.target
                                                                        .value
                                                                )
                                                            }
                                                            disabled={submitted}
                                                            rows={
                                                                question.type ===
                                                                "Essay"
                                                                    ? 6
                                                                    : 3
                                                            }
                                                            placeholder="Write your answer…"
                                                            aria-label={`Your answer to question ${index + 1}`}
                                                            className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm ${styles.studyInput} ${styles.studyPlaceholder}`}
                                                        />
                                                    )}

                                                    <footer
                                                        className={`mt-auto flex items-center justify-between gap-3 px-4 pt-8 pb-4 rounded-b-lg ${styles.secondaryBg} sm:-mx-6 sm:-mb-6 sm:px-6`}
                                                    >
                                                        <button
                                                            type="button"
                                                            aria-label={
                                                                isCurrentQuestionAnswered
                                                                    ? "Previous question"
                                                                    : "Answer this question before continuing"
                                                            }
                                                            title={
                                                                isCurrentQuestionAnswered
                                                                    ? "Previous question"
                                                                    : "Answer this question before continuing"
                                                            }
                                                            disabled={
                                                                activeQuestion ===
                                                                    0 ||
                                                                !isCurrentQuestionAnswered
                                                            }
                                                            onClick={() =>
                                                                goToQuestion(
                                                                    activeQuestion -
                                                                        1
                                                                )
                                                            }
                                                            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${styles.blueBg2} ${styles.blueBg2hover} ${styles.studyFocusRing} disabled:cursor-not-allowed disabled:opacity-40`}
                                                        >
                                                            <ChevronLeft
                                                                className="h-5 w-5"
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                        <span
                                                            className={`text-sm ${styles.studyMutedText}`}
                                                        >
                                                            Question{" "}
                                                            {activeQuestion + 1}{" "}
                                                            of{" "}
                                                            {
                                                                material
                                                                    .questions
                                                                    .length
                                                            }
                                                        </span>
                                                        {activeQuestion <
                                                        material.questions
                                                            .length -
                                                            1 ? (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    !isCurrentQuestionAnswered
                                                                }
                                                                aria-label={
                                                                    isCurrentQuestionAnswered
                                                                        ? "Next question"
                                                                        : "Answer this question before continuing"
                                                                }
                                                                title={
                                                                    isCurrentQuestionAnswered
                                                                        ? "Next question"
                                                                        : "Answer this question before continuing"
                                                                }
                                                                onClick={() =>
                                                                    goToQuestion(
                                                                        activeQuestion +
                                                                            1
                                                                    )
                                                                }
                                                                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg  ${styles.blueBg2} ${styles.blueBg2hover} ${styles.studyFocusRing} disabled:cursor-not-allowed disabled:opacity-40`}
                                                            >
                                                                <ChevronRight
                                                                    className="h-5 w-5"
                                                                    aria-hidden="true"
                                                                />
                                                            </button>
                                                        ) : !submitted ? (
                                                            <button
                                                                type="submit"
                                                                aria-label="Submit exam"
                                                                title="Submit exam"
                                                                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${styles.greenBg2} ${styles.greenBg2Hover} ${styles.studyFocusRing}`}
                                                            >
                                                                <CheckCircle2
                                                                    className="h-5 w-5"
                                                                    aria-hidden="true"
                                                                />
                                                            </button>
                                                        ) : (
                                                            <span
                                                                className="h-10 w-10"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                    </footer>
                                                </fieldset>
                                            );
                                        }
                                    )}
                                </form>
                            )}
                        </div>
                    </div>
                </>
            )}

            {confirmSubmit && (
                <div
                    className="modal-overlay"
                    style={styles.studyOverlayStyle}
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget)
                            setConfirmSubmit(false);
                    }}
                >
                    <div
                        ref={confirmDialogRef}
                        tabIndex={-1}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirm-submit-title"
                        aria-describedby="confirm-submit-description"
                        className={`w-full max-w-sm rounded-lg border p-5 ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
                    >
                        <h2 id="confirm-submit-title" className="font-semibold">
                            Submit with unanswered questions?
                        </h2>
                        <p
                            id="confirm-submit-description"
                            className={`mt-2 text-sm ${styles.secondaryText}`}
                        >
                            {material.questions.length - answeredCount}{" "}
                            unanswered. Submit anyway?
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmSubmit(false)}
                                className={`min-h-10 px-4 text-sm ${styles.studyGhostButton} ${styles.studyFocusRing}`}
                            >
                                Keep working
                            </button>
                            <button
                                type="button"
                                onClick={submitExam}
                                className={`min-h-10 rounded-lg px-4 text-sm font-medium ${styles.studyPrimaryButton} ${styles.studyFocusRing}`}
                            >
                                Submit anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {blocker.state === "blocked" && (
                <div
                    className="modal-overlay"
                    style={styles.studyOverlayStyle}
                    role="presentation"
                >
                    <div
                        ref={leaveDialogRef}
                        tabIndex={-1}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="leave-exam-title"
                        aria-describedby="leave-exam-description"
                        className={`w-full max-w-sm rounded-lg border p-5 ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
                    >
                        <h2 id="leave-exam-title" className="font-semibold">
                            Leave this exam?
                        </h2>
                        <p
                            id="leave-exam-description"
                            className={`mt-2 text-sm ${styles.secondaryText}`}
                        >
                            Your answers will be saved, so you can resume later
                            or retake the exam.
                        </p>
                        {leaveError && (
                            <p
                                role="alert"
                                className={`mt-3 text-sm ${styles.studyDanger}`}
                            >
                                {leaveError}
                            </p>
                        )}
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => blocker.reset?.()}
                                disabled={savingLeave}
                                className={`min-h-10 px-4 text-sm ${styles.studyGhostButton} ${styles.studyFocusRing}`}
                            >
                                Stay in exam
                            </button>
                            <button
                                type="button"
                                onClick={confirmLeave}
                                disabled={savingLeave}
                                className={`min-h-10 rounded-lg px-4 text-sm font-medium ${styles.studyPrimaryButton} ${styles.studyFocusRing}`}
                            >
                                {savingLeave ? "Saving…" : "Leave exam"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
