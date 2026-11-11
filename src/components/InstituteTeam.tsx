import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Users, Lock, Pencil, X } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Photo } from "./Photo";
import { profileUrl } from "../lib/links";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const empty = { name: "", specialty: "", discipline: "Yoga", price: "", bio: "", image: "", availableDays: [] as string[] };

// Plan Institutos: «Múltiples profes asociados». El instituto arma su equipo y cada profe tiene su propia ficha.
export function InstituteTeam({ authHeaders, onUpgrade }: { authHeaders: () => Record<string, string>; onUpgrade: () => void }) {
  const [state, setState] = useState<{ allowed: boolean; max: number; staff: any[] } | null>(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => apiFetch("/api/institute/staff", { headers: authHeaders() }).then((r) => r.json()).then(setState).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await apiFetch(editing ? `/api/institute/staff/${editing}` : "/api/institute/staff", {
      method: editing ? "PUT" : "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "No se pudo guardar"); return; }
    setForm(empty); setEditing(null); load();
  };
  const remove = async (id: string) => {
    if (!confirm("¿Quitar a este profe del equipo?")) return;
    await apiFetch(`/api/institute/staff/${id}`, { method: "DELETE", headers: authHeaders() });
    load();
  };
  const edit = (p: any) => {
    setEditing(p.id);
    setForm({ name: p.name || "", specialty: p.specialty || "", discipline: p.discipline || "Yoga", price: p.price || "", bio: p.bio || "", image: p.image || "", availableDays: p.availableDays || [] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!state) return <div className="w-8 h-8 border-4 border-salvia/30 border-t-salvia rounded-sm animate-spin" />;
  const input = "w-full bg-lino border border-lino-oscuro rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-salvia";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <h1 className="text-3xl font-light tracking-tight text-bosque mb-2">Equipo de profes</h1>
      <p className="text-musgo mb-8">Sumá a los profes que dan clases en tu estudio. Aparecen en tu ficha como «Nuestro equipo» y se pueden encontrar en el directorio. Hasta {state.max} profes con el Plan Institutos.</p>

      {!state.allowed && (
        <div className="bg-[#FFF9E8] border border-[#E4C56A] rounded-3xl p-8 mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-3 items-start"><Lock className="w-6 h-6 text-[#8A6410] shrink-0 mt-0.5" />
            <div><p className="font-semibold text-bosque">Los profes asociados son parte del Plan Institutos</p><p className="text-sm text-musgo mt-1">Activá el plan para armar tu equipo.</p></div></div>
          <button onClick={onUpgrade} className="bg-bosque text-lino px-6 py-3 rounded-full text-sm font-semibold cursor-pointer">Ver el Plan Institutos</button>
        </div>
      )}

      {state.allowed && (
        <form onSubmit={save} className="bg-white border border-lino-oscuro rounded-3xl p-6 sm:p-8 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="md:col-span-2 text-lg font-semibold text-bosque flex items-center gap-2">{editing ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}{editing ? "Editar profe" : "Agregar un profe"}</h2>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre y apellido" className={input} />
          <input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Especialidad (ej. Pilates Reformer)" className={input} />
          <select value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} className={input}>
            <option>Yoga</option><option>Pilates</option><option>Yoga &amp; Pilates</option>
          </select>
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Precio (ej. $9.000/clase)" className={input} />
          <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Foto (enlace, opcional)" className={`${input} md:col-span-2`} />
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Breve presentación" rows={3} className={`${input} md:col-span-2`} />
          <div className="md:col-span-2 flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button type="button" key={d} onClick={() => setForm({ ...form, availableDays: form.availableDays.includes(d) ? form.availableDays.filter((x) => x !== d) : [...form.availableDays, d] })}
                className={`px-3 py-1.5 rounded-lg text-sm border cursor-pointer ${form.availableDays.includes(d) ? "bg-bosque text-lino border-bosque" : "bg-lino text-musgo border-lino-oscuro"}`}>{d}</button>
            ))}
          </div>
          {error && <p className="md:col-span-2 text-sm text-red-700">{error}</p>}
          <div className="md:col-span-2 flex gap-3">
            <button disabled={busy} className="bg-bosque text-lino px-6 py-3 rounded-full text-sm font-semibold disabled:opacity-60 cursor-pointer">{busy ? "Guardando…" : editing ? "Guardar cambios" : "Agregar al equipo"}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm(empty); }} className="px-5 py-3 rounded-full text-sm border border-lino-oscuro text-musgo cursor-pointer flex items-center gap-1"><X className="w-4 h-4" />Cancelar</button>}
          </div>
        </form>
      )}

      <h2 className="text-sm font-bold uppercase tracking-wider text-musgo mb-3 flex items-center gap-2"><Users className="w-4 h-4" />Tu equipo ({state.staff.length}/{state.max})</h2>
      {state.staff.length === 0 ? <p className="text-musgo">Todavía no sumaste a nadie.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {state.staff.map((p) => (
            <div key={p.id} className="bg-white border border-lino-oscuro rounded-2xl p-4 flex items-center gap-4">
              <Photo src={p.image} name={p.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-bosque truncate">{p.name}</p>
                <p className="text-xs text-musgo truncate">{[p.discipline, p.specialty].filter(Boolean).join(" · ")}{p.price ? ` · ${p.price}` : ""}</p>
                <Link to={profileUrl(p)} className="text-xs text-salvia-oscuro font-semibold hover:underline">Ver ficha</Link>
              </div>
              {p.user_id === null && state.allowed && (<>
                <button onClick={() => edit(p)} aria-label="Editar" className="p-2 text-musgo hover:text-bosque cursor-pointer"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(p.id)} aria-label="Quitar" className="p-2 text-musgo hover:text-red-700 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
