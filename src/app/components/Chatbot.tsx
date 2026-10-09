import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import clsx from "clsx";

// AI chatbot (SRS feature #6). Talks to backend/app/routers/chatbot.py
const API_URL = import.meta.env.VITE_API_URL;
const QUICK_REPLIES = ["Loan Application Status", "Repayment Information", "Investment Advice"];

interface ChatLine {
  from: "user" | "bot";
  text: string;
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([
    { from: "bot", text: "Hi! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Show the customer's earlier conversation the first time the window opens
  const [historyLoaded, setHistoryLoaded] = useState(false);
  useEffect(() => {
    if (!open || historyLoaded) return;
    setHistoryLoaded(true);
    fetch(`${API_URL}/api/chatbot/history`, { credentials: "include" })
      .then(res => (res.ok ? res.json() : []))
      .then((rows: { question: string; answer: string }[]) => {
        if (rows.length === 0) return;
        const earlier = rows.flatMap(r => [
          { from: "user" as const, text: r.question },
          { from: "bot" as const, text: r.answer },
        ]);
        setLines(prev => [...earlier, ...prev]);
      });
  }, [open, historyLoaded]);

  // Keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, open]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setLines(prev => [...prev, { from: "user", text: message }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/api/chatbot/message`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      setLines(prev => [...prev, { from: "bot", text: res.ok ? data.answer : "Sorry, something went wrong. Please try again." }]);
    } catch {
      setLines(prev => [...prev, { from: "bot", text: "I can't reach the server right now. Please try again." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] max-w-sm h-[480px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#005B3F] text-white px-4 py-3 flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <div className="flex-1">
              <div className="font-bold text-sm">Mbudzi Tshena Assistant</div>
              <div className="text-xs text-white/70">Loans, repayments and investments</div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/10" title="Close">
                <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#F4F6F8]">
            {lines.map((line, i) => (
              <div key={i} className={clsx("flex", line.from === "user" ? "justify-end" : "justify-start")}>
                <div className={clsx(
                  "max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-line",
                  line.from === "user"
                    ? "bg-[#005B3F] text-white rounded-br-sm"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                )}>
                    {line.text}
                </div>
              </div>
            ))}
            {sending && <div className="text-xs text-gray-400 px-1">Assistant is typing…</div>}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          <div className="px-3 pt-2 flex flex-wrap gap-1.5 border-t border-gray-100">
            {QUICK_REPLIES.map(q => (
              <button key={q} onClick={() => send(q)} disabled={sending}
                className="text-xs font-bold px-2.5 py-1 rounded-full border border-[#005B3F]/30 text-[#005B3F] bg-[#E5F2D9] hover:bg-[#B4D330]/30 disabled:opacity-50">
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={e => { e.preventDefault(); send(input); }} className="p-3 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={500}
              placeholder="Type your question…"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B4D330]"
            />
            <button type="submit" disabled={sending || !input.trim()}
              className="p-2.5 rounded-xl bg-[#005B3F] text-white disabled:opacity-50" title="Send">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="ml-auto flex items-center justify-center w-14 h-14 rounded-full bg-[#005B3F] text-white shadow-lg hover:bg-[#004530] transition-colors"
        title={open ? "Close chat" : "Chat with us"}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}

