import { Link, useNavigate } from "react-router";
import {
  Bell, LogOut, CheckCircle2, ArrowRight, Activity, Wallet, PieChart, TrendingUp,
  CreditCard, Briefcase, Filter, X, Upload, FileText, Clock, XCircle, Megaphone,
  Info, AlertCircle, Loader2
} from "lucide-react";
import clsx from "clsx";
import { Logo } from "../components/Logo";
import { useState, useEffect, useMemo, useRef } from "react";

/* ─── Real notifications API shape ───────────────────────────────── */
// Matches NotificationOut returned by GET /api/notifications/me
interface ApiNotification {
  id: number;
  type: "proof_accepted" | "proof_rejected" | "loan_approved" | "loan_rejected";
  message: string;
  read: boolean;
  created_at: string;
}

interface Notification extends ApiNotification {
  date: string; // formatted display string derived from created_at
}

// "Today, 09:41" / "Yesterday, 14:22" / "Mar 10, 09:00"
function formatNotificationDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false });

  if (date.toDateString() === now.toDateString()) return `Today, ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;

  return `${date.toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}, ${time}`;
}

/* ─── Real application history API shape ────────────────────────── */
// Matches ApplicationHistoryItem / LoanSummary returned by
// GET /api/applications/me/history
interface ApiLoanSummary {
  loan_number: string;
  status: string;
  outstanding_balance: number;
  monthly_instalment: number;
  total_repayable: number;
}

interface ApiApplicationHistoryItem {
  reference_number: string;
  loan_type: string;
  loan_amount: number;
  status: string;
  created_at: string;
  ai_risk_score: number | null;
  repayment_probability: number | null;
  loan: ApiLoanSummary | null;
}

const formatCurrency = (value: number) =>
  `R ${value.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;

/* ─── Investor modal ─────────────────────────────────────────────── */
interface InvestorFormData {
  amount: number;
  duration: number;
  risk: string;
  agreedAt: string;
}

function InvestorModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: InvestorFormData) => void }) {
  const [amount, setAmount]     = useState("");
  const [duration, setDuration] = useState("12");
  const [risk, setRisk]         = useState("Moderate");
  const [agreed, setAgreed]     = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!amount || Number(amount) < 1000) e.amount = "Minimum investment is R 1,000.";
    if (!agreed) e.agreed = "You must agree to the terms and conditions.";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSubmit({ amount: Number(amount), duration: Number(duration), risk, agreedAt: new Date().toISOString() });
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-[#111827]">Become a MicroFin Investor</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#E5F2D9] rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#005B3F]" />
            </div>
            <h4 className="text-lg font-bold text-[#111827] mb-2">Request Received!</h4>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Your investment request has been received. Our team will contact you within 2 business days to complete the onboarding process.
            </p>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-[#005B3F] hover:bg-[#00432E] text-white font-bold rounded-lg transition-colors text-sm">
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Amount */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
                Investment Amount (R) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="1000" value={amount}
                onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: "" })); }}
                placeholder="Minimum R 1,000"
                className={clsx("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B4D330]",
                  errors.amount ? "border-red-400" : "border-gray-200")}
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.amount}</p>}
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Investment Duration</label>
              <div className="flex gap-2 flex-wrap">
                {[["6", "6 Months"], ["12", "12 Months"], ["24", "24 Months"], ["36", "36 Months"]].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setDuration(v)}
                    className={clsx("px-4 py-1.5 rounded-lg border text-xs font-bold transition-all",
                      duration === v ? "bg-[#005B3F] text-white border-[#005B3F]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk level */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Risk Level</label>
              <div className="flex gap-2">
                {[["Conservative", "Low return, low risk"], ["Moderate", "Balanced portfolio"], ["Aggressive", "High return, higher risk"]].map(([v, desc]) => (
                  <button key={v} type="button" onClick={() => setRisk(v)}
                    className={clsx("flex-1 py-2 px-2 rounded-lg border-2 text-xs font-bold transition-all text-left",
                      risk === v ? "bg-[#E5F2D9] border-[#005B3F] text-[#005B3F]" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300")}>
                    <div>{v}</div>
                    <div className={clsx("font-normal mt-0.5", risk === v ? "text-[#005B3F]/70" : "text-gray-400")}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Terms */}
            <div>
              <label className={clsx("flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition-colors",
                agreed ? "bg-[#E5F2D9] border-[#B4D330]/40" : errors.agreed ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300")}>
                <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); setErrors(p => ({ ...p, agreed: "" })); }}
                  className="mt-0.5 h-4 w-4 text-[#005B3F] focus:ring-[#B4D330] rounded border-gray-300" />
                <span className="text-xs font-medium text-gray-700 leading-relaxed">
                  I agree to the MicroFin Investment Terms and Conditions. I understand that investments are subject to market risk and capital is not guaranteed unless stated.
                </span>
              </label>
              {errors.agreed && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.agreed}</p>}
            </div>

            <button onClick={handleSubmit}
              className="w-full py-3 bg-[#B4D330] hover:bg-[#a3c02b] text-[#005B3F] font-bold rounded-xl transition-colors text-sm">
              Submit Investment Request
              <ArrowRight className="w-4 h-4 inline ml-2" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const IS_ACCEPTING_LOANS = true;

interface LoanRecord {
  id: string;
  amount: string;
  amountValue: number;
  type: string;
  status: "approved" | "pending" | "rejected" | "repaid";
  date: string;
  repaymentProbability: number | null;
  riskScore: number;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  approved: { label: "Approved", className: "bg-[#E5F2D9] text-[#005B3F] border-[#B4D330]/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  pending:  { label: "Pending",  className: "bg-amber-50 text-amber-700 border-amber-100",     icon: <Clock className="w-3 h-3" /> },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-100",           icon: <XCircle className="w-3 h-3" /> },
  repaid:   { label: "Repaid",   className: "bg-blue-50 text-blue-700 border-blue-100",        icon: <CheckCircle2 className="w-3 h-3" /> },
};

// Maps backend ApplicationStatus + nested Loan.status into the frontend's
// four-state badge. Loan.status "Paid Off" (set in the payments router
// when outstanding_balance hits 0) takes priority over the application status.
function mapApiStatus(item: ApiApplicationHistoryItem): LoanRecord["status"] {
  if (item.loan?.status?.toLowerCase() === "paid off") return "repaid";
  const s = item.status.toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected" || s === "declined") return "rejected";
  return "pending"; // covers pending, under_review, etc.
}

export default function UserDashboard() {
  const navigate = useNavigate();

  // ─── Backend user data ───────────────────────────────────────────
  const [user, setUser] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState("");

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      setLogoutMessage("");

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();
      setLogoutMessage(data.message);

      if (!res.ok) {
        throw new Error(data.message || "Logout failed");
      }

      setTimeout(() => {
        sessionStorage.removeItem("user");
        navigate("/login", { replace: true });
      }, 1000);

    } catch (err: any) {
      setLogoutMessage(err.message || "Unable to log out.");
    } finally {
      setLoggingOut(false);
    }
  };

  // ─── Real loan application history ──────────────────────────────
  const [apiHistory, setApiHistory] = useState<ApiApplicationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();

    (async () => {
      try {
        setHistoryLoading(true);
        setHistoryError("");
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/applications/me/history`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Couldn't load your loan application history.");
        const data: ApiApplicationHistoryItem[] = await res.json();
        setApiHistory(data);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setHistoryError(err.message || "Something went wrong loading your applications.");
        }
      } finally {
        setHistoryLoading(false);
      }
    })();

    return () => controller.abort();
  }, [user]);

  const loanHistory: LoanRecord[] = useMemo(
    () =>
      apiHistory.map((item) => ({
        id: item.reference_number,
        amount: formatCurrency(item.loan_amount),
        amountValue: item.loan_amount,
        type: item.loan_type,
        status: mapApiStatus(item),
        date: item.created_at.slice(0, 10), // YYYY-MM-DD, for the date-range filter
        repaymentProbability: item.repayment_probability,
        riskScore: item.ai_risk_score ?? 0,
      })),
    [apiHistory]
  );

  // Sum of outstanding_balance across loans that aren't paid off yet.
  // Relies on GET /api/applications/me/history nesting `loan.outstanding_balance`.
  const activeLoanBalance = useMemo(
    () =>
      apiHistory.reduce((sum, item) => {
        if (item.loan && item.loan.status?.toLowerCase() !== "paid off") {
          return sum + Number(item.loan.outstanding_balance);
        }
        return sum;
      }, 0),
    [apiHistory]
  );

  // ─── Derived user status string (used in AI risk text) ─────────
  const userStatus = user?.is_active ? "Excellent" : "Inactive";

  // ─── Real notifications ──────────────────────────────────────────
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const notifRef = useRef<HTMLDivElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();

    (async () => {
      try {
        setNotificationsLoading(true);
        setNotificationsError("");
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/me`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Couldn't load notifications.");
        const data: ApiNotification[] = await res.json();
        setNotifications(data.map(n => ({ ...n, date: formatNotificationDate(n.created_at) })));
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setNotificationsError(err.message || "Something went wrong loading notifications.");
        }
      } finally {
        setNotificationsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current?.contains(e.target as Node) || notifBtnRef.current?.contains(e.target as Node)) return;
      setShowNotifications(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openNotifications = () => {
    setShowNotifications(p => !p);
    if (unreadCount === 0) return;

    // Optimistic update, then tell the backend. If the request fails we
    // don't roll back — worst case the badge under-counts until next load.
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    fetch(`${import.meta.env.VITE_API_URL}/api/notifications/me/read-all`, {
      method: "PATCH",
      credentials: "include",
    }).catch(err => console.error("Failed to mark notifications as read:", err));
  };

  // ─── Investor modal / "Total Invested" ──────────────────────────
  // NOTE: there is no investments backend/model, so this total only
  // reflects requests submitted in this browser session — it resets
  // on reload and isn't shared across devices. Add an investments
  // table + endpoint (e.g. GET /api/investments/me) to make this durable.
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [investorRequests, setInvestorRequests] = useState<InvestorFormData[]>([]);

  const handleInvestorSubmit = (data: InvestorFormData) => {
    setInvestorRequests(prev => [...prev, data]);
  };

  const totalInvested = useMemo(
    () => investorRequests.reduce((sum, r) => sum + r.amount, 0),
    [investorRequests]
  );

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterStatus, setFilterStatus]       = useState("all");
  const [filterDateFrom, setFilterDateFrom]   = useState("");
  const [filterDateTo, setFilterDateTo]       = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");

  const filterPanelRef = useRef<HTMLDivElement>(null);
  const filterBtnRef   = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(e.target as Node) &&
        filterBtnRef.current &&
        !filterBtnRef.current.contains(e.target as Node)
      ) {
        setShowFilterPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const [proofUploads, setProofUploads] = useState<Record<string, string>>({});

  const latestApplication = loanHistory.length > 0 ? loanHistory[0] : null;
  const aiRiskScore = latestApplication?.riskScore ?? null;

  const loanOffers = [
    { id: 1, title: "Personal Growth Loan", amount: "R1,000 - R 49,000", rate: "Prime + 2%", term: "24 Months", type: "Personal", icon: <CreditCard className="w-6 h-6 text-[#005B3F]" /> },
    { id: 2, title: "SME Starter Pack",     amount: "R150,00 - R 250,000", rate: "Prime + 1.5%", term: "48 Months", type: "Business", icon: <Briefcase className="w-6 h-6 text-[#005B3F]" /> },
  ];

  const hasActiveFilters = filterStatus !== "all" || filterDateFrom || filterDateTo || filterMinAmount || filterMaxAmount;

  const filteredHistory = useMemo(() => {
    return loanHistory.filter(loan => {
      if (filterStatus !== "all" && loan.status !== filterStatus) return false;
      if (filterDateFrom && loan.date < filterDateFrom) return false;
      if (filterDateTo && loan.date > filterDateTo) return false;
      if (filterMinAmount && loan.amountValue < Number(filterMinAmount)) return false;
      if (filterMaxAmount && loan.amountValue > Number(filterMaxAmount)) return false;
      return true;
    });
  }, [loanHistory, filterStatus, filterDateFrom, filterDateTo, filterMinAmount, filterMaxAmount]);

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterMinAmount("");
    setFilterMaxAmount("");
  };

  const handleProofUpload = (loanId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setProofUploads(prev => ({ ...prev, [loanId]: file.name }));
  };

  // ─── Loading state ────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#005B3F]/20 border-t-[#005B3F] rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] font-['Inter',sans-serif]">
      {/* Top Navigation */}
      <nav className="bg-[#005B3F] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate("/")}>
              <Logo textColor="text-white" />
            </div>
            <div className="flex items-center gap-6">
              {/* Notifications with green dot */}
              <div className="relative">
                <button
                  ref={notifBtnRef}
                  onClick={openNotifications}
                  className="text-white/80 hover:text-white transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-[#B4D330] ring-2 ring-[#005B3F]" />
                  )}
                </button>

                {showNotifications && (
                  <div ref={notifRef} className="absolute right-0 top-full mt-3 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-30 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800">Notifications</span>
                      <span className="text-xs text-gray-400 font-medium">{notifications.length} total</span>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="p-6 text-center text-sm text-gray-400 font-medium flex flex-col items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading…
                        </div>
                      ) : notificationsError ? (
                        <div className="p-6 text-center text-sm text-red-500 font-medium">{notificationsError}</div>
                      ) : notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-400 font-medium">No notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={clsx("px-4 py-3 flex items-start gap-3", !n.read ? "bg-[#E5F2D9]/50" : "bg-white")}>
                            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                              n.type === "proof_accepted" || n.type === "loan_approved" ? "bg-[#E5F2D9] text-[#005B3F]" : "bg-red-50 text-red-600")}>
                              {n.type === "proof_accepted" || n.type === "loan_approved"
                                ? <CheckCircle2 className="w-4 h-4" />
                                : <XCircle className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 leading-relaxed">{n.message}</p>
                              <p className="text-xs text-gray-400 mt-1 font-medium">{n.date}</p>
                            </div>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-[#005B3F] shrink-0 mt-1.5"></span>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 border-l border-white/20 pl-6">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                  {user.full_name ? user.full_name.charAt(0) : "?"}
                </div>
                <span className="font-medium hidden sm:block">{user.full_name || user.name}</span>
                <button
                  onClick={handleLogout}
                  className="ml-2 text-white/80 hover:text-white transition-colors flex items-center gap-1"
                  title="Logout"
                >
                  {loggingOut ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-5 h-5" />
                      Log Out
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {logoutMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 shadow-sm">
            {logoutMessage}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Announcement Banner */}
        {IS_ACCEPTING_LOANS && !announcementDismissed && (
          <div className="bg-[#005B3F] text-white rounded-xl px-5 py-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-[#B4D330] shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">
                <span className="font-bold">Loan applications are now open!</span> We are currently accepting new loan
                applications. Apply today and get a decision within 24 hours.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
              <button
                onClick={() => navigate("/apply")}
                className="bg-[#B4D330] text-[#005B3F] font-bold text-sm px-4 py-1.5 rounded-lg hover:bg-[#a3c02b] transition-colors whitespace-nowrap"
              >
                Apply Now
              </button>
              <button
                onClick={() => setAnnouncementDismissed(true)}
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Dismiss announcement"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Welcome Hero Banner */}
        <div className="relative w-full h-48 md:h-64 rounded-3xl overflow-hidden shadow-sm mb-8">
          <div className="absolute inset-0 bg-[#005B3F]/70 mix-blend-multiply z-10"></div>
          <img
            src="https://images.unsplash.com/photo-1559154352-06e29e1e11aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwcGVyc29uJTIwdXNpbmclMjBwaG9uZSUyMHNtaWxpbmd8ZW58MXx8fHwxNzczMDc0NjE4fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="User Welcome"
            className="absolute inset-0 w-full h-full object-cover z-0 grayscale"
          />
          <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-8 text-white">
            <h1 className="text-3xl md:text-4xl font-black mb-1">Welcome back, {user.name || user.full_name}</h1>
            <p className="text-white/90 text-sm md:text-base font-medium max-w-lg">
              Here is your financial overview, AI risk assessment, and personalized loan offers designed for your growth.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">

            {/* AI Risk Score Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#B4D330]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                <div className="order-2 sm:order-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-[#005B3F]" />
                    <h2 className="text-lg font-bold text-gray-800">AI Risk Assessment</h2>
                  </div>
                  <p className="text-sm text-gray-500 max-w-sm mb-4">
                    {latestApplication
                      ? `Based on your most recent application (${latestApplication.id}). Our AI model assigns you an ${userStatus.toLowerCase()} credit profile.`
                      : "Our AI model will analyze your financial data once you submit a loan application."}
                  </p>
                  {aiRiskScore !== null && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#B4D330]/20 text-[#005B3F] rounded-full text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Pre-approved for Top Tier
                    </div>
                  )}
                </div>

                <div className="order-1 sm:order-2 self-center flex flex-col items-center justify-center bg-gray-50 rounded-full w-32 h-32 border-4 border-[#B4D330] shadow-inner shrink-0 relative group">
                  {aiRiskScore !== null ? (
                    <>
                      <span className="text-4xl font-black text-[#005B3F]">{aiRiskScore}</span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Score</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-gray-300">—</span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Score</span>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center cursor-help">
                        <Info className="w-3.5 h-3.5 text-gray-400" />
                        <div className="absolute bottom-full right-0 mb-2 w-40 bg-gray-800 text-white text-xs rounded-lg p-2 font-medium leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 whitespace-normal">
                          No application yet. Submit your first loan application to get a score.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Loan Offers Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#111827]">Your Personalized Offers</h2>
                <button className="text-sm font-bold text-[#005B3F] hover:text-[#00432E] transition-colors">
                  View all
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {loanOffers.map((offer) => (
                  <div key={offer.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="w-12 h-12 bg-[#F4F6F8] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#B4D330]/20 transition-colors">
                      {offer.icon}
                    </div>
                    <div className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold mb-2">
                      {offer.type}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{offer.title}</h3>
                    <div className="text-2xl font-black text-[#005B3F] mb-4">{offer.amount}</div>

                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">Interest Rate</span>
                        <span className="font-bold text-gray-900">{offer.rate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">Repayment Term</span>
                        <span className="font-bold text-gray-900">{offer.term}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate("/apply")}
                      className="w-full py-2.5 rounded-lg border-2 border-[#005B3F] text-[#005B3F] font-bold hover:bg-[#005B3F] hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      Apply Now
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Investment CTA */}
            <div className="bg-[#005B3F] rounded-2xl shadow-lg p-6 relative overflow-hidden text-white">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#B4D330] rounded-full opacity-20 blur-2xl"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full opacity-10 blur-xl"></div>

              <div className="relative z-10">
                <div className="w-12 h-12 bg-[#B4D330] rounded-xl flex items-center justify-center mb-6 shadow-sm">
                  <TrendingUp className="w-6 h-6 text-[#005B3F]" />
                </div>

                <h2 className="text-2xl font-bold mb-3 leading-tight">Become a MicroFin Investor</h2>
                <p className="text-white/80 text-sm mb-6 leading-relaxed">
                  Your excellent financial standing makes you an ideal candidate to join our peer-to-peer investment fund. Earn up to{" "}
                  <strong className="text-[#B4D330]">11.5% APY</strong> by funding local entrepreneurs.
                </p>

                <ul className="space-y-3 mb-8 text-sm text-white/90 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#B4D330]" />Capital protection fund included</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#B4D330]" />Start with as little as R 1,000</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#B4D330]" />Impact local businesses directly</li>
                </ul>

                <button
                  onClick={() => setShowInvestorModal(true)}
                  className="w-full py-3 bg-[#B4D330] hover:bg-[#a3c02b] text-[#005B3F] font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  Explore Investments
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Quick Summary</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500">Active Loan Balance</div>
                    <div className="text-sm font-bold text-gray-900">
                      {historyLoading ? "—" : formatCurrency(activeLoanBalance)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500">Total Invested</div>
                    <div className="text-sm font-bold text-gray-900">{formatCurrency(totalInvested)}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Loan Application History */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#111827]">Loan Application History</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {historyLoading
                  ? "Loading your applications…"
                  : `${filteredHistory.length} application${filteredHistory.length !== 1 ? "s" : ""}${hasActiveFilters ? " (filtered)" : ""}`}
              </p>
            </div>

            <div className="relative">
              <button
                ref={filterBtnRef}
                onClick={() => setShowFilterPanel(p => !p)}
                className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-[#111827] font-semibold hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Filter className="w-4 h-4" />
                Filter
                {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[#005B3F]"></span>}
              </button>

              {showFilterPanel && (
                <div
                  ref={filterPanelRef}
                  className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-xl p-4 z-20"
                >
                  {/* Status */}
                  <div className="mb-4">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {["all", "approved", "pending", "rejected", "repaid"].map(s => (
                        <button
                          key={s}
                          onClick={() => setFilterStatus(s)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border capitalize transition-all ${
                            filterStatus === s
                              ? "bg-[#005B3F] text-white border-[#005B3F]"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="mb-4">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Date Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={e => setFilterDateFrom(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B4D330] w-full"
                      />
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={e => setFilterDateTo(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B4D330] w-full"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
                      <span>From</span><span>To</span>
                    </div>
                  </div>

                  {/* Amount Range */}
                  <div className="mb-4">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Loan Amount (R)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={filterMinAmount}
                        onChange={e => setFilterMinAmount(e.target.value)}
                        placeholder="Min"
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B4D330] w-full"
                      />
                      <input
                        type="number"
                        value={filterMaxAmount}
                        onChange={e => setFilterMaxAmount(e.target.value)}
                        placeholder="Max"
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B4D330] w-full"
                      />
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full text-center text-xs font-bold text-red-600 hover:text-red-800 py-1 transition-colors"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Loan list */}
          <div className="space-y-3">
            {historyLoading ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-[#005B3F] animate-spin" />
                <p className="text-gray-500 font-medium text-sm">Loading your loan application history…</p>
              </div>
            ) : historyError ? (
              <div className="bg-white rounded-xl border border-red-100 shadow-sm p-10 text-center">
                <p className="text-red-600 font-medium text-sm">{historyError}</p>
                <p className="text-gray-400 text-xs mt-1">Try refreshing the page.</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
                <p className="text-gray-500 font-medium">
                  {apiHistory.length === 0
                    ? "You haven't submitted a loan application yet."
                    : "No applications match your filter criteria."}
                </p>
                {hasActiveFilters && apiHistory.length > 0 && (
                  <button onClick={clearFilters} className="mt-3 text-sm font-bold text-[#005B3F] hover:text-[#00432E] transition-colors">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              filteredHistory.map(loan => {
                const cfg = statusConfig[loan.status];
                const proofFile = proofUploads[loan.id];
                const canUploadProof = loan.status === "approved" || loan.status === "repaid";

                return (
                  <div key={loan.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-start gap-4">

                      {/* ID, type, date */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 text-sm">{loan.id}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${cfg.className}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {loan.type} •{" "}
                          {new Date(loan.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-xl font-black text-[#005B3F] shrink-0">{loan.amount}</div>

                      {/* Repayment probability */}
                      {loan.repaymentProbability !== null && (
                        <div className="w-full sm:w-auto sm:min-w-[180px]">
                          <div className="text-xs text-gray-500 mb-1.5 font-medium">Repayment Probability</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  loan.repaymentProbability >= 80
                                    ? "bg-[#B4D330]"
                                    : loan.repaymentProbability >= 60
                                    ? "bg-amber-400"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${loan.repaymentProbability}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-gray-900 w-10 shrink-0">{loan.repaymentProbability}%</span>
                          </div>
                        </div>
                      )}

                      {/* Proof of payment */}
                      <div className="shrink-0">
                        {proofFile ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E5F2D9] text-[#005B3F] rounded-lg text-xs font-bold border border-[#B4D330]/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Proof Uploaded
                          </div>
                        ) : canUploadProof ? (
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-[#005B3F] text-[#005B3F] rounded-lg text-xs font-bold cursor-pointer hover:bg-[#005B3F] hover:text-white transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            Upload Proof
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={e => handleProofUpload(loan.id, e)}
                            />
                          </label>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-400 rounded-lg text-xs font-medium border border-gray-100">
                            <FileText className="w-3.5 h-3.5" />
                            No proof needed
                          </span>
                        )}
                      </div>
                    </div>

                    {proofFile && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                        <FileText className="w-3.5 h-3.5 text-[#005B3F]" />
                        <span className="font-medium text-[#005B3F]">{proofFile}</span>
                        <span className="text-gray-400">— uploaded successfully</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {showInvestorModal && (
        <InvestorModal
          onClose={() => setShowInvestorModal(false)}
          onSubmit={data => { handleInvestorSubmit(data); }}
        />
      )}
    </div>
  );
}