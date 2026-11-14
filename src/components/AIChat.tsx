import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { LogoMark } from "./Logo";
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
        <button
          onClick={() => setIsOpen(true)}
          className={`bg-bosque hover:bg-bosque-profundo text-lino p-4 rounded-full shadow-2xl transition duration-300 pointer-events-auto ${isOpen ? 'scale-0' : 'scale-100 hover:scale-110'}`}
          title={`Chateá con ${name}`}
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 border border-lino-oscuro animate-in fade-in slide-in-from-bottom-8 duration-300">
          {/* Header */}
          <div className="px-6 py-4 bg-lino border-b border-lino-oscuro flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-salvia/10 p-2 rounded-sm">
                <LogoMark className="w-5 h-5 text-bosque" />
              </div>
              <div>
                <h3 className="font-medium text-bosque flex items-center gap-1.5">
                  <span>{name}</span>
                  <span className="text-[10px] bg-salvia/15 text-salvia-oscuro font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">IA</span>
                </h3>
                <p className="text-xs text-salvia-oscuro">Asistente virtual de Omia</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-musgo hover:text-bosque transition-colors p-2 rounded-full hover:bg-black/5"
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
                      ? "bg-bosque text-lino rounded-tr-sm shadow-sm" 
                      : "bg-lino border border-lino-oscuro text-bosque rounded-tl-sm shadow-sm"
                  }`}
                >
                  <div className={`prose prose-sm ${msg.role === "user" ? "prose-invert text-white" : "text-bosque"} max-w-none`}>
                    <Markdown components={{ a: ({ href, children }) => (href && href.startsWith("/") ? <Link to={href} onClick={() => setIsOpen(false)} className="text-salvia-oscuro underline font-medium">{children}</Link> : <a href={href} target="_blank" rel="noopener noreferrer" className="text-salvia-oscuro underline">{children}</a>) }}>{msg.text}</Markdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-lino border border-lino-oscuro rounded-2xl rounded-tl-sm p-4 flex gap-1 items-center h-12 shadow-sm">
                  <div className="w-2 h-2 bg-salvia rounded-sm animate-bounce" />
                  <div className="w-2 h-2 bg-salvia rounded-sm animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-salvia rounded-sm animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="pt-2" />
          </div>

          {/* Suggestions Tray (always helpful for rapid onboarding) */}
          <div className="px-4 py-2.5 bg-lino/60 border-t border-lino-oscuro/50 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.query)}
                className="bg-white border border-lino-oscuro hover:border-salvia hover:bg-salvia/5 text-xs text-bosque font-medium px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap cursor-pointer shrink-0 shadow-sm"
                disabled={isLoading}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="px-4 pb-1 pt-2 bg-white text-center shrink-0">
            <Link to="/contacto" onClick={() => setIsOpen(false)} className="text-[11px] text-musgo hover:text-salvia-oscuro underline">¿Preferís hablar con una persona? Escribinos</Link>
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white border-t border-lino-oscuro shrink-0">
            <div className="relative flex items-center">
              <input aria-label="Escribime lo que necesitás..."
                type="text"
                placeholder="Escribime lo que necesitás..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="w-full bg-lino border border-lino-oscuro focus:border-salvia focus:ring-1 focus:ring-salvia text-bosque rounded-sm pl-5 pr-12 py-3.5 outline-none transition placeholder:text-musgo/50 text-sm"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bg-bosque hover:bg-bosque-profundo disabled:opacity-50 disabled:hover:bg-bosque-profundo text-lino p-2.5 rounded-full transition-colors"
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
