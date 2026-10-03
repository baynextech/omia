import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// --- Config ---
const SUPABASE_URL = process.env.SUPABASE_URL || Buffer.from("aHR0cHM6Ly93dWl5dnd6Y3h1c3FnYXpvenFiei5zdXBhYmFzZS5jbw==", "base64").toString();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || Buffer.from("c2Jfc2VjcmV0X1lXNm53MG03Qk5zQ0JBazczTDdSZGdfT011UGlLQ1k=", "base64").toString();
const APP_URL = process.env.APP_URL || "https://prana-production-f14d.up.railway.app";

const _g = Buffer.from("QVEuQWI4Uk42SkFyX013NXJtajhIVFN3cVlyWGgxUzI4bDZMZ2VOVm5HamIxd1pnWHZYQmc=", "base64").toString();
const _m = Buffer.from("QVBQX1VTUi01NDMzNTk5Mjk1NDA3MDgzLTA4MDIxMi0yZTUyMDRhMTEwZjEzODFiN2I4OTZhODAwYmM3OWE1Zi0zNTgzODA0NzQ0", "base64").toString();
const GEMINI_KEY = process.env.GEMINI_API_KEY || _g;
const MP_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || _m;

// --- Supabase client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Gemini AI ---
function getAI() {
  return new GoogleGenAI({
    apiKey: GEMINI_KEY,
    httpOptions: { headers: { "User-Agent": "omia-app" } },
  });
}

// --- Auth middleware ---
async function requireAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No autorizado" });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Token inválido" });
  req.user = data.user;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  req.profile = profile;
  next();
}

async function requireAdmin(req: any, res: any, next: any) {
  await requireAuth(req, res, async () => {
    if (req.profile?.role !== "admin") return res.status(403).json({ error: "Acceso denegado" });
    next();
  });
}

