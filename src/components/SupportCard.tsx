import { Mail, MessageCircle, LifeBuoy } from "lucide-react";
import { useContent } from "../contexts/ContentContext";

// Plan Institutos: «Soporte por mail y WhatsApp». Abre el mail o el chat con los datos del instituto ya escritos.
export function SupportCard({ name, ficha }: { name: string; ficha?: string | null }) {
  const { t } = useContent();
  const mail = t("contact.email") || "hola@omia.site";
  const wa = (t("contact.whatsapp") || "").replace(/\D/g, "");
  const msg = `Hola, soy ${name} (Plan Institutos de Omia${ficha ? `, ficha ${ficha}` : ""}). Necesito ayuda con: `;
  return (
    <div className="bg-[#FFF9E8] border border-[#E4C56A] rounded-3xl p-6 sm:p-8" id="soporte">
      <div className="flex items-center gap-2 mb-2 text-[#6B4A06]"><LifeBuoy className="w-5 h-5" /><span className="font-semibold uppercase tracking-wider text-sm">Soporte del Plan Institutos</span></div>
      <p className="text-sm text-musgo mb-5 max-w-xl">Escribinos por mail o por WhatsApp para dudas con tu ficha, tu equipo, tus horarios o tu cobro. Ya va cargado tu nombre y tu ficha para que no tengas que explicarlo de cero.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <a href={`mailto:${mail}?subject=${encodeURIComponent(`Soporte Plan Institutos – ${name}`)}&body=${encodeURIComponent(msg)}`} className="inline-flex items-center justify-center gap-2 bg-bosque hover:bg-bosque-profundo text-lino px-6 py-3 rounded-full text-sm font-semibold"><Mail className="w-4 h-4" />Escribir por mail</a>
        {wa ? <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fb857] text-white px-6 py-3 rounded-full text-sm font-semibold"><MessageCircle className="w-4 h-4" />Escribir por WhatsApp</a>
          : <span className="text-sm text-musgo self-center">Respondemos dentro de las próximas 48 horas hábiles.</span>}
      </div>
    </div>
  );
}
