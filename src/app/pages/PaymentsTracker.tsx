import { useEffect, useState, useRef, useMemo, Fragment } from "react";
import {
  ArrowUpRight, ArrowDownRight, Search, Filter,
  X, User, DollarSign, Calendar, FileText, CheckCircle2,
  XCircle, Clock, RotateCcw, AlertCircle, Upload, Plus,
  Loader2
} from "lucide-react";
import clsx from "clsx";

const API_URL = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 20;

// ---------- Types -------------------------------------------------------------
interface TransactionListItem {
  id: string;
  borrower_name: string;
  amount: string;
  payment_type: "Repayment" | "Disbursement";
  date: string;
  status: "Completed" | "Failed" | "Pending";
   email?: string;      
  borrower?: string;    
}


interface TransactionDetail extends TransactionListItem {
  user_id: string;
  loan_id: string;
  phone: string;
  amountRaw: number;
  dueDate: string;
  verificationStatus: "Verified" | "Unverified" | "Disputed";
  proofFile: string | null;
  notes: string;
  overrideHistory: { status: string; comment: string; by: string; at: string } | null;
}

interface Summary {
  total_collected: number;
  total_disbursed: number;
  failed_count: number;
}

interface ActiveLoanUser {
  user_id: string;
  name: string;
  loans: { id: string; label: string }[];
}

// ---------- Helper components -------------------------------------------------
function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className={clsx("text-sm font-bold mt-0.5", highlight ? "text-[#005B3F] text-base" : "text-gray-900")}>{value}</div>
    </div>
  );
}

