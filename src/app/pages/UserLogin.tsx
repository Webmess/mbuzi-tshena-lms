import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  User,
  Lock,
  ArrowLeft,
  Mail,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { Logo, LogoIcon } from "../components/Logo";
import clsx from "clsx";

type View = "login" | "forgot" | "reset-otp" | "new-password";

/* ─── OTP 6‑box input component ─────────────────────────────────── */
interface OtpInputProps {
  value: string[];
  onChange: (val: string[]) => void;
  hasError: boolean;
}

function OtpInput({ value, onChange, hasError }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (i: number) => refs.current[i]?.focus();

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) focus(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[i]) {
        const next = [...value];
        next[i] = "";
        onChange(next);
      } else if (i > 0) {
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      focus(i - 1);
    } else if (e.key === "ArrowRight" && i < 5) {
      focus(i + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = [...value];
    for (let j = 0; j < 6; j++) next[j] = text[j] ?? "";
    onChange(next);
    focus(Math.min(text.length, 5));
  };

  return (
    <div className="flex gap-3 justify-center">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className={clsx(
            "w-11 h-14 text-center text-xl font-bold rounded-lg border-2 transition-all focus:outline-none",
            hasError
              ? "border-red-400 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-300"
              : digit
              ? "border-[#005B3F] bg-[#E5F2D9]/50 text-[#005B3F] focus:ring-2 focus:ring-[#B4D330]"
              : "border-gray-200 bg-white text-[#111827] focus:border-[#005B3F] focus:ring-2 focus:ring-[#B4D330]"
          )}
        />
      ))}
    </div>
  );
}

