import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { ArrowUp, X } from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import Styling from "../../theme/Styling";
import FinnieIcon from "../../../../../public/Finnie.png";

marked.setOptions({ breaks: true, gfm: true });

function ResponseText({ text }) {
  const html = DOMPurify.sanitize(marked.parse(text || ""));
  return <div className="finnie-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function FinnieChat() {
  const styles = Styling();
  const { apiRequest } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileViewportHeight, setMobileViewportHeight] = useState(0);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const chatPanelRef = useRef(null);
  const launcherRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (window.matchMedia("(min-width: 640px)").matches) inputRef.current?.focus();
      const container = messagesContainerRef.current;
      if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [open, messages, loading]);

  useEffect(() => {
    if (!open) return undefined;
    const viewport = window.visualViewport;
    const updateViewportHeight = () => {
      setMobileViewportHeight(Math.round(viewport?.height || window.innerHeight));
    };
    updateViewportHeight();
    viewport?.addEventListener("resize", updateViewportHeight);
    window.addEventListener("resize", updateViewportHeight);
    return () => {
      viewport?.removeEventListener("resize", updateViewportHeight);
      window.removeEventListener("resize", updateViewportHeight);
    };
  }, [open]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (
        !chatPanelRef.current?.contains(event.target) &&
        !launcherRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || loading) return;
    const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: "user", content: message }]);
    setDraft("");
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest("/finnie/chat", {
        method: "POST",
        body: JSON.stringify({ message, history }),
      });
      setMessages((current) => [...current, { role: "assistant", content: result.response }]);
    } catch (requestError) {
      setError(requestError.message || "Finnie could not respond right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <section
          ref={chatPanelRef}
          aria-label="Chat with Finnie"
          className={`fixed inset-0 z-[60] flex h-[var(--finnie-mobile-height)] w-full flex-col overflow-hidden ${styles.secondaryBg} ${styles.border} ${styles.primaryText} sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(40rem,calc(100dvh-3rem))] sm:max-h-[calc(100dvh-3rem)] sm:w-[min(24rem,calc(100vw-3rem))] sm:rounded-2xl sm:border sm:shadow-2xl`}
          style={{ "--finnie-mobile-height": `${mobileViewportHeight || window.innerHeight}px` }}
        >
          <header className={`flex shrink-0 items-center justify-between border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] ${styles.border} sm:py-3`}>
            <div className="flex items-center gap-3">
              <span className="relative block">
                <img src={FinnieIcon} alt="" className={`h-10 w-10 p-0.5 rounded-full border  object-cover ${styles.border}`} />
                <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${styles.border} bg-emerald-500`} />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Finnie</h2>
                <p className={`text-xs ${styles.secondaryText}`}>Your Finote assistant</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Finnie chat" className={`rounded-lg p-2 ${styles.secondaryBgHover}`}>
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={messagesContainerRef} className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain p-4" aria-live="polite" aria-relevant="additions text">
            {!messages.length && (
              <div className={`items-center flex flex-col`}>
                <p className="text-base font-semibold tracking-tight pt-2">Hi! I’m Finnie.</p>
                <p className={`mt-1 leading-relaxed text-sm text-center ${styles.secondaryText}`}>I can explain Finote features and help you plan your study routine.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["How do flashcards work?", "Help me plan a study session", "What can I do in Finote?"].map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => { setDraft(suggestion); inputRef.current?.focus(); }} className={`rounded-full border px-3 py-1.5 text-left text-xs transition-colors hover:text-blue-600 ${styles.border} ${styles.secondaryBg}`}>
                      {suggestion}
                    </button>
                  ))}
                </div>
                  <p className={`mt-4 border-t pt-3 text-xs leading-relaxed text-center ${styles.border} ${styles.tertiaryText}`}>
                    I can’t access your personal notes, schedule, account details, or past conversations.
                  </p>              
                </div>
            )}
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`flex min-w-0 ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`min-w-0 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${item.role === "user" ? "max-w-[90%] rounded-br-md bg-blue-600 text-white shadow-sm" : `max-w-full rounded-bl-md border ${styles.border} ${styles.primaryBg} ${styles.primaryText} shadow-sm`}`}>
                  {item.role === "assistant" ? <ResponseText text={item.content} /> : <p className="whitespace-pre-wrap break-words">{item.content}</p>}
                </div>
              </div>
            ))}
            {loading && <div className={`flex items-center gap-2 text-sm ${styles.secondaryText}`} role="status"><span className="finnie-typing"><i /><i /><i /></span></div>}
            {error && <div role="alert" className={`rounded-lg border p-3 text-sm ${styles.border} bg-red-500/10 text-red-700 dark:text-red-300`}>{error}</div>}
          </div>

          <form onSubmit={sendMessage} className={`shrink-0 border-t px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${styles.border} sm:pb-3`}>
            <label className="sr-only" htmlFor="finnie-message">Message Finnie</label>
            <div className={`flex items-end gap-2 rounded-lg border p-2 shadow-sm transition-colors  ${styles.border} ${styles.input}`}>
              <textarea
                ref={inputRef}
                id="finnie-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
                placeholder="Ask Finnie…"
                rows={1}
                maxLength={2000}
                disabled={loading}
                className={`max-h-28 min-h-8 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none ${styles.primaryText}`}
              />
              <button type="submit" disabled={!draft.trim() || loading} aria-label="Send message" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45">
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
            <p className={`mt-1.5 px-1 text-[11px] text-center ${styles.tertiaryText}`}>Finnie can make mistakes. Don’t share sensitive information.</p>
          </form>
        </section>
      )}
      {!open && (
        <button 
          ref={launcherRef} 
          type="button" 
          onClick={() => setOpen(true)} 
          aria-label="Open Finnie chat" 
          className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[60] flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:bottom-6 sm:right-6 cursor-pointer ${styles.secondaryBgHover} ${styles.secondaryBg} ${styles.border}`}>
          <img src={FinnieIcon} alt="" className="h-10 w-auto object-cover" />
        </button>
      )}
    </>
  );
}
