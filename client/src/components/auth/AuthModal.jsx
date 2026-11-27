import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import Styling from "../theme/Styling";
import { authRequest, useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";

export default function AuthModal({ mode, onClose, onSwitch }) {
  const styles = Styling();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [stage, setStage] = useState(mode === "signup" ? "signup" : "signin");
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm: "",
    code: "",
    rememberMe: false,
    acceptedTerms: false,
  });
  const [busy, setBusy] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const codeInputs = useRef([]);

  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const canSubmit = {
    signin: Boolean(form.email.trim() && form.password),
    signup: Boolean(
      form.email.trim() &&
        form.password &&
        form.confirm &&
        form.acceptedTerms,
    ),
    verify: form.code.length === 6,
    forgot: Boolean(form.email.trim()),
    reset: Boolean(form.code.length === 6 && form.password),
  }[stage];

  const updateStage = (value) => {
    setStage(value);
  };

  useEffect(() => {
    if (stage === "verify" || stage === "reset") {
      codeInputs.current[0]?.focus();
    }
  }, [stage]);

  const isCoolingDown = cooldownSeconds > 0;
  useEffect(() => {
    if (!isCoolingDown) return undefined;
    const timer = window.setInterval(() => {
      setCooldownSeconds((remaining) => Math.max(0, remaining - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isCoolingDown]);

  const formatWait = (seconds) => {
    if (seconds >= 60) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
    }
    return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  };

  const showRequestError = (error) => {
    if (error.status === 429) {
      const waitSeconds = Math.max(1, Number(error.retryAfterSeconds) || 60);
      setCooldownSeconds(waitSeconds);
      toast.error(`${error.message} Please wait ${formatWait(waitSeconds)} before trying again.`);
      return;
    }
    toast.error(error.message);
  };

  const updateCode = (index, value) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      const nextCode = `${form.code.slice(0, index)}${form.code.slice(index + 1)}`;
      set("code", nextCode);
      return;
    }

    const nextCode = form.code.padEnd(6, " ").split("");
    digits.slice(0, 6 - index).split("").forEach((digit, offset) => {
      nextCode[index + offset] = digit;
    });
    set("code", nextCode.join("").replace(/ /g, ""));
    codeInputs.current[Math.min(index + digits.length, 5)]?.focus();
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);

    try {
      if (stage === "signin") {
        const user = await signIn(form.email, form.password, form.rememberMe);
        onClose();
        navigate(user.profileComplete ? "/home" : "/complete-profile", {
          replace: true,
        });
      } else if (stage === "signup") {
        if (form.password !== form.confirm) {
          throw new Error("Passwords do not match.");
        }

        const result = await authRequest("/register", {
          method: "POST",
          body: JSON.stringify({
            email: form.email,
            password: form.password,
          }),
        });
        toast.success(result.message || "Check your email for a verification code.");
        setStage("verify");
      } else if (stage === "verify") {
        await authRequest("/verify-email", {
          method: "POST",
          body: JSON.stringify({ email: form.email, code: form.code }),
        });
        toast.success("Email verified. Please sign in to continue.");
        set("code", "");
        setStage("signin");
      } else if (stage === "forgot") {
        const result = await authRequest("/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: form.email }),
        });
        toast.success(result.message);
        setStage("reset");
      } else {
        const result = await authRequest("/reset-password", {
          method: "POST",
          body: JSON.stringify({
            email: form.email,
            code: form.code,
            newPassword: form.password,
          }),
        });
        toast.success(result.message);
        setStage("signin");
      }
    } catch (submitError) {
      showRequestError(submitError);
    } finally {
      setBusy(false);
    }
  };

  const title = {
    signin: "Welcome to Finote",
    signup: "Create your account",
    verify: "Verify your email",
    forgot: "Reset your password",
    reset: "Choose a new password",
  }[stage];

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className={`w-full max-w-md overflow-hidden rounded-xl border ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
      >
        <header className="flex items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <h2 id="auth-title" className="text-xl font-semibold">
              {title}
            </h2>
          
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className={`rounded-lg p-2 ${styles.closeButton}`}
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-4 px-6 pb-6">
          {(stage === "signin" ||
            stage === "signup" ||
            stage === "forgot") && (
            <label className="block text-sm font-medium">
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={`mt-1 w-full rounded-md border ${styles.input} px-4 py-2`}
                placeholder="you@example.com"
              />
            </label>
          )}

          {(stage === "signin" || stage === "signup" || stage === "reset") && (
            <label className="block text-sm font-medium">
              {stage === "reset" ? "New password" : "Password"}
              <input
                required
                minLength={8}
                maxLength={72}
                type="password"
                autoComplete={
                  stage === "signin" ? "current-password" : "new-password"
                }
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className={`mt-1 w-full rounded-md border ${styles.input} px-4 py-2`}
                placeholder="●●●●●●●●"
              />
            </label>
          )}

          {stage === "signup" && (
            <label className="block text-sm font-medium">
              Confirm password
              <input
                required
                minLength={8}
                maxLength={72}
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => set("confirm", e.target.value)}
                className={`mt-1 w-full rounded-md border ${styles.input} px-4 py-2`}
                placeholder="●●●●●●●●"
              />
            </label>
          )}

          {(stage === "verify" || stage === "reset") && (
            <>
              <fieldset className="min-w-0 space-y-2">
                <legend className="text-sm font-medium">
                  {stage === "verify" ? "Enter the six-digit code sent to your email" : "Password reset code"}
                </legend>
                <div className="grid min-w-0 grid-cols-6 gap-2" role="group" aria-label="Six-digit verification code">
                  {Array.from({ length: 6 }, (_, index) => (
                    <input
                      key={index}
                      ref={(element) => { codeInputs.current[index] = element; }}
                      aria-label={`Digit ${index + 1} of 6`}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      pattern="[0-9]"
                      maxLength={6}
                      required
                      value={form.code[index] || ""}
                      onChange={(event) => updateCode(index, event.target.value)}
                      onPaste={(event) => {
                        event.preventDefault();
                        const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                        set("code", digits);
                        codeInputs.current[Math.min(digits.length, 5)]?.focus();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Backspace" && !form.code[index] && index > 0) {
                          codeInputs.current[index - 1]?.focus();
                        } else if (event.key === "ArrowLeft" && index > 0) {
                          codeInputs.current[index - 1]?.focus();
                        } else if (event.key === "ArrowRight" && index < 5) {
                          codeInputs.current[index + 1]?.focus();
                        }
                      }}
                      className={`h-12 w-full min-w-0 rounded-lg border text-center text-xl font-semibold tabular-nums transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${styles.input} ${styles.border}`}
                    />
                  ))}
                </div>
              </fieldset>
              
              <div>
                <p className={`text-xs leading-relaxed ${styles.secondaryText}`}>
                  {stage === "verify"
                    ? "Check your inbox for the email verification code. If it doesn’t arrive, request a new code. It expires after 15 minutes."
                    : "Check your inbox for the password reset code. If it doesn’t arrive, request another code. It expires after 15 minutes."}
                </p>
              </div>
              <button
                type="button"
                disabled={resendingCode || cooldownSeconds > 0}
                className={`cursor-pointer text-sm ${styles.blueText} hover:underline disabled:cursor-not-allowed disabled:opacity-60`}
                onClick={async () => {
                  if (resendingCode) return;
                  if (cooldownSeconds > 0) return;
                  setResendingCode(true);
                  try {
                    const path =
                      stage === "verify"
                        ? "/resend-verification"
                        : "/forgot-password";
                    await authRequest(path, {
                      method: "POST",
                      body: JSON.stringify({ email: form.email }),
                    });
                    toast.success(
                      stage === "verify"
                        ? "If your account still needs verification, a new code has been sent."
                        : "If an account exists for this email, a password reset code has been sent.",
                    );
                  } catch (e) {
                    showRequestError(e);
                  } finally {
                    setResendingCode(false);
                  }
                }}
              >
                {resendingCode
                  ? "Sending code…"
                  : cooldownSeconds > 0
                    ? `Try again in ${formatWait(cooldownSeconds)}`
                    : "Send a new code"}
              </button>
            </>
          )}

          {stage === "signin" && (
            <div className="flex items-center justify-between text-sm">
              <label
                className={`flex items-center gap-2 ${styles.secondaryText}`}
              >
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={(e) => set("rememberMe", e.target.checked)}
                />
                Remember me (30 days)
              </label>
              <button
                type="button"
                onClick={() => updateStage("forgot")}
                className={`${styles.blueText} hover:underline`}
              >
                Forgot password?
              </button>
            </div>
          )}

          {stage === "signup" && (
            <label
              className={`flex items-start gap-2 text-xs ${styles.secondaryText}`}
            >
              <input
                type="checkbox"
                required
                checked={form.acceptedTerms}
                onChange={(e) => set("acceptedTerms", e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I agree to the{" "}
                <Link
                  to="/terms-of-services"
                  onClick={onClose}
                  className="underline"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy-policy"
                  onClick={onClose}
                  className="underline"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          )}

          <button
            disabled={busy || !canSubmit || cooldownSeconds > 0}
            type="submit"
            className={`mt-4 w-full rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${styles.buttonBlue}`}
          >
            {busy
              ? "Please wait…"
              : cooldownSeconds > 0
                ? `Try again in ${formatWait(cooldownSeconds)}`
              : {
                  signin: "Sign in",
                  signup: "Create account",
                  verify: "Verify email",
                  forgot: "Send reset code",
                  reset: "Reset password",
                }[stage]}
          </button>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            {stage === "signin" && (
              <button
                type="button"
                onClick={onSwitch}
                className={`${styles.secondaryText}`}
              >
                Don't have an account? <span className={`${styles.blueText} hover:underline cursor-pointer`}>Create account</span>
              </button>
            )}

            {stage === "signup" && (
              <button
                type="button"
                onClick={onSwitch}
                className={`${styles.secondaryText}`}
              >
                Already have an account? <span className={`${styles.blueText} hover:underline cursor-pointer`}>Sign in</span>
              </button>
            )}

            {stage === "forgot" && (
              <button
                type="button"
                onClick={() => updateStage("signin")}
                className={`${styles.blueText} hover:underline`}
              >
                Back to sign in
              </button>
            )}

            
          </div>
        </form>
      </section>
    </div>
  );
}
