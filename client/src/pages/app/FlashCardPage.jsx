import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Shuffle } from "lucide-react";
import { useParams } from "react-router-dom";
import Styling from "../../components/theme/Styling";
import { useAuth } from "../../auth/AuthContext";

function shuffledIndices(length) {
    const indices = Array.from({ length }, (_, index) => index);
    for (let index = indices.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
    }
    return indices;
}

export default function FlashCardPage() {
    const styles = Styling();
    const { materialId } = useParams();
    const { apiRequest } = useAuth();
    const [loadState, setLoadState] = useState(null);
    const [notebookName, setNotebookName] = useState({ materialId: null, name: "" });
    const [progress, setProgress] = useState({ materialId: null, cardIndex: 0, showAnswer: false, complete: false });
    const [ratings, setRatings] = useState({ materialId: null, byCard: {} });
    const [cardOrder, setCardOrder] = useState({ materialId: null, indices: [] });
    const [reviewOnly, setReviewOnly] = useState(false);
    const [flipStarted, setFlipStarted] = useState(false);
    const [activityError, setActivityError] = useState("");
    const completionEventRef = useRef("");
    const isCurrentMaterial = loadState?.materialId === materialId;
    const material = isCurrentMaterial ? loadState.material : null;
    const loading = !isCurrentMaterial || loadState.status === "loading";
    const error = isCurrentMaterial ? loadState.error : "";
    const cardIndex = progress.materialId === materialId ? progress.cardIndex : 0;
    const showAnswer = progress.materialId === materialId && progress.showAnswer;
    const complete = progress.materialId === materialId && progress.complete;
    const allIndices = cardOrder.materialId === materialId
        ? cardOrder.indices
        : material?.cards.map((_, index) => index) || [];
    const cardIndices = reviewOnly ? allIndices.filter((index) => ratings.materialId === materialId && ratings.byCard[index] === "review-again") : allIndices;
    const sourceIndex = cardIndices[cardIndex];
    const currentCard = material && Number.isInteger(sourceIndex) ? material.cards[sourceIndex] : null;
    const cardRating = ratings.materialId === materialId ? ratings.byCard[sourceIndex] : undefined;
    const ratedCount = ratings.materialId === materialId
        ? Object.keys(ratings.byCard).length
        : 0;
    const gotItCount = ratings.materialId === materialId
        ? Object.values(ratings.byCard).filter((rating) => rating === "got-it").length
        : 0;
    const reviewCount = ratings.materialId === materialId
        ? Object.values(ratings.byCard).filter((rating) => rating === "review-again").length
        : 0;


    useEffect(() => {
        let active = true;
        apiRequest(`/study-materials/${encodeURIComponent(materialId)}`)
            .then(async ({ material: savedMaterial }) => {
                if (!active) return;
                if (savedMaterial.type !== "flashcards") {
                    setLoadState({
                        materialId,
                        status: "error",
                        material: null,
                        error: "This saved item is not a flashcard set.",
                    });
                    return;
                }
                setLoadState({ materialId, status: "success", material: savedMaterial, error: "" });
                apiRequest(`/notebooks/${encodeURIComponent(savedMaterial.sourceNotebookId)}`)
                    .then(({ notebook }) => { if (active) setNotebookName({ materialId, name: notebook?.name || "" }); })
                    .catch(() => {});
                const saved = await apiRequest(`/study-materials/${encodeURIComponent(materialId)}/progress`);
                setCardOrder({ materialId, indices: saved.state?.indices?.length === savedMaterial.cards.length ? saved.state.indices : savedMaterial.cards.map((_, index) => index) });
                setProgress({ materialId, cardIndex: saved.state?.cardIndex || 0, showAnswer: Boolean(saved.state?.showAnswer), complete: Boolean(saved.state?.complete) });
                if (saved.state?.complete && saved.state?.sessionId) completionEventRef.current = saved.state.sessionId;
                setFlipStarted(false);
                setRatings({ materialId, byCard: saved.state?.ratings || {} });
                setReviewOnly(Boolean(saved.state?.reviewOnly));
            })
            .catch((loadError) => {
                if (active) setLoadState({ materialId, status: "error", material: null, error: loadError.message });
            });
        return () => {
            active = false;
        };
    }, [apiRequest, materialId]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!material?.cards.length || complete || event.altKey || event.ctrlKey || event.metaKey) return;
            const target = event.target;
            if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
            const onFlipControl = target instanceof HTMLElement && target.closest("button[aria-label='Reveal answer'], button[aria-label='Show question']");
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                setProgress((current) => ({
                    materialId,
                    cardIndex: Math.max(0, (current.materialId === materialId ? current.cardIndex : 0) - 1),
                    showAnswer: false,
                    complete: false,
                }));
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setProgress((current) => ({
                    materialId,
                    cardIndex: Math.min(cardIndices.length - 1, (current.materialId === materialId ? current.cardIndex : 0) + 1),
                    showAnswer: false,
                    complete: false,
                }));
            } else if ((event.key === " " || event.key === "Enter") && !onFlipControl) {
                event.preventDefault();
                setFlipStarted(true);
                setProgress((current) => ({ ...current, materialId, showAnswer: !current.showAnswer, complete: false }));
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [apiRequest, cardIndices.length, complete, material, materialId]);

    const moveTo = (nextIndex) => setProgress({
        materialId,
        cardIndex: nextIndex,
        showAnswer: false,
        complete: false,
    });

    const completeRound = async () => {
        if (cardIndices.some((index) => !["got-it", "review-again"].includes(ratings.byCard[index]))) {
            setActivityError("Rate every card in this round before completing it.");
            return;
        }
        const eventId = completionEventRef.current || crypto.randomUUID();
        completionEventRef.current = eventId;
        setProgress({ materialId, cardIndex, showAnswer: false, complete: true, sessionId: eventId });
        try {
            await apiRequest(`/study-materials/${encodeURIComponent(materialId)}/sessions`, { method: "POST", body: JSON.stringify({ sessionId: eventId, indices: cardIndices, ratings: ratings.byCard, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }) });
            setActivityError("");
        } catch (error) { setActivityError(error.message); }
    };

    const rateCard = (rating) => {
        setRatings((current) => ({
            materialId,
            byCard: {
                ...(current.materialId === materialId ? current.byCard : {}),
                [sourceIndex]: rating,
            },
        }));
    };

    const restart = () => {
        completionEventRef.current = "";
        setReviewOnly(false);
        moveTo(0);
        setRatings({ materialId, byCard: {} });
    };

    const shuffle = () => {
        if (!material) return;
        completionEventRef.current = "";
        setCardOrder({ materialId, indices: shuffledIndices(material.cards.length) });
        moveTo(0);
    };

    const reviewMissed = () => {
        if (!allIndices.some((index) => ratings.byCard[index] === "review-again")) return;
        completionEventRef.current = "";
        setReviewOnly(true);
        setProgress({ materialId, cardIndex: 0, showAnswer: false, complete: false });
    };

    useEffect(() => {
        if (!material || progress.materialId !== materialId) return;
        const timer = setTimeout(() => apiRequest(`/study-materials/${encodeURIComponent(materialId)}/progress`, { method: "PUT", body: JSON.stringify({ state: { ...progress, ratings: ratings.byCard, indices: cardOrder.indices, reviewOnly } }) }).catch(() => {}), 300);
        return () => clearTimeout(timer);
    }, [apiRequest, material, materialId, progress, ratings, cardOrder, reviewOnly]);

    return (
        <div className={`study-tools-motion mx-auto w-full max-w-7xl space-y-6 ${styles.primaryText}`}>
           

            {loading && <p role="status" className={styles.secondaryText}>Loading flashcards...</p>}
            {error && (
                <div role="alert" className={`rounded-lg border px-4 py-3 text-sm ${styles.studyDanger}`}>
                    {error}
                </div>
            )}

            {material && (
                <>
                    <header className={`flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between ${styles.border}`}>
                        <div className="min-w-0">
                        <h1 className="break-words font-serif text-2xl font-semibold sm:text-3xl">{material.title}</h1>
                        
                        {notebookName.materialId === materialId && notebookName.name && <p className={`mt-1 text-sm ${styles.studyMutedText}`}>Notebook: {notebookName.name}</p>}
                        </div>
                    </header>

                    {material.cards.length > 0 ? (
                        <section className="flex flex-col items-center py-2 sm:py-5" aria-label="Flashcard study">
                            <div className="mb-5 w-full max-w-7xl">
                                <div
                                    role="progressbar"
                                    aria-label="Flashcard deck progress"
                                    aria-valuemin={0}
                                    aria-valuemax={cardIndices.length}
                                    aria-valuenow={complete ? cardIndices.length : cardIndex + 1}
                                    className={`h-2 overflow-hidden rounded-full ${styles.stepTrack}`}
                                >
                                    <div
                                        className={`h-full rounded-full transition-[width] duration-150 motion-reduce:transition-none ${styles.stepProgress}`}
                                        style={{ width: `${complete ? 100 : ((cardIndex + 1) / cardIndices.length) * 100}%` }}
                                    />
                                </div>
                                <p className={`mt-2 text-center text-xs font-medium ${styles.studyMutedText}`}>
                                    {complete ? (reviewOnly ? "Review round complete" : "Deck complete") : `Card ${cardIndex + 1} of ${cardIndices.length}${reviewOnly ? " · Review again" : ""}`}
                                </p>
                            </div>

                            {complete ? (
                                <div className={`w-full max-w-7xl rounded-3xl border p-6 text-center shadow-sm sm:p-10 ${styles.border} ${styles.secondaryBg}`}>
                                    <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${styles.greenBg2} ${styles.correctText}`}>
                                        <Check className="h-6 w-6" aria-hidden="true" />
                                    </span>
                                    <h2 className="mt-4 font-serif text-2xl font-semibold">Deck complete</h2>
                                    <p className={`mt-2 text-sm ${styles.secondaryText}`}>
                                        {gotItCount} got it · {reviewCount} to review · {reviewOnly ? "Focused review complete." : "Round complete."}
                                    </p>
                                    {activityError && <div role="alert" className={`mx-auto mt-4 max-w-lg rounded-lg border p-3 text-sm ${styles.studyDanger}`}><p>Round complete, but study activity could not be recorded.</p><button type="button" onClick={completeRound} className="mt-2 underline">Retry activity</button></div>}
                                    {!reviewOnly && ratedCount > gotItCount && <button type="button" onClick={reviewMissed} className={`mt-4 mr-2 min-h-11 rounded-lg px-4 text-sm font-medium ${styles.studyGhostButton} ${styles.studyFocusRing}`}>Review missed cards</button>}
                                    <button
                                        type="button"
                                        onClick={restart}
                                        className={`mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium ${styles.studyPrimaryButton} ${styles.studyFocusRing}`}
                                    >
                                        <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restart deck
                                    </button>
                                </div>
                            ) : currentCard ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFlipStarted(true);
                                            setProgress({ materialId, cardIndex, showAnswer: !showAnswer, complete: false });
                                        }}
                                        className={`h-[20rem] w-full max-w-7xl rounded-3xl text-center ${styles.studyFocusRing} sm:h-[25rem]`}
                                        style={{ perspective: "1000px" }}
                                        aria-label={showAnswer ? "Show question" : "Reveal answer"}
                                        aria-pressed={showAnswer}
                                    >
                                        <span className={`relative block h-full w-full [transform-style:preserve-3d] ${showAnswer ? (flipStarted ? "flashcard-flipper-back" : "[transform:rotateY(180deg)]") : (flipStarted ? "flashcard-flipper-front" : "")}`}>
                                            <span className={`absolute inset-0 flex flex-col items-center rounded-3xl border px-6 pb-6 pt-8 text-center shadow-sm [backface-visibility:hidden] sm:px-12 sm:pb-8 ${styles.border} ${styles.secondaryBg} ${styles.secondaryBgHover}`}>
                                                <span className={`shrink-0 text-sm ${styles.studyMutedText}`}>Question</span>
                                                <span className="flex min-h-0 w-full flex-1 items-center justify-center overflow-y-auto py-4 font-serif text-2xl font-semibold leading-relaxed sm:text-3xl">{currentCard.question}</span>
                                                <span className={`shrink-0 text-sm ${styles.studyMutedText}`}>Tap or press Space to flip</span>
                                            </span>
                                            <span className={`absolute inset-0 flex flex-col items-center rounded-3xl border px-6 pb-6 pt-8 text-center shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)] sm:px-12 sm:pb-8 ${styles.border} ${styles.secondaryBg}`}>
                                                <span className={`shrink-0 text-sm ${styles.studyMutedText}`}>Answer</span>
                                                <span className="flex min-h-0 w-full flex-1 items-center justify-center overflow-y-auto py-4 font-serif text-2xl font-semibold leading-relaxed sm:text-3xl">{currentCard.answer}</span>
                                                <span className={`shrink-0 text-sm ${styles.studyMutedText}`}>Tap or press Space to flip back</span>
                                            </span>
                                        </span>
                                    </button>
                                    {showAnswer && (
                                        <div className="mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label="Rate this flashcard">
                                            <button
                                                type="button"
                                                aria-pressed={cardRating === "got-it"}
                                                onClick={() => rateCard("got-it")}
                                                className={`min-h-10 rounded-lg border px-4 text-sm font-medium ${styles.studyFocusRing} ${cardRating === "got-it" ? styles.studySuccess : styles.studyGhostButton}`}
                                            >
                                                Got it
                                            </button>
                                            <button
                                                type="button"
                                                aria-pressed={cardRating === "review-again"}
                                                onClick={() => rateCard("review-again")}
                                                className={`min-h-10 rounded-lg border px-4 text-sm font-medium ${styles.studyFocusRing} ${cardRating === "review-again" ? styles.studyDanger : styles.studyGhostButton}`}
                                            >
                                                Review again
                                            </button>
                                        </div>
                                    )}
                                    {activityError && <p role="alert" className={`mt-3 text-center text-sm ${styles.studyDanger}`}>{activityError}</p>}
                                    <div className="mt-4 grid gap-2 sm:gap-4 grid-cols-4">

                                        <button
                                            type="button"
                                            disabled={cardIndex === 0}
                                            aria-label="Previous card"
                                            title="Previous card"
                                            onClick={() => moveTo(cardIndex - 1)}
                                            className={`flex p-2.5 items-center justify-center rounded-xl ${styles.blueBg2} ${styles.blueBg2hover} ${styles.studyFocusRing} disabled:cursor-not-allowed disabled:opacity-40`}
                                        >
                                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                        </button>

                                        <button
                                            type="button"
                                            aria-label="Shuffle cards"
                                            title="Shuffle cards"
                                            onClick={shuffle}
                                            className={`flex p-2.5 items-center justify-center rounded-xl ${styles.buttonFrost} ${styles.studyFocusRing}`}
                                        >
                                            <Shuffle className="h-5 w-5" aria-hidden="true" />
                                        </button>

                                        <button
                                            type="button"
                                            aria-label="Restart flashcards"
                                            title="Restart flashcards"
                                            onClick={restart}
                                            className={`flex p-2.5 items-center justify-center rounded-xl ${styles.buttonFrost} ${styles.studyFocusRing}`}
                                        >
                                            <RotateCcw className="h-5 w-5" aria-hidden="true" />
                                        </button>

                                        <button
                                            type="button"
                                            aria-label={cardIndex === cardIndices.length - 1 ? "Complete study round" : "Next card"}
                                            title={cardIndex === cardIndices.length - 1 ? "Complete study round" : "Next card"}
                                            onClick={() => cardIndex === cardIndices.length - 1 ? completeRound() : moveTo(cardIndex + 1)}
                                            className={`flex p-2.5 items-center justify-center rounded-xl ${styles.blueBg2} ${styles.blueBg2hover} ${styles.studyFocusRing} disabled:cursor-not-allowed disabled:opacity-40`}
                                        >
                                            {cardIndex === cardIndices.length - 1 ? <Check className="h-5 w-5" aria-hidden="true" /> : <ChevronRight className="h-5 w-5" aria-hidden="true" />}
                                        </button>

                                    </div>

                                </>
                            ) : null}
                        </section>
                    ) : (
                        <p className={`rounded-lg border p-6 text-center ${styles.border} ${styles.secondaryText}`}>
                            This flashcard set has no cards.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
