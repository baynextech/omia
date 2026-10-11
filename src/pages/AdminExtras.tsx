import { useEffect, useState } from "react";
import { Plus, Trash2, Check, X, Edit2 } from "lucide-react";
import { apiFetch } from "../lib/api";

// Secciones del panel de administración para noticias, pedidos, suscripciones y mensajes.
const call = (token: string, method: string, url: string, body?: unknown) =>
  apiFetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json());

const card = "bg-white rounded-2xl border border-[#E5E5E5] shadow-sm";
const inputCls = "w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#88976C] bg-white";
const thCls = "px-5 py-3.5 text-left text-[10px] font-semibold text-[#98A77C] uppercase tracking-wider";
const tdCls = "px-5 py-3 text-sm text-[#2C2C2C] align-top";
const primary = "inline-flex items-center gap-2 bg-[#88976C] hover:bg-[#728156] text-white px-5 py-2.5 rounded-sm text-sm font-medium transition-colors";
const secondary = "inline-flex items-center gap-2 bg-white border border-[#9DB085] text-[#2C2C2C] px-4 py-2 rounded-sm text-sm font-medium";
const fmt = (d: string) => new Date(d).toLocaleDateString("es-AR");
const ars = (n: number) => `$${Number(n || 0).toLocaleString("es-AR")}`;

const useList = (token: string, url: string) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = () => call(token, "GET", url).then((d) => setRows(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  useEffect(() => { reload(); }, [url]);
  return { rows, setRows, loading, reload };
};

const Empty = ({ loading, text }: { loading: boolean; text: string }) => (
  <p className="p-8 text-center text-sm text-[#5D5D5D]">{loading ? "Cargando…" : text}</p>
);

// ─── Suscripciones ───────────────────────────────────────────────────────────
export function AdminSubscriptions({ token }: { token: string }) {
  const { rows, loading } = useList(token, "/api/admin/subscriptions");
  const active = rows.filter((r) => r.status === "activa");
  const mrr = active.reduce((sum, r) => sum + Number(r.amount), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[["Activas", active.length], ["Ingreso mensual recurrente", ars(mrr)], ["Pendientes", rows.filter((r) => r.status === "pendiente").length], ["Bajas / vencidas", rows.filter((r) => ["cancelada", "vencida"].includes(r.status)).length]].map(([l, v]) => (
          <div key={l as string} className={`${card} p-5`}><p className="text-[10px] uppercase tracking-widest text-[#98A77C] font-semibold">{l}</p><p className="text-2xl font-light mt-1">{v}</p></div>
        ))}
      </div>
      <div className={`${card} overflow-x-auto`}>
        {rows.length === 0 ? <Empty loading={loading} text="Todavía no hay suscripciones." /> : (
          <table className="w-full"><thead><tr>{["Usuario", "Plan", "Importe", "Estado", "Próximo cobro", "Alta"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-[#E5E5E5]">
                <td className={tdCls}>{r.user_name}<br /><span className="text-xs text-[#5D5D5D]">{r.email}</span></td>
                <td className={tdCls}>{r.plan}</td><td className={tdCls}>{ars(r.amount)}</td>
                <td className={tdCls}>{r.status}</td>
                <td className={tdCls}>{r.next_payment_at ? fmt(r.next_payment_at) : "—"}</td>
                <td className={tdCls}>{fmt(r.created_at)}</td>
              </tr>))}</tbody></table>
        )}
      </div>
    </div>
  );
}

