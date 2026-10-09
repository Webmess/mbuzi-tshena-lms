import { useState, useEffect, Fragment } from "react";
import { MessageCircle, CircleHelp, UserRound } from "lucide-react";
import clsx from "clsx";

// Questions the chatbot could not answer, or where the customer asked for a person.
// Comes from GET /api/chatbot/escalated (backend/app/routers/chatbot.py)
interface EscalatedQuestion {
  id: number;
  question: string;
  answer: string;
  category: string;
  user_name: string;
  user_email: string;
  asked: string;
}

const typeConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  human:       { label: "Asked for a person", className: "bg-blue-50 text-blue-700 border-blue-100",    icon: <UserRound className="w-3.5 h-3.5" /> },
  unsupported: { label: "Not understood",     className: "bg-amber-50 text-amber-700 border-amber-100", icon: <CircleHelp className="w-3.5 h-3.5" /> },
};

export default function ChatbotQuestions() {
  const [questions, setQuestions] = useState<EscalatedQuestion[]>([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/chatbot/escalated`, { credentials: "include" })
      .then(res => (res.ok ? res.json() : []))
      .then(setQuestions);
  }, []);

  const filtered = questions.filter(q =>
    filter === "All" ||
    (filter === "Asked for a person" && q.category === "human") ||
    (filter === "Not understood" && q.category === "unsupported")
  );
  const groups = filtered.reduce<Record<string, EscalatedQuestion[]>>((acc, q) => {
    if (!acc[q.user_email]) acc[q.user_email] = [];
    acc[q.user_email].push(q);
    return acc;
  }, {});

  const counts = {
    total:      questions.length,
    person:     questions.filter(q => q.category === "human").length,
    understood: questions.filter(q => q.category === "unsupported").length,
  };

   return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Chatbot Questions</h2>
        <p className="text-gray-500 mt-1 font-medium">
            Customers who asked for a person, and questions the assistant could not answer. Add the unanswered ones as examples in
          backend/app/utils/chatbot.py to make the assistant smarter.
        </p>
      </div>
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Escalated questions", value: counts.total,      color: "bg-gray-50 border-gray-200 text-[#111827]" },
          { label: "Asked for a person",  value: counts.person,     color: "bg-blue-50 border-blue-100 text-blue-700" },
          { label: "Not understood",      value: counts.understood, color: "bg-amber-50 border-amber-100 text-amber-700" },
        ].map(card => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <div className="text-xl font-bold">{card.value}</div>
            <div className="text-xs font-semibold mt-0.5 opacity-80">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {["All", "Asked for a person", "Not understood"].map(f => (
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Question</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Assistant replied</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Asked</th>
              </tr>
              </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">
                    <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    No escalated questions in this category.
                  </td>
                </tr>
                ) : (
                Object.entries(groups).map(([email, userQuestions]) => (
                  <Fragment key={email}>
                    <tr className="bg-gray-50/70">
                      <td colSpan={4} className="px-6 py-3">
                        <span className="font-bold text-[#111827] text-sm">{userQuestions[0].user_name}</span>
                        <span className="text-xs text-gray-500 font-medium ml-2">{email}</span>
                        <span className="text-xs text-gray-400 ml-2">· {userQuestions.length} question{userQuestions.length !== 1 ? "s" : ""}</span>
                      </td>
                    </tr>
                    {userQuestions.map(q => {
                      const cfg = typeConfig[q.category] ?? typeConfig.unsupported;
                      return (
                        <tr key={q.id} className="hover:bg-[#F4F6F8] transition-colors align-top">
                          <td className="px-6 py-4 text-sm font-medium text-[#111827] max-w-xs">"{q.question}"</td>
                          <td className="px-6 py-4 text-xs text-gray-500 max-w-sm">{q.answer}</td>
                          <td className="px-6 py-4">
                            <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border whitespace-nowrap", cfg.className)}>
                              {cfg.icon}
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-medium whitespace-nowrap">{q.asked}</td>
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
          Showing {filtered.length} of {questions.length} questions
        </div>
      </div>
    </div>
  );
}