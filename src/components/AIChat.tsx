import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Leaf, Sparkles } from "lucide-react";
import Markdown from "react-markdown";

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Namaste 🙏. Soy tu guía inteligente de Omia Yoga. ¿Cómo te puedo ayudar hoy? Podés buscar estilos, consultarme sobre posturas, o pedirme recomendaciones de profes en Buenos Aires." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    { label: "🧘‍♀️ Yoga suave", query: "Busco clases suaves de yoga" },
    { label: "📍 Profes en Palermo", query: "Recomendame profesores de yoga en Palermo" },
    { label: "💫 ¿Qué es Ashtanga?", query: "¿En qué consiste el estilo Ashtanga?" },
    { label: "📅 Clases los Sábados", query: "¿Qué profesores tienen clases disponibles los Sábados?" }
  ];

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }), 
      });

      if (!response.ok) throw new Error("Failed to chat");
      
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.text }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "ai", text: "Disculpá, estoy teniendo problemas para conectarme ahora. Respirá profundo y volvé a intentarlo más tarde." }]);
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
            <Sparkles className="w-3 h-3 text-[#8CAE99]" />
            <span>¿Buscás profesor? ¡Preguntame!</span>
          </div>
        )}
        <button
          onClick={() => setIsOpen(true)}
          className={`bg-[#8CAE99] hover:bg-[#7a9d88] text-white p-4.5 rounded-full shadow-2xl transition-all duration-300 pointer-events-auto ${isOpen ? 'scale-0' : 'scale-100 hover:scale-110'}`}
          title="Omia AI Guide"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 border border-[#E5E5E5] animate-in fade-in slide-in-from-bottom-8 duration-300">
          {/* Header */}
          <div className="px-6 py-4 bg-[#FDFBF7] border-b border-[#E5E5E5] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-[#8CAE99]/10 p-2 rounded-full">
                <Leaf className="w-5 h-5 text-[#8CAE99]" />
              </div>
              <div>
                <h3 className="font-medium text-[#2C2C2C] flex items-center gap-1.5">
                  <span>Omia Guide</span>
                  <span className="text-[10px] bg-[#8CAE99]/15 text-[#8CAE99] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">IA</span>
                </h3>
                <p className="text-xs text-[#8CAE99]">Asistente de Bienestar</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-[#5D5D5D] hover:text-[#2C2C2C] transition-colors p-2 rounded-full hover:bg-black/5"
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
                      : "bg-[#FDFBF7] border border-[#E5E5E5] text-[#2C2C2C] rounded-tl-sm shadow-sm"
                  }`}
                >
                  <div className={`prose prose-sm ${msg.role === "user" ? "prose-invert text-white" : "text-[#2C2C2C]"} max-w-none`}>
                    <Markdown>{msg.text}</Markdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#FDFBF7] border border-[#E5E5E5] rounded-2xl rounded-tl-sm p-4 flex gap-1 items-center h-12 shadow-sm">
                  <div className="w-2 h-2 bg-[#8CAE99] rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-[#8CAE99] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-[#8CAE99] rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="pt-2" />
          </div>

          {/* Suggestions Tray (always helpful for rapid onboarding) */}
          <div className="px-4 py-2.5 bg-[#FDFBF7]/60 border-t border-[#E5E5E5]/50 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.query)}
                className="bg-white border border-[#E5E5E5] hover:border-[#8CAE99] hover:bg-[#8CAE99]/5 text-xs text-[#2C2C2C] font-medium px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap cursor-pointer shrink-0 shadow-sm"
                disabled={isLoading}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white border-t border-[#E5E5E5] shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Preguntá por estilos, profes o posturas..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="w-full bg-[#FDFBF7] border border-[#E5E5E5] focus:border-[#8CAE99] focus:ring-1 focus:ring-[#8CAE99] text-[#2C2C2C] rounded-full pl-5 pr-12 py-3.5 outline-none transition-all placeholder:text-[#5D5D5D]/50 text-sm"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bg-[#8CAE99] hover:bg-[#7a9d88] disabled:opacity-50 disabled:hover:bg-[#8CAE99] text-white p-2.5 rounded-full transition-colors"
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
