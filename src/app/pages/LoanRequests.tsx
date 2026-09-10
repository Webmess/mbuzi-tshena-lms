import { useEffect, useState, useRef, useMemo } from "react";
import {
  Search, Filter, ShieldCheck, ShieldAlert, Clock, ChevronRight,
  X, FileText, User, DollarSign, Calendar, Briefcase, AlertCircle,
  CheckCircle2, XCircle, RotateCcw, TrendingUp
} from "lucide-react";
import clsx from "clsx";

const API_URL = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 20;
const FILTERS = ["All", "Pending Review", "Auto-Approved", "Flagged"];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------- Types -----------------------------------------------------------------
interface LoanRequestListItem {
  id: string;
  name: string;
  amount: string;
  score: number;
  aiAction: string | null;
  status: string;
  date: string;
  amountValue?: number; // only for client-side filtering if needed
}

interface LoanRequestDetail extends LoanRequestListItem {
  idNumber: string;
  phone: string;
  email: string;
  loanType: string;
  purpose: string;
  term: string;
  employer: string;
  income: string;
  bank: string;
  accountType: string;
  repaymentProbability: number;
  aiExplanation: string;
  documents: string[];
  decisionReason: string;
  overrideHistory: { status: string; comment: string; by: string; at: string } | null;
  amountValue: number;
}

interface DetailModalProps {
  requestId: string;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<LoanRequestDetail>) => void;
}

// ---------- Helper components -----------------------------------------------------
function RiskBar({ score }: { score: number }) {
  const color = score < 30 ? "bg-[#B4D330]" : score < 60 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="w-full max-w-[80px] h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-bold text-[#111827] w-6">{score}</span>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#005B3F]">{icon}</span>
        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className={clsx("text-sm font-bold mt-0.5", highlight ? "text-[#005B3F] text-base" : "text-gray-900")}>{value}</div>
    </div>
  );
}

