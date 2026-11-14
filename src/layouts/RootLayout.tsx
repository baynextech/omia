import { useState, useEffect } from "react";
import { Outlet, Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AIChat } from "../components/AIChat";
import { useAuth } from "../contexts/AuthContext";
import { AuthModal } from "../components/AuthModal";
import { Analytics } from "../components/Analytics";
import { UserMenu, UserAvatar } from "../components/UserMenu";
import { useContent } from "../contexts/ContentContext";
import { safeHref } from "../lib/content";
import { Logo } from "../components/Logo";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function RootLayout() {
  const { isAuthenticated, logout, profile, isAdmin } = useAuth();
  const { t } = useContent();
  const announcement = t("site.announcement").trim();
  const announcementHref = safeHref(t("site.announcement_link"));
  const [announcementClosed, setAnnouncementClosed] = useState(() => { try { return sessionStorage.getItem("omia_announcement") === t("site.announcement"); } catch { return false; } });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);
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

  // /login, /registro y el enlace del mail de recuperación (/?reset=…) abren el modal de acceso.
  const navigate = useNavigate();
  const { search } = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(search);
    const auth = params.get("auth");
    if (auth === "login" || auth === "register") {
      setAuthMode(auth);
      setIsAuthModalOpen(true);
      // Después de ingresar se vuelve a donde se quería ir (solo rutas internas).
      const next = params.get("next");
      if (next && /^\/(?!\/)/.test(next)) { setNextPath(next); }
      navigate(pathname, { replace: true });
    } else if (params.get("reset")) {
      setAuthMode("login");
      setIsAuthModalOpen(true);
    }
  }, [search]);

  useEffect(() => {
    if (nextPath && isAuthenticated) { const to = nextPath; setNextPath(null); setIsAuthModalOpen(false); navigate(to, { replace: true }); }
  }, [nextPath, isAuthenticated]);

  const showAnnouncement = !!announcement && !announcementClosed && !isPanel;

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-dvh bg-lino font-sans text-bosque">
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      {showAnnouncement && (
        <div className="fixed top-0 left-0 right-0 z-50 h-9 bg-bosque text-lino text-xs sm:text-sm flex items-center justify-center px-10 text-center">
          {announcementHref ? (
            <a href={announcementHref} className="hover:underline truncate">{announcement}</a>
          ) : (
            <span className="truncate">{announcement}</span>
          )}
          <button
            aria-label="Cerrar anuncio"
            onClick={() => { setAnnouncementClosed(true); try { sessionStorage.setItem("omia_announcement", announcement); } catch {} }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className={`${isPanel ? "hidden " : ""}fixed ${showAnnouncement ? "top-9" : "top-0"} left-0 right-0 z-40 transition-[background-color,box-shadow,border-color] duration-300 border-b ${
        scrolled
          ? "bg-lino/95 backdrop-blur-md shadow-sm border-lino-oscuro"
          : "bg-transparent border-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" aria-label="Omia" className={`transition-colors ${scrolled ? "text-bosque" : "text-lino"}`}>
            <Logo className="h-7 w-auto" />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { to: "/directorio", label: "Directorio" },
              { to: "/estudios", label: "Estudios" },
              { to: "/ranking", label: "Ranking" },
              { to: "/tienda", label: "Tienda" },
              { to: "/noticias", label: "Noticias" },
              { to: "/para-profes", label: "Para Profes" },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={`enlace-trazo text-sm font-medium transition-colors ${scrolled ? "text-bosque hover:text-salvia-oscuro" : "text-white/90 hover:text-salvia-claro"}`}
              >
                {label}
              </NavLink>
            ))}
            {isAuthenticated && (
              <NavLink to="/favoritos" className={`enlace-trazo text-sm font-medium transition-colors ${scrolled ? "text-bosque hover:text-salvia-oscuro" : "text-white/90 hover:text-salvia-claro"}`}>
                Favoritos
              </NavLink>
            )}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <UserMenu scrolled={scrolled} />
            ) : (
              <>
                <button onClick={() => openAuth("login")} className={`text-sm font-medium hover:opacity-70 transition-opacity cursor-pointer ${scrolled ? "text-bosque" : "text-white/90"}`}>
                  Ingresá
                </button>
                <button
                  onClick={() => openAuth("register")}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition cursor-pointer ${
                    scrolled
                      ? "bg-bosque hover:bg-bosque-profundo text-lino"
                      : "bg-white text-bosque hover:bg-lino"
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
              <Link to="/perfil" aria-label="Mi perfil" className="flex items-center"><UserAvatar size={36} /></Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 transition-colors rounded-full border w-10 h-10 flex items-center justify-center cursor-pointer ${
                scrolled ? "text-bosque border-lino-oscuro bg-white" : "text-white border-white/30 bg-white/10"
              }`}
              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="menu-movil"
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
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              id="menu-movil"
              className="md:hidden border-b border-lino-oscuro bg-lino overflow-hidden shadow-lg"
            >
              <div className="px-6 py-6 flex flex-col gap-5">
                {[
                  { to: "/directorio", label: "Directorio de Profesores", sub: "Buscar" },
                  { to: "/estudios", label: "Estudios e Institutos", sub: "Centros" },
                  { to: "/ranking", label: "Ranking de Profesionales", sub: "Top" },
                  { to: "/tienda", label: "Tienda Omia", sub: "Productos" },
                  { to: "/noticias", label: "Noticias", sub: "Novedades" },
                  { to: "/para-profes", label: "Membresías para Profes", sub: "Planes" },
                ].map(({ to, label, sub }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-base font-semibold py-2 px-3 hover:bg-lino-oscuro/40 rounded-sm transition flex items-center justify-between text-bosque"
                  >
                    <span>{label}</span>
                    <span className="text-xs font-medium text-salvia-oscuro">{sub}</span>
                  </Link>
                ))}
                {isAuthenticated && (
                  <Link
                    to="/favoritos"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-base font-semibold py-2 px-3 hover:bg-lino-oscuro/40 rounded-sm transition flex items-center justify-between text-bosque"
                  >
                    <span>Mis Favoritos</span>
                    <span className="text-xs font-medium text-red-400">♥</span>
                  </Link>
                )}

                <div className="border-t border-lino-oscuro pt-5 mt-2 flex flex-col gap-3">
                  {isAuthenticated ? (
                    <div className="flex items-center justify-between px-3">
                      <span className="text-sm text-musgo truncate max-w-[150px]">
                        Hola, {profile?.name || profile?.email}
                      </span>
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                        className="text-sm font-semibold text-red-500 hover:text-red-600 py-2 px-4 rounded-full hover:bg-red-50/50 transition cursor-pointer"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); openAuth("login"); }}
                        className="py-3 px-4 text-center rounded-full text-sm font-semibold border border-lino-oscuro hover:bg-lino-oscuro/40 transition cursor-pointer"
                      >
                        Ingresá
                      </button>
                      <button
                        onClick={() => { setIsMobileMenuOpen(false); openAuth("register"); }}
                        className="py-3 px-4 text-center bg-bosque hover:bg-bosque-profundo text-lino rounded-full text-sm font-semibold transition cursor-pointer"
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

      <main id="contenido" tabIndex={-1} className={`outline-none ${showAnnouncement ? "pt-9" : ""}`}>
        <Outlet />
      </main>

      <footer className={`${isPanel ? "hidden " : ""}bg-bosque py-16 px-6`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-12">
            <div>
              <Logo className="h-9 w-auto text-lino" />
              <p className="text-salvia text-sm mt-3 max-w-xs leading-relaxed">
                {t("footer.tagline")}
              </p>
            </div>
            <div className="flex flex-wrap gap-12">
              <div className="flex flex-col gap-3">
                <span className="text-lino text-sm font-semibold mb-1">Plataforma</span>
                <Link to="/directorio" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Directorio</Link>
                <Link to="/estudios" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Estudios</Link>
                <Link to="/ranking" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Ranking</Link>
                <Link to="/tienda" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Tienda</Link>
                <Link to="/noticias" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Noticias</Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-lino text-sm font-semibold mb-1">Profesionales</span>
                <Link to="/para-profes" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Para Profes</Link>
                <Link to="/para-profes" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Membresías</Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-lino text-sm font-semibold mb-1">Legal</span>
                <Link to="/nosotros" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Nosotros</Link>
                <Link to="/contacto" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Contacto</Link>
                <Link to="/terminos" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Términos</Link>
                <Link to="/privacidad" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Privacidad</Link>
                <Link to="/arrepentimiento" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Botón de arrepentimiento</Link>
                <Link to="/contacto?tipo=baja" className="enlace-trazo w-fit text-salvia text-sm hover:text-lino transition-colors">Botón de baja</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-bosque-linea pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-salvia text-sm">© {new Date().getFullYear()} {t("legal.name")}. Todos los derechos reservados.</p>
            <p className="text-salvia text-xs flex items-center gap-4">
              {t("contact.instagram") && <a href={`https://instagram.com/${t("contact.instagram").replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-lino">Instagram</a>}
              {t("contact.whatsapp") && <a href={`https://wa.me/${t("contact.whatsapp").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-lino">WhatsApp</a>}
              <span>{t("footer.bottom")}</span>
            </p>
          </div>
        </div>
      </footer>

      <Analytics />
      <AIChat />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authMode} />
    </div>
  );
}