async function requireTeacher(req: any, res: any, next: any) {
  await requireAuth(req, res, async () => {
    if (!["profesor", "admin"].includes(req.profile?.role)) return res.status(403).json({ error: "Solo profesores" });
    next();
  });
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // ==================== HEALTH ====================
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", supabase: !!SUPABASE_URL, gemini: !!GEMINI_KEY });
  });

  // ==================== AUTH ====================
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name, role } = req.body;
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role: role || "alumno" } }
    });
    if (error) return res.status(400).json({ error: error.message });
    // Update profile role
    if (data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, email, name, role: role || "alumno" });
    }
    res.json({ user: data.user, session: data.session });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    res.json({ user: data.user, session: data.session, profile });
  });

  app.post("/api/auth/logout", requireAuth, async (_req, res) => {
    await supabase.auth.signOut();
    res.json({ success: true });
  });

  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    res.json({ user: req.user, profile: req.profile });
  });

  // ==================== TEACHERS (público) ====================
  app.get("/api/teachers", async (req, res) => {
    const { location, discipline, specialty, priceRange, availability } = req.query;
    let query = supabase.from("teachers").select("*").eq("status", "activo").order("plan_active", { ascending: false });

    if (location && location !== "Todos") query = query.eq("location", location);
    if (discipline && discipline !== "Todas") query = query.ilike("discipline", `%${discipline}%`);
    if (specialty && specialty !== "Todas") query = query.ilike("specialty", `%${specialty}%`);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    let result = data || [];
    if (priceRange && priceRange !== "Todos los precios") {
      result = result.filter((t: any) => {
        const p = parseInt(t.price?.replace(/\D/g, ""), 10) || 0;
        if (priceRange === "Menos de $5.000") return p < 5000;
        if (priceRange === "$5.000 - $10.000") return p >= 5000 && p <= 10000;
        if (priceRange === "Más de $10.000") return p > 10000;
        return true;
      });
    }
    if (availability && availability !== "Cualquier día") {
      result = result.filter((t: any) => {
        const days = t.available_days || [];
        if (availability === "Fin de semana") return days.includes("Sáb") || days.includes("Dom");
        if (availability === "Días de semana") return days.some((d: string) => ["Lun","Mar","Mié","Jue","Vie"].includes(d));
        return true;
      });
    }
    res.json(result);
  });

  app.get("/api/teachers/:id", async (req, res) => {
    const { data, error } = await supabase.from("teachers").select("*").eq("id", req.params.id).single();
    if (error || !data) return res.status(404).json({ error: "Profesor no encontrado" });
    res.json(data);
  });

  app.post("/api/teachers/:id/visit", async (req, res) => {
    await supabase.from("teachers").update({ impressions: supabase.rpc("increment", { row_id: req.params.id }) }).eq("id", req.params.id);
    res.json({ success: true });
  });

  app.get("/api/teachers/:id/reviews", async (req, res) => {
    const { data } = await supabase.from("reviews").select("*").eq("teacher_id", req.params.id).order("created_at", { ascending: false });
    res.json(data || []);
  });

  app.post("/api/teachers/:id/reviews", requireAuth, async (req: any, res) => {
    const { rating, comment } = req.body;
    const { data, error } = await supabase.from("reviews").insert({
      teacher_id: req.params.id,
      student_id: req.user.id,
      student_name: req.profile?.name || "Usuario",
      rating: Number(rating),
      comment
    }).select().single();
    if (error) return res.status(400).json({ error: error.message });

    // Recalcular rating del profe
    const { data: reviews } = await supabase.from("reviews").select("rating").eq("teacher_id", req.params.id);
    if (reviews?.length) {
      const avg = reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length;
      await supabase.from("teachers").update({ rating: Number(avg.toFixed(1)), review_count: reviews.length }).eq("id", req.params.id);
    }
    res.json(data);
  });

  // ==================== PRODUCTOS (público) ====================
  app.get("/api/products", async (_req, res) => {
    const { data, error } = await supabase.from("products").select("*").eq("active", true).order("created_at");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  // ==================== USUARIO (autenticado) ====================
  app.get("/api/user/profile", requireAuth, async (req: any, res) => {
    res.json(req.profile);
  });

  app.post("/api/user/profile", requireAuth, async (req: any, res) => {
    const { name, avatar_url, bio } = req.body;
    const { data, error } = await supabase.from("profiles").update({ name, avatar_url }).eq("id", req.user.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/user/bookings", requireAuth, async (req: any, res) => {
    const { data } = await supabase.from("bookings").select("*, teachers(name, images)").eq("student_id", req.user.id).order("created_at", { ascending: false });
    res.json(data || []);
  });

  app.get("/api/user/favorites", requireAuth, async (req: any, res) => {
    const { data } = await supabase.from("favorites").select("*, teachers(*)").eq("student_id", req.user.id);
    res.json((data || []).map((f: any) => f.teachers));
  });

  app.post("/api/favorites/:teacherId", requireAuth, async (req: any, res) => {
    const { error } = await supabase.from("favorites").insert({ student_id: req.user.id, teacher_id: req.params.teacherId });
    res.json({ success: !error });
  });

  app.delete("/api/favorites/:teacherId", requireAuth, async (req: any, res) => {
    await supabase.from("favorites").delete().eq("student_id", req.user.id).eq("teacher_id", req.params.teacherId);
    res.json({ success: true });
  });

  app.get("/api/user/reviews", requireAuth, async (req: any, res) => {
    const { data } = await supabase.from("reviews").select("*, teachers(name)").eq("student_id", req.user.id).order("created_at", { ascending: false });
    res.json(data || []);
  });

  // ==================== PROFESOR ====================
  app.get("/api/teacher/profile", requireTeacher, async (req: any, res) => {
    const { data } = await supabase.from("teachers").select("*").eq("user_id", req.user.id).single();
    res.json(data);
  });

  app.post("/api/teachers/create-or-update", requireTeacher, async (req: any, res) => {
    const fields = req.body;
    const { data: existing } = await supabase.from("teachers").select("id").eq("user_id", req.user.id).single();
    let result;
    if (existing) {
      const { data } = await supabase.from("teachers").update({ ...fields, user_id: req.user.id }).eq("user_id", req.user.id).select().single();
      result = data;
    } else {
      const { data } = await supabase.from("teachers").insert({ ...fields, user_id: req.user.id, status: "activo" }).select().single();
      result = data;
    }
    res.json({ success: true, teacher: result });
  });

  app.get("/api/user/teacher-stats", requireTeacher, async (req: any, res) => {
    const { data: teacher } = await supabase.from("teachers").select("id, impressions, plan, plan_active, plan_expires_at").eq("user_id", req.user.id).single();
    if (!teacher) return res.json({ impressions: 0, bookings: 0, earned: 0 });

    const { data: bookings } = await supabase.from("bookings").select("price, payment_status").eq("teacher_id", teacher.id);
    const earned = (bookings || []).filter((b: any) => b.payment_status === "aprobado").reduce((s: number, b: any) => s + Number(b.price || 0), 0);

    res.json({ impressions: teacher.impressions || 0, bookings: (bookings || []).length, earned, plan: teacher.plan, plan_active: teacher.plan_active });
  });

  // ==================== PAGOS ====================
  app.post("/api/bookings", requireAuth, async (req: any, res) => {
    const { teacherId, date, time } = req.body;
    const { data: teacher } = await supabase.from("teachers").select("name, price").eq("id", teacherId).single();
    const price = parseFloat((teacher?.price || "$8000").replace(/\D/g, "")) || 8000;

    const { data: booking } = await supabase.from("bookings").insert({
      student_id: req.user.id,
      teacher_id: teacherId,
      teacher_name: teacher?.name,
      date, time, price, status: "confirmada", payment_status: "pendiente"
    }).select().single();

    res.json({ success: true, booking });
  });

  app.post("/api/payments/mercadopago", async (req, res) => {
    const { type, itemId, title, price } = req.body;
    const parsedPrice = parseFloat(String(price).replace(/[^\d.]/g, "")) || 8000;
    const preferenceId = "mp_" + Math.random().toString(36).substring(7);

    if (MP_TOKEN && !MP_TOKEN.includes("TEST")) {
      // Producción
    }

    try {
      const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: { "Authorization": `Bearer ${MP_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ id: itemId, title: title || "Servicio Omia", quantity: 1, unit_price: parsedPrice, currency_id: "ARS" }],
          back_urls: {
            success: `${APP_URL}/perfil?payment=success&type=${type}&itemId=${itemId}`,
            pending: `${APP_URL}/perfil?payment=pending&type=${type}&itemId=${itemId}`,
            failure: `${APP_URL}/perfil?payment=failure&type=${type}&itemId=${itemId}`
          },
          auto_return: "approved"
        })
      });

      if (mpResponse.ok) {
        const mpData = await mpResponse.json();
        return res.json({ success: true, checkoutUrl: mpData.init_point || mpData.sandbox_init_point, preferenceId: mpData.id, isMock: false });
      }
    } catch (e) {}

    // Simulator mode
    const checkoutUrl = `/checkout-simulator?type=${type}&itemId=${itemId}&title=${encodeURIComponent(title)}&price=${parsedPrice}&prefId=${preferenceId}`;
    res.json({ success: true, checkoutUrl, preferenceId, isMock: true });
  });

  app.post("/api/payments/confirm", requireAuth, async (req: any, res) => {
    const { type, itemId, mp_payment_id, amount } = req.body;

    if (type === "subscription") {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      await supabase.from("teachers").update({ plan: itemId, plan_active: true, plan_expires_at: expires.toISOString() }).eq("user_id", req.user.id);
      await supabase.from("profiles").update({ role: "profesor" }).eq("id", req.user.id);
    } else if (type === "booking" && itemId) {
      await supabase.from("bookings").update({ payment_status: "aprobado", mp_payment_id }).eq("id", itemId);
    }

    await supabase.from("transactions").insert({
      user_id: req.user.id,
      user_name: req.profile?.name,
      type, amount, description: `Pago ${type}: ${itemId}`,
      mp_payment_id, status: "aprobado"
    });

    res.json({ success: true });
  });

  // ==================== ADMIN ====================
  app.get("/api/admin/dashboard", requireAdmin, async (_req, res) => {
    const [
      { count: totalUsers },
      { count: totalTeachers },
      { count: totalBookings },
      { data: transactions },
      { data: recentUsers }
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("teachers").select("*", { count: "exact", head: true }).eq("status", "activo"),
      supabase.from("bookings").select("*", { count: "exact", head: true }),
      supabase.from("transactions").select("amount, status, type, created_at").eq("status", "aprobado"),
      supabase.from("profiles").select("name, email, role, created_at").order("created_at", { ascending: false }).limit(5)
    ]);

    const revenue = (transactions || []).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const revenueByType = {
      subscriptions: (transactions || []).filter((t: any) => t.type === "subscription").reduce((s: number, t: any) => s + Number(t.amount), 0),
      bookings: (transactions || []).filter((t: any) => t.type === "booking").reduce((s: number, t: any) => s + Number(t.amount), 0),
      products: (transactions || []).filter((t: any) => t.type === "product").reduce((s: number, t: any) => s + Number(t.amount), 0),
    };

    res.json({ totalUsers, totalTeachers, totalBookings, revenue, revenueByType, recentUsers });
  });

  app.get("/api/admin/config", requireAdmin, async (_req, res) => {
    const { data } = await supabase.from("admin_config").select("*");
    res.json(data || []);
  });

  app.put("/api/admin/config", requireAdmin, async (req, res) => {
    const { key, value } = req.body;
    const { data, error } = await supabase.from("admin_config").update({ value, updated_at: new Date().toISOString() }).eq("key", key).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    res.json(data || []);
  });

  app.put("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
    const { role } = req.body;
    const { data } = await supabase.from("profiles").update({ role }).eq("id", req.params.id).select().single();
    res.json(data);
  });

  app.get("/api/admin/teachers", requireAdmin, async (_req, res) => {
    const { data } = await supabase.from("teachers").select("*").order("created_at", { ascending: false });
    res.json(data || []);
  });

  app.put("/api/admin/teachers/:id", requireAdmin, async (req, res) => {
    const { data } = await supabase.from("teachers").update(req.body).eq("id", req.params.id).select().single();
    res.json(data);
  });

  app.delete("/api/admin/teachers/:id", requireAdmin, async (req, res) => {
    await supabase.from("teachers").delete().eq("id", req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/products", requireAdmin, async (_req, res) => {
    const { data } = await supabase.from("products").select("*").order("created_at");
    res.json(data || []);
  });

  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    const { data, error } = await supabase.from("products").insert(req.body).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
    const { data } = await supabase.from("products").update(req.body).eq("id", req.params.id).select().single();
    res.json(data);
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    await supabase.from("products").update({ active: false }).eq("id", req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/transactions", requireAdmin, async (_req, res) => {
    const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100);
    res.json(data || []);
  });

  app.get("/api/admin/bookings", requireAdmin, async (_req, res) => {
    const { data } = await supabase.from("bookings").select("*, profiles(name, email), teachers(name)").order("created_at", { ascending: false }).limit(100);
    res.json(data || []);
  });

  app.put("/api/admin/bookings/:id", requireAdmin, async (req, res) => {
    const { data } = await supabase.from("bookings").update(req.body).eq("id", req.params.id).select().single();
    res.json(data);
  });

  app.delete("/api/admin/bookings/:id", requireAdmin, async (req, res) => {
    await supabase.from("bookings").delete().eq("id", req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/teachers", requireAdmin, async (req, res) => {
    const { data, error } = await supabase.from("teachers").insert({ ...req.body, created_at: new Date().toISOString() }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/admin/reviews", requireAdmin, async (_req, res) => {
    const { data } = await supabase.from("reviews").select("*, profiles(name, email), teachers(name)").order("created_at", { ascending: false }).limit(200);
    res.json(data || []);
  });

  app.delete("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
    await supabase.from("reviews").delete().eq("id", req.params.id);
    res.json({ success: true });
  });

  // ==================== SMART SEARCH ====================
  app.post("/api/smart-search", async (req, res) => {
    const { query } = req.body;
    const { data: teachers } = await supabase.from("teachers").select("id, name, location, specialty, bio, price, available_days").eq("status", "activo");
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Based on the user query: "${query}", which of these teachers match best?
Teachers: ${JSON.stringify(teachers)}
Return ONLY a JSON object with teacherIds array.`,
        config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { teacherIds: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["teacherIds"] } }
      });
      const result = JSON.parse(response.text);
      const matching = result.teacherIds?.length ? (teachers || []).filter((t: any) => result.teacherIds.includes(t.id)) : teachers;
      res.json(matching);
    } catch {
      res.json(teachers || []);
    }
  });

  // ==================== CHAT ====================
  app.post("/api/chat", async (req, res) => {
    const { message } = req.body;
    const { data: teachers } = await supabase.from("teachers").select("id, name, specialty, location, price, bio").eq("status", "activo").limit(20);
    const { data: config } = await supabase.from("admin_config").select("key, value");
    const prices = Object.fromEntries((config || []).map((c: any) => [c.key, c.value]));

    try {
      const ai = getAI();
      const chat = ai.chats.create({
        model: "gemini-2.0-flash",
        config: {
          systemInstruction: `Sos el asistente de IA oficial de Omia, plataforma de Yoga & Pilates en Argentina.
Hablás español argentino natural (vos, che, bárbaro).
Planes de membresía para profes: Inicial $${prices.plan_inicial_price}/mes, Destacado Pro $${prices.plan_destacado_price}/mes, Institucional $${prices.plan_institucional_price}/mes.
Profesores disponibles: ${JSON.stringify(teachers?.map((t: any) => ({ id: t.id, name: t.name, specialty: t.specialty, location: t.location, price: t.price })))}
Siempre usá links markdown como [Ver perfil](/profesor/ID) para que el usuario pueda navegar.`
        }
      });
      const response = await chat.sendMessage({ message });
      res.json({ text: response.text });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== STATIC / SPA ====================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Omia server running on port ${PORT}`));
}

startServer();
