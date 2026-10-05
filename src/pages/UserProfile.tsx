import { useState, useEffect, useRef } from "react";
import { apiFetch, apiJson } from "../lib/api";
import { usePlans, startCheckout } from "../hooks/usePlans";
import { User, Heart, MessageSquare, Camera, Edit2, Star, Save, Calendar, ShieldCheck, Sparkles, AlertCircle, CheckCircle2, Eye, DollarSign, ArrowUpRight, Mail, Phone, Check, UploadCloud, X, Plus, TrendingUp, LayoutDashboard } from "lucide-react";
import { TeacherCard, Teacher } from "../components/TeacherCard";
import { useFavorites } from "../hooks/useFavorites";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const convertToWebP = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo inicializar el Canvas"));
          return;
        }
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const webpDataUrl = canvas.toDataURL("image/webp", 0.85);
        resolve(webpDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// "2026-10-12" → "12/10/2026"
const formatDate = (iso: string) => (iso || "").split("-").reverse().join("/");

interface Booking {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  time: string;
  price: string;
  status: string;
  paymentStatus: string;
}

export function UserProfile() {
  const [activeTab, setActiveTab] = useState<"perfil" | "bookings" | "favoritos" | "reseñas" | "premium" | "visited" | "stats" | "landing">("perfil");
  const [isEditing, setIsEditing] = useState(false);
  
  const [profile, setProfile] = useState({ 
    name: "", 
    email: "", 
    bio: "", 
    avatar: "", 
    isPremium: false,
    role: "alumno" as "alumno" | "profesor" | "instituto",
    plan: "ninguno" as "ninguno" | "inicial" | "destacado" | "institucional",
    teacherId: null as string | null,
    teacherStatus: null as string | null,
    planExpiresAt: null as string | null
  });
  
  const [editForm, setEditForm] = useState({ 
    name: "", 
    email: "", 
    bio: "", 
    avatar: "", 
    isPremium: false,
    role: "alumno" as "alumno" | "profesor" | "instituto",
    plan: "ninguno" as "ninguno" | "inicial" | "destacado" | "institucional",
    teacherId: null as string | null,
    teacherStatus: null as string | null,
    planExpiresAt: null as string | null
  });

  const [favoriteTeachers, setFavoriteTeachers] = useState<Teacher[]>([]);
  const [visitedTeachers, setVisitedTeachers] = useState<Teacher[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [teacherStats, setTeacherStats] = useState({
    visitors: [] as { name: string; date: string }[],
    impressions: 0,
    earned: 0,
    pendingPayout: 0
  });

  const [landingForm, setLandingForm] = useState({
    name: "",
    specialty: "Vinyasa Flow",
    location: "Palermo",
    price: "$8.000/clase",
    availableDays: ["Lun", "Mié", "Vie"] as string[],
    bio: "",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600",
    email: "",
    phone: "",
    images: [] as string[],
    address: "",
    hours: "",
    amenities: [] as string[]
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isPayingId, setIsPayingId] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveLandingLoading, setSaveLandingLoading] = useState(false);
  const [saveLandingSuccess, setSaveLandingSuccess] = useState(false);
  
  const { favorites } = useFavorites();
  const { formatPrice } = usePlans();
  const { token, isAuthenticated, profile: authProfile, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  const fetchUserData = async () => {
    if (!token) { setIsLoading(false); return; }
    try {
      const profileData = await (await apiFetch("/api/user/profile")).json();
      const isPro = profileData.role === "profesor" || profileData.role === "instituto";

      // Cada panel pide lo suyo: quien contrata ve lo que reservó y guardó;
      // el profesional o instituto ve lo que recibió.
      const getList = (path: string) => apiFetch(path).then(r => (r.ok ? r.json() : [])).then(d => (Array.isArray(d) ? d : []));
      const [favoritesData, reviewsData, bookingsData, visitedData, statsData, ownTeacher] = await Promise.all([
        isPro ? [] : getList("/api/user/favorites"),
        getList("/api/user/reviews"),
        getList(isPro ? "/api/teacher/bookings" : "/api/user/bookings"),
        isPro ? [] : getList("/api/user/visited"),
        apiFetch("/api/user/teacher-stats").then(r => r.json()),
        isPro ? apiFetch("/api/teacher/profile").then(r => r.json()) : null
      ]);

      setProfile(profileData);
      setEditForm(profileData);
      setFavoriteTeachers(favoritesData);
      setReviews(reviewsData);
      setBookings(bookingsData);
      setVisitedTeachers(visitedData);
      setTeacherStats({ visitors: [], impressions: 0, earned: 0, pendingPayout: 0, ...statsData });

      // Sincronizar el formulario de landing page
      const linkedTeacher = ownTeacher as Teacher | null;
      if (linkedTeacher) {
        setLandingForm({
          name: linkedTeacher.name,
          specialty: linkedTeacher.specialty,
          location: linkedTeacher.location,
          price: linkedTeacher.price,
          availableDays: linkedTeacher.availableDays || ["Lun", "Mié", "Vie"],
          bio: linkedTeacher.bio || "",
          image: linkedTeacher.image || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600",
          email: linkedTeacher.email || profileData.email || "",
          phone: linkedTeacher.phone || "",
          images: linkedTeacher.images || [],
          address: (linkedTeacher as any).address || "",
          hours: (linkedTeacher as any).hours || "",
          amenities: (linkedTeacher as any).amenities || []
        });
      } else {
        setLandingForm(prev => ({
          ...prev,
          name: profileData.name,
          bio: profileData.bio || "Instructor apasionado en Omia Yoga.",
          email: profileData.email || "",
          phone: "",
          images: []
        }));
      }

    } catch (error) {
      console.error("Error al cargar datos del usuario:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handlePaymentConfirmation = async () => {
      const paymentStatus = searchParams.get("payment");
      const type = searchParams.get("type");
      const itemId = searchParams.get("itemId");

      const tx = searchParams.get("tx");

      if (paymentStatus && tx) {
        setIsLoading(true);
        if (paymentStatus === "failure") {
          setPaymentResult({ success: false, message: "El pago no se completó. Podés intentarlo de nuevo cuando quieras." });
        } else {
          try {
            // El servidor consulta el pago en Mercado Pago; acá solo se muestra el resultado.
            const { ok, data } = await apiJson("/api/payments/confirm", {
              tx,
              payment_id: searchParams.get("payment_id") || searchParams.get("collection_id")
            });
            if (ok && data.success) {
              setPaymentResult({
                success: true,
                message: type === "subscription"
                  ? "¡Listo! Tu plan está activo y tu perfil ya figura en Omia."
                  : type === "product"
                    ? "¡Compra abonada con éxito! Te vamos a contactar para coordinar la entrega."
                    : "¡Reserva de clase abonada con éxito!"
              });
            } else {
              setPaymentResult({
                success: false,
                message: "Todavía no recibimos la confirmación del pago. Si ya pagaste, se va a acreditar solo en unos minutos."
              });
            }
          } catch (err) {
            console.error("Confirm error", err);
          }
        }
        setSearchParams({});
      }
      
      await fetchUserData();
    };

    handlePaymentConfirmation();
  }, [favorites, searchParams]);

  // Asegurar de que la pestaña activa sea válida cuando cambia el rol del usuario
  useEffect(() => {
    if (profile.role === "alumno") {
      if (["stats", "landing"].includes(activeTab)) {
        setActiveTab("perfil");
      }
    } else {
      if (["favoritos", "visited"].includes(activeTab)) {
        setActiveTab("perfil");
      }
    }
  }, [profile.role]);

  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploadingGallery(true);
    const convertedImages: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        const webpData = await convertToWebP(files[i]);
        convertedImages.push(webpData);
      } catch (err) {
        console.error("Error al convertir imagen a WebP:", err);
      }
    }
    
    setLandingForm(prev => {
      const currentImages = prev.images || [];
      const updated = [...currentImages, ...convertedImages];
      return {
        ...prev,
        images: updated,
        image: prev.image && !prev.image.includes("unsplash.com") ? prev.image : (updated[0] || prev.image)
      };
    });
    
    setIsUploadingGallery(false);
  };

  const handleRemoveGalleryImage = (idxToRemove: number) => {
    setLandingForm(prev => {
      const updated = (prev.images || []).filter((_, idx) => idx !== idxToRemove);
      return {
        ...prev,
        images: updated,
        image: prev.image === (prev.images || [])[idxToRemove] 
          ? (updated[0] || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600")
          : prev.image
      };
    });
  };

  const handleSaveProfile = async () => {
    try {
      const res = await apiFetch("/api/user/profile", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      setProfile(data);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Error al guardar perfil");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePay = async (type: "booking" | "subscription", itemId: string) => {
    setIsPayingId(itemId);
    const error = await startCheckout({ type, itemId });
    if (error) alert(error);
    setIsPayingId(null);
  };

  const handleReplyReview = async (review: any) => {
    const reply = window.prompt("Tu respuesta (queda visible en tu perfil público):", review.reply || "");
    if (reply === null) return;
    const { ok, data } = await apiJson(`/api/reviews/${review.id}/reply`, { reply });
    if (ok) setReviews(prev => prev.map(r => (r.id === review.id ? data : r)));
    else alert(data.error || "No se pudo guardar la respuesta");
  };

  const handleSaveLanding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLandingLoading(true);
    setSaveLandingSuccess(false);

    try {
      const res = await apiFetch("/api/teachers/create-or-update", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ...landingForm, amenities: landingForm.amenities.map(x => x.trim()).filter(Boolean) })
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfile(data.userProfile);
        setSaveLandingSuccess(true);
        setTimeout(() => setSaveLandingSuccess(false), 8000);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "No se pudo guardar tu página.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    } finally {
      setSaveLandingLoading(false);
    }
  };

  const toggleAvailableDay = (day: string) => {
    setLandingForm(prev => {
      const current = prev.availableDays || [];
      if (current.includes(day)) {
        return { ...prev, availableDays: current.filter(d => d !== day) };
      } else {
        return { ...prev, availableDays: [...current, day] };
      }
    });
  };

  if (!isAuthenticated && !isLoading) {
    return (
      <div className="py-24 px-6 max-w-7xl mx-auto flex flex-col justify-center items-center h-[60vh] text-center gap-6">
        <User className="w-16 h-16 text-[#E5E5E5]" />
        <h2 className="text-2xl font-medium text-[#2C2C2C]">Iniciá sesión para ver tu perfil</h2>
        <p className="text-[#5D5D5D] max-w-sm">Creá una cuenta o ingresá para acceder a tus reservas, favoritos y configuración.</p>
        <Link to="/" className="px-6 py-3 bg-[#98A77C] hover:bg-[#88976C] text-white rounded-sm font-medium transition-colors">
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-24 px-6 max-w-7xl mx-auto flex justify-center items-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#98A77C]/30 border-t-[#98A77C] rounded-sm animate-spin" />
      </div>
    );
  }

  const isTeacherOrInstitute = profile.role === "profesor" || profile.role === "instituto";

  const TABS_FOR_ROLE = isTeacherOrInstitute ? [
    { id: "perfil", label: "Mi Perfil", icon: User },
    { id: "stats", label: "Estadísticas", icon: TrendingUp },
    { id: "landing", label: "Mi Página", icon: LayoutDashboard },
    { id: "bookings", label: "Reservas", icon: Calendar },
    { id: "reseñas", label: "Reseñas", icon: Star },
    { id: "premium", label: "Plan Premium", icon: Sparkles },
  ] : [
    { id: "perfil", label: "Mi Perfil", icon: User },
    { id: "bookings", label: "Mis Reservas", icon: Calendar },
    { id: "favoritos", label: "Favoritos", icon: Heart },
    { id: "visited", label: "Visitados", icon: Eye },
    { id: "reseñas", label: "Mis Reseñas", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7f1] flex">
      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-[#E5E5E5] flex flex-col z-30">
        {/* Logo */}
        <div className="px-6 pt-8 pb-6 border-b border-[#E5E5E5]">
          <Link to="/" className="text-xl font-serif italic text-[#2C2C2C]">Omia</Link>
          <p className="text-xs text-[#98A77C]/70 mt-0.5">Panel de Usuario</p>
        </div>
        {/* User info */}
        <div className="px-6 py-5 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#1a2a1a] flex items-center justify-center text-sm font-semibold text-white overflow-hidden shrink-0">
              {profile.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : (profile.name?.[0] || profile.email?.[0] || "U").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#2C2C2C] truncate">{profile.name || "Usuario"}</p>
              <p className="text-xs text-[#98A77C]/70 truncate">{authProfile?.role || "alumno"}</p>
            </div>
          </div>
        </div>
        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {TABS_FOR_ROLE.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                activeTab === t.id
                  ? "bg-[#1a2a1a] text-white rounded-lg border-none"
                  : "text-[#5D5D5D] hover:bg-[#f4f7f1] hover:text-[#2C2C2C]"
              }`}>
              <t.icon size={16} className="shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>
        {/* Bottom */}
        <div className="px-6 pb-6">
          <Link to="/" className="text-xs text-[#5D5D5D] hover:text-[#98A77C] transition-colors flex items-center gap-1.5">
            ← Ver sitio
          </Link>
        </div>
      </aside>

      {/* MAIN */}
      <div className="ml-60 flex-1 min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E5E5E5] px-8 py-4 sticky top-0 z-20 flex items-center justify-between">
          <h1 className="text-lg font-light text-[#2C2C2C]">{TABS_FOR_ROLE.find(t => t.id === activeTab)?.label || "Panel"}</h1>
          <button onClick={logout} className="text-sm text-[#5D5D5D] hover:text-red-500 transition-colors">Cerrar sesión</button>
        </header>
        <div className="px-8 py-6">

        {paymentResult && (
          <div className="mb-8 p-5 bg-[#98A77C]/10 border-2 border-[#98A77C] rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-5 duration-300">
            <CheckCircle2 className="w-6 h-6 text-[#98A77C] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[#2C2C2C] mb-1">{paymentResult.success ? "¡Pago aprobado con Mercado Pago!" : "Pago sin confirmar"}</h3>
              <p className="text-sm text-[#5D5D5D]">{paymentResult.message}</p>
            </div>
            <button onClick={() => setPaymentResult(null)} className="ml-auto text-[#5D5D5D] hover:text-[#2C2C2C] text-sm font-medium">Cerrar</button>
          </div>
        )}

        {/* TAB 1: PERFIL */}
        {activeTab === "perfil" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            {/* Mini stat cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Reservas totales", value: bookings.length, icon: Calendar, bars: [30,50,40,70,55,80,65,90,75,85] },
                { label: "Favoritos", value: favoriteTeachers.length, icon: Heart, bars: [60,40,70,50,80,45,75,55,85,70] },
                { label: "Reseñas", value: reviews.length, icon: Star, bars: [20,40,30,60,45,70,55,80,65,75] },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs text-[#5D5D5D] uppercase tracking-widest font-medium">{stat.label}</p>
                    <stat.icon size={15} className="text-[#98A77C]" />
                  </div>
                  <p className="text-3xl font-light text-[#2C2C2C]">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-light tracking-tight text-[#2C2C2C]">Perfil y Configuración</h1>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F4EFE4] border border-[#E8E0D0] hover:border-[#2C2C2C] rounded-sm text-sm font-medium transition-colors text-[#2C2C2C]"
                >
                  <Edit2 className="w-4 h-4" /> Editar Datos
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm(profile);
                    }}
                    className="px-4 py-2 bg-transparent text-[#5D5D5D] hover:text-[#2C2C2C] rounded-sm text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    className="flex items-center gap-2 px-4 py-2 bg-[#98A77C] hover:bg-[#88976C] text-white rounded-sm text-sm font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" /> Guardar
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white border border-[#E8E0D0] rounded-3xl p-8 shadow-sm">
              <div className="flex flex-col gap-6">
                {isEditing && (
                  <div className="flex items-center gap-6 pb-6 border-b border-[#E8E0D0]">
                    <div className="relative group w-20 h-20">
                      <img 
                        src={editForm.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(editForm.name)}&background=8CAE99&color=fff`} 
                        alt="Avatar preview" 
                        className="w-full h-full rounded-sm object-cover border border-[#E8E0D0]"
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </button>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-[#2C2C2C]">Foto de perfil</p>
                      <p className="text-sm text-[#5D5D5D]">Hacé clic en la imagen para cambiarla. Usá un JPG o PNG o URL de avatar.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#5D5D5D] mb-2">Nombre completo</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none transition-all"
                      />
                    ) : (
                      <p className="text-[#2C2C2C] font-medium p-3 bg-[#F4EFE4] rounded-xl border border-transparent">{profile.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5D5D5D] mb-2">Correo electrónico</label>
                    {isEditing ? (
                      <input 
                        type="email" 
                        value={editForm.email}
                        onChange={e => setEditForm({...editForm, email: e.target.value})}
                        className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none transition-all"
                      />
                    ) : (
                      <p className="text-[#2C2C2C] font-medium p-3 bg-[#F4EFE4] rounded-xl border border-transparent">{profile.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#5D5D5D] mb-2">Rol / Tipo de cuenta</label>
                    {isEditing ? (
                      <select 
                        value={editForm.role}
                        onChange={e => setEditForm({...editForm, role: e.target.value as any})}
                        className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none transition-all cursor-pointer"
                      >
                        <option value="alumno">Alumno / Alumna</option>
                        <option value="profesor">Profesor / Profesora</option>
                        <option value="instituto">Instituto o Estudio de Yoga</option>
                      </select>
                    ) : (
                      <p className="text-[#2C2C2C] font-medium p-3 bg-[#F4EFE4] rounded-xl border border-transparent capitalize">
                        {({ alumno: "Alumno", profesor: "Profesor", instituto: "Instituto", admin: "Administrador" } as Record<string, string>)[profile.role] || profile.role}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5D5D5D] mb-2">ID de Profesor Vinculado</label>
                    <p className="text-[#5D5D5D] text-sm p-3 bg-[#F4EFE4] rounded-xl border border-transparent font-mono">
                      {profile.teacherId ? profile.teacherId : "Ninguno (Suscripción inactiva)"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5D5D5D] mb-2">Biografía</label>
                  {isEditing ? (
                    <textarea 
                      value={editForm.bio}
                      onChange={e => setEditForm({...editForm, bio: e.target.value})}
                      rows={4}
                      className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none transition-all resize-none"
                    />
                  ) : (
                    <div className="p-4 bg-[#F4EFE4] rounded-xl border border-transparent min-h-[100px]">
                      <p className="text-[#2C2C2C]">{profile.bio || <span className="text-[#5D5D5D] italic">No hay biografía. Hacé clic en editar para agregar algo sobre vos.</span>}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2b: RESERVAS RECIBIDAS (PROFESOR / INSTITUTO) */}
        {activeTab === "bookings" && isTeacherOrInstitute && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h1 className="text-3xl font-light tracking-tight text-[#2C2C2C] mb-6">Reservas recibidas</h1>
            {bookings.length > 0 ? (
              <div className="bg-white border border-[#E8E0D0] rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-[#5D5D5D] border-b border-[#E8E0D0]">
                      <th className="px-6 py-4">Alumno/a</th>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Hora</th>
                      <th className="px-6 py-4">Precio</th>
                      <th className="px-6 py-4">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking: any) => (
                      <tr key={booking.id} className="border-b border-[#E8E0D0] last:border-0">
                        <td className="px-6 py-4">
                          <p className="font-medium text-[#2C2C2C]">{booking.studentName || "Alumno/a"}</p>
                          {booking.studentEmail && <a href={`mailto:${booking.studentEmail}`} className="text-xs text-[#98A77C] hover:underline">{booking.studentEmail}</a>}
                        </td>
                        <td className="px-6 py-4">{formatDate(booking.date)}</td>
                        <td className="px-6 py-4">{booking.time} hs</td>
                        <td className="px-6 py-4 font-mono">{booking.price}</td>
                        <td className="px-6 py-4">{booking.paymentStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-[#F4EFE4] rounded-3xl border border-[#E8E0D0] py-20 px-6 text-center">
                <Calendar className="w-12 h-12 text-[#E5E5E5] mx-auto mb-4" />
                <h2 className="text-xl font-medium text-[#2C2C2C] mb-2">Todavía no recibiste reservas</h2>
                <p className="text-[#5D5D5D] max-w-sm mx-auto">Cuando alguien reserve una clase desde tu perfil, la vas a ver acá con sus datos de contacto.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RESERVAS (SOLO ALUMNO) */}
        {activeTab === "bookings" && !isTeacherOrInstitute && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h1 className="text-3xl font-light tracking-tight text-[#2C2C2C] mb-6">Mis Clases Reservadas</h1>
            {bookings.length > 0 ? (
              <div className="flex flex-col gap-6">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-white border border-[#E8E0D0] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="p-3.5 bg-[#98A77C]/10 text-[#98A77C] rounded-2xl">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#2C2C2C] text-lg">Sesión con {booking.teacherName}</h3>
                        <p className="text-sm text-[#5D5D5D] mt-1 flex items-center gap-1">
                          <span>Fecha: <strong>{formatDate(booking.date)}</strong></span>
                          <span className="mx-1">•</span>
                          <span>Hora: <strong>{booking.time} hs</strong></span>
                        </p>
                        <p className="text-xs text-[#5D5D5D] mt-1">Precio: <strong className="text-[#2C2C2C]">{booking.price}</strong></p>
                      </div>
                    </div>
                    
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-[#E8E0D0]">
                      <div className="flex flex-col items-start md:items-end gap-1">
                        <span className="text-xs text-[#5D5D5D]">Estado del pago:</span>
                        <span className={`px-3 py-1 rounded-sm text-xs font-semibold ${
                          booking.paymentStatus === "Pagado" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {booking.paymentStatus}
                        </span>
                      </div>

                      {booking.paymentStatus === "Pendiente" && (
                        <button
                          onClick={() => handlePay("booking", booking.id)}
                          disabled={isPayingId === booking.id}
                          className="px-5 py-2.5 bg-[#009EE3] hover:bg-[#008CD0] text-white rounded-sm text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          {isPayingId === booking.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-sm animate-spin" />
                          ) : (
                            <>
                              <span>Pagar clase</span>
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#F4EFE4] rounded-3xl border border-[#E8E0D0] py-20 px-6 text-center flex flex-col items-center">
                <Calendar className="w-12 h-12 text-[#E5E5E5] mb-4" />
                <h2 className="text-xl font-medium text-[#2C2C2C] mb-2">No tenés reservas todavía</h2>
                <p className="text-[#5D5D5D] mb-6 max-w-sm mx-auto">Encontrá el profesor que mejor se adapte a tu estilo y agendá una clase.</p>
                <Link to="/directorio" className="px-6 py-3 bg-[#98A77C] hover:bg-[#88976C] text-white rounded-sm font-medium transition-colors">
                  Buscar Profesores
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FAVORITOS (SOLO ALUMNO) */}
        {activeTab === "favoritos" && !isTeacherOrInstitute && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h1 className="text-3xl font-light tracking-tight text-[#2C2C2C] mb-6">Mis Favoritos</h1>
            {favoriteTeachers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {favoriteTeachers.map(teacher => (
                  <TeacherCard key={teacher.id} teacher={teacher} />
                ))}
              </div>
            ) : (
              <div className="bg-[#F4EFE4] rounded-3xl border border-[#E8E0D0] py-20 px-6 text-center flex flex-col items-center">
                <Heart className="w-12 h-12 text-[#E5E5E5] mb-4" />
                <h2 className="text-xl font-medium text-[#2C2C2C] mb-2">No agregaste a nadie todavía</h2>
                <p className="text-[#5D5D5D] mb-6 max-w-sm mx-auto">Cuando encuentres profes que te gusten en el directorio, tocales el corazón para guardarlos acá.</p>
                <Link to="/directorio" className="px-6 py-3 bg-[#98A77C] hover:bg-[#88976C] text-white rounded-sm font-medium transition-colors">
                  Ir al Directorio
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PROFESORES VISTOS (SOLO ALUMNO) */}
        {activeTab === "visited" && !isTeacherOrInstitute && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h1 className="text-3xl font-light tracking-tight text-[#2C2C2C] mb-6">Profesores que ya viste el perfil</h1>
            <p className="text-[#5D5D5D] mb-8">Un historial de los profesionales y centros de yoga que estuviste explorando. Podés contactarlos directamente desde aquí.</p>
            
            {visitedTeachers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {visitedTeachers.map((teacher) => (
                  <div key={teacher.id} className="bg-white border border-[#E8E0D0] rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex gap-4 items-start mb-4">
                        <img 
                          src={teacher.image} 
                          alt={teacher.name} 
                          className="w-16 h-16 rounded-2xl object-cover border border-[#E8E0D0]"
                        />
                        <div>
                          <h3 className="font-semibold text-[#2C2C2C] text-lg">{teacher.name}</h3>
                          <p className="text-sm text-[#98A77C] font-medium">{teacher.specialty}</p>
                          <p className="text-xs text-[#5D5D5D] mt-0.5">{teacher.location}</p>
                        </div>
                      </div>
                      <p className="text-sm text-[#5D5D5D] line-clamp-2 mb-6">
                        {teacher.bio}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-4 border-t border-[#E8E0D0]">
                      <div className="grid grid-cols-2 gap-2">
                        <a 
                          href={`mailto:profe_${teacher.id}@omiayoga.com?subject=Consulta sobre clases de yoga - Omia&body=Hola ${teacher.name}, vi tu perfil en Omia y quería hacerte una consulta.`}
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-[#F4EFE4] hover:bg-black/5 text-[#2C2C2C] rounded-xl text-xs font-semibold border border-[#E8E0D0] transition-all"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#5D5D5D]" />
                          <span>Enviar Mail</span>
                        </a>
                        <a 
                          href={`https://wa.me/5491133445566?text=Hola%20${encodeURIComponent(teacher.name)}!%20Vi%20tu%20perfil%20en%20Omia%20y%20me%20gustaría%20hacerte%20una%20consulta%20por%20tus%20clases.%20Gracias!`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-semibold transition-all"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                      <Link 
                        to={`/profesor/${teacher.id}`}
                        className="w-full text-center py-2.5 bg-[#2C2C2C] hover:bg-black text-white rounded-xl text-xs font-semibold transition-all"
                      >
                        Ver Perfil Completo
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#F4EFE4] rounded-3xl border border-[#E8E0D0] py-20 px-6 text-center flex flex-col items-center">
                <Eye className="w-12 h-12 text-[#E5E5E5] mb-4" />
                <h2 className="text-xl font-medium text-[#2C2C2C] mb-2">No viste ningún perfil todavía</h2>
                <p className="text-[#5D5D5D] mb-6 max-w-sm mx-auto">Explorá los perfiles del directorio. Los profes que visites se guardarán automáticamente acá para que no los pierdas.</p>
                <Link to="/directorio" className="px-6 py-3 bg-[#98A77C] hover:bg-[#88976C] text-white rounded-sm font-medium transition-colors">
                  Ver Profesores
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ESTADÍSTICAS / DASHBOARD (SOLO PROFESOR / INSTITUTO) */}
        {activeTab === "stats" && isTeacherOrInstitute && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h1 className="text-3xl font-light tracking-tight text-[#2C2C2C] mb-2">Panel de Control Profesional</h1>
            <p className="text-[#5D5D5D] mb-8">Hacé el seguimiento del rendimiento de tu landing page y el estado financiero de tus reservas.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {/* Card 1: Impresiones */}
              <div className="bg-white border border-[#E8E0D0] rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="p-3 bg-[#98A77C]/10 text-[#98A77C] rounded-2xl">
                    <Eye className="w-5 h-5" />
                  </span>
                </div>
                <p className="text-sm text-[#5D5D5D] font-medium uppercase tracking-wider">Apariciones en Búsqueda</p>
                <h3 className="text-3xl font-mono font-bold text-[#2C2C2C] mt-1">{teacherStats.impressions}</h3>
                <p className="text-xs text-[#5D5D5D] mt-2">Veces que apareció tu perfil</p>
              </div>

              {/* Card 2: Visitas directas */}
              <div className="bg-white border border-[#E8E0D0] rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                    <User className="w-5 h-5" />
                  </span>
                </div>
                <p className="text-sm text-[#5D5D5D] font-medium uppercase tracking-wider">Visitas al Perfil</p>
                <h3 className="text-3xl font-mono font-bold text-[#2C2C2C] mt-1">{teacherStats.visitors.length}</h3>
                <p className="text-xs text-[#5D5D5D] mt-2">Gente que ingresó a tu landing</p>
              </div>

              {/* Card 3: Plata ganada */}
              <div className="bg-white border border-[#E8E0D0] rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <DollarSign className="w-5 h-5" />
                  </span>
                  <span className="text-xs text-white bg-[#98A77C] font-semibold px-2 py-0.5 rounded-sm">100% Tuyo</span>
                </div>
                <p className="text-sm text-[#5D5D5D] font-medium uppercase tracking-wider">Plata Ganada (Histórico)</p>
                <h3 className="text-3xl font-mono font-bold text-[#2C2C2C] mt-1">${teacherStats.earned.toLocaleString("es-AR")}</h3>
                <p className="text-xs text-[#5D5D5D] mt-2">Total facturado por tus reservas</p>
              </div>

              {/* Card 4: Para cobrar */}
              <div className="bg-white border border-[#E8E0D0] rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <span className="text-xs text-[#2C2C2C] bg-[#F4EFE4] border border-[#E8E0D0] font-semibold px-2 py-0.5 rounded-sm">Disponible</span>
                </div>
                <p className="text-sm text-[#5D5D5D] font-medium uppercase tracking-wider">Para Cobrar</p>
                <h3 className="text-3xl font-mono font-bold text-[#98A77C] mt-1">${teacherStats.pendingPayout.toLocaleString("es-AR")}</h3>
                <p className="text-xs text-[#5D5D5D] mt-2">Dinero acumulado para retirar</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Gente que vio tu perfil */}
              <div className="lg:col-span-2 bg-white border border-[#E8E0D0] rounded-3xl p-8 shadow-sm">
                <h3 className="text-xl font-medium text-[#2C2C2C] mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#98A77C]" />
                  <span>Gente que vio tu perfil</span>
                </h3>

                {teacherStats.visitors.length > 0 ? (
                  <div className="divide-y divide-[#E5E5E5]">
                    {teacherStats.visitors.map((visitor, idx) => (
                      <div key={idx} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-sm bg-[#98A77C]/15 text-[#98A77C] flex items-center justify-center font-bold text-sm uppercase">
                            {visitor.name.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-[#2C2C2C] text-sm">{visitor.name}</p>
                            <p className="text-xs text-[#98A77C]">Visita registrada en Omia</p>
                          </div>
                        </div>
                        <span className="text-xs text-[#5D5D5D] font-mono">
                          {new Date(visitor.date).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} hs
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-[#5D5D5D]">
                    <p className="italic">Todavía no se registraron visitas identificadas en tu perfil.</p>
                  </div>
                )}
              </div>

              {/* Explicación del modelo de cobro */}
              <div className="bg-[#F4EFE4] border border-[#E8E0D0] rounded-3xl p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#2C2C2C] mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-[#98A77C]" />
                    <span>Modelo de Pauta Transparente</span>
                  </h3>
                  <p className="text-sm text-[#5D5D5D] leading-relaxed mb-6">
                    Omia opera bajo un esquema de <strong>comisión cero</strong> para los profesionales de yoga. 
                    Cobrás el total del dinero que se genera de tus reservas de clases de forma directa, sin retenciones del sitio.
                  </p>
                  <p className="text-sm text-[#5D5D5D] leading-relaxed">
                    Lo único que abonás para mantener tu landing page activa y recibir tráfico continuo es la <strong>membresía fija mensual</strong>.
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-[#E8E0D0]">
                  <Link 
                    to="/" 
                    className="text-xs text-[#98A77C] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Ver tabla de precios en la Home</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MI LANDING PAGE / PERFIL PUBLICO (SOLO PROFESOR / INSTITUTO) */}
        {activeTab === "landing" && isTeacherOrInstitute && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-light tracking-tight text-[#2C2C2C]">Mi Publicación / Landing Page</h1>
                <p className="text-[#5D5D5D] text-sm mt-1">Configurá la landing page pública que verán tus futuros alumnos.</p>
              </div>
              {profile.teacherId && (
                <Link 
                  to={`/profesor/${profile.teacherId}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2C2C2C] hover:bg-black text-white text-sm font-medium rounded-sm transition-colors shrink-0"
                >
                  <span>Ver mi Landing Page</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {saveLandingSuccess && (
              <div className="mb-8 p-5 bg-green-50 border-2 border-[#98A77C] rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-5 duration-300">
                <CheckCircle2 className="w-6 h-6 text-[#98A77C] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">
                    {profile.teacherStatus === "activo" ? "¡Cambios publicados!" : "¡Perfil guardado!"}
                  </h3>
                  <p className="text-sm text-green-700">
                    {profile.teacherStatus === "activo"
                      ? "Tu publicación está online. Podés compartir este enlace: "
                      : "Para que aparezca en el directorio, activá tu plan en la pestaña Plan Premium. Así se va a ver: "}
                    <Link to={`/profesor/${profile.teacherId}`} className="font-bold underline text-[#2C2C2C]">
                      {window.location.origin}/profesor/{profile.teacherId}
                    </Link>
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveLanding} className="bg-white border border-[#E8E0D0] rounded-3xl p-8 shadow-sm flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#5D5D5D] mb-2">Nombre del Profesor o Instituto *</label>
                  <input 
                    type="text" 
                    value={landingForm.name}
                    onChange={e => setLandingForm({...landingForm, name: e.target.value})}
                    placeholder="Ej. Estudio de Yoga Serene, Profe Lena"
                    className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5D5D5D] mb-2">Especialidad / Estilos de Yoga *</label>
                  <input 
                    type="text" 
                    value={landingForm.specialty}
                    onChange={e => setLandingForm({...landingForm, specialty: e.target.value})}
                    placeholder="Ej. Vinyasa Flow, Ashtanga, Hatha, Yin Yoga"
                    className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#5D5D5D] mb-2">Barrio / Zona *</label>
                  <select 
                    value={landingForm.location}
                    onChange={e => setLandingForm({...landingForm, location: e.target.value})}
                    className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none transition-all cursor-pointer"
                    required
                  >
                    <option value="Palermo">Palermo</option>
                    <option value="Belgrano">Belgrano</option>
                    <option value="San Telmo">San Telmo</option>
                    <option value="Recoleta">Recoleta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5D5D5D] mb-2">Precio sugerido por clase *</label>
                  <input 
                    type="text" 
                    value={landingForm.price}
                    onChange={e => setLandingForm({...landingForm, price: e.target.value})}
                    placeholder="Ej. $8.000/clase o Gratis"
                    className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {profile.role === "instituto" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-[#5D5D5D] mb-2">Dirección</label>
                    <input type="text" value={landingForm.address} onChange={e => setLandingForm({...landingForm, address: e.target.value})} placeholder="Ej. Humboldt 1942, Palermo" className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#5D5D5D] mb-2">Horarios de atención</label>
                    <input type="text" value={landingForm.hours} onChange={e => setLandingForm({...landingForm, hours: e.target.value})} placeholder="Ej. Lun a Sáb 07:00 a 21:00 hs" className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-[#5D5D5D] mb-2">Comodidades (separadas por coma)</label>
                    <input type="text" value={landingForm.amenities.join(", ")} onChange={e => setLandingForm({...landingForm, amenities: e.target.value.split(",").map(a => a.trimStart()).filter((a, i, all) => a || i === all.length - 1)})} placeholder="Ej. Camas Reformer, Mat incluido, Duchas" className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#5D5D5D] mb-2">E-mail de Contacto Público *</label>
                  <input 
                    type="email" 
                    value={landingForm.email || ""}
                    onChange={e => setLandingForm({...landingForm, email: e.target.value})}
                    placeholder="Ej. mi.contacto@yogaestudio.com"
                    className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#5D5D5D] mb-2">Teléfono o WhatsApp de Contacto *</label>
                  <input 
                    type="text" 
                    value={landingForm.phone || ""}
                    onChange={e => setLandingForm({...landingForm, phone: e.target.value})}
                    placeholder="Ej. 5491133445566 (Sólo números: código país + área + número)"
                    className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#5D5D5D] mb-3">Días Disponibles *</label>
                <div className="flex flex-wrap gap-2">
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => {
                    const isSelected = (landingForm.availableDays || []).includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleAvailableDay(day)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-[#98A77C] text-white border-[#98A77C]"
                            : "bg-[#F4EFE4] text-[#5D5D5D] border-[#E8E0D0] hover:border-[#98A77C]/40"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#5D5D5D] mb-2">Imagen de Portada (URL de Foto) *</label>
                <input 
                  type="text" 
                  value={landingForm.image}
                  onChange={e => setLandingForm({...landingForm, image: e.target.value})}
                  placeholder="Ej. https://images.unsplash.com/..."
                  className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none transition-all font-mono text-xs"
                  required
                />
                
                {/* Atajos de fotos de portada hermosas */}
                <div className="mt-3">
                  <p className="text-[11px] text-[#5D5D5D] font-medium uppercase tracking-wider mb-2">Fotos recomendadas (Toca para seleccionar):</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Yoga Mat y Espacio", url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600" },
                      { label: "Estiramiento", url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=600" },
                      { label: "Meditación Zen", url: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=600" },
                      { label: "Estudio Nórdico", url: "https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&q=80&w=600" }
                    ].map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setLandingForm({ ...landingForm, image: preset.url })}
                        className={`p-2 bg-[#F4EFE4] border rounded-lg text-[10px] font-medium text-left truncate transition-all ${
                          landingForm.image === preset.url ? "border-[#98A77C] bg-[#98A77C]/5 font-bold" : "border-[#E8E0D0] hover:border-[#98A77C]/30"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECCIÓN DE SUBIDA MULTI-IMAGEN CON CONVERSIÓN WEBP AUTOMÁTICA */}
              <div className="border-t border-[#E8E0D0] pt-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#5D5D5D]">Galería de Fotos de tu Estudio o Clases (Tipo Airbnb)</label>
                    <p className="text-xs text-[#5D5D5D] mt-0.5">Sube varias fotos de alta calidad. Se optimizarán automáticamente a formato WebP.</p>
                  </div>
                  <span className="self-start sm:self-center text-[11px] bg-[#98A77C]/15 text-[#98A77C] font-bold px-3 py-1 rounded-sm uppercase tracking-wider">
                    Auto-WebP Activo
                  </span>
                </div>

                {/* Grid de fotos subidadas */}
                {(landingForm.images || []).length > 0 && (
                  <div className="mb-6 bg-[#F4EFE4]/50 p-4 rounded-2xl border border-[#E8E0D0]">
                    <p className="text-xs text-[#5D5D5D] font-semibold mb-3">Tus imágenes en la Galería ({landingForm.images.length} fotos):</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {(landingForm.images || []).map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[#E8E0D0] group/thumb bg-white">
                          <img 
                            src={img} 
                            alt={`Preview ${idx}`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryImage(idx)}
                              className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-sm shadow-md transition-transform hover:scale-110 cursor-pointer"
                              title="Eliminar foto"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {idx === 0 && (
                            <span className="absolute bottom-1.5 left-1.5 bg-[#98A77C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                              Portada
                            </span>
                          )}
                          <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow-sm">
                            WEBP
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Caja de subida */}
                <div className="relative">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleGalleryUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isUploadingGallery}
                  />
                  <div className="border-2 border-dashed border-[#E8E0D0] hover:border-[#98A77C] rounded-2xl p-8 text-center transition-all bg-[#F4EFE4] flex flex-col items-center justify-center gap-3">
                    {isUploadingGallery ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-[#98A77C]/30 border-t-[#98A77C] rounded-sm animate-spin" />
                        <p className="text-sm font-medium text-[#5D5D5D]">Optimizando y convirtiendo imágenes a WebP...</p>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-white border border-[#E8E0D0] rounded-sm text-[#98A77C] shadow-sm">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#2C2C2C] text-sm">Hace clic o arrastra múltiples fotos aquí</p>
                          <p className="text-xs text-[#5D5D5D] mt-1">Soporta PNG, JPG, JPEG, etc. Todas se transformarán de inmediato a WebP.</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#5D5D5D] mb-2">Presentación / Biografía Pública *</label>
                <textarea 
                  value={landingForm.bio}
                  onChange={e => setLandingForm({...landingForm, bio: e.target.value})}
                  placeholder="Contanos sobre tu trayectoria, el estilo de tus clases, la dirección de tu estudio, qué tipo de alumnos recibís, etc."
                  rows={6}
                  className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-xl px-4 py-3 outline-none transition-all resize-none text-sm"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={saveLandingLoading}
                className="w-full bg-[#2C2C2C] hover:bg-black text-white py-4 rounded-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saveLandingLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-sm animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Guardar Datos y Publicar Landing Page</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 7: PLAN DE PAUTA (Suscripciones de Profesores / Institutos) */}
        {activeTab === "premium" && isTeacherOrInstitute && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h1 className="text-3xl font-light tracking-tight text-[#2C2C2C] mb-6">Mi Membresía de Pauta</h1>
            
            {profile.isPremium ? (
              <div className="bg-[#98A77C]/10 border-2 border-[#98A77C] rounded-3xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3 text-[#98A77C]">
                    <Sparkles className="w-6 h-6" />
                    <span className="font-semibold uppercase tracking-wider text-sm">Tu membresía fija está activa</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-[#2C2C2C] mb-2">
                    Membresía Activa: {profile.plan === "inicial" ? "Plan Inicial" : profile.plan === "institucional" ? "Plan Institutos" : "Plan Destacado"}
                  </h2>
                  <p className="text-[#5D5D5D] max-w-xl text-sm leading-relaxed">
                    Tu suscripción se encuentra vinculada a tu cuenta. Disfrutás de visibilidad completa en el mapa de búsquedas de zona, acceso para editar tu landing page en tiempo real, recolección de estadísticas detalladas de visitas y total prioridad de recomendación en nuestro guía inteligente por IA.
                  </p>
                </div>
                <div className="bg-white/80 backdrop-blur border border-[#98A77C] rounded-2xl p-4 text-center shrink-0 w-full md:w-auto">
                  <p className="text-xs text-[#5D5D5D] font-medium uppercase tracking-wider mb-1">Estado de Facturación</p>
                  <p className="text-lg font-bold text-green-700">Abonado vía Mercado Pago</p>
                  <p className="text-xs text-[#5D5D5D] mt-1">
                    {profile.planExpiresAt ? `Vigente hasta el ${new Date(profile.planExpiresAt).toLocaleDateString("es-AR")}` : "Plan activo"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E8E0D0] rounded-3xl p-8 shadow-sm">
                <div className="text-center max-w-2xl mx-auto py-8">
                  <AlertCircle className="w-12 h-12 text-[#98A77C] mx-auto mb-4" />
                  <h2 className="text-2xl font-medium text-[#2C2C2C] mb-3">Pauta no activa</h2>
                  <p className="text-[#5D5D5D] mb-8 leading-relaxed">
                    Para poder publicar tu landing page, subir tus datos, imágenes y figurar en las búsquedas inteligentes del directorio de Omia, debés contar con un plan de pauta mensual activo. El cobro se realiza de forma fija sin comisiones sobre tus ventas.
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    {([
                      { id: "inicial", name: "Plan Inicial", desc: "Tu perfil publicado en el directorio." },
                      { id: "destacado", name: "Plan Destacado (más elegido)", desc: "Prioridad en las búsquedas, insignia y estadísticas completas." },
                      { id: "institucional", name: "Plan Institucional", desc: "Para institutos y estudios con varios profesores." },
                    ] as const).map(plan => (
                      <div key={plan.id} className="p-6 bg-[#F4EFE4] rounded-3xl border border-[#E8E0D0] flex flex-col sm:flex-row justify-between items-center gap-4 text-left">
                        <div>
                          <h4 className="font-semibold text-[#2C2C2C]">{plan.name}</h4>
                          <p className="text-xs text-[#5D5D5D] mt-0.5">{plan.desc}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                          <span className="text-2xl font-mono font-bold text-[#2C2C2C]">{formatPrice(plan.id)}<span className="text-xs text-[#5D5D5D] font-sans">/mes</span></span>
                          <button
                            onClick={() => handlePay("subscription", plan.id)}
                            disabled={isPayingId !== null}
                            className="px-5 py-3 bg-[#009EE3] hover:bg-[#008CD0] disabled:opacity-60 text-white rounded-sm text-xs font-bold transition-all shadow-sm"
                          >
                            {isPayingId === plan.id ? "Abriendo…" : "Abonar Plan"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!profile.teacherId && (
                    <p className="mt-6 text-sm text-[#5D5D5D]">
                      Antes de abonar, completá y guardá tu perfil en la pestaña <strong>Mi Página</strong>.
                    </p>
                  )}

                  <div className="mt-8 text-xs text-[#5D5D5D]">
                    ¿Querés ver otros planes de precios? <Link to="/" className="text-[#98A77C] font-medium hover:underline">Ir a la tabla comparativa de 3 planes en la Home.</Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: RESEÑAS */}
        {activeTab === "reseñas" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h1 className="text-3xl font-light tracking-tight text-[#2C2C2C] mb-6">
              {isTeacherOrInstitute ? "Reseñas de mis Alumnos" : "Mis Reseñas de Clases"}
            </h1>
            {reviews.length > 0 ? (
              <div className="flex flex-col gap-6">
                {reviews.map(review => (
                  <div key={review.id} className="bg-white border border-[#E8E0D0] rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-[#5D5D5D] font-medium mb-1">
                          {isTeacherOrInstitute ? `Dejado por: ${review.userName || 'Alumno/a de Omia'}` : `Reseña para ${review.teacherName}`}
                        </p>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? "fill-[#98A77C] text-[#98A77C]" : "text-[#E5E5E5] fill-[#F4EFE4]"}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-[#5D5D5D] bg-[#F4EFE4] px-3 py-1 rounded-sm border border-[#E8E0D0]">
                        {new Date(review.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[#2C2C2C] bg-[#F4EFE4] p-4 rounded-2xl italic">
                      "{review.comment}"
                    </p>
                    {review.reply && (
                      <p className="mt-3 ml-6 text-sm text-[#5D5D5D] border-l-2 border-[#98A77C] pl-4">
                        <strong className="text-[#2C2C2C]">Respuesta del profesional:</strong> {review.reply}
                      </p>
                    )}
                    {isTeacherOrInstitute && (
                      <button onClick={() => handleReplyReview(review)} className="mt-3 text-sm font-medium text-[#98A77C] hover:underline">
                        {review.reply ? "Editar respuesta" : "Responder"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#F4EFE4] rounded-3xl border border-[#E8E0D0] py-20 px-6 text-center flex flex-col items-center">
                <MessageSquare className="w-12 h-12 text-[#E5E5E5] mb-4" />
                <h2 className="text-xl font-medium text-[#2C2C2C] mb-2">Aún no hay reseñas registradas</h2>
                <p className="text-[#5D5D5D] max-w-sm mx-auto">
                  {isTeacherOrInstitute 
                    ? "Los alumnos que tomen clases con vos podrán dejarte calificaciones aquí para que otros los vean." 
                    : "Calificá a tus profes después de las clases para ayudar a otros estudiantes a encontrarlos."}
                </p>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// ArrowRight helper function
function ArrowRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
