import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Leaf, Sparkles } from "lucide-react";
import Markdown from "react-markdown";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useContent } from "../contexts/ContentContext";

export function AIChat() {
  const { t, pairs } = useContent();
  const name = t("assistant.name") || "Omi";
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // El primer mensaje sale del panel (Admin → Sitio → Asistente); se arma al abrir para tomar lo último.
  useEffect(() => {
    if (isOpen && messages.length === 0) setMessages([{ role: "ai", text: t("assistant.greeting") }]);
  }, [isOpen]);

  const suggestionChips = pairs("assistant.chips").map((p) => ({ label: p.a, query: p.b }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    const userMessage = textToSend.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    if (!customText) setInput("");
    setIsLoading(true);

    try {
      const response = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          // Los últimos mensajes, para que siga la conversación sin repetir preguntas.
          history: messages.slice(-8).map((m) => ({ role: m.role === "user" ? "user" : "model", content: m.text })),
        }),
      });

      if (!response.ok) throw new Error("Failed to chat");
      
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.text }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "ai", text: "Uf, no me está andando la conexión. Probá de nuevo en un ratito o escribinos desde Contacto 🙂" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button with tooltip badge */}
      <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 ${isOpen ? 'pointer-events-none' : ''}`}>
        {!isOpen && (
          <div className="bg-[#2C2C2C] text-white text-xs px-3 py-2 rounded-2xl shadow-lg border border-white/10 flex items-center gap-1.5 animate-bounce font-medium whitespace-nowrap">
            <Sparkles className="w-3 h-3 text-[#98A77C]" />
            <span>{t("assistant.bubble")}</span>
          </div>
        )}
        <button
          onClick={() => setIsOpen(true)}
          className={`bg-[#98A77C] hover:bg-[#88976C] text-white p-4 rounded-full shadow-2xl transition-all duration-300 pointer-events-auto ${isOpen ? 'scale-0' : 'scale-100 hover:scale-110'}`}
          title={`Chateá con ${name}`}
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 border border-[#E8E0D0] animate-in fade-in slide-in-from-bottom-8 duration-300">
          {/* Header */}
          <div className="px-6 py-4 bg-[#F4EFE4] border-b border-[#E8E0D0] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-[#98A77C]/10 p-2 rounded-sm">
                <Leaf className="w-5 h-5 text-[#98A77C]" />
              </div>
              <div>
                <h3 className="font-medium text-[#2C2C2C] flex items-center gap-1.5">
                  <span>{name}</span>
                  <span className="text-[10px] bg-[#98A77C]/15 text-[#98A77C] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">IA</span>
                </h3>
                <p className="text-xs text-[#98A77C]">Asistente virtual de Omia</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-[#5D5D5D] hover:text-[#2C2C2C] transition-colors p-2 rounded-sm hover:bg-black/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white shrink-0 h-0">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.role === "user" 
                      ? "bg-[#2C2C2C] text-white rounded-tr-sm shadow-sm" 
                      : "bg-[#F4EFE4] border border-[#E8E0D0] text-[#2C2C2C] rounded-tl-sm shadow-sm"
                  }`}
                >
                  <div className={`prose prose-sm ${msg.role === "user" ? "prose-invert text-white" : "text-[#2C2C2C]"} max-w-none`}>
                    <Markdown components={{ a: ({ href, children }) => (href && href.startsWith("/") ? <Link to={href} onClick={() => setIsOpen(false)} className="text-[#6f8656] underline font-medium">{children}</Link> : <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#6f8656] underline">{children}</a>) }}>{msg.text}</Markdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#F4EFE4] border border-[#E8E0D0] rounded-2xl rounded-tl-sm p-4 flex gap-1 items-center h-12 shadow-sm">
                  <div className="w-2 h-2 bg-[#98A77C] rounded-sm animate-bounce" />
                  <div className="w-2 h-2 bg-[#98A77C] rounded-sm animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-[#98A77C] rounded-sm animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="pt-2" />
          </div>

          {/* Suggestions Tray (always helpful for rapid onboarding) */}
          <div className="px-4 py-2.5 bg-[#F4EFE4]/60 border-t border-[#E8E0D0]/50 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.query)}
                className="bg-white border border-[#E8E0D0] hover:border-[#98A77C] hover:bg-[#98A77C]/5 text-xs text-[#2C2C2C] font-medium px-3.5 py-1.5 rounded-sm transition-colors whitespace-nowrap cursor-pointer shrink-0 shadow-sm"
                disabled={isLoading}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="px-4 pb-1 pt-2 bg-white text-center shrink-0">
            <Link to="/contacto" onClick={() => setIsOpen(false)} className="text-[11px] text-[#5D5D5D] hover:text-[#98A77C] underline">¿Preferís hablar con una persona? Escribinos</Link>
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white border-t border-[#E8E0D0] shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Escribime lo que necesitás..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-sm pl-5 pr-12 py-3.5 outline-none transition-all placeholder:text-[#5D5D5D]/50 text-sm"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bg-[#98A77C] hover:bg-[#88976C] disabled:opacity-50 disabled:hover:bg-[#98A77C] text-white p-2.5 rounded-sm transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
