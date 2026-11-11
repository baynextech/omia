import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Copy, ExternalLink, Palette } from "lucide-react";
import { apiFetch } from "../lib/api";

export interface PageForm {
  name: string; location: string; image: string; images: string[]; bio: string; price: string; availableDays: string[];
  email: string; phone: string; address: string; schedule: string;
}

// «Tu página en Omia»: dirección propia, estado, qué falta completar y vista previa.
// El diseño lo pone Omia: la persona carga textos, fotos y horarios, y su página usa siempre la misma plantilla del sitio.
export function PageBuilderCard({ form, slug, teacherId, status, isInstitute, authHeaders, onSlug }: {
  form: PageForm; slug: string | null; teacherId: string | null; status: string | null; isInstitute: boolean;
  authHeaders: () => Record<string, string>; onSlug: (slug: string) => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://omia.site";
  const [edit, setEdit] = useState(slug || "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const path = `/profesor/${slug || teacherId || ""}`;

  const items: { ok: boolean; label: string; hint: string }[] = [
    { ok: form.name.trim().length > 1, label: "Nombre", hint: "Cómo te van a buscar" },
    { ok: !!form.location, label: "Zona", hint: "Para aparecer en las búsquedas de tu barrio" },
    { ok: !!(form.image || form.images.length), label: "Foto de portada", hint: "Es lo primero que se ve en tu ficha" },
    { ok: form.bio.trim().length >= 80, label: "Presentación (80 letras o más)", hint: "Contá quién sos y cómo son tus clases" },
    { ok: !!form.price.trim(), label: "Precio", hint: "Ej. $8.000/clase" },
    { ok: form.availableDays.length > 0, label: "Días disponibles", hint: "Para que te pidan clases en tus días" },
    { ok: !!(form.email.trim() || form.phone.trim()), label: "Contacto (mail o WhatsApp)", hint: "Para que los alumnos te escriban" },
    ...(isInstitute ? [
      { ok: !!form.address.trim(), label: "Dirección del estudio", hint: "Para ubicarte en el mapa" },
      { ok: form.schedule.trim().length > 0, label: "Grilla de clases", hint: "Se muestra en tu ficha y la usa el asistente de IA" },
    ] : []),
  ];
  const done = items.filter((i) => i.ok).length;
  const pct = Math.round((done / items.length) * 100);

  const saveSlug = async () => {
    setBusy(true); setMsg(null);
    const res = await apiFetch("/api/teacher/slug", { method: "PUT", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ slug: edit }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { onSlug(data.slug); setEdit(data.slug); setMsg({ ok: true, text: "¡Listo! Tu nueva dirección ya funciona." }); }
    else setMsg({ ok: false, text: data.error || "No se pudo guardar la dirección" });
  };
  const copy = () => navigator.clipboard?.writeText(`${origin}${path}`).then(() => setMsg({ ok: true, text: "Enlace copiado" })).catch(() => {});

  return (
    <section className="bg-white border border-lino-oscuro rounded-3xl p-6 sm:p-8 shadow-sm mb-8" aria-label="Tu página en Omia">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-semibold text-bosque">Tu página en Omia</h2>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm ${status === "activo" ? "bg-green-100 text-green-800" : "bg-[#FFF6DA] text-[#6B4A06]"}`}>
              {status === "activo" ? "Publicada" : "Todavía no publicada"}
            </span>
          </div>
          <p className="text-sm text-musgo mb-5">{status === "activo" ? "Tu página ya la pueden ver los alumnos." : "Se publica en el directorio cuando activás tu plan. Mientras tanto la ves solo vos."}</p>

          <label className="block text-xs font-semibold text-musgo mb-2">Tu dirección propia</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center flex-1 min-w-0 bg-lino border border-lino-oscuro rounded-xl overflow-hidden focus-within:border-salvia">
              <span className="pl-4 pr-1 text-sm text-musgo whitespace-nowrap hidden sm:block">{origin.replace(/^https?:\/\//, "")}/profesor/</span>
              <input value={edit} onChange={(e) => setEdit(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="tu-nombre" className="flex-1 min-w-0 bg-transparent px-3 sm:px-0 py-3 text-sm text-bosque font-medium outline-none" aria-label="Dirección de tu página" />
            </div>
            <button type="button" onClick={saveSlug} disabled={busy || !edit || edit === slug} className="px-5 py-3 rounded-xl bg-bosque text-lino text-sm font-semibold disabled:opacity-50 cursor-pointer">Guardar</button>
          </div>
          {msg && <p className={`text-xs mt-2 ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}

          <div className="flex flex-wrap gap-3 mt-5">
            <Link to={path} target="_blank" className="inline-flex items-center gap-2 px-5 py-2.5 bg-bosque hover:bg-bosque-profundo text-lino text-sm font-medium rounded-full"><ExternalLink className="w-4 h-4" />Ver cómo queda mi página</Link>
            <button type="button" onClick={copy} className="inline-flex items-center gap-2 px-5 py-2.5 border border-lino-oscuro hover:border-bosque text-bosque text-sm font-medium rounded-full cursor-pointer"><Copy className="w-4 h-4" />Copiar enlace</button>
          </div>

          <div className="mt-6 flex gap-3 bg-lino rounded-2xl p-4 text-sm text-musgo">
            <Palette className="w-5 h-5 text-salvia-oscuro shrink-0 mt-0.5" />
            <p><strong className="text-bosque">El diseño lo pone Omia.</strong> Vos cargás tus textos, fotos, precio y horarios; los colores, las tipografías y el orden de tu página son los del sitio, así todas las fichas se ven igual de cuidadas.</p>
          </div>
        </div>

        <div className="lg:w-80 shrink-0">
          <div className="flex justify-between items-baseline mb-2"><h3 className="text-sm font-semibold text-bosque">Tu página está al {pct} %</h3><span className="text-xs text-musgo">{done}/{items.length}</span></div>
          <div className="h-2 bg-lino-oscuro rounded-full overflow-hidden mb-4"><div className="h-full bg-salvia-oscuro rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
          <ul className="space-y-2.5">
            {items.map((i) => (
              <li key={i.label} className="flex gap-2.5 items-start text-sm">
                {i.ok ? <CheckCircle2 className="w-4 h-4 text-salvia-oscuro shrink-0 mt-0.5" /> : <Circle className="w-4 h-4 text-lino-oscuro shrink-0 mt-0.5" />}
                <span><span className={i.ok ? "text-musgo" : "text-bosque font-medium"}>{i.label}</span>{!i.ok && <span className="block text-xs text-musgo">{i.hint}</span>}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
