import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Home, LockKeyhole, Search, ServerCrash } from "lucide-react";
import Styling from "../theme/Styling";

const states = {
  unauthorized: { code: "401", title: "Sign in required", description: "Sign in to access this page.", icon: LockKeyhole },
  forbidden: { code: "403", title: "Access denied", description: "You do not have permission to view this page.", icon: AlertCircle },
  notFound: { code: "404", title: "Page not found", description: "The page you’re looking for doesn’t exist.", icon: Search },
  error: { code: "500", title: "Something went wrong", description: "Please try again in a moment.", icon: ServerCrash },
  success: { code: "200", title: "All set", description: "Your request completed successfully.", icon: CheckCircle2 },
};

export default function StatusPage({ type = "error", title, description, action, onAction }) {
  const styles = Styling();
  const state = states[type] || states.error;
  const Icon = state.icon;
  return <main className={`grid min-h-dvh place-items-center px-5 py-12 ${styles.primaryBg} ${styles.primaryText}`}>
    <section className="w-full max-w-md text-center">
      <div className={`mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl ${styles.blueBg2} ${styles.blueText}`}><Icon className="h-7 w-7" /></div>
      <p className={`text-sm font-semibold tracking-widest ${styles.blueText}`}>{state.code}</p>
      <h1 className="mt-2 text-3xl font-semibold">{title || state.title}</h1>
      <p className={`mx-auto mt-3 max-w-sm text-sm leading-6 ${styles.secondaryText}`}>{description || state.description}</p>
      {onAction ? <button onClick={onAction} className={`mt-7 rounded-lg px-5 py-2.5 text-sm font-medium ${styles.buttonBlue}`}>{action || "Continue"}</button> : <Link to={type === "unauthorized" ? "/?auth=signin" : "/home"} className={`mt-7 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium ${styles.buttonBlue}`}><Home className="h-4 w-4" />{type === "unauthorized" ? "Go to sign in" : "Go to workspace"}</Link>}
    </section>
  </main>;
}