// ─── Pedidos de la tienda ────────────────────────────────────────────────────
export function AdminOrders({ token }: { token: string }) {
  const { rows, setRows, loading } = useList(token, "/api/admin/orders");
  const update = async (id: string, fulfillment: string) => {
    const tracking = fulfillment === "despachado" ? window.prompt("Código de seguimiento (opcional):") || undefined : undefined;
    const res = await call(token, "PUT", `/api/admin/orders/${id}`, { fulfillment, tracking });
    if (res.id) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...res } : r)));
  };
  return (
    <div className={`${card} overflow-x-auto`}>
      {rows.length === 0 ? <Empty loading={loading} text="Todavía no hay pedidos pagos." /> : (
        <table className="w-full"><thead><tr>{["Fecha", "Cliente", "Detalle", "Entrega", "Total", "Estado"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-[#E5E5E5]">
              <td className={tdCls}>{fmt(r.created_at)}</td>
              <td className={tdCls}>{r.shipping?.name}<br /><span className="text-xs text-[#5D5D5D]">{r.shipping?.phone} · {r.email}</span></td>
              <td className={tdCls}>{(r.items || []).map((i: any) => <div key={i.id}>{i.quantity} × {i.name}</div>)}</td>
              <td className={tdCls}>{r.shipping?.method === "retiro" ? "Retiro" : `${r.shipping?.address}, ${r.shipping?.city} (${r.shipping?.zip})`}{r.tracking && <><br /><span className="text-xs">Seguimiento: {r.tracking}</span></>}</td>
              <td className={tdCls}>{ars(r.amount)}</td>
              <td className={tdCls}>
                <select value={r.fulfillment} onChange={(e) => update(r.id, e.target.value)} className="border border-[#E8E0D0] rounded-lg px-2 py-1 text-xs">
                  {["pendiente", "preparando", "despachado", "entregado", "cancelado"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>))}</tbody></table>
      )}
    </div>
  );
}

// ─── Mensajes (consultas, arrepentimiento y bajas) ───────────────────────────
export function AdminMessages({ token }: { token: string }) {
  const { rows, setRows, loading } = useList(token, "/api/admin/messages");
  const toggle = async (id: string, handled: boolean) => {
    await call(token, "PUT", `/api/admin/messages/${id}`, { handled });
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, handled } : r)));
  };
  return (
    <div className={card}>
      {rows.length === 0 ? <Empty loading={loading} text="No hay mensajes." /> : rows.map((r) => (
        <div key={r.id} className={`p-5 border-b border-[#E5E5E5] last:border-0 ${r.handled ? "opacity-50" : ""}`}>
          <div className="flex justify-between gap-4">
            <div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm ${r.kind === "consulta" ? "bg-blue-100 text-blue-700" : r.kind === "baja" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{r.kind}</span>
              <span className="ml-3 text-sm font-medium">{r.name || "—"}</span> <span className="text-xs text-[#5D5D5D]">{r.email} · {fmt(r.created_at)}</span>
              {r.reference && <p className="text-xs text-[#5D5D5D] mt-1">Referencia: {r.reference}</p>}
              <p className="text-sm mt-2 whitespace-pre-wrap">{r.message}</p>
            </div>
            <button onClick={() => toggle(r.id, !r.handled)} className={secondary}>{r.handled ? "Reabrir" : "Marcar resuelto"}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Noticias ────────────────────────────────────────────────────────────────
const emptyArticle = { title: "", excerpt: "", body: "", image: "", category: "General", status: "borrador" };

export function AdminNews({ token }: { token: string }) {
  const { rows, reload, loading } = useList(token, "/api/admin/articles");
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setEditing((e: any) => ({ ...e, [k]: v }));

  const save = async () => {
    setSaving(true);
    const res = editing.id ? await call(token, "PUT", `/api/admin/articles/${editing.id}`, editing) : await call(token, "POST", "/api/admin/articles", editing);
    setSaving(false);
    if (res.error) return alert(res.error);
    setEditing(null);
    reload();
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    await call(token, "DELETE", `/api/admin/articles/${id}`);
    reload();
  };

  if (editing) {
    return (
      <div className={`${card} p-6 space-y-4 max-w-3xl`}>
        <input className={inputCls} placeholder="Título" value={editing.title} onChange={(e) => set("title", e.target.value)} />
        <input className={inputCls} placeholder="Bajada / resumen (aparece en Google y en las redes)" value={editing.excerpt || ""} onChange={(e) => set("excerpt", e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <input className={inputCls} placeholder="Categoría" value={editing.category || ""} onChange={(e) => set("category", e.target.value)} />
          <input className={inputCls} placeholder="URL de la imagen" value={editing.image || ""} onChange={(e) => set("image", e.target.value)} />
        </div>
        <textarea className={`${inputCls} min-h-[320px] font-mono`} placeholder="Contenido (admite Markdown: ## títulos, **negrita**, listas con -)" value={editing.body} onChange={(e) => set("body", e.target.value)} />
        <div className="flex items-center gap-3">
          <select className="border border-[#E8E0D0] rounded-xl px-3 py-2 text-sm" value={editing.status} onChange={(e) => set("status", e.target.value)}>
            <option value="borrador">Borrador</option><option value="publicado">Publicada</option>
          </select>
          <button onClick={save} disabled={saving || !editing.title || !editing.body} className={primary}><Check size={16} />{saving ? "Guardando…" : "Guardar"}</button>
          <button onClick={() => setEditing(null)} className={secondary}><X size={16} />Cancelar</button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <button onClick={() => setEditing({ ...emptyArticle })} className={primary}><Plus size={16} />Nueva nota</button>
      <div className={`${card} overflow-x-auto`}>
        {rows.length === 0 ? <Empty loading={loading} text="Todavía no escribiste notas." /> : (
          <table className="w-full"><thead><tr>{["Título", "Categoría", "Estado", "Fecha", ""].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-[#E5E5E5]">
                <td className={tdCls}>{r.title}<br /><span className="text-xs text-[#5D5D5D]">/noticias/{r.slug}</span></td>
                <td className={tdCls}>{r.category}</td><td className={tdCls}>{r.status}</td>
                <td className={tdCls}>{fmt(r.published_at || r.created_at)}</td>
                <td className={`${tdCls} text-right whitespace-nowrap`}>
                  <button onClick={() => setEditing(r)} className="p-2 text-[#5D5D5D] hover:text-[#88976C]"><Edit2 size={15} /></button>
                  <button onClick={() => remove(r.id)} className="p-2 text-[#5D5D5D] hover:text-red-600"><Trash2 size={15} /></button>
                </td>
              </tr>))}</tbody></table>
        )}
      </div>
    </div>
  );
}
