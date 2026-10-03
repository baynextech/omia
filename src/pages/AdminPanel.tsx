import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import {
  Users, BookOpen, DollarSign, Package, Settings,
  Edit2, Trash2, Plus, Save, X, Check, Calendar,
  Star, LayoutDashboard, ArrowUpRight, Eye, EyeOff, RefreshCw, Search,
  TrendingUp, ChevronRight
} from "lucide-react";

// ─── API helper ─────────────────────────────────────────────────────────────
const API = (token: string) => ({
  get: (url: string) => apiFetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  post: (url: string, body: any) => apiFetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
  put: (url: string, body: any) => apiFetch(url, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
  del: (url: string) => apiFetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
});

type Tab = "dashboard" | "teachers" | "products" | "users" | "bookings" | "reviews" | "transactions" | "config";

// ─── Design tokens ────────────────────────────────────────────────────────────
const btn = {
  primary: "inline-flex items-center gap-2 bg-[#88976C] hover:bg-[#728156] text-white px-5 py-2.5 rounded-sm text-sm font-medium transition-colors",
  secondary: "inline-flex items-center gap-2 bg-white border border-[#9DB085] hover:border-[#88976C] text-[#2C2C2C] px-5 py-2.5 rounded-sm text-sm font-medium transition-colors",
  danger: "inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors",
  ghost: "inline-flex items-center gap-1.5 text-[#88976C] hover:text-[#728156] text-sm font-medium transition-colors",
  icon: "p-2 rounded-sm hover:bg-[#88976C]/10 text-[#5D5D5D] hover:text-[#88976C] transition-colors",
};

const card = "bg-white rounded-2xl border border-[#E5E5E5] shadow-sm";
const inputCls = "w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white placeholder:text-[#5D5D5D]/50";
const badge = {
  green: "px-2.5 py-0.5 rounded-sm text-xs font-medium bg-[#E8E0D0] text-[#4a6340]",
  gray: "px-2.5 py-0.5 rounded-sm text-xs font-medium bg-[#E5E5E5] text-[#5D5D5D]",
  red: "px-2.5 py-0.5 rounded-sm text-xs font-medium bg-red-100 text-red-700",
  blue: "px-2.5 py-0.5 rounded-sm text-xs font-medium bg-blue-100 text-blue-700",
  purple: "px-2.5 py-0.5 rounded-sm text-xs font-medium bg-purple-100 text-purple-700",
  yellow: "px-2.5 py-0.5 rounded-sm text-xs font-medium bg-amber-100 text-amber-700",
};

const thCls = "px-5 py-3.5 text-left text-[10px] font-semibold text-[#98A77C] uppercase tracking-wider";
const trCls = "border-b border-[#E5E5E5] last:border-0 hover:bg-[#f4f7f1] transition-colors";

// ─── Componente principal ─────────────────────────────────────────────────────
export function AdminPanel() {
  const { isAdmin, token, profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [config, setConfig] = useState<any[]>([]);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [newProduct, setNewProduct] = useState(false);
  const [newTeacher, setNewTeacher] = useState(false);
  const [loaded, setLoaded] = useState<Set<Tab>>(new Set());

  // Search states
  const [searchTeachers, setSearchTeachers] = useState("");
  const [searchProducts, setSearchProducts] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const [searchBookings, setSearchBookings] = useState("");
  const [searchTransactions, setSearchTransactions] = useState("");

  useEffect(() => {
    if (!isAdmin) { navigate("/perfil"); return; }
    loadTab("dashboard");
  }, [isAdmin]);

  useEffect(() => { if (!loaded.has(tab)) loadTab(tab); }, [tab]);

  const api = API(token!);

  const loadTab = async (t: Tab) => {
    setLoaded(s => new Set(s).add(t));
    if (t === "dashboard") setDashboard(await api.get("/api/admin/dashboard"));
    if (t === "teachers") setTeachers(await api.get("/api/admin/teachers"));
    if (t === "products") setProducts(await api.get("/api/admin/products"));
    if (t === "users") setUsers(await api.get("/api/admin/users"));
    if (t === "bookings") setBookings(await api.get("/api/admin/bookings"));
    if (t === "reviews") setReviews(await api.get("/api/admin/reviews"));
    if (t === "transactions") setTransactions(await api.get("/api/admin/transactions"));
    if (t === "config") {
      const data = await api.get("/api/admin/config");
      setConfig(data);
      setConfigValues(Object.fromEntries(data.map((c: any) => [c.key, c.value])));
    }
  };

  const reload = (t: Tab) => { setLoaded(s => { const n = new Set(s); n.delete(t); return n; }); loadTab(t); };

  // ── Handlers ──
  const saveConfig = async (key: string) => {
    await api.put("/api/admin/config", { key, value: configValues[key] });
    setConfig(c => c.map(item => item.key === key ? { ...item, value: configValues[key] } : item));
    setEditingConfig(null);
  };

  const toggleTeacherStatus = async (id: string, status: string) => {
    const newStatus = status === "activo" ? "inactivo" : "activo";
    await api.put(`/api/admin/teachers/${id}`, { status: newStatus });
    setTeachers(ts => ts.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const deleteTeacher = async (id: string) => {
    if (!confirm("¿Eliminar este profesor? Esta acción es irreversible.")) return;
    await api.del(`/api/admin/teachers/${id}`);
    setTeachers(ts => ts.filter(t => t.id !== id));
  };

  const saveTeacher = async (teacher: any) => {
    if (teacher.id) {
      const updated = await api.put(`/api/admin/teachers/${teacher.id}`, teacher);
      setTeachers(ts => ts.map(t => t.id === teacher.id ? updated : t));
    } else {
      const created = await api.post("/api/admin/teachers", teacher);
      setTeachers(ts => [created, ...ts]);
    }
    setEditingTeacher(null);
    setNewTeacher(false);
  };

  const saveProduct = async (product: any) => {
    if (product.id) {
      const updated = await api.put(`/api/admin/products/${product.id}`, product);
      setProducts(ps => ps.map(p => p.id === product.id ? updated : p));
    } else {
      const created = await api.post("/api/admin/products", product);
      setProducts(ps => [...ps, created]);
    }
    setEditingProduct(null);
    setNewProduct(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("¿Desactivar este producto?")) return;
    await api.del(`/api/admin/products/${id}`);
    setProducts(ps => ps.map(p => p.id === id ? { ...p, active: false } : p));
  };

  const changeUserRole = async (id: string, role: string) => {
    await api.put(`/api/admin/users/${id}/role`, { role });
    setUsers(us => us.map(u => u.id === id ? { ...u, role } : u));
  };

  const updateBookingStatus = async (id: string, status: string) => {
    await api.put(`/api/admin/bookings/${id}`, { status });
    setBookings(bs => bs.map(b => b.id === id ? { ...b, status } : b));
  };

  const deleteBooking = async (id: string) => {
    if (!confirm("¿Eliminar esta reserva?")) return;
    await api.del(`/api/admin/bookings/${id}`);
    setBookings(bs => bs.filter(b => b.id !== id));
  };

  const deleteReview = async (id: string) => {
    if (!confirm("¿Eliminar esta reseña?")) return;
    await api.del(`/api/admin/reviews/${id}`);
    setReviews(rs => rs.filter(r => r.id !== id));
  };

  if (!isAdmin) return null;

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "teachers", label: "Profesores", icon: BookOpen, count: teachers.length || undefined },
    { id: "products", label: "Productos", icon: Package, count: products.length || undefined },
    { id: "users", label: "Usuarios", icon: Users, count: users.length || undefined },
    { id: "bookings", label: "Reservas", icon: Calendar, count: bookings.length || undefined },
    { id: "reviews", label: "Reseñas", icon: Star, count: reviews.length || undefined },
    { id: "transactions", label: "Transacciones", icon: DollarSign },
    { id: "config", label: "Configuración", icon: Settings },
  ];

  const initials = (name?: string, email?: string) =>
    ((name || email || "A")[0] || "A").toUpperCase();

  // Filtered lists
  const filteredTeachers = teachers.filter(t =>
    !searchTeachers || `${t.name} ${t.email}`.toLowerCase().includes(searchTeachers.toLowerCase())
  );
  const filteredProducts = products.filter(p =>
    !searchProducts || `${p.name} ${p.category}`.toLowerCase().includes(searchProducts.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    !searchUsers || `${u.name} ${u.email}`.toLowerCase().includes(searchUsers.toLowerCase())
  );
  const filteredBookings = bookings.filter(b =>
    !searchBookings || `${b.profiles?.name} ${b.profiles?.email} ${b.teachers?.name}`.toLowerCase().includes(searchBookings.toLowerCase())
  );
  const filteredTransactions = transactions.filter(t =>
    !searchTransactions || `${t.user_name} ${t.description}`.toLowerCase().includes(searchTransactions.toLowerCase())
  );

  const tabTitles: Record<Tab, string> = {
    dashboard: "Dashboard",
    teachers: "Profesores",
    products: "Productos",
    users: "Usuarios",
    bookings: "Reservas",
    reviews: "Reseñas",
    transactions: "Transacciones",
    config: "Configuración",
  };

  return (
    <div className="min-h-screen bg-[#f4f7f1]">

      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-[#E5E5E5] flex flex-col z-30 overflow-y-auto">

        {/* Logo */}
        <div className="px-6 pt-7 pb-5 border-b border-[#E5E5E5]">
          <p className="text-[#2C2C2C] text-2xl font-serif italic leading-none">Omia</p>
          <p className="text-[#98A77C] text-[11px] mt-1 font-light tracking-wide">Admin Panel</p>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-[#1a2a1a] flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {initials(profile?.name, profile?.email)}
            </div>
            <div className="min-w-0">
              <p className="text-[#2C2C2C] text-sm font-medium truncate">{profile?.name || "Admin"}</p>
              <p className="text-[#98A77C] text-[11px]">Administrador</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2">
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-all my-0.5 ${
                  active
                    ? "bg-[#1a2a1a] text-white rounded-lg border-none mx-1"
                    : "text-[#5D5D5D] hover:bg-[#f4f7f1] hover:text-[#2C2C2C] rounded-lg"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <t.icon size={15} />
                  {t.label}
                </span>
                {t.count != null && (
                  <span className="bg-[#98A77C]/15 text-[#728156] text-[10px] rounded-sm px-1.5 py-0.5 font-semibold leading-none">
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom link */}
        <div className="px-6 py-5 border-t border-[#E5E5E5]">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-[#5D5D5D] hover:text-[#98A77C] text-sm transition-colors"
          >
            Ver sitio <ArrowUpRight size={13} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="ml-60">

        {/* Top bar */}
        <div className="bg-white border-b border-[#E5E5E5] px-8 py-4 sticky top-0 z-20 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-light text-[#2C2C2C] tracking-tight">{tabTitles[tab]}</h1>
          </div>
          <div className="flex items-center gap-2">
            {tab === "teachers" && (
              <button
                onClick={() => { setNewTeacher(true); setEditingTeacher({ name: "", email: "", discipline: "", location: "", bio: "", price: "", plan: "ninguno", status: "activo", specialty: "", available_days: "", phone: "" }); }}
                className={btn.primary}
              >
                <Plus size={14} /> Nuevo profesor
              </button>
            )}
            {tab === "products" && (
              <button
                onClick={() => { setNewProduct(true); setEditingProduct({ name: "", description: "", price: "", category: "accesorios", stock: 999, active: true, images: [], features: [] }); }}
                className={btn.primary}
              >
                <Plus size={14} /> Nuevo producto
              </button>
            )}
            <button
              onClick={() => reload(tab)}
              className="p-2 rounded-sm hover:bg-[#f4f7f1] text-[#5D5D5D] hover:text-[#88976C] transition-colors"
              title="Actualizar"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">

          {/* ── DASHBOARD ── */}
          {tab === "dashboard" && dashboard && (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Usuarios totales", value: dashboard.totalUsers ?? 0, icon: Users, iconColor: "text-blue-600", iconBg: "bg-blue-50", trend: "+12% vs mes anterior", bars: [40,55,45,70,50,80,60,85,72,90] },
                  { label: "Profesores activos", value: dashboard.totalTeachers ?? 0, icon: BookOpen, iconColor: "text-[#88976C]", iconBg: "bg-[#E8E0D0]/40", trend: "+5% vs mes anterior", bars: [60,45,75,55,80,50,70,60,85,75] },
                  { label: "Reservas", value: dashboard.totalBookings ?? 0, icon: Calendar, iconColor: "text-purple-600", iconBg: "bg-purple-50", trend: "+18% vs mes anterior", bars: [30,50,40,65,55,75,60,80,70,90] },
                  { label: "Revenue total", value: `$${(dashboard.revenue ?? 0).toLocaleString("es-AR")}`, icon: TrendingUp, iconColor: "text-amber-600", iconBg: "bg-amber-50", trend: "+9% vs mes anterior", bars: [50,35,60,45,70,55,80,65,85,75] },
                ].map(stat => (
                  <div key={stat.label} className={`${card} p-5`}>
                    <div className={`w-10 h-10 ${stat.iconBg} rounded-2xl flex items-center justify-center mb-4`}>
                      <stat.icon size={18} className={stat.iconColor} />
                    </div>
                    <p className="text-[10px] text-[#98A77C] uppercase tracking-widest font-semibold mb-1">{stat.label}</p>
                    <p className="text-3xl font-light text-[#2C2C2C]">{stat.value}</p>
                    <p className="text-[#98A77C] text-xs mt-1">{stat.trend}</p>
                    <div className="flex items-end gap-0.5 mt-3 h-8">
                      {stat.bars.map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-[#98A77C]/30 transition-all" style={{height:`${h}%`}} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom cards */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className={`${card} p-5`}>
                  <h3 className="text-sm font-medium text-[#2C2C2C] mb-4">Revenue por tipo</h3>
                  {[
                    { label: "Membresías", value: dashboard.revenueByType?.subscriptions ?? 0, dot: "bg-purple-400" },
                    { label: "Reservas", value: dashboard.revenueByType?.bookings ?? 0, dot: "bg-blue-400" },
                    { label: "Tienda", value: dashboard.revenueByType?.products ?? 0, dot: "bg-[#88976C]" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b border-[#E5E5E5] last:border-0">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${item.dot}`} />
                        <span className="text-sm text-[#5D5D5D]">{item.label}</span>
                      </div>
                      <span className="font-medium text-[#2C2C2C] text-sm">${item.value.toLocaleString("es-AR")}</span>
                    </div>
                  ))}
                </div>
                <div className={`${card} p-5`}>
                  <h3 className="text-sm font-medium text-[#2C2C2C] mb-4">Últimos usuarios</h3>
                  {(dashboard.recentUsers ?? []).map((u: any) => (
                    <div key={u.email} className="flex items-center justify-between py-2.5 border-b border-[#E5E5E5] last:border-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-sm bg-[#E8E0D0]/60 flex items-center justify-center text-xs font-semibold text-[#728156]">
                          {initials(u.name, u.email)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#2C2C2C] leading-tight">{u.name || "—"}</p>
                          <p className="text-xs text-[#5D5D5D]">{u.email}</p>
                        </div>
                      </div>
                      <span className={u.role === "admin" ? badge.red : u.role === "profesor" ? badge.blue : badge.gray}>{u.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar chart — Actividad mensual */}
              <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-medium text-[#2C2C2C] text-sm">Actividad mensual</h3>
                    <p className="text-xs text-[#5D5D5D] mt-0.5">Reservas y transacciones</p>
                  </div>
                  <span className="text-xs bg-[#98A77C]/15 text-[#728156] px-3 py-1 rounded-sm font-medium">Este año</span>
                </div>
                <div className="flex items-end justify-between gap-1.5 h-32">
                  {[
                    { label: "Ene", res: 45, tx: 30 },
                    { label: "Feb", res: 60, tx: 45 },
                    { label: "Mar", res: 35, tx: 25 },
                    { label: "Abr", res: 80, tx: 60 },
                    { label: "May", res: 55, tx: 40 },
                    { label: "Jun", res: 90, tx: 70 },
                    { label: "Jul", res: 65, tx: 50 },
                    { label: "Ago", res: 75, tx: 55 },
                    { label: "Sep", res: 85, tx: 65 },
                    { label: "Oct", res: 70, tx: 48 },
                  ].map((d) => (
                    <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end gap-0.5" style={{ height: "100px" }}>
                        <div className="flex-1 bg-[#1a2a1a] rounded-t-sm transition-all hover:bg-[#2a3a2a]" style={{ height: `${d.res}%` }} />
                        <div className="flex-1 bg-[#98A77C]/50 rounded-t-sm" style={{ height: `${d.tx}%` }} />
                      </div>
                      <span className="text-[9px] text-[#5D5D5D]">{d.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#E5E5E5]">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#1a2a1a]"/><span className="text-xs text-[#5D5D5D]">Reservas</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#98A77C]/50"/><span className="text-xs text-[#5D5D5D]">Transacciones</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ── PROFESORES ── */}
          {tab === "teachers" && (
            <div className="space-y-4">
              {(editingTeacher || newTeacher) && (
                <TeacherForm
                  teacher={editingTeacher}
                  onSave={saveTeacher}
                  onCancel={() => { setEditingTeacher(null); setNewTeacher(false); }}
                />
              )}

              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A77C]" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email…"
                  value={searchTeachers}
                  onChange={e => setSearchTeachers(e.target.value)}
                  className="w-full max-w-sm border border-[#E8E0D0] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white placeholder:text-[#5D5D5D]/50"
                />
              </div>

              <div className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f4f7f1] border-b border-[#E5E5E5]">
                        {["Profesor", "Disciplina", "Zona", "Plan", "Estado", "Acciones"].map(h => (
                          <th key={h} className={thCls}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeachers.length === 0 && (
                        <tr><td colSpan={6} className="px-5 py-10 text-center text-[#5D5D5D] text-sm">Sin profesores registrados</td></tr>
                      )}
                      {filteredTeachers.map(t => (
                        <tr key={t.id} className={trCls}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              {t.photo_url
                                ? <img src={t.photo_url} alt={t.name} className="w-8 h-8 rounded-sm object-cover" />
                                : <div className="w-8 h-8 rounded-sm bg-[#E8E0D0]/60 flex items-center justify-center text-xs font-semibold text-[#728156]">{t.name?.[0]}</div>
                              }
                              <div>
                                <p className="font-medium text-[#2C2C2C]">{t.name}</p>
                                <p className="text-xs text-[#5D5D5D]">{t.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[#5D5D5D]">{t.discipline || "—"}</td>
                          <td className="px-5 py-4 text-[#5D5D5D]">{t.location || "—"}</td>
                          <td className="px-5 py-4">
                            <span className={t.plan_active ? badge.green : badge.gray}>{t.plan || "ninguno"}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={t.status === "activo" ? badge.green : badge.red}>{t.status}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditingTeacher(t)} className={btn.icon} title="Editar">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => toggleTeacherStatus(t.id, t.status)} className={btn.icon} title={t.status === "activo" ? "Desactivar" : "Activar"}>
                                {t.status === "activo" ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                              <button onClick={() => deleteTeacher(t.id)} className="p-2 rounded-sm hover:bg-red-50 text-[#5D5D5D] hover:text-red-500 transition-colors" title="Eliminar">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUCTOS ── */}
          {tab === "products" && (
            <div className="space-y-4">
              {(editingProduct || newProduct) && (
                <ProductForm product={editingProduct} onSave={saveProduct} onCancel={() => { setEditingProduct(null); setNewProduct(false); }} />
              )}

              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A77C]" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o categoría…"
                  value={searchProducts}
                  onChange={e => setSearchProducts(e.target.value)}
                  className="w-full max-w-sm border border-[#E8E0D0] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white placeholder:text-[#5D5D5D]/50"
                />
              </div>

              <div className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f4f7f1] border-b border-[#E5E5E5]">
                        {["Producto", "Categoría", "Precio", "Stock", "Estado", "Acciones"].map(h => (
                          <th key={h} className={thCls}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 && (
                        <tr><td colSpan={6} className="px-5 py-10 text-center text-[#5D5D5D] text-sm">Sin productos registrados</td></tr>
                      )}
                      {filteredProducts.map(p => (
                        <tr key={p.id} className={trCls}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              {p.images?.[0]
                                ? <img src={p.images[0]} alt={p.name} className="w-9 h-9 rounded-xl object-cover border border-[#E5E5E5]" />
                                : <div className="w-9 h-9 rounded-xl bg-[#f4f7f1] flex items-center justify-center border border-[#E5E5E5]"><Package size={14} className="text-[#98A77C]" /></div>
                              }
                              <div>
                                <p className="font-medium text-[#2C2C2C]">{p.name}</p>
                                <p className="text-xs text-[#5D5D5D] max-w-[180px] truncate">{p.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[#5D5D5D] capitalize">{p.category}</td>
                          <td className="px-5 py-4 font-medium text-[#2C2C2C]">${Number(p.price).toLocaleString("es-AR")}</td>
                          <td className="px-5 py-4 text-[#5D5D5D]">{p.stock}</td>
                          <td className="px-5 py-4">
                            <span className={p.active ? badge.green : badge.red}>{p.active ? "Activo" : "Inactivo"}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditingProduct(p)} className={btn.icon} title="Editar"><Edit2 size={14} /></button>
                              <button onClick={() => deleteProduct(p.id)} className="p-2 rounded-sm hover:bg-red-50 text-[#5D5D5D] hover:text-red-500 transition-colors" title="Desactivar"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── USUARIOS ── */}
          {tab === "users" && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A77C]" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email…"
                  value={searchUsers}
                  onChange={e => setSearchUsers(e.target.value)}
                  className="w-full max-w-sm border border-[#E8E0D0] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white placeholder:text-[#5D5D5D]/50"
                />
              </div>

              <div className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f4f7f1] border-b border-[#E5E5E5]">
                        {["Usuario", "Email", "Rol actual", "Registrado", "Cambiar rol"].map(h => (
                          <th key={h} className={thCls}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 && (
                        <tr><td colSpan={5} className="px-5 py-10 text-center text-[#5D5D5D] text-sm">Sin usuarios registrados</td></tr>
                      )}
                      {filteredUsers.map(u => (
                        <tr key={u.id} className={trCls}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-sm bg-[#E8E0D0]/60 flex items-center justify-center text-xs font-semibold text-[#728156]">
                                {initials(u.name, u.email)}
                              </div>
                              <span className="font-medium text-[#2C2C2C]">{u.name || "Sin nombre"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[#5D5D5D]">{u.email}</td>
                          <td className="px-5 py-4">
                            <span className={u.role === "admin" ? badge.red : u.role === "profesor" ? badge.blue : badge.gray}>{u.role}</span>
                          </td>
                          <td className="px-5 py-4 text-[#5D5D5D] text-xs">{new Date(u.created_at).toLocaleDateString("es-AR")}</td>
                          <td className="px-5 py-4">
                            <select
                              value={u.role}
                              onChange={e => changeUserRole(u.id, e.target.value)}
                              className="text-xs border border-[#E8E0D0] rounded-sm px-3 py-1.5 text-[#2C2C2C] focus:outline-none focus:border-[#88976C] bg-white cursor-pointer"
                            >
                              <option value="alumno">Alumno</option>
                              <option value="profesor">Profesor</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── RESERVAS ── */}
          {tab === "bookings" && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A77C]" />
                <input
                  type="text"
                  placeholder="Buscar por alumno o profesor…"
                  value={searchBookings}
                  onChange={e => setSearchBookings(e.target.value)}
                  className="w-full max-w-sm border border-[#E8E0D0] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white placeholder:text-[#5D5D5D]/50"
                />
              </div>

              <div className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f4f7f1] border-b border-[#E5E5E5]">
                        {["Alumno", "Profesor", "Fecha", "Precio", "Estado", "Acciones"].map(h => (
                          <th key={h} className={thCls}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.length === 0 && (
                        <tr><td colSpan={6} className="px-5 py-10 text-center text-[#5D5D5D] text-sm">Sin reservas aún</td></tr>
                      )}
                      {filteredBookings.map(b => (
                        <tr key={b.id} className={trCls}>
                          <td className="px-5 py-4">
                            <p className="font-medium text-[#2C2C2C]">{b.profiles?.name || "—"}</p>
                            <p className="text-xs text-[#5D5D5D]">{b.profiles?.email}</p>
                          </td>
                          <td className="px-5 py-4 text-[#5D5D5D]">{b.teachers?.name || "—"}</td>
                          <td className="px-5 py-4 text-xs text-[#5D5D5D]">{b.booking_date ? new Date(b.booking_date).toLocaleDateString("es-AR") : new Date(b.created_at).toLocaleDateString("es-AR")}</td>
                          <td className="px-5 py-4 font-medium text-[#2C2C2C]">{b.price ? `$${Number(b.price).toLocaleString("es-AR")}` : "—"}</td>
                          <td className="px-5 py-4">
                            <select
                              value={b.status || "pendiente"}
                              onChange={e => updateBookingStatus(b.id, e.target.value)}
                              className="text-xs border border-[#E8E0D0] rounded-sm px-3 py-1.5 text-[#2C2C2C] focus:outline-none focus:border-[#88976C] bg-white cursor-pointer"
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="confirmada">Confirmada</option>
                              <option value="cancelada">Cancelada</option>
                              <option value="completada">Completada</option>
                            </select>
                          </td>
                          <td className="px-5 py-4">
                            <button onClick={() => deleteBooking(b.id)} className="p-2 rounded-sm hover:bg-red-50 text-[#5D5D5D] hover:text-red-500 transition-colors" title="Eliminar">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── RESEÑAS ── */}
          {tab === "reviews" && (
            <div className="grid gap-3">
              {reviews.length === 0 && (
                <div className={`${card} p-10 text-center text-[#5D5D5D] text-sm`}>Sin reseñas publicadas</div>
              )}
              {reviews.map(r => (
                <div key={r.id} className={`${card} p-5 flex items-start justify-between gap-4`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-sm bg-[#E8E0D0]/60 flex items-center justify-center text-xs font-semibold text-[#728156]">
                        {(r.profiles?.name || r.user_name || "?")?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#2C2C2C]">{r.profiles?.name || r.user_name || "Anónimo"}</p>
                        <p className="text-xs text-[#5D5D5D]">sobre <span className="text-[#88976C] font-medium">{r.teachers?.name || r.teacher_name || "—"}</span></p>
                      </div>
                      <div className="flex items-center gap-0.5 ml-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={12} className={i < (r.rating || 0) ? "text-amber-400 fill-amber-400" : "text-[#E5E5E5]"} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-[#5D5D5D] leading-relaxed">{r.comment || r.text || "Sin comentario."}</p>
                    <p className="text-xs text-[#5D5D5D]/60 mt-2">{new Date(r.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <button onClick={() => deleteReview(r.id)} className="p-2 rounded-sm hover:bg-red-50 text-[#5D5D5D] hover:text-red-500 transition-colors shrink-0" title="Eliminar reseña">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── TRANSACCIONES ── */}
          {tab === "transactions" && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A77C]" />
                <input
                  type="text"
                  placeholder="Buscar por usuario o descripción…"
                  value={searchTransactions}
                  onChange={e => setSearchTransactions(e.target.value)}
                  className="w-full max-w-sm border border-[#E8E0D0] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white placeholder:text-[#5D5D5D]/50"
                />
              </div>

              <div className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f4f7f1] border-b border-[#E5E5E5]">
                        {["Usuario", "Tipo", "Descripción", "Monto", "Estado", "Fecha"].map(h => (
                          <th key={h} className={thCls}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length === 0 && (
                        <tr><td colSpan={6} className="px-5 py-10 text-center text-[#5D5D5D] text-sm">Sin transacciones aún</td></tr>
                      )}
                      {filteredTransactions.map(t => (
                        <tr key={t.id} className={trCls}>
                          <td className="px-5 py-4 text-[#5D5D5D]">{t.user_name || "—"}</td>
                          <td className="px-5 py-4">
                            <span className={t.type === "subscription" ? badge.purple : t.type === "booking" ? badge.blue : badge.yellow}>
                              {t.type === "subscription" ? "Membresía" : t.type === "booking" ? "Reserva" : "Tienda"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-[#5D5D5D] text-xs max-w-[220px] truncate">{t.description || "—"}</td>
                          <td className="px-5 py-4 font-medium text-[#2C2C2C]">${Number(t.amount || 0).toLocaleString("es-AR")}</td>
                          <td className="px-5 py-4">
                            <span className={t.status === "aprobado" ? badge.green : t.status === "rechazado" ? badge.red : badge.yellow}>{t.status}</span>
                          </td>
                          <td className="px-5 py-4 text-[#5D5D5D] text-xs">{new Date(t.created_at).toLocaleDateString("es-AR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── CONFIGURACIÓN ── */}
          {tab === "config" && (
            <div className="space-y-4">
              <div className={card}>
                {config.length === 0 && (
                  <div className="p-10 text-center text-[#5D5D5D] text-sm">Sin configuraciones disponibles</div>
                )}
                {config.map((item, idx) => (
                  <div key={item.key} className={`px-6 py-5 flex items-center justify-between gap-4 ${idx < config.length - 1 ? "border-b border-[#E5E5E5]" : ""}`}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2C2C2C]">{item.label || item.key}</p>
                      {editingConfig !== item.key && (
                        <p className="text-sm text-[#88976C] font-medium mt-0.5">
                          {item.key.includes("price") ? `$${Number(item.value).toLocaleString("es-AR")} ARS` : item.value}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingConfig === item.key ? (
                        <>
                          <input
                            className={`${inputCls} w-44`}
                            value={configValues[item.key] || ""}
                            onChange={e => setConfigValues(v => ({ ...v, [item.key]: e.target.value }))}
                            autoFocus
                          />
                          <button onClick={() => saveConfig(item.key)} className="p-2 bg-[#E8E0D0]/50 text-[#728156] rounded-sm hover:bg-[#E8E0D0] transition-colors"><Check size={15} /></button>
                          <button onClick={() => setEditingConfig(null)} className="p-2 bg-[#E5E5E5] text-[#5D5D5D] rounded-sm hover:bg-gray-200 transition-colors"><X size={15} /></button>
                        </>
                      ) : (
                        <button onClick={() => setEditingConfig(item.key)} className={btn.ghost}>
                          <Edit2 size={13} /> Editar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── TeacherForm ──────────────────────────────────────────────────────────────
function TeacherForm({ teacher, onSave, onCancel }: { teacher: any; onSave: (t: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ ...teacher });
  const set = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

  const col1Fields = [
    { label: "Nombre completo", key: "name", type: "text" },
    { label: "Email", key: "email", type: "email" },
    { label: "Teléfono", key: "phone", type: "text" },
    { label: "Disciplina", key: "discipline", type: "text" },
    { label: "Especialidad", key: "specialty", type: "text" },
    { label: "Zona / Barrio", key: "location", type: "text" },
    { label: "Precio por clase (ARS)", key: "price", type: "number" },
    { label: "Días disponibles", key: "available_days", type: "text" },
  ];

  return (
    <div className="bg-[#f4f7f1] border border-[#E8E0D0] rounded-2xl p-6">
      <h3 className="font-medium text-[#2C2C2C] mb-5 text-base">{teacher?.id ? "Editar profesor" : "Nuevo profesor"}</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {col1Fields.map(f => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-[#5D5D5D] mb-1.5">{f.label}</label>
            <input type={f.type} value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)} className={`w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white`} />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-[#5D5D5D] mb-1.5">URL foto de perfil</label>
          <input type="text" value={form.photo_url || ""} onChange={e => set("photo_url", e.target.value)} className={`w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white`} placeholder="https://…" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-[#5D5D5D] mb-1.5">Biografía</label>
          <textarea value={form.bio || ""} onChange={e => set("bio", e.target.value)} className={`w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white`} rows={3} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#5D5D5D] mb-1.5">Plan</label>
          <select value={form.plan || "ninguno"} onChange={e => set("plan", e.target.value)} className={`w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#88976C] bg-white`}>
            <option value="ninguno">Sin plan</option>
            <option value="inicial">Inicial</option>
            <option value="destacado">Destacado</option>
            <option value="institucional">Institucional</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#5D5D5D] mb-1.5">Estado</label>
          <select value={form.status || "activo"} onChange={e => set("status", e.target.value)} className={`w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#88976C] bg-white`}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={() => onSave(form)} className="inline-flex items-center gap-2 bg-[#88976C] hover:bg-[#728156] text-white px-5 py-2.5 rounded-sm text-sm font-medium transition-colors">
          <Save size={15} /> {teacher?.id ? "Guardar cambios" : "Crear profesor"}
        </button>
        <button onClick={onCancel} className="inline-flex items-center gap-2 bg-white border border-[#9DB085] hover:border-[#88976C] text-[#2C2C2C] px-5 py-2.5 rounded-sm text-sm font-medium transition-colors">
          <X size={15} /> Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── ProductForm ──────────────────────────────────────────────────────────────
function ProductForm({ product, onSave, onCancel }: { product: any; onSave: (p: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ ...product });
  const set = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

  return (
    <div className="bg-[#f4f7f1] border border-[#E8E0D0] rounded-2xl p-6">
      <h3 className="font-medium text-[#2C2C2C] mb-5 text-base">{product?.id ? "Editar producto" : "Nuevo producto"}</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { label: "Nombre", key: "name", type: "text" },
          { label: "Precio (ARS)", key: "price", type: "number" },
          { label: "Categoría", key: "category", type: "text" },
          { label: "Stock", key: "stock", type: "number" },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-[#5D5D5D] mb-1.5">{f.label}</label>
            <input type={f.type} value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)} className={`w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white`} />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-[#5D5D5D] mb-1.5">Descripción</label>
          <textarea value={form.description || ""} onChange={e => set("description", e.target.value)} className={`w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white`} rows={3} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-[#5D5D5D] mb-1.5">URL de imagen principal</label>
          <input value={form.images?.[0] || ""} onChange={e => set("images", [e.target.value])} className={`w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#88976C] focus:ring-1 focus:ring-[#88976C]/30 bg-white`} placeholder="https://…" />
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active ?? true} onChange={e => set("active", e.target.checked)} className="rounded border-[#E8E0D0] text-[#88976C] focus:ring-[#88976C]" />
            <span className="text-sm text-[#2C2C2C]">Producto activo (visible en tienda)</span>
          </label>
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={() => onSave(form)} className="inline-flex items-center gap-2 bg-[#88976C] hover:bg-[#728156] text-white px-5 py-2.5 rounded-sm text-sm font-medium transition-colors">
          <Save size={15} /> {product?.id ? "Guardar cambios" : "Crear producto"}
        </button>
        <button onClick={onCancel} className="inline-flex items-center gap-2 bg-white border border-[#9DB085] hover:border-[#88976C] text-[#2C2C2C] px-5 py-2.5 rounded-sm text-sm font-medium transition-colors">
          <X size={15} /> Cancelar
        </button>
      </div>
    </div>
  );
}
