import { useState, useEffect, Fragment } from "react";
import { TrendingUp, CheckCircle2, Clock, XCircle } from "lucide-react";
import clsx from "clsx";

interface InvestorRequest {
  id: string;
  name: string;
  userId: string;
  amount: number;
  duration: number;
  riskLevel: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
}

const statusConfig = {
  pending:  { label: "Pending Review", className: "bg-amber-50 text-amber-700 border-amber-100",     icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: "Approved",       className: "bg-[#E5F2D9] text-[#005B3F] border-[#B4D330]/30", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected: { label: "Rejected",       className: "bg-red-50 text-red-700 border-red-100",           icon: <XCircle className="w-3.5 h-3.5" /> },
};

const riskColors: Record<string, string> = {
  Conservative: "bg-blue-50 text-blue-700 border-blue-100",
  Moderate:     "bg-amber-50 text-amber-700 border-amber-100",
  Aggressive:   "bg-red-50 text-red-700 border-red-100",
};

export default function InvestorRequests() {
  const [requests, setRequests] = useState<InvestorRequest[]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/investments`, { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then((data: any[]) => setRequests(data.map(i => ({
        id: i.id,
        name: i.user_name,
        userId: i.user_email,
        amount: i.amount,
        duration: i.duration,
        riskLevel: i.risk_level,
        submittedAt: i.submitted_at,
        status: i.status,
      }))));
  }, []);
  const [filter, setFilter]     = useState("All");

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const admin_notes = status === "rejected" ? prompt("Reason for rejecting?") : null;
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/investments/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_notes }),
    });
    if (res.ok) setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    else alert("Could not update the request");
  };

  const filtered = requests.filter(r =>
    filter === "All" ||
    (filter === "Pending"  && r.status === "pending")  ||
    (filter === "Approved" && r.status === "approved") ||
    (filter === "Rejected" && r.status === "rejected")
  );
  const groups = filtered.reduce<Record<string, InvestorRequest[]>>((acc, r) => {
    if (!acc[r.userId]) acc[r.userId] = [];
    acc[r.userId].push(r);
    return acc;
  }, {});
  const totalValue = requests.reduce((sum, r) => sum + r.amount, 0);
  const pendingCount  = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Investor Requests</h2>
          <p className="text-gray-500 mt-1 font-medium">Review and manage user investment applications.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Requests",    value: requests.length,                                color: "bg-gray-50 border-gray-200 text-[#111827]" },
          { label: "Pending Review",    value: pendingCount,                                   color: "bg-amber-50 border-amber-100 text-amber-700" },
          { label: "Approved",          value: approvedCount,                                  color: "bg-[#E5F2D9] border-[#B4D330]/30 text-[#005B3F]" },
          { label: "Total Value (R)",   value: `R ${totalValue.toLocaleString()}`,             color: "bg-blue-50 border-blue-100 text-blue-700" },
        ].map(card => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <div className="text-xl font-bold">{card.value}</div>
            <div className="text-xs font-semibold mt-0.5 opacity-80">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {["All", "Pending", "Approved", "Rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx("px-4 py-2 rounded-full text-sm font-bold transition-all border",
              filter === f
                ? "bg-[#005B3F] text-white border-[#005B3F] shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50")}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Investor</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Risk Level</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">No investment requests in this category.</td></tr>
              ) : (
                Object.entries(groups).map(([email, userReqs]) => (
                  <Fragment key={email}>
                    <tr className="bg-gray-50/70">
                      <td colSpan={7} className="px-6 py-3">
                        <span className="font-bold text-[#111827] text-sm">{userReqs[0].name}</span>
                        <span className="text-xs text-gray-500 font-medium ml-2">{email}</span>
                        <span className="text-xs text-gray-400 ml-2">· {userReqs.length} request{userReqs.length !== 1 ? "s" : ""}</span>
                      </td>
                    </tr>
                    {userReqs.map(req => {
                  const cfg = statusConfig[req.status];
                  return (
                    <tr key={req.id} className="hover:bg-[#F4F6F8] transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-500 font-medium">{req.id}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#005B3F] text-base">
                        R {req.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700">
                        {req.duration} months
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx("inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border",
                          riskColors[req.riskLevel] ?? "bg-gray-100 text-gray-600 border-gray-200")}>
                          <TrendingUp className="w-3.5 h-3.5" />
                          {req.riskLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-medium whitespace-nowrap">
                        {req.submittedAt}
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border", cfg.className)}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {req.status !== "approved" && (
                            <button onClick={() => updateStatus(req.id, "approved")}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E5F2D9] text-[#005B3F] border border-[#B4D330]/30 hover:bg-[#B4D330]/30 transition-colors flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          )}
                          {req.status !== "rejected" && (
                            <button onClick={() => updateStatus(req.id, "rejected")}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                 })}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 text-sm text-gray-500 font-medium">
          Showing {filtered.length} of {requests.length} requests
        </div>
      </div>
    </div>
  );
}