// ---------- Detail Modal ----------------------------------------------------------
function DetailModal({ requestId, onClose, onUpdate }: DetailModalProps) {
  const [request, setRequest] = useState<LoanRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showOverride, setShowOverride] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState("");
  const [overrideComment, setOverrideComment] = useState("");
  const [commentError, setCommentError] = useState(false);
  const [overrideSuccess, setOverrideSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_URL}/api/applications/${requestId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load application details");
        const data = await res.json();
        setRequest(data);
        setOverrideStatus(data.status === "Approved" ? "Rejected" : "Approved");
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId]);

  const handleOverride = async () => {
    if (!request) return;
    if (!overrideComment.trim()) {
      setCommentError(true);
      return;
    }
    setCommentError(false);
    try {
      const res = await fetch(`${API_URL}/api/applications/${request.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: overrideStatus, comment: overrideComment.trim() }),
      });
      if (!res.ok) throw new Error("Override failed");
      const updated = await res.json();
      onUpdate(request.id, updated);
      setRequest(updated);
      setOverrideSuccess(true);
    } catch (err: any) {
      setError(err.message || "Override failed");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative z-10 w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#005B3F]/20 border-t-[#005B3F] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative z-10 w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-bold">Error</h3>
            <button onClick={onClose}><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 text-red-600 font-medium">{error || "Not found"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-[#111827]">Loan Request — {request.id}</h3>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{request.date}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={clsx(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border",
              request.status === "Approved" ? "bg-[#E5F2D9] text-[#005B3F] border-[#B4D330]/30" :
              request.status === "Rejected" ? "bg-red-50 text-red-700 border-red-100" :
              "bg-blue-50 text-blue-700 border-blue-100"
            )}>
              {request.status === "Approved" && <CheckCircle2 className="w-4 h-4" />}
              {request.status === "Rejected" && <XCircle className="w-4 h-4" />}
              {(request.status === "Pending" || request.status === "Under Review") && <Clock className="w-4 h-4" />}
              {request.status}
            </span>
            {request.overrideHistory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                <RotateCcw className="w-3 h-3" />
                Overridden
              </span>
            )}
          </div>

          {/* Applicant details */}
          <Section icon={<User className="w-4 h-4" />} title="Applicant Details">
            <Grid2>
              <Field label="Full Name" value={request.full_name} />
              <Field label="ID Number" value={request.id_number} />
              <Field label="Phone Number" value={request.phone_number} />
              <Field label="Email Address" value={request.email} />
            </Grid2>
          </Section>

          {/* Loan details */}
          <Section icon={<DollarSign className="w-4 h-4" />} title="Loan Details">
            <Grid2>
              <Field label="Amount Requested" value={request.loan_amount} highlight />
              <Field label="Loan Type" value={request.loan_type} />
              <Field label="Repayment Term" value={request.repayment_term} />
              <Field label="Application Date" value={formatDate(request.created_at)} />
            </Grid2>
            <div className="mt-3">
              <Field label="Purpose" value={request.purpose} />
            </div>
          </Section>

          {/* Employment & Banking */}
          <Section icon={<Briefcase className="w-4 h-4" />} title="Employment & Banking">
            <Grid2>
              <Field label="Employer" value={request.employer_name} />
              <Field label="Monthly Income" value={request.monthly_income} />
              <Field label="Bank" value={request.bank_name} />
              <Field label="Account Type" value={request.account_type} />
            </Grid2>
          </Section>

          {/* AI Assessment */}
          <Section icon={<TrendingUp className="w-4 h-4" />} title="AI Risk Assessment">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">AI Risk Score</div>
                <div className="flex items-end gap-3">
                  <span className={clsx(
                    "text-4xl font-black",
                    request.ai_risk_score < 30 ? "text-[#005B3F]" : request.ai_risk_score < 60 ? "text-amber-600" : "text-red-600"
                  )}>{request.ai_risk_score}</span>
                  <span className="text-sm text-gray-400 font-medium mb-1">/100</span>
                </div>
                <RiskBar score={request.ai_risk_score} />
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">Repayment Probability</div>
                <div className="flex items-end gap-3">
                  <span className={clsx(
                    "text-4xl font-black",
                    request.repaymentProbability >= 80 ? "text-[#005B3F]" : request.repaymentProbability >= 60 ? "text-amber-600" : "text-red-600"
                  )}>{request.repaymentProbability}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                  <div
                    className={clsx("h-full rounded-full", request.repaymentProbability >= 80 ? "bg-[#B4D330]" : request.repaymentProbability >= 60 ? "bg-amber-400" : "bg-red-500")}
                    style={{ width: `${request.repaymentProbability}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">AI Explanation</div>
              <p className="text-sm text-gray-700 font-medium leading-relaxed">{request.aiExplanation}</p>
            </div>
            <div className="mt-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border">
                {request.ai_action === "Auto-Approve" ? (
                  <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 border-green-200 px-2.5 py-1 rounded-md">
                    <ShieldCheck className="w-3.5 h-3.5" /> {request.ai_action}
                  </span>
                ) : request.ai_action === "Flagged" || request.ai_action === "Decline" ? (
                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 border-red-200 px-2.5 py-1 rounded-md">
                    <ShieldAlert className="w-3.5 h-3.5" /> {request.ai_action}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-100 border-yellow-200 px-2.5 py-1 rounded-md">
                    <Clock className="w-3.5 h-3.5" /> {request.ai_action}
                  </span>
                )}
              </div>
            </div>
          </Section>

          {/* Documents */}
          <Section icon={<FileText className="w-4 h-4" />} title="Uploaded Documents">
            <div className="space-y-2">
              {request.documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <div className="w-8 h-8 bg-[#E5F2D9] rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#005B3F]" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{doc}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Decision reason */}
          <Section icon={<AlertCircle className="w-4 h-4" />} title="Decision Reason">
            <div className={clsx(
              "rounded-xl p-4 border text-sm font-medium leading-relaxed",
              request.decisionReason === "Pending review"
                ? "bg-blue-50 border-blue-100 text-blue-800"
                : request.status === "Rejected"
                ? "bg-red-50 border-red-100 text-red-800"
                : "bg-[#E5F2D9] border-[#B4D330]/30 text-[#005B3F]"
            )}>
              {request.decisionReason}
            </div>
          </Section>

          {/* Override history */}
          {request.overrideHistory && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-amber-800">Override Record</span>
              </div>
              <p className="text-sm text-amber-800 font-medium">{request.overrideHistory.comment}</p>
              <p className="text-xs text-amber-600 mt-1">By {request.overrideHistory.by} · {request.overrideHistory.at}</p>
            </div>
          )}

          {/* Override section */}
          {!overrideSuccess ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowOverride(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-bold text-gray-700"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#005B3F]" />
                  Override Decision
                </span>
                <span className="text-gray-400 text-xs font-medium">{showOverride ? "Hide" : "Expand"}</span>
              </button>

              {showOverride && (
                <div className="p-5 space-y-4 border-t border-gray-200">
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Change Status To</label>
                    <div className="flex gap-3">
                      {["Approved", "Rejected"].map(s => (
                        <button
                          key={s}
                          onClick={() => setOverrideStatus(s)}
                          className={clsx(
                            "flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-colors",
                            overrideStatus === s
                              ? s === "Approved" ? "bg-[#E5F2D9] border-[#005B3F] text-[#005B3F]" : "bg-red-50 border-red-500 text-red-700"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
                      Override Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={overrideComment}
                      onChange={e => { setOverrideComment(e.target.value); if (e.target.value.trim()) setCommentError(false); }}
                      placeholder="Provide a detailed reason for overriding this decision..."
                      className={clsx(
                        "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B4D330] resize-none",
                        commentError ? "border-red-400" : "border-gray-200"
                      )}
                    />
                    {commentError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Override reason is required.</p>}
                  </div>
                  <button
                    onClick={handleOverride}
                    className="w-full py-2.5 bg-[#005B3F] hover:bg-[#00432E] text-white font-bold rounded-lg transition-colors text-sm"
                  >
                    Confirm Override
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#E5F2D9] border border-[#B4D330]/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#005B3F] shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#005B3F]">Override applied successfully.</p>
                <p className="text-xs text-[#005B3F]/70 mt-0.5">Status changed to <strong>{overrideStatus}</strong>. Reason recorded.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Main Component -------------------------------------------------------
export default function LoanRequests() {
  // From old version
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [requests, setRequests] = useState<LoanRequestListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New filters
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterAiAction, setFilterAiAction] = useState("All");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");

  // Detail modal
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const filterPanelRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [filter, filterStatus, filterAiAction, filterMinAmount, filterMaxAmount]);

  // Close filter panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterPanelRef.current?.contains(e.target as Node) || filterBtnRef.current?.contains(e.target as Node)) return;
      setShowFilterPanel(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasAdvancedFilters = filterStatus !== "All" || filterAiAction !== "All" || filterMinAmount || filterMaxAmount;

  const clearAdvancedFilters = () => {
    setFilterStatus("All");
    setFilterAiAction("All");
    setFilterMinAmount("");
    setFilterMaxAmount("");
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
        filter,
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (filterStatus !== "All") params.set("status", filterStatus);
      if (filterAiAction !== "All") params.set("ai_action", filterAiAction);
      if (filterMinAmount) params.set("min_amount", filterMinAmount);
      if (filterMaxAmount) params.set("max_amount", filterMaxAmount);

      const res = await fetch(`${API_URL}/api/applications?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Unable to load loan requests");

      const data = await res.json();
      setRequests(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.pages ?? 1);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong loading loan requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filter, debouncedSearch, page, filterStatus, filterAiAction, filterMinAmount, filterMaxAmount]);

  const handleUpdate = (id: string, updated: Partial<LoanRequestDetail>) => {
    // Update list item if present
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Loan Requests</h2>
          <p className="text-gray-500 mt-1 font-medium">Manage and review applicant requests processed by AI.</p>
        </div>

        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID or name..."
              className="w-full sm:w-auto pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B4D330] focus:border-[#B4D330] transition-shadow shadow-sm"
            />
          </div>
          <div className="relative">
            <button
              ref={filterBtnRef}
              onClick={() => setShowFilterPanel(p => !p)}
              className="flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-[#111827] font-semibold hover:bg-gray-50 transition-colors shadow-sm w-full sm:w-auto"
            >
              <Filter className="w-4 h-4" />
              Filter
              {hasAdvancedFilters && <span className="w-2 h-2 rounded-full bg-[#005B3F]"></span>}
            </button>

            {showFilterPanel && (
              <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-xl p-4 z-20">
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {["All", "Approved", "Pending", "Under Review", "Rejected"].map(s => (
                      <button key={s} onClick={() => setFilterStatus(s)}
                        className={clsx("px-3 py-1 rounded-full text-xs font-bold border transition-all",
                          filterStatus === s ? "bg-[#005B3F] text-white border-[#005B3F]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">AI Action</label>
                  <div className="flex flex-wrap gap-2">
                    {["All", "Auto-Approve", "Manual Review", "Flagged", "Decline"].map(s => (
                      <button key={s} onClick={() => setFilterAiAction(s)}
                        className={clsx("px-3 py-1 rounded-full text-xs font-bold border transition-all",
                          filterAiAction === s ? "bg-[#005B3F] text-white border-[#005B3F]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Loan Amount (R)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={filterMinAmount} onChange={e => setFilterMinAmount(e.target.value)} placeholder="Min"
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B4D330]" />
                    <input type="number" value={filterMaxAmount} onChange={e => setFilterMaxAmount(e.target.value)} placeholder="Max"
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B4D330]" />
                  </div>
                </div>
                {hasAdvancedFilters && (
                  <button onClick={clearAdvancedFilters} className="w-full text-center text-xs font-bold text-red-600 hover:text-red-800 py-1 transition-colors">
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-bold transition-all border",
              filter === f
                ? "bg-[#005B3F] text-white border-[#005B3F] shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Applicant</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">AI Risk Score</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">AI Action</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4" colSpan={7}>
                      <div className="h-10 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-gray-500 font-medium" colSpan={7}>
                    No loan requests found.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => setSelectedRequestId(req.id)}
                    className="hover:bg-[#F4F6F8] transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#111827]">{req.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 font-medium">{req.id}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#005B3F]">{req.amount}</td>
                    <td className="px-6 py-4">
                      <RiskBar score={req.score} />
                    </td>
                    <td className="px-6 py-4">
                      {req.aiAction && (
                        <div className={clsx(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold",
                          req.aiAction === "Auto-Approve" ? "bg-green-100 text-green-700" :
                          req.aiAction === "Flagged" || req.aiAction === "Decline" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        )}>
                          {req.aiAction === "Auto-Approve" && <ShieldCheck className="w-3.5 h-3.5" />}
                          {(req.aiAction === "Flagged" || req.aiAction === "Decline") && <ShieldAlert className="w-3.5 h-3.5" />}
                          {req.aiAction === "Manual Review" && <Clock className="w-3.5 h-3.5" />}
                          {req.aiAction}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "inline-block px-3 py-1 rounded-md text-xs font-bold border",
                        req.status === "Approved" ? "bg-[#E5F2D9] text-[#005B3F] border-[#B4D330]/30" :
                        req.status === "Rejected" ? "bg-red-50 text-red-700 border-red-100" :
                        "bg-blue-50 text-blue-700 border-blue-100"
                      )}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">{req.date}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-[#E5F2D9] rounded-lg text-gray-400 hover:text-[#005B3F] transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm">
          <span className="text-gray-500 font-medium">
            {total === 0 ? "No entries" : `Showing ${rangeStart}-${rangeEnd} of ${total} entries`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 border border-gray-200 rounded-lg text-[#111827] font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="px-4 py-2 border border-gray-200 rounded-lg text-[#111827] font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedRequestId && (
        <DetailModal
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}