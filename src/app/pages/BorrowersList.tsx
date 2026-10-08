import { useEffect, useState, useRef, useMemo } from "react";
import { Users, Search, Filter, X } from "lucide-react";
import clsx from "clsx";

interface BorrowerLoan {
  reference: string;
  amount: string;
  loanType: string;
  status: string;
  score: number;
}
interface Borrower {
  id: string;
  name: string;
  email: string;
  idNumber: string;
  phone: string;
  joinedDate: string;
  loans: BorrowerLoan[];
}

const API_URL = import.meta.env.VITE_API_URL;

const STATUS_OPTIONS = ["All", "Pending", "Under Review", "Approved", "Rejected", "Disbursed", "Closed"];
const LOAN_TYPE_OPTIONS = ["All", "personal", "business", "education", "home-improvement", "debt-consolidation", "emergency"];

const statusStyles: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-100",
  "Under Review": "bg-amber-50 text-amber-700 border-amber-100",
  Approved: "bg-[#E5F2D9] text-[#005B3F] border-[#B4D330]/30",
  Rejected: "bg-red-50 text-red-700 border-red-100",
  Disbursed: "bg-blue-50 text-blue-700 border-blue-100",
  Closed: "bg-gray-50 text-gray-500 border-gray-100",
  "—": "bg-gray-50 text-gray-400 border-gray-100",
};