// ---------- Detail Modal ------------------------------------------------------
function DetailModal({ txId, onClose, onUpdate }: { txId: string; onClose: () => void; onUpdate: (id: string, updated: Partial<TransactionDetail>) => void }) {
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showOverride, setShowOverride] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<"Completed" | "Failed">("Completed");
  const [overrideComment, setOverrideComment] = useState("");
  const [commentError, setCommentError] = useState(false);
  const [overrideSuccess, setOverrideSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_URL}/api/payments/${txId}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load payment details");
        const data = await res.json();
        setTx(data);
        setOverrideStatus(data.status === "Completed" ? "Failed" : "Completed");
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [txId]);

  const handleOverride = async () => {
    if (!tx) return;
    if (!overrideComment.trim()) {
      setCommentError(true);
      return;
    }
    setCommentError(false);
    try {
      const res = await fetch(`${API_URL}/api/payments/${tx.id}/override`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: overrideStatus, comment: overrideComment.trim() }),
      });
      if (!res.ok) throw new Error("Override failed");
      const updated = await res.json();
      onUpdate(tx.id, updated);
      setTx(updated);
      setOverrideSuccess(true);
    } catch (err: any) {
      setError(err.message || "Override failed");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative z-10 w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#005B3F]/20 border-t-[#005B3F] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative z-10 w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col">
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
      <div className="relative z-10 w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-[#111827]">Payment — {tx.id}</h3>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{tx.date}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border",
              tx.status === "Completed" ? "bg-[#E5F2D9] text-[#005B3F] border-[#B4D330]/30" :
              tx.status === "Failed"    ? "bg-red-50 text-red-700 border-red-100" :
              "bg-amber-50 text-amber-700 border-amber-100"
            )}>
              {tx.status === "Completed" && <CheckCircle2 className="w-4 h-4" />}
              {tx.status === "Failed"    && <XCircle className="w-4 h-4" />}
              {tx.status === "Pending"   && <Clock className="w-4 h-4" />}
              {tx.status}
            </span>
            <span className={clsx(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border",
              tx.verificationStatus === "Verified"   ? "bg-[#E5F2D9] text-[#005B3F] border-[#B4D330]/30" :
              tx.verificationStatus === "Disputed"   ? "bg-red-50 text-red-700 border-red-100" :
              "bg-gray-100 text-gray-600 border-gray-200"
            )}>
              {tx.verificationStatus}
            </span>
            {tx.overrideHistory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                <RotateCcw className="w-3 h-3" /> Overridden
              </span>
            )}
          </div>

          {/* User & Loan */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-[#005B3F]" />
              <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">User & Loan</h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Borrower" value={tx.borrower_name} />
              <Field label="User ID" value={tx.user_id} />
              <Field label="Phone" value={tx.phone} />
              <Field label="Loan ID" value={tx.loan_id} />
            </div>
          </div>

          {/* Payment details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-[#005B3F]" />
              <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Payment Details</h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Type" value={tx.payment_type} />
              <Field label="Amount" value={tx.amount} highlight />
              <Field label="Payment Date" value={tx.date} />
              <Field label="Due Date" value={tx.dueDate} />
            </div>
            {tx.notes && (
              <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-500 font-medium mb-1">Notes</div>
                <p className="text-sm font-medium text-gray-800">{tx.notes}</p>
              </div>
            )}
          </div>

          {/* Proof of payment */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-[#005B3F]" />
              <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Proof of Payment</h4>
            </div>
            {tx.proofFile ? (
              <div className="flex items-center gap-3 bg-[#E5F2D9] border border-[#B4D330]/30 rounded-lg p-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-[#B4D330]/20">
                  <FileText className="w-5 h-5 text-[#005B3F]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#005B3F]">{tx.proofFile}</p>
                  <p className="text-xs text-[#005B3F]/70 mt-0.5">Uploaded by borrower</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4 text-center text-sm text-gray-400 font-medium">
                No proof of payment uploaded
              </div>
            )}
          </div>

          {/* Override history */}
          {tx.overrideHistory && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-amber-800">Override Record</span>
              </div>
              <p className="text-sm text-amber-800 font-medium">{tx.overrideHistory.comment}</p>
              <p className="text-xs text-amber-600 mt-1">By {tx.overrideHistory.by} · {tx.overrideHistory.at}</p>
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
                  Override Payment Status
                </span>
                <span className="text-gray-400 text-xs font-medium">{showOverride ? "Hide" : "Expand"}</span>
              </button>
              {showOverride && (
                <div className="p-5 space-y-4 border-t border-gray-200">
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Mark Payment As</label>
                    <div className="flex gap-3">
                      {(["Completed", "Failed"] as const).map(s => (
                        <button key={s} onClick={() => setOverrideStatus(s)}
                          className={clsx("flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-colors",
                            overrideStatus === s
                              ? s === "Completed" ? "bg-[#E5F2D9] border-[#005B3F] text-[#005B3F]" : "bg-red-50 border-red-500 text-red-700"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300")}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
                      Override Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea rows={3} value={overrideComment}
                      onChange={e => { setOverrideComment(e.target.value); if (e.target.value.trim()) setCommentError(false); }}
                      placeholder="e.g. Admin confirmed offline EFT payment via email. Reference: EFT-20240315."
                      className={clsx("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B4D330] resize-none",
                        commentError ? "border-red-400" : "border-gray-200")}
                    />
                    {commentError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Override reason is required.</p>}
                  </div>
                  <button onClick={handleOverride}
                    className="w-full py-2.5 bg-[#005B3F] hover:bg-[#00432E] text-white font-bold rounded-lg transition-colors text-sm">
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
                <p className="text-xs text-[#005B3F]/70 mt-0.5">Payment status updated to <strong>{overrideStatus}</strong>.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Manual Repayment Modal -------------------------------------------
function ManualRepaymentModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (tx: TransactionListItem) => void }) {
  const [users, setUsers] = useState<ActiveLoanUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedLoan, setSelectedLoan] = useState("");
  const [amount, setAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [method, setMethod] = useState("EFT");
  const [note, setNote] = useState("");
  const [proofFile, setProofFile] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/applications/active`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load active loan users");
        const data = await res.json();
        const applications = Array.isArray(data)
          ? data
          : Array.isArray(data?.users)
            ? data.users
            : Array.isArray(data?.items)
              ? data.items
              : data && typeof data === "object"
                ? [data]
                : [];

        const usersById = new Map<string, ActiveLoanUser>();
        applications.forEach((application: any) => {
          if (application?.user_id == null) return;

          const userId = String(application.user_id);
          const user = usersById.get(userId) || {
            user_id: userId,
            name: application.full_name || application.name || `User ${userId}`,
            loans: [],
          };

          if (application.id != null && !user.loans.some(loan => loan.id === String(application.id))) {
            user.loans.push({
              id: String(application.id),
              label: `${application.reference_number || `Loan ${application.id}`} · R${Number(application.loan_amount || 0).toFixed(2)}`,
            });
          }
          usersById.set(userId, user);
        });

        setUsers(Array.from(usersById.values()));
      } catch (err) {
        // Fallback to empty; could also show error
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, []);

  console.log("Active loan users:", users);

  const userObj = users.find(u => u.user_id === selectedUser) || null;
  const loanOpts = userObj?.loans ?? [];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedUser) e.user = "Please select a user.";
    if (!selectedLoan) e.loan = "Please select a loan.";
    if (!amount || Number(amount) <= 0) e.amount = "Enter a valid repayment amount.";
    if (!payDate) e.payDate = "Payment date is required.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const payload = {
      user_id: selectedUser,
      loan_id: selectedLoan,
      amount: Number(amount),
      payment_date: payDate,
      payment_type : "Repayment",
      payment_method: method,
      note: note || null,
      proof_file: proofFile,
    };
    try {
      const res = await fetch(`${API_URL}/api/payments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to record manual repayment");
      const newTx = await res.json();
      onSubmit(newTx);
      setSubmitted(true);
    } catch (err: any) {
      setErrors({ general: err.message || "Something went wrong" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-[#111827]">Record Manual Repayment</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#E5F2D9] rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#005B3F]" />
            </div>
            <h4 className="text-lg font-bold text-[#111827] mb-2">Repayment Recorded</h4>
            <p className="text-sm text-gray-500 font-medium">The manual repayment has been saved and the loan balance updated.</p>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-[#005B3F] hover:bg-[#00432E] text-white font-bold rounded-lg transition-colors text-sm">
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}

            {/* User select */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Borrower <span className="text-red-500">*</span></label>
              <select
                value={selectedUser}
                disabled={loadingUsers}
                onChange={e => { setSelectedUser(e.target.value); setSelectedLoan(""); setErrors(p => ({ ...p, user: "" })); }}
                className={clsx("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B4D330]",
                  errors.user ? "border-red-400" : "border-gray-200", loadingUsers && "opacity-50")}
              >
                <option value="">{loadingUsers ? "Loading borrowers..." : "Select a borrower with an active loan…"}</option>
                {users.map(u => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
              </select>
              {errors.user && <p className="text-red-500 text-xs mt-1">{errors.user}</p>}
            </div>

            {/* Loan select */}
            {loanOpts.length > 0 && (
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Active Loan <span className="text-red-500">*</span></label>
                <select value={selectedLoan} onChange={e => { setSelectedLoan(e.target.value); setErrors(p => ({ ...p, loan: "" })); }}
                  className={clsx("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B4D330]",
                    errors.loan ? "border-red-400" : "border-gray-200")}>
                  <option value="">Select a loan…</option>
                  {loanOpts.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
                {errors.loan && <p className="text-red-500 text-xs mt-1">{errors.loan}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Amount (R) <span className="text-red-500">*</span></label>
                <input type="number" min="1" value={amount} onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: "" })); }}
                  placeholder="e.g. 2500"
                  className={clsx("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B4D330]",
                    errors.amount ? "border-red-400" : "border-gray-200")} />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Payment Date <span className="text-red-500">*</span></label>
                <input type="date" value={payDate} onChange={e => { setPayDate(e.target.value); setErrors(p => ({ ...p, payDate: "" })); }}
                  className={clsx("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B4D330]",
                    errors.payDate ? "border-red-400" : "border-gray-200")} />
                {errors.payDate && <p className="text-red-500 text-xs mt-1">{errors.payDate}</p>}
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Payment Method</label>
              <div className="flex gap-2 flex-wrap">
                {["EFT", "Cash", "Card", "Debit Order"].map(m => (
                  <button key={m} type="button" onClick={() => setMethod(m)}
                    className={clsx("px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                      method === m ? "bg-[#005B3F] text-white border-[#005B3F]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Proof upload */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Proof of Payment (optional)</label>
              {proofFile ? (
                <div className="flex items-center gap-3 bg-[#E5F2D9] border border-[#B4D330]/30 rounded-lg p-3">
                  <FileText className="w-4 h-4 text-[#005B3F]" />
                  <span className="text-sm font-medium text-[#005B3F] flex-1">{proofFile}</span>
                  <button onClick={() => setProofFile(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:border-[#005B3F] transition-colors">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500 font-medium">Click to upload (PDF, JPG, PNG)</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setProofFile(f.name); }} />
                </label>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Note (optional)</label>
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                placeholder="Any additional remarks..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B4D330] resize-none" />
            </div>

            <button onClick={handleSubmit}
              className="w-full py-3 bg-[#005B3F] hover:bg-[#00432E] text-white font-bold rounded-xl transition-colors text-sm">
              Save Repayment Record
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Main Component ----------------------------------------------------
const TYPE_OPTIONS = ["All", "Repayment", "Disbursement"];
const STATUS_OPTIONS = ["All", "Completed", "Failed", "Pending"];

export default function PaymentsTracker() {
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  // Advanced filters
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

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

  // Close filter panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterPanelRef.current?.contains(e.target as Node) || filterBtnRef.current?.contains(e.target as Node)) return;
      setShowFilterPanel(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasFilters = filterType !== "All" || filterStatus !== "All" || filterDateFrom || filterDateTo;
  const clearFilters = () => { setFilterType("All"); setFilterStatus("All"); setFilterDateFrom(""); setFilterDateTo(""); };

  const loadSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await fetch(`${API_URL}/api/payments/summary`, { credentials: "include" });
      if (!res.ok) throw new Error("Unable to load payment summary");
      const data = await res.json();
      setSummary(data);
    } catch (err: any) {
      // We may already have a general error state, but we can ignore summary errors separately if needed
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (filterType !== "All") params.set("type", filterType);
      if (filterStatus !== "All") params.set("status", filterStatus);
      if (filterDateFrom) params.set("date_from", filterDateFrom);
      if (filterDateTo) params.set("date_to", filterDateTo);

      const res = await fetch(`${API_URL}/api/payments?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Unable to load transactions");

      const data = await res.json();
      setTransactions(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.pages ?? 1);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong loading transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [debouncedSearch, page, filterType, filterStatus, filterDateFrom, filterDateTo]);

  const handleUpdate = (id: string, updated: Partial<TransactionDetail>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
  };

  const handleManualSubmit = (newTx: TransactionListItem) => {
    setTransactions(prev => [newTx, ...prev]);
    // Refresh summary after manual repayment
    loadSummary();
  };
  const groups = transactions.reduce<Record<string, any[]>>((acc, t: any) => {
    const key = t.email || t.borrower;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const formatRand = (amount: number) => {
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Payment Tracking</h2>
          <p className="text-gray-500 mt-1 font-medium">Monitor disbursements and incoming repayments.</p>
        </div>

        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full sm:w-auto pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B4D330] transition-shadow shadow-sm"
            />
          </div>

          {/* Filter button and panel */}
          <div className="relative">
            <button
              ref={filterBtnRef}
              onClick={() => setShowFilterPanel(p => !p)}
              className="flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-lg text-[#111827] font-semibold hover:bg-gray-50 transition-colors shadow-sm w-full sm:w-auto"
            >
              <Filter className="w-4 h-4" />
              Filter
              {hasFilters && <span className="w-2 h-2 rounded-full bg-[#005B3F]"></span>}
            </button>
            {showFilterPanel && (
              <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-xl p-4 z-20">
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {TYPE_OPTIONS.map(s => (
                      <button key={s} onClick={() => setFilterType(s)}
                        className={clsx("px-3 py-1 rounded-full text-xs font-bold border transition-all",
                          filterType === s ? "bg-[#005B3F] text-white border-[#005B3F]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map(s => (
                      <button key={s} onClick={() => setFilterStatus(s)}
                        className={clsx("px-3 py-1 rounded-full text-xs font-bold border transition-all",
                          filterStatus === s ? "bg-[#005B3F] text-white border-[#005B3F]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B4D330]" />
                    <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B4D330]" />
                  </div>
                </div>
                {hasFilters && (
                  <button onClick={clearFilters} className="w-full text-center text-xs font-bold text-red-600 hover:text-red-800 py-1 transition-colors">
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Manual repayment button */}
          <button
            onClick={() => setShowManual(true)}
            className="flex items-center justify-center gap-2 bg-[#005B3F] text-white px-5 py-2.5 rounded-lg font-bold hover:bg-[#00432E] transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 text-[#B4D330]" />
            Record Manual Repayment
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <h4 className="text-sm font-semibold text-gray-500">Total Collected Today</h4>
            <div className="text-2xl font-bold text-[#111827] mt-1 tracking-tight">
              {summaryLoading ? (
                <div className="w-24 h-7 bg-gray-200 rounded animate-pulse" />
              ) : (
                formatRand(summary?.total_collected ?? 0)
              )}
            </div>
          </div>
          <div className="w-12 h-12 bg-[#E5F2D9] border border-[#B4D330]/30 rounded-xl flex items-center justify-center text-[#005B3F]">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <h4 className="text-sm font-semibold text-gray-500">Total Disbursed Today</h4>
            <div className="text-2xl font-bold text-[#111827] mt-1 tracking-tight">
              {summaryLoading ? (
                <div className="w-24 h-7 bg-gray-200 rounded animate-pulse" />
              ) : (
                formatRand(summary?.total_disbursed ?? 0)
              )}
            </div>
          </div>
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-700">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <h4 className="text-sm font-semibold text-gray-500">Failed Transactions</h4>
            <div className="text-2xl font-bold text-[#111827] mt-1 tracking-tight">
              {summaryLoading ? (
                <div className="w-8 h-7 bg-gray-200 rounded animate-pulse" />
              ) : (
                summary?.failed_count ?? 0
              )}
            </div>
          </div>
          <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-700">
            <span className="font-bold text-xl">!</span>
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <h3 className="font-bold text-[#111827]">Recent Transactions</h3>
          {!loading && <span className="text-xs font-medium text-gray-500">{total} total</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4" colSpan={4}>
                      <div className="h-10 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-gray-500 font-medium" colSpan={4}>
                    No transactions found.
                  </td>
                </tr>
              ) : (
                Object.entries(groups).map(([key, userTx]) => (
                  <Fragment key={key}>
                    <tr className="bg-gray-50/70">
                      <td colSpan={4} className="px-6 py-3">
                        <span className="font-bold text-[#111827] text-sm">{userTx[0].borrower}</span>
                        {userTx[0].email && <span className="text-xs text-gray-500 font-medium ml-2">{userTx[0].email}</span>}
                        <span className="text-xs text-gray-400 ml-2">· {userTx.length} transaction{userTx.length !== 1 ? "s" : ""}</span>
                      </td>
                    </tr>
                    {userTx.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTxId(tx.id)}
                    className="hover:bg-[#F4F6F8] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                            tx.type === "Repayment"
                              ? "bg-[#E5F2D9] text-[#005B3F] border-[#B4D330]/30"
                              : "bg-blue-50 text-blue-700 border-blue-100"
                          }`}
                        >
                          {tx.type === "Repayment" ? (
                            <ArrowDownRight className="w-5 h-5" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[#111827]">{tx.type}</div>
                          <div className="text-xs text-gray-500 mt-0.5 font-medium">
                            {tx.id} • {tx.type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`font-bold ${tx.type === "Repayment" ? "text-[#005B3F]" : "text-[#111827]"}`}>
                        {tx.amount}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">{tx.date}</td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-md text-xs font-bold border ${
                          tx.status === "Completed"
                            ? "bg-[#E5F2D9] text-[#005B3F] border-[#B4D330]/30"
                            : tx.status === "Failed"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-sm font-bold text-[#005B3F] disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs font-medium text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-sm font-bold text-[#005B3F] disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selectedTxId && (
        <DetailModal
          txId={selectedTxId}
          onClose={() => setSelectedTxId(null)}
          onUpdate={handleUpdate}
        />
      )}
      {showManual && (
        <ManualRepaymentModal
          onClose={() => setShowManual(false)}
          onSubmit={handleManualSubmit}
        />
      )}
    </div>
  );
}