import { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  BrainCircuit,
  X,
  ShieldAlert,
  Clock,
  Bell,
  RefreshCw,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import clsx from "clsx";

/* ─── Types and static alert data ─────────────────────────────── */
interface Alert {
  id: string;
  type: "Fraud Suspicion" | "Late Payment" | "High Risk" | "Document Mismatch" | "Multiple Applications";
  relatedId: string;
  relatedUser: string;
  dateTime: string;
  description: string;
  status: "unresolved" | "resolved";
  read: boolean;
}

const typeConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  "Fraud Suspicion":      { color: "bg-red-100 text-red-700 border-red-200",     icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  "Multiple Applications":{ color: "bg-red-100 text-red-700 border-red-200",     icon: <RefreshCw className="w-3.5 h-3.5" /> },
  "High Risk":            { color: "bg-orange-100 text-orange-700 border-orange-200", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  "Document Mismatch":    { color: "bg-amber-100 text-amber-700 border-amber-200",icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  "Late Payment":         { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock className="w-3.5 h-3.5" /> },
};

/* ─── Alerts Modal ────────────────────────────────────────────── */
function AlertsModal({ onClose }: { onClose: () => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/alerts`, { credentials: "include" })
      .then(res => (res.ok ? res.json() : []))
      .then(setAlerts);
  }, []);
  const [filter, setFilter] = useState<"All" | "Unresolved" | "Resolved">("All");

  const toggleResolved = (id: string) => {
     fetch(`${import.meta.env.VITE_API_URL}/api/admin/alerts/${id}`, { method: "PATCH", credentials: "include" });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: a.status === "resolved" ? "unresolved" : "resolved", read: true } : a));
  };

  const markRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const filtered = alerts.filter(a =>
    filter === "All" ||
    (filter === "Unresolved" && a.status === "unresolved") ||
    (filter === "Resolved"   && a.status === "resolved")
  );

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50 sticky top-0 z-10 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-[#111827]">All System Alerts</h3>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {(["All", "Unresolved", "Resolved"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={clsx("px-3 py-1 rounded-full text-xs font-bold border transition-all",
                    filter === f ? "bg-[#005B3F] text-white border-[#005B3F]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Bell className="w-10 h-10 mb-3 opacity-50" />
              <p className="font-medium text-sm">No alerts in this category</p>
            </div>
          ) : (
            filtered.map(alert => {
              const cfg = typeConfig[alert.type] ?? { color: "bg-gray-100 text-gray-600 border-gray-200", icon: <Bell className="w-3.5 h-3.5" /> };
              return (
                <div
                  key={alert.id}
                  onClick={() => markRead(alert.id)}
                  className={clsx(
                    "p-4 rounded-xl border transition-all cursor-default",
                    alert.status === "resolved"
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : alert.read
                      ? "bg-white border-red-100"
                      : "bg-[#FEF2F2] border-red-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border", cfg.color)}>
                        {cfg.icon}
                        {alert.type}
                      </span>
                      {!alert.read && (
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                      )}
                    </div>
                    <span className={clsx("text-xs font-bold px-2 py-0.5 rounded border",
                      alert.status === "resolved"
                        ? "bg-[#E5F2D9] text-[#005B3F] border-[#B4D330]/30"
                        : "bg-red-50 text-red-700 border-red-100"
                    )}>
                      {alert.status === "resolved" ? "Resolved" : "Unresolved"}
                    </span>
                  </div>

                  <p className="text-sm text-gray-800 font-medium leading-relaxed mb-2">{alert.description}</p>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                      <span>{alert.relatedId}</span>
                      <span>·</span>
                      <span>{alert.relatedUser}</span>
                      <span>·</span>
                      <span>{alert.dateTime}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); toggleResolved(alert.id); }}
                      className={clsx(
                        "text-xs font-bold px-3 py-1 rounded-lg border transition-colors",
                        alert.status === "resolved"
                          ? "text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                          : "text-[#005B3F] border-[#005B3F]/30 hover:bg-[#E5F2D9]"
                      )}
                    >
                      {alert.status === "resolved" ? "Mark Unresolved" : "Mark Resolved"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard Overview Component ───────────────────────── */
export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<any>(null);
  const [showAlerts, setShowAlerts] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const [realAlerts, setRealAlerts] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API_URL}/api/admin/alerts`, { credentials: "include" })
      .then(res => (res.ok ? res.json() : []))
      .then(setRealAlerts);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_URL}/api/admin/dashboard`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Unable to load dashboard");
      const json = await res.json();
      setDashboard(json);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const stats = dashboard?.stats ?? null;
  const data = dashboard?.chart_data ?? [];
  const recentAlerts = realAlerts.filter(a => a.status === "unresolved");

  function StatCardSkeleton() {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-200 animate-pulse">
        <div className="flex justify-between">
          <div className="w-12 h-12 rounded-xl bg-gray-200" />
          <div className="w-16 h-6 rounded bg-gray-200" />
        </div>
        <div className="mt-6">
          <div className="w-32 h-4 bg-gray-200 rounded" />
          <div className="w-24 h-8 bg-gray-200 rounded mt-3" />
        </div>
      </div>
    );
  }

  function BannerSkeleton() {
    return <div className="h-40 rounded-2xl bg-gray-200 animate-pulse" />;
  }

  function ChartSkeleton() {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
        <div className="w-48 h-6 bg-gray-200 rounded mb-8" />
        <div className="h-[300px] flex items-end gap-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${60 + Math.random() * 180}px` }} />
          ))}
        </div>
      </div>
    );
  }

  function AlertsSkeleton() {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
        <div className="w-44 h-6 bg-gray-200 rounded mb-6" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-xl p-4 mb-4">
            <div className="w-20 h-4 bg-gray-200 rounded mb-3" />
            <div className="w-full h-4 bg-gray-200 rounded mb-2" />
            <div className="w-1/2 h-4 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">{error}</div>
        <button onClick={loadDashboard} className="text-sm font-bold text-[#005B3F] underline">Try again</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <BannerSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><ChartSkeleton /></div>
          <AlertsSkeleton />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* AI Status Banner */}
        <div className="relative bg-[#005B3F] rounded-2xl p-6 md:p-8 flex items-center justify-between text-white shadow-lg overflow-hidden border border-[#00432E] min-h-[140px]">
          <div className="absolute inset-0 bg-[#005B3F]/80 mix-blend-multiply z-10"></div>
          <img
            src="https://images.unsplash.com/photo-1757421392324-cc071fb8b644?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjb3Jwb3JhdGUlMjBvZmZpY2UlMjBwZW9wbGUlMjBhZnJpY2F8ZW58MXx8fHwxNzczMDc0NjE4fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Corporate Office"
            className="absolute inset-0 w-full h-full object-cover z-0 grayscale"
          />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#B4D330] opacity-20 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 z-10"></div>

          <div className="relative z-20 flex items-center gap-4">
            <div className="bg-white/10 p-3.5 rounded-xl border border-white/20 backdrop-blur-md shadow-sm">
              <BrainCircuit className="w-8 h-8 text-[#B4D330]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">AI Risk Engine Active</h2>
              <p className="text-sm text-white/90 mt-1 font-medium">
                Processed {stats?.processed_today ?? 0} loan requests today with {stats?.accuracy_pct ?? 0}% accuracy.
              </p>
            </div>
          </div>
          <div className="relative z-20 text-right hidden md:block bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="text-3xl font-black text-[#B4D330] tracking-tight leading-none">Active</div>
            <div className="text-xs text-white/80 font-bold uppercase tracking-wider mt-1.5">System Status</div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total Active Loans"
            value={stats?.total_active_loans_count ?? "—"}
            trend={stats?.trends?.active_loans ?? "—"}
            isPositive={!(stats?.trends?.active_loans ?? "").startsWith("-")}
            icon={TrendingUp}
            color="blue"
          />
          <StatCard
            title="Reliable Borrowers"
            value={stats?.reliable_borrowers_count ?? "—"}
            trend={stats?.trends?.borrowers ?? "—"}
            isPositive={!(stats?.trends?.borrowers ?? "").startsWith("-")}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Avg. AI Risk Score"
            value={stats?.avg_ai_risk_score ?? "—"}
            trend={stats?.trends?.risk_score ?? "—"}
            isPositive={(stats?.trends?.risk_score ?? "").startsWith("-")}
            icon={CheckCircle2}
            color="indigo"
          />
          <StatCard
            title="Fraud Alerts Detected"
            value={stats?.fraud_alerts_count ?? "—"}
            trend={stats?.trends?.fraud ?? "—"}
            isPositive={(stats?.trends?.fraud ?? "+0").startsWith("-")}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* Charts & AI Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#111827]">Loan Processing Trends</h3>
              <select className="bg-[#F4F6F8] border border-gray-200 text-sm font-semibold text-[#005B3F] rounded-lg py-2 px-4 outline-none focus:ring-2 focus:ring-[#B4D330] hover:bg-gray-50 transition-colors">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApprovals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#005B3F" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#005B3F" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRejections" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} itemStyle={{ fontWeight: 600 }} />
                  <Area type="monotone" dataKey="approvals" stroke="#005B3F" strokeWidth={3} fillOpacity={1} fill="url(#colorApprovals)" />
                  <Area type="monotone" dataKey="rejections" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRejections)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
            <h3 className="text-lg font-bold text-[#111827] mb-6">Recent Fraud Alerts</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {recentAlerts.length > 0 ? (
                recentAlerts.slice(0, 4).map((alert: any) => (
                  <div key={alert.id} className="bg-[#FEF2F2] p-4 rounded-xl border border-red-100 transition-all hover:border-red-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-red-900">{alert.relatedId || alert.id}</span>
                      <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md">
                        {alert.type}
                      </span>
                    </div>
                    <p className="text-sm text-red-800 font-medium mb-2 leading-snug line-clamp-2">{alert.description}</p>
                    <div className="text-xs text-red-500 font-medium">{alert.dateTime || alert.time}</div>
                  </div>
                ))
              ) : (
               <p className="text-sm text-gray-400 text-center py-8">No unresolved fraud alerts</p>
              )}
            </div>
            <button
              onClick={() => setShowAlerts(true)}
              className="mt-4 w-full py-3 text-sm font-bold text-[#005B3F] bg-white border border-[#005B3F]/20 rounded-xl hover:bg-[#F4F6F8] transition-colors"
            >
              View All Alerts
            </button>
          </div>
        </div>
      </div>

      {showAlerts && <AlertsModal onClose={() => setShowAlerts(false)} />}
    </>
  );
}

/* ─── Stat Card Component ─────────────────────────────────────── */
function StatCard({ title, value, trend, isPositive, icon: Icon, color }: any) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-[#E5F2D9] text-[#005B3F] border-[#B4D330]/30",
    red: "bg-red-50 text-red-700 border-red-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-xl border ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center gap-1 text-sm font-bold bg-gray-50 px-2 py-1 rounded-md ${isPositive ? "text-green-700" : "text-red-700"}`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {trend}
        </div>
      </div>
      <div className="mt-5">
        <h4 className="text-sm font-semibold text-gray-500">{title}</h4>
        <div className="text-2xl font-bold text-[#111827] mt-1 tracking-tight">{value}</div>
      </div>
    </div>
  );
}