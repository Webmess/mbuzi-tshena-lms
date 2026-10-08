import { useState, useEffect } from "react";
import { Search, CheckCircle2, XCircle, Clock, FileImage, FileText, Eye } from "lucide-react";
import clsx from "clsx";

interface ProofRecord {
  id: string;
  userName: string;
  userId: string;
  loanId: string;
  fileName: string;
  fileType: "image" | "pdf";
  uploadedAt: string;
  loanAmount: string;
  status: "pending" | "verified" | "rejected";
}


const statusConfig = {
  pending:  { label: "Pending Review", className: "bg-amber-50 text-amber-700 border-amber-100",     icon: <Clock className="w-3.5 h-3.5" /> },
  verified: { label: "Verified",       className: "bg-[#E5F2D9] text-[#005B3F] border-[#B4D330]/30", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected: { label: "Rejected",       className: "bg-red-50 text-red-700 border-red-100",           icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function ProofOfPayments() {
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const API_URL = import.meta.env.VITE_API_URL;
  useEffect(() => {
    fetch(`${API_URL}/api/proofs`, { credentials: "include" })
      .then(res => res.json())
      .then((data: any[]) => setProofs(data.map(p => ({
        id: p.id,
        userName: p.user_name,
        userId: p.user_email,
        loanId: p.loan_reference,
        fileName: p.file_name,
        fileType: p.file_type,
        uploadedAt: new Date(p.uploaded_at + "Z").toLocaleString("en-ZA"),
        loanAmount: p.loan_amount,
        status: p.status,
      }))));
  }, []);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const updateStatus = async (id: string, status: "verified" | "rejected") => {
    const admin_notes = status === "rejected" ? prompt("Reason for rejecting?") : null;
    const res = await fetch(`${API_URL}/api/proofs/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_notes }),
    });
    if (res.ok) setProofs(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const filtered = proofs.filter(p => {
    const matchesSearch =
      p.userName.toLowerCase().includes(search.toLowerCase()) ||
      p.loanId.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      filterStatus === "All" ||
      (filterStatus === "Pending"  && p.status === "pending")  ||
      (filterStatus === "Verified" && p.status === "verified") ||
      (filterStatus === "Rejected" && p.status === "rejected");
    return matchesSearch && matchesStatus;
  });

  const counts = {
    total:    proofs.length,
    pending:  proofs.filter(p => p.status === "pending").length,
    verified: proofs.filter(p => p.status === "verified").length,
    rejected: proofs.filter(p => p.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Proof of Payments</h2>
          <p className="text-gray-500 mt-1 font-medium">Review and verify user-uploaded payment proofs.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Submissions", value: counts.total,    color: "bg-gray-50 border-gray-200 text-[#111827]" },
          { label: "Pending Review",    value: counts.pending,  color: "bg-amber-50 border-amber-100 text-amber-700" },
          { label: "Verified",          value: counts.verified, color: "bg-[#E5F2D9] border-[#B4D330]/30 text-[#005B3F]" },
          { label: "Rejected",          value: counts.rejected, color: "bg-red-50 border-red-100 text-red-700" },
        ].map(card => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs font-semibold mt-0.5 opacity-80">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, loan ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B4D330] focus:border-[#B4D330] transition-shadow shadow-sm text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", "Pending", "Verified", "Rejected"].map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={clsx(
                "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                filterStatus === f
                  ? "bg-[#005B3F] text-white border-[#005B3F] shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Borrower</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">File</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Loan</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Uploaded</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                    No proof submissions match your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(proof => {
                  const cfg = statusConfig[proof.status];
                  return (
                    <tr key={proof.id} className="hover:bg-[#F4F6F8] transition-colors">
                      {/* Borrower */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#111827] text-sm">{proof.userName}</div>
                        <div className="text-xs text-gray-500 mt-0.5 font-medium">{proof.userId}</div>
                      </td>

                      {/* File preview thumbnail */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center border shrink-0",
                            proof.fileType === "image"
                              ? "bg-blue-50 border-blue-100 text-blue-600"
                              : "bg-[#E5F2D9] border-[#B4D330]/30 text-[#005B3F]"
                          )}>
                            {proof.fileType === "image"
                              ? <FileImage className="w-5 h-5" />
                              : <FileText className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#111827] max-w-[140px] truncate" title={proof.fileName}>
                              {proof.fileName}
                            </div>
                            <div className="text-xs text-gray-400 uppercase font-medium mt-0.5">
                              {proof.fileType === "image" ? "Image" : "PDF"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Loan info */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-[#005B3F]">{proof.loanAmount}</div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5">{proof.loanId}</div>
                      </td>

                      {/* Uploaded date */}
                      <td className="px-6 py-4 text-sm text-gray-500 font-medium whitespace-nowrap">
                        {proof.uploadedAt}
                      </td>

                      {/* Status badge */}
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border",
                          cfg.className
                        )}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            title="Preview"
                             onClick={async () => {
                              const res = await fetch(`${API_URL}/api/proofs/${proof.id}/file`, { credentials: "include" });
                              if (!res.ok) { alert("Could not open file"); return; }
                              const blob = await res.blob();
                              window.open(URL.createObjectURL(blob), "_blank");
                            }}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {proof.status !== "verified" && (
                            <button
                              onClick={() => updateStatus(proof.id, "verified")}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E5F2D9] text-[#005B3F] border border-[#B4D330]/30 hover:bg-[#B4D330]/30 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Verify
                            </button>
                          )}
                          {proof.status !== "rejected" && (
                            <button
                              onClick={() => updateStatus(proof.id, "rejected")}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm">
          <span className="text-gray-500 font-medium">Showing {filtered.length} of {proofs.length} submissions</span>
        </div>
      </div>
    </div>
  );
}