export default function BorrowersList() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterLoanType, setFilterLoanType] = useState("All");
  const [filterMinScore, setFilterMinScore] = useState("");
  const [filterMaxScore, setFilterMaxScore] = useState("");

  const filterPanelRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const loadBorrowers = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_URL}/api/admin/borrowers?page_size=100`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load borrowers");
        const data = await res.json();

        // Map API response to the table format. Missing fields become placeholders.
        const mapped: Borrower[] = (data.items ?? []).map((item: any) => ({
          id: String(item.id),
          name: item.name ?? "Unknown",
          email: item.email ?? "",
          idNumber: item.id_number ?? "—",
          phone: item.phone ?? "—",
          joinedDate: item.joined ?? "—",
          loans: (item.loans ?? []).map((l: any) => ({
            reference: l.reference,
            amount: l.amount,
            loanType: l.loan_type,
            status: l.status,
            score: l.score ?? 0,
          })),
        }));
        setBorrowers(mapped);
      } catch (err: any) {
        setError(err.message ?? "Something went wrong loading borrowers");
      } finally {
        setLoading(false);
      }
    };
    loadBorrowers();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterPanelRef.current?.contains(e.target as Node) || filterBtnRef.current?.contains(e.target as Node)) return;
      setShowFilterPanel(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasFilters = filterStatus !== "All" || filterLoanType !== "All" || filterMinScore || filterMaxScore;
  const clearFilters = () => {
    setFilterStatus("All");
    setFilterLoanType("All");
    setFilterMinScore("");
    setFilterMaxScore("");
  };

  const filtered = useMemo(() => borrowers.filter(b => {
    const term = search.toLowerCase();
    const matchesSearch = !search || b.name.toLowerCase().includes(term) || b.email.toLowerCase().includes(term) || b.loans.some(l => l.reference.toLowerCase().includes(term));
    const matchesStatus = filterStatus === "All" || b.loans.some(l => l.status === filterStatus);
    const matchesLoanType = filterLoanType === "All" || b.loans.some(l => l.loanType === filterLoanType);
    const matchesMinScore = !filterMinScore || b.loans.some(l => l.score >= Number(filterMinScore));
    const matchesMaxScore = !filterMaxScore || b.loans.some(l => l.score <= Number(filterMaxScore));
    return matchesSearch && matchesStatus && matchesLoanType && matchesMinScore && matchesMaxScore;
  }), [borrowers, search, filterStatus, filterLoanType, filterMinScore, filterMaxScore]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-64 bg-gray-200 rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-64 bg-gray-200 rounded-lg" />
            <div className="h-10 w-24 bg-gray-200 rounded-lg" />
            <div className="h-10 w-40 bg-gray-200 rounded-lg" />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
            <div className="h-5 w-32 bg-gray-200 rounded" />
          </div>
          <div className="divide-y divide-gray-100">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                  <div className="h-3 w-56 bg-gray-200 rounded" />
                </div>
                <div className="w-24 h-4 bg-gray-200 rounded" />
                <div className="w-32 h-4 bg-gray-200 rounded" />
                <div className="w-20 h-6 bg-gray-200 rounded" />
                <div className="w-24 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
          {error}
        </div>
        <button onClick={() => window.location.reload()} className="text-sm font-bold text-[#005B3F] underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Reliable Borrowers</h2>
          <p className="text-gray-500 mt-1 font-medium">AI-identified low-risk customers for pre-approved offers.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full sm:w-auto pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B4D330] transition-shadow shadow-sm"
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
              {hasFilters && <span className="w-2 h-2 rounded-full bg-[#005B3F]"></span>}
            </button>

            {showFilterPanel && (
              <div ref={filterPanelRef} className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-xl p-4 z-20">
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
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Loan Type</label>
                  <div className="flex flex-wrap gap-2">
                    {LOAN_TYPE_OPTIONS.map(s => (
                      <button key={s} onClick={() => setFilterLoanType(s)}
                        className={clsx("px-3 py-1 rounded-full text-xs font-bold border transition-all",
                          filterLoanType === s ? "bg-[#005B3F] text-white border-[#005B3F]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">AI Risk Score</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={filterMinScore} onChange={e => setFilterMinScore(e.target.value)} placeholder="Min (0)"
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B4D330]" />
                    <input type="number" value={filterMaxScore} onChange={e => setFilterMaxScore(e.target.value)} placeholder="Max (100)"
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B4D330]" />
                  </div>
                </div>
                {hasFilters && (
                  <button onClick={clearFilters} className="w-full text-center text-xs font-bold text-red-600 hover:text-red-800 py-1 transition-colors">
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
          <button className="bg-[#005B3F] hover:bg-[#00432E] text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-sm w-full sm:w-auto">
            Run Batch Analysis
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-[#E5F2D9] border border-[#B4D330]/30 text-[#005B3F] rounded-2xl flex items-center justify-center mb-5 shadow-sm">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#111827] mb-2">No Borrowers Found</h3>
          <p className="text-gray-500 max-w-md font-medium">No borrowers match your current filter criteria.</p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-4 text-sm font-bold text-[#005B3F] hover:text-[#00432E] transition-colors">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
            <span className="text-sm font-bold text-[#111827]">Borrower Directory</span>
            <span className="text-xs text-gray-400 font-medium">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Borrower</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Loan</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">AI Risk Score</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-[#F4F6F8] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#111827]">{b.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 font-medium">{b.email} · {b.phone}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{b.loans.length} loan{b.loans.length !== 1 ? "s" : ""}</div>
                    </td>
                    <td className="px-6 py-4 space-y-2">
                      {b.loans.length === 0 ? "—" : b.loans.map(l => (
                        <div key={l.reference}>
                          <div className="font-bold text-[#005B3F]">{l.amount}</div>
                          <div className="text-xs text-gray-500 font-medium">{l.reference} · {l.loanType}</div>
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 space-y-4">
                      {b.loans.map(l => (
                        <div key={l.reference} className="flex items-center gap-3">
                          <div className="w-full max-w-[80px] h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                            <div
                              className={clsx("h-full rounded-full", l.score < 30 ? "bg-[#B4D330]" : l.score < 60 ? "bg-amber-400" : "bg-red-500")}
                              style={{ width: `${l.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-[#111827] w-6">{l.score}</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 space-y-3">
                      {b.loans.map(l => (
                        <div key={l.reference}>
                          <span className={clsx("inline-block px-3 py-1 rounded-md text-xs font-bold border", statusStyles[l.status] ?? statusStyles["—"])}>
                            {l.status}
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                      {b.joinedDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}