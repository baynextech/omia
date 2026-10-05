import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { AIChat } from "../components/AIChat";
import { useAuth } from "../contexts/AuthContext";
import { AuthModal } from "../components/AuthModal";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function RootLayout() {
  const { isAuthenticated, logout, profile, isAdmin } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setScrolled] = useState(false);
  // Solo la home tiene un hero oscuro detrás; en el resto el encabezado va siempre sólido.
  const { pathname } = useLocation();
  const scrolled = isScrolled || pathname !== "/";
  // Los paneles (/perfil y /admin) traen su propia barra lateral y cabecera: ahí no va el menú ni el pie del sitio.
  const isPanel = isAuthenticated && /^\/(perfil|admin)/.test(pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F4EFE4] font-sans text-[#2C2C2C]">
      {/* Navigation */}
      <nav className={`${isPanel ? "hidden " : ""}fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-[#F4EFE4]/95 backdrop-blur-md shadow-sm border-b border-[#E0D8CC]"
          : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className={`text-2xl font-serif italic font-medium tracking-tight transition-colors ${scrolled ? "text-[#1C3829]" : "text-white"}`}>
            Omia
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { to: "/directorio", label: "Directorio" },
              { to: "/estudios", label: "Estudios" },
              { to: "/ranking", label: "Ranking" },
              { to: "/tienda", label: "Tienda" },
              { to: "/para-profes", label: "Para Profes" },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm font-medium transition-colors hover:text-[#98A77C] ${scrolled ? "text-[#2C2C2C]" : "text-white/90"}`}
              >
                {label}
              </Link>
            ))}
            {isAuthenticated && (
              <Link to="/favoritos" className={`text-sm font-medium transition-colors hover:text-[#98A77C] ${scrolled ? "text-[#2C2C2C]" : "text-white/90"}`}>
                Favoritos
              </Link>
            )}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-1.5 bg-[#1C3829] hover:bg-[#152e1f] text-white px-4 py-2 rounded-sm text-xs font-bold transition-colors">
                    Admin
                  </Link>
                )}
                <Link to="/perfil" className={`flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-medium transition-colors ${
                  scrolled
                    ? "bg-white hover:bg-[#E8E0D0] text-[#2C2C2C] border border-[#E8E0D0]"
                    : "bg-white/15 border border-white/30 text-white hover:bg-white/25"
                }`}>
                  Mi Perfil
                </Link>
                <button onClick={logout} className={`text-sm font-medium hover:opacity-70 transition-opacity cursor-pointer ${scrolled ? "text-[#2C2C2C]" : "text-white"}`}>
                  Salir
                </button>
              </>
            ) : (
              <>
                <button onClick={() => openAuth("login")} className={`text-sm font-medium hover:opacity-70 transition-opacity cursor-pointer ${scrolled ? "text-[#2C2C2C]" : "text-white/90"}`}>
                  Ingresá
                </button>
                <button
                  onClick={() => openAuth("register")}
                  className={`px-5 py-2.5 rounded-sm text-sm font-medium transition-all cursor-pointer ${
                    scrolled
                      ? "bg-[#1C3829] hover:bg-[#152e1f] text-white"
                      : "bg-white text-[#1C3829] hover:bg-[#F4EFE4]"
                  }`}
                >
                  Registrate
                </button>
              </>
            )}
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-3">
            {isAuthenticated && (
              <Link to="/perfil" className={`px-3.5 py-2 rounded-sm text-xs font-semibold border transition-colors ${
                scrolled ? "bg-white text-[#2C2C2C] border-[#E8E0D0]" : "bg-white/15 text-white border-white/30"
              }`}>
                Mi Perfil
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 transition-colors rounded-sm border w-10 h-10 flex items-center justify-center cursor-pointer ${
                scrolled ? "text-[#2C2C2C] border-[#E0D8CC] bg-white" : "text-white border-white/30 bg-white/10"
              }`}
              aria-label="Menu principal"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="md:hidden border-b border-[#E8E0D0] bg-[#F4EFE4] overflow-hidden shadow-lg"
            >
              <div className="px-6 py-6 flex flex-col gap-5">
                {[
                  { to: "/directorio", label: "Directorio de Profesores", sub: "Buscar" },
                  { to: "/estudios", label: "Estudios e Institutos", sub: "Centros" },
                  { to: "/ranking", label: "Ranking de Profesionales", sub: "Top" },
                  { to: "/tienda", label: "Tienda Omia", sub: "Productos" },
                  { to: "/para-profes", label: "Membresías para Profes", sub: "Planes" },
                ].map(({ to, label, sub }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-base font-semibold py-2 px-3 hover:bg-[#E8E0D0]/40 rounded-sm transition-all flex items-center justify-between text-[#2C2C2C]"
                  >
                    <span>{label}</span>
                    <span className="text-xs font-medium text-[#98A77C]">{sub}</span>
                  </Link>
                ))}
                {isAuthenticated && (
                  <Link
                    to="/favoritos"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-base font-semibold py-2 px-3 hover:bg-[#E8E0D0]/40 rounded-sm transition-all flex items-center justify-between text-[#2C2C2C]"
                  >
                    <span>Mis Favoritos</span>
                    <span className="text-xs font-medium text-red-400">♥</span>
                  </Link>
                )}

                <div className="border-t border-[#E8E0D0] pt-5 mt-2 flex flex-col gap-3">
                  {isAuthenticated ? (
                    <div className="flex items-center justify-between px-3">
                      <span className="text-sm text-[#5D5D5D] truncate max-w-[150px]">
                        Hola, {profile?.name || profile?.email}
                      </span>
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                        className="text-sm font-semibold text-red-500 hover:text-red-600 py-2 px-4 rounded-sm hover:bg-red-50/50 transition-all cursor-pointer"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); openAuth("login"); }}
                        className="py-3 px-4 text-center rounded-sm text-sm font-semibold border border-[#E0D8CC] hover:bg-[#E8E0D0]/40 transition-all cursor-pointer"
                      >
                        Ingresá
                      </button>
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); openAuth("register"); }}
                        className="py-3 px-4 text-center bg-[#1C3829] hover:bg-[#152e1f] text-white rounded-sm text-sm font-semibold transition-all cursor-pointer"
                      >
                        Registrate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main>
        <Outlet />
      </main>

      <footer className={`${isPanel ? "hidden " : ""}bg-[#1C3829] py-16 px-6`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-12">
            <div>
              <span className="text-3xl font-serif italic text-[#F4EFE4]">Omia</span>
              <p className="text-[#9DB085] text-sm mt-3 max-w-xs leading-relaxed">
                La plataforma para encontrar profesores e institutos de Yoga & Pilates en Argentina.
              </p>
            </div>
            <div className="flex flex-wrap gap-12">
              <div className="flex flex-col gap-3">
                <span className="text-[#F4EFE4] text-xs font-bold uppercase tracking-widest">Plataforma</span>
                <Link to="/directorio" className="text-[#9DB085] text-sm hover:text-[#F4EFE4] transition-colors">Directorio</Link>
                <Link to="/estudios" className="text-[#9DB085] text-sm hover:text-[#F4EFE4] transition-colors">Estudios</Link>
                <Link to="/ranking" className="text-[#9DB085] text-sm hover:text-[#F4EFE4] transition-colors">Ranking</Link>
                <Link to="/tienda" className="text-[#9DB085] text-sm hover:text-[#F4EFE4] transition-colors">Tienda</Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[#F4EFE4] text-xs font-bold uppercase tracking-widest">Profesionales</span>
                <Link to="/para-profes" className="text-[#9DB085] text-sm hover:text-[#F4EFE4] transition-colors">Para Profes</Link>
                <a href="#planes-section" className="text-[#9DB085] text-sm hover:text-[#F4EFE4] transition-colors">Membresías</a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[#F4EFE4] text-xs font-bold uppercase tracking-widest">Legal</span>
                <a href="#" className="text-[#9DB085] text-sm hover:text-[#F4EFE4] transition-colors">Nosotros</a>
                <a href="#" className="text-[#9DB085] text-sm hover:text-[#F4EFE4] transition-colors">Términos</a>
                <a href="#" className="text-[#9DB085] text-sm hover:text-[#F4EFE4] transition-colors">Privacidad</a>
              </div>
            </div>
          </div>
          <div className="border-t border-[#2a4d38] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[#6B8C78] text-sm">© {new Date().getFullYear()} Omia Bienestar. Todos los derechos reservados.</p>
            <p className="text-[#6B8C78] text-xs">Yoga · Pilates · Reformer · Mat · Barre · Buenos Aires</p>
          </div>
        </div>
      </footer>

      <AIChat />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authMode} />
    </div>
  );
}
