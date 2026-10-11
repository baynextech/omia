import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ExternalLink, Image as ImageIcon, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useContent, mediaUrl } from "../contexts/ContentContext";
import { DEFAULTS, Field, GROUPS, Pair, Value } from "../lib/content";

// Editor de todo el contenido del sitio (Admin → Sitio). Cada campo muestra el valor vigente y permite
// restaurar el texto original. Lo guardado se ve en el sitio al instante.

const inputCls = "w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white";
const same = (a: Value | undefined, b: Value | undefined) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");

// Reduce la foto antes de subirla: el sitio carga más rápido y se evitan archivos enormes.
async function shrinkImage(file: File, maxSide = 1800): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(file.type === "image/png" && file.size < 800_000 ? "image/png" : "image/jpeg", 0.85);
}

function ImageField({ value, onChange, token }: { value: string; onChange: (v: string) => void; token: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const dataUrl = await shrinkImage(file);
      const res = await apiFetch("/api/admin/media", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl, name: file.name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen");
      onChange(data.url);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-3 items-start">
        {value ? <img src={mediaUrl(value)} alt="" className="w-28 h-20 object-cover rounded-lg border border-[#E8E0D0]" /> : <div className="w-28 h-20 rounded-lg border border-dashed border-[#E8E0D0] flex items-center justify-center text-[#98A77C]"><ImageIcon size={20} /></div>}
        <div className="flex-1 space-y-2">
          <input className={inputCls} placeholder="Dirección (URL) de la imagen" value={value} onChange={(e) => onChange(e.target.value)} />
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex items-center gap-2 text-sm text-[#5f7348] border border-[#9DB085] rounded-lg px-3 py-1.5 hover:bg-[#98A77C]/10 disabled:opacity-50"><Upload size={14} />{busy ? "Subiendo…" : "Subir desde mi computadora"}</button>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FieldEditor({ field, value, onChange, token }: { field: Field; value: Value; onChange: (v: Value) => void; token: string }) {
  if (field.type === "textarea" || field.type === "markdown") {
    return <textarea className={`${inputCls} ${field.type === "markdown" ? "min-h-[260px] font-mono" : "min-h-[84px]"}`} value={value as string} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === "rich") return <textarea className={`${inputCls} min-h-[64px]`} value={value as string} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "list") {
    return <textarea className={`${inputCls} min-h-[120px]`} value={(value as string[]).join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} />;
  }
  if (field.type === "image") return <ImageField value={value as string} onChange={onChange} token={token} />;
  if (field.type === "pairs") {
    const pairs = value as Pair[];
    const set = (i: number, patch: Partial<Pair>) => onChange(pairs.map((p, j) => (j === i ? { ...p, ...patch } : p)));
    return (
      <div className="space-y-3">
        {pairs.map((p, i) => (
          <div key={i} className="border border-[#E8E0D0] rounded-xl p-3 space-y-2 bg-[#faf8f2]">
            <div className="flex gap-2">
              <input className={inputCls} placeholder={field.pairLabels?.[0]} value={p.a} onChange={(e) => set(i, { a: e.target.value })} />
              <button type="button" onClick={() => onChange(pairs.filter((_, j) => j !== i))} className="p-2 text-[#5D5D5D] hover:text-red-600" title="Quitar"><Trash2 size={16} /></button>
            </div>
            <textarea className={`${inputCls} min-h-[64px]`} placeholder={field.pairLabels?.[1]} value={p.b} onChange={(e) => set(i, { b: e.target.value })} />
          </div>
        ))}
        <button type="button" onClick={() => onChange([...pairs, { a: "", b: "" }])} className="inline-flex items-center gap-1.5 text-sm text-[#5f7348] hover:underline"><Plus size={14} />Agregar</button>
      </div>
    );
  }
  return <input className={inputCls} value={value as string} onChange={(e) => onChange(e.target.value)} />;
}

export function AdminContent({ token }: { token: string }) {
  const { overrides, reload } = useContent();
  const [groupId, setGroupId] = useState(GROUPS[0].id);
  const [draft, setDraft] = useState<Record<string, Value>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const group = GROUPS.find((g) => g.id === groupId)!;
  const current = (f: Field): Value => (f.key in draft ? draft[f.key] : (overrides[f.key] ?? f.def));
  const dirty = useMemo(() => group.fields.filter((f) => f.key in draft && !same(draft[f.key], overrides[f.key] ?? f.def)), [draft, group, overrides]);

  useEffect(() => { setSaved(false); setError(""); }, [groupId]);

  const set = (f: Field, v: Value) => { setDraft((d) => ({ ...d, [f.key]: v })); setSaved(false); };

  const save = async () => {
    setSaving(true); setError("");
    // Lo que queda igual al texto original no se guarda: así los cambios futuros del código se siguen viendo.
    const values: Record<string, Value | null> = {};
    for (const f of dirty) {
      let v = draft[f.key];
      if (f.type === "list") v = (v as string[]).map((x) => x.trim()).filter(Boolean);
      if (f.type === "pairs") v = (v as Pair[]).filter((p) => p.a.trim() || p.b.trim());
      values[f.key] = same(v, f.def) ? null : v;
    }
    try {
      const res = await apiFetch("/api/admin/content", { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      await reload();
      setDraft((d) => { const n = { ...d }; for (const f of dirty) delete n[f.key]; return n; });
      setSaved(true);
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  const restore = async (f: Field) => {
    if (!confirm("¿Volver al texto original de este campo?")) return;
    const res = await apiFetch("/api/admin/content", { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values: { [f.key]: null } }) });
    if (res.ok) { await reload(); setDraft((d) => { const n = { ...d }; delete n[f.key]; return n; }); }
  };

  const changedCount = (id: string) => GROUPS.find((g) => g.id === id)!.fields.filter((f) => f.key in overrides).length;

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
      <nav className="bg-white border border-[#E5E5E5] rounded-2xl p-2 h-fit lg:sticky lg:top-4">
        {GROUPS.map((g) => (
          <button key={g.id} onClick={() => setGroupId(g.id)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm flex items-center justify-between ${g.id === groupId ? "bg-[#88976C] text-white" : "text-[#2C2C2C] hover:bg-[#f4f7f1]"}`}>
            <span>{g.title}</span>
            {changedCount(g.id) > 0 && <span className={`text-[10px] px-1.5 rounded-full ${g.id === groupId ? "bg-white/25" : "bg-[#98A77C]/20 text-[#5f7348]"}`}>{changedCount(g.id)}</span>}
          </button>
        ))}
      </nav>

      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="max-w-xl">
            <h2 className="text-xl font-medium text-[#2C2C2C]">{group.title}</h2>
            <p className="text-sm text-[#5D5D5D] mt-1">{group.description}</p>
          </div>
          <a href={group.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#5f7348] hover:underline"><ExternalLink size={14} />Ver en el sitio</a>
        </div>

        <div className="space-y-6">
          {group.fields.map((f) => {
            const edited = f.key in overrides;
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <label className="text-sm font-medium text-[#2C2C2C]">{f.label}</label>
                  {edited && <button type="button" onClick={() => restore(f)} className="inline-flex items-center gap-1 text-xs text-[#5D5D5D] hover:text-[#5f7348]"><RotateCcw size={12} />Restaurar original</button>}
                </div>
                <FieldEditor field={f} value={current(f)} onChange={(v) => set(f, v)} token={token} />
                {f.help && <p className="text-xs text-[#5D5D5D] mt-1.5">{f.help}</p>}
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 -mx-6 md:-mx-8 -mb-6 md:-mb-8 mt-8 px-6 md:px-8 py-4 bg-white/95 backdrop-blur border-t border-[#E5E5E5] rounded-b-2xl flex items-center gap-4">
          <button onClick={save} disabled={saving || dirty.length === 0} className="inline-flex items-center gap-2 bg-[#88976C] hover:bg-[#728156] disabled:opacity-40 text-white px-6 py-2.5 rounded-sm text-sm font-medium"><Check size={16} />{saving ? "Guardando…" : dirty.length ? `Guardar ${dirty.length} cambio${dirty.length > 1 ? "s" : ""}` : "Sin cambios"}</button>
          {saved && <span className="text-sm text-green-700">¡Guardado! Ya se ve en el sitio.</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </div>
  );
}
