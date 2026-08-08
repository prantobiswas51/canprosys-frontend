import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';

const API_URL = import.meta.env.VITE_API_URL;

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  isError?: boolean;
}

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const suggestedPrompts = [
  'How much does our Canvas 3x4 cost to make?',
  'What raw materials are running low?',
  'What does Karim earn this month?',
  'Give me a waste sales summary',
];

let nextId = 1;

export default function AiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Nothing to scroll to yet on first mount (empty state) -- without this
    // guard, scrollIntoView still runs once with no messages and, since the
    // page is taller than the viewport, drags the whole page down to bring
    // the (already-visible) bottom marker into view instead of leaving you
    // at the top where you landed. block: 'nearest' scopes the scroll to
    // the chat panel itself once there are messages, so sending/receiving
    // replies doesn't yank the outer page scroll either.
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, sending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { id: nextId++, role: 'user', text: trimmed }]);
    setInput('');
    setSending(true);

    try {
      const res = await axios.post<{ reply: string }>(`${API_URL}/ai/chat`, { message: trimmed });
      setMessages((prev) => [...prev, { id: nextId++, role: 'assistant', text: res.data.reply }]);
    } catch (err) {
      const message = getApiErrorMessage(err, 'Could not reach the AI assistant. Check the console.');
      setMessages((prev) => [...prev, { id: nextId++, role: 'assistant', text: message, isError: true }]);
      console.error('AI chat failed', err);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="pb-1">
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">AI Assistant</h2>
        <p className="text-[0.9rem] text-[#545454]">
          Ask about product cost, raw material and wood stock, waste, employees, and salaries -- answers come
          straight from live data, not guesses.
        </p>
      </div>

      <div className={`${cardClass} flex flex-col h-[65vh]`}>
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-8">
              <div className="w-14 h-14 rounded-full bg-[rgba(226,30,83,0.08)] text-[#e21e53] flex items-center justify-center">
                <i className="fa-solid fa-robot text-[1.4rem]" />
              </div>
              <div>
                <p className="text-[0.95rem] font-bold text-[#1E1E1E] mb-1">Ask me anything about your business</p>
                <p className="text-[0.8rem] text-[#545454]">Try one of these, or type your own question below.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    disabled={sending}
                    className="text-[0.8rem] font-semibold text-[#e21e53] bg-[rgba(226,30,83,0.06)] hover:bg-[rgba(226,30,83,0.12)] border border-[rgba(226,30,83,0.15)] rounded-full px-3 py-1.5 transition-colors duration-200 disabled:opacity-50 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-xl px-4 py-2.5 text-[0.875rem] leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-[#e21e53] to-[#c01745] text-white'
                    : m.isError
                    ? 'bg-[rgba(239,68,68,0.08)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]'
                    : 'bg-[#f8fafc] text-[#1E1E1E] border border-[#e8e8e8]'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-xl px-4 py-2.5 text-[0.875rem] bg-[#f8fafc] text-[#545454] border border-[#e8e8e8] flex items-center gap-2">
                <i className="fa-solid fa-spinner fa-spin" />
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-2 pt-4 mt-3 border-t border-[#e8e8e8]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about product stock..."
            disabled={sending}
            className="flex-1 bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(226,30,83,0.15)] disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="h-[2.6rem] px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] hover:bg-[#c81a49] transition-colors duration-200 disabled:opacity-50 cursor-pointer"
          >
            <i className={`fa-solid ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