/* ─── Left panel (unchanged from original) ───────────────────────── */
function LeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative bg-[#005B3F]">
      <div className="absolute inset-0 bg-[#005B3F]/70 mix-blend-multiply z-10"></div>
      <img
        src="https://images.unsplash.com/photo-1655720360377-b97f6715e1ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwcGVyc29uJTIwdXNpbmclMjBtb2JpbGUlMjBwaG9uZSUyMGJhbmtpbmd8ZW58MXx8fHwxNzczMDczNzQ0fDA&ixlib=rb-4.1.0&q=80&w=1080"
        alt="Banking on the go"
        className="absolute inset-0 w-full h-full object-cover z-0 grayscale"
      />
      <div className="relative z-20 flex flex-col justify-between p-12 text-white h-full w-full">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 hover:text-[#B4D330] transition-colors text-sm font-bold">
            <ArrowLeft className="w-4 h-4" />
            Back to main site
          </Link>
        </div>
        <div className="max-w-md">
          <div className="inline-flex bg-[#B4D330] p-3 rounded-xl mb-6 shadow-sm">
            <LogoIcon className="w-10 h-10 text-[#005B3F]" />
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">Empowering your financial future.</h1>
          <p className="text-lg text-white/90 font-medium">
            Access your personalized dashboard to manage loan requests, track your payments, and view your risk score anywhere, anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function UserLogin() {
  const navigate = useNavigate();

  // View state to toggle between login and forgot password flows
  const [view, setView] = useState<View>("login");

  // Existing login state (unchanged)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  // Existing handleLogin (unchanged)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/login/json`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || data.message || "Invalid email/ID number or password.");
        return;
      }

      const meRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });

      if (!meRes.ok) {
        setError("Failed to retrieve user information.");
        return;
      }

      const user = await meRes.json();
      sessionStorage.setItem("user", JSON.stringify(user));
      navigate("/dashboard");
    } catch (err) {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Forgot password state ── */
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotLoading) return;
    setForgotEmailError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotEmailError("Please enter a valid email address.");
      return;
    }
    setForgotLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/auth/forgot-password?email=${encodeURIComponent(forgotEmail)}`,
        {
        method: "POST",
        },
      );

      if (!response.ok) {
        setForgotEmailError("Failed to send reset code. Please try again.");
        return;
      }
      setResetOtp(Array(6).fill(""));
      setResetOtpError("");
      setResetResendKey(0);
      setView("reset-otp");
    } catch {
      setForgotEmailError("Unable to connect to the server. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  /* ── Reset OTP state ── */
  const [resetOtp, setResetOtp] = useState(Array(6).fill(""));
  const [resetOtpError, setResetOtpError] = useState("");
  const [resetResendKey, setResetResendKey] = useState(0);
  const [resetCountdown, setResetCountdown] = useState(30);
  const [resetCanResend, setResetCanResend] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resetToken, setResetToken] = useState(""); 

  useEffect(() => {
    if (view !== "reset-otp") return;
    setResetCountdown(30);
    setResetCanResend(false);
    const timer = setInterval(() => {
      setResetCountdown(prev => {
        if (prev <= 1) {
          setResetCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [view, resetResendKey]);

  const handleResetResend = async () => {
    if (!resetCanResend || resendLoading) return;
    setResendLoading(true);
    setResetOtp(Array(6).fill(""));
    setResetOtpError("");
    try {
      const response = await fetch(
        `${API_URL}/api/auth/forgot-password?email=${encodeURIComponent(forgotEmail)}`,
        {
        method: "POST",
        },
      );
      if (!response.ok) {
        setResetOtpError("Failed to resend code. Please try again.");
        return;
      }
      setResetResendKey(k => k + 1);
    } catch {
      setResetOtpError("Unable to connect to the server. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleResetOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetLoading) return;
    const code = resetOtp.join("");
    if (code.length < 6) {
      setResetOtpError("Please enter the full 6-digit code.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setResetOtpError("Code must contain digits only.");
      return;
    }
    setResetLoading(true);
    try {
      const params = new URLSearchParams({
        email: forgotEmail,
        reset_code: code,
      });
      const response = await fetch(
        `${API_URL}/api/auth/verify-reset-otp?${params.toString()}`,
        { method: "POST" },
      );
      if (!response.ok) {
        let errorMessage = "Invalid or expired OTP. Please try again.";
        try {
          const errorData = await response.json();
          if (typeof errorData?.detail === "string") {
            errorMessage = errorData.detail;
          }
        } catch {
          // Keep the fallback message when the response is not valid JSON.
        }
        setResetOtpError(errorMessage);
        return;
      }
      setResetToken((await response.json()).reset_token);
      setNewPw("");
      setConfirmNewPw("");
      setNewPwError("");
      setShowNewPw(false);
      setView("new-password");
    } catch {
      setResetOtpError("Unable to connect to the server. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  /* ── New password state ── */
  const [newPw, setNewPw] = useState("");
  const [confirmNewPw, setConfirmNewPw] = useState("");
  const [newPwError, setNewPwError] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [newPwLoading, setNewPwLoading] = useState(false);

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwLoading) return;
    setNewPwError("");
    if (newPw.length < 6) {
      setNewPwError("Password must be at least 6 characters.");
      return;
    }
    if (newPw !== confirmNewPw) {
      setNewPwError("Passwords do not match.");
      return;
    }
    setNewPwLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, password: newPw, reset_token: resetToken }),
      });
      if (!response.ok) {
        setNewPwError("Failed to reset password. Please try again.");
        return;
      }
      setForgotEmail("");
      setView("login");
    } catch {
      console.error("Error resetting password:", e);
      setNewPwError("Unable to connect to the server. Please try again.");
    } finally {
      setNewPwLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex font-['Inter',sans-serif]">
      <LeftPanel />

      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 xl:px-24">
        {/* Mobile header (unchanged) */}
        <div className="lg:hidden mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-[#005B3F] hover:text-[#00432E] transition-colors text-sm font-bold mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to main site
          </Link>
          <Logo textClassName="text-2xl font-bold tracking-tight" iconClassName="w-8 h-8 text-[#005B3F]" />
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* ── LOGIN VIEW (identical to original, except Forgot password button) ── */}
          {view === "login" && (
            <>
              <h2 className="text-3xl font-bold tracking-tight text-[#111827]">
                Welcome back
              </h2>
              <p className="mt-2 text-sm font-medium text-gray-500">
                Please sign in to your personal account
              </p>

              <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                <div>
                  <label className="block text-sm font-bold text-[#111827]">
                    Email or ID Number
                  </label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-lg text-[#111827] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B4D330] focus:border-transparent transition-all font-medium sm:text-sm shadow-sm"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#111827]">
                    Password
                  </label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-lg text-[#111827] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B4D330] focus:border-transparent transition-all font-medium sm:text-sm shadow-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-[#005B3F] focus:ring-2 focus:ring-[#B4D330] border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-gray-600">
                      Remember me
                    </label>
                  </div>

                  {/* Changed: now a button that switches to forgot password view */}
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(""); setForgotEmailError(""); setView("forgot"); }}
                    className="text-sm font-bold text-[#005B3F] hover:text-[#00432E] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <div>
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-sm text-sm font-bold text-white bg-[#005B3F] hover:bg-[#00432E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B4D330] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center text-sm font-medium">
                <span className="text-gray-500 mr-1">New to Mbudzi Tshena?</span>
                <a href="/sign-up" className="font-bold text-[#005B3F] hover:text-[#00432E] transition-colors">
                  Create an account
                </a>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD VIEW ── */}
          {view === "forgot" && (
            <>
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-[#E5F2D9] border border-[#B4D330]/30 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                  <KeyRound className="w-8 h-8 text-[#005B3F]" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-[#111827]">Forgot your password?</h2>
                <p className="mt-3 text-sm font-medium text-gray-500 leading-relaxed max-w-sm">
                  No worries. Enter your registered email and we'll send you a reset code.
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleForgotSubmit}>
                <div>
                  <label className="block text-sm font-bold text-[#111827]">Email Address</label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => { setForgotEmail(e.target.value); setForgotEmailError(""); }}
                      className={clsx(
                        "block w-full pl-10 pr-3 py-3 bg-white border rounded-lg text-[#111827] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B4D330] focus:border-transparent transition-all font-medium sm:text-sm shadow-sm",
                        forgotEmailError ? "border-red-400" : "border-gray-200"
                      )}
                      placeholder="name@example.com"
                    />
                  </div>
                  {forgotEmailError && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />{forgotEmailError}
                    </p>
                  )}
                </div>

                <button type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#005B3F] hover:bg-[#00432E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B4D330] transition-colors">
                  Send Reset Code
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
                <button onClick={() => setView("login")}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to sign in
                </button>
              </div>
            </>
          )}

          {/* ── RESET OTP VIEW ── */}
          {view === "reset-otp" && (
            <>
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-[#E5F2D9] border border-[#B4D330]/30 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                  <Mail className="w-8 h-8 text-[#005B3F]" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-[#111827]">Check your email</h2>
                <p className="mt-3 text-sm font-medium text-gray-500 leading-relaxed max-w-sm">
                  We've sent a 6-digit reset code to{" "}
                  <span className="font-bold text-[#111827]">{forgotEmail}</span>.
                  Enter it below to continue.
                </p>
              </div>

              <form onSubmit={handleResetOtpVerify} className="space-y-6">
                <OtpInput value={resetOtp} onChange={setResetOtp} hasError={!!resetOtpError} />

                {resetOtpError && (
                  <div className="flex items-center justify-center gap-2 text-sm text-red-600 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {resetOtpError}
                  </div>
                )}

                <button type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#005B3F] hover:bg-[#00432E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B4D330] transition-colors">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Verify Code
                </button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="text-sm text-gray-500 font-medium">Didn't receive a code?</p>
                {resetCanResend ? (
                  <button onClick={handleResetResend}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#005B3F] hover:text-[#00432E] transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resend Code
                  </button>
                ) : (
                  <p className="text-sm font-medium text-gray-400">
                    Resend in <span className="font-bold text-[#005B3F]">{resetCountdown}s</span>
                  </p>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
                <button onClick={() => setView("forgot")}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              </div>
            </>
          )}

          {/* ── NEW PASSWORD VIEW ── */}
          {view === "new-password" && (
            <>
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-[#E5F2D9] border border-[#B4D330]/30 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                  <Lock className="w-8 h-8 text-[#005B3F]" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-[#111827]">Set new password</h2>
                <p className="mt-3 text-sm font-medium text-gray-500 leading-relaxed max-w-sm">
                  Choose a strong password for your account.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSetNewPassword}>
                {newPwError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {newPwError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-[#111827]">New Password</label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showNewPw ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => { setNewPw(e.target.value); setNewPwError(""); }}
                      className="block w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-lg text-[#111827] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B4D330] focus:border-transparent transition-all font-medium sm:text-sm shadow-sm"
                      placeholder="Minimum 6 characters"
                    />
                    <button type="button" onClick={() => setShowNewPw(p => !p)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#111827]">Confirm New Password</label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showNewPw ? "text" : "password"}
                      value={confirmNewPw}
                      onChange={(e) => { setConfirmNewPw(e.target.value); setNewPwError(""); }}
                      className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-lg text-[#111827] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B4D330] focus:border-transparent transition-all font-medium sm:text-sm shadow-sm"
                      placeholder="Re-enter your new password"
                    />
                  </div>
                </div>

                <button type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#005B3F] hover:bg-[#00432E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B4D330] transition-colors mt-2">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Reset Password
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
                <button onClick={() => setView("login")}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}