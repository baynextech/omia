import { Star } from "lucide-react";

// Insignia Pro dorada: Plan Destacado y Plan Institutos.
export function ProBadge({ className = "", size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  const big = size === "md";
  return (
    <span
      title="Profesional Pro de Omia"
      className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider border border-[#B8892B] text-[#5C3F06] shadow-sm
        bg-gradient-to-b from-[#F6DC8D] to-[#D8A93B] ${big ? "text-xs px-3 py-1.5" : "text-[10px] px-2 py-0.5"} ${className}`}
    >
      <Star className={big ? "w-3.5 h-3.5 fill-[#5C3F06]" : "w-3 h-3 fill-[#5C3F06]"} />
      Pro
    </span>
  );
}
