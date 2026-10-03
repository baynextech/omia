import { useState, useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
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
  const [scrolled, setScrolled] = useState(false);

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
    <div className="min-h-screen bg-white font-sans text-[#2C2C2C]">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-40 border-b border-[#E5E5E5] transition-shadow duration-300 ${scrolled ? "shadow-md" : "shadow-none"}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-2xl font-serif italic font-medium tracking-tight">Omia</Link>
          </div>
          
          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/directorio" className="text-sm font-medium hover:text-[#8CAE99] transition-colors">Directorio</Link>
            <Link to="/estudios" className="text-sm font-medium hover:text-[#8CAE99] transition-colors">Estudios e Institutos</Link>
            <Link to="/tienda" className="text-sm font-medium text-[#8CAE99] font-semibold hover:text-[#7a9d88] transition-colors flex items-center gap-1">
              <span>Tienda</span>
              <span className="bg-[#8CAE99]/15 text-[#8CAE99] text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase">Nuevo</span>
            </Link>
            <Link to="/para-profes" className="text-sm font-medium hover:text-[#8CAE99] transition-colors">Para Profes</Link>
            {isAuthenticated && (
              <Link to="/favoritos" className="text-sm font-medium hover:text-[#8CAE99] transition-colors">Mis Favoritos</Link>
            )}
          </div>
          
          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-1.5 bg-[#2C2C2C] hover:bg-black text-white px-4 py-2 rounded-full text-xs font-bold transition-colors">
                    Admin
                  </Link>
                )}
                <Link to="/perfil" className="flex items-center gap-2 bg-[#FDFBF7] hover:bg-[#E5E5E5] text-[#2C2C2C] px-5 py-2.5 rounded-full text-sm font-medium transition-colors border border-[#E5E5E5]">
                  Mi Perfil
                </Link>
                <button onClick={logout} className="text-sm font-medium hover:opacity-70 transition-opacity cursor-pointer">
                  Salir
                </button>
              </>
            ) : (
              <>
                <button onClick={() => openAuth("login")} className="text-sm font-medium hover:opacity-70 transition-opacity cursor-pointer">
                  Ingresá
                </button>
                <button onClick={() => openAuth("register")} className="bg-[#2C2C2C] hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer">
                  Registrate
                </button>
              </>
            )}
          </div>

          {/* Mobile Actions and Hamburger */}
          <div className="flex md:hidden items-center gap-3">
            {isAuthenticated && (
              <Link to="/perfil" className="bg-[#FDFBF7] text-[#2C2C2C] px-3.5 py-2 rounded-full text-xs font-semibold transition-colors border border-[#E5E5E5]">
                Mi Perfil
              </Link>
            )}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-[#2C2C2C] hover:text-[#8CAE99] transition-colors rounded-xl border border-[#E5E5E5] bg-[#FDFBF7] w-11 h-11 flex items-center justify-center cursor-pointer"
              aria-label="Menu principal"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="md:hidden border-b border-[#E5E5E5] bg-white overflow-hidden shadow-lg"
            >
              <div className="px-6 py-6 flex flex-col gap-5">
                <Link 
                  to="/directorio" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-base font-semibold py-2 px-3 hover:bg-neutral-50 rounded-xl transition-all flex items-center justify-between text-[#2C2C2C]"
                >
                  <span>Directorio de Profesores</span>
                  <span className="text-xs font-medium text-[#8CAE99]">Buscar</span>
                </Link>
                <Link 
                  to="/estudios" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-base font-semibold py-2 px-3 hover:bg-neutral-50 rounded-xl transition-all flex items-center justify-between text-[#2C2C2C]"
                >
                  <span>Estudios e Institutos</span>
                  <span className="text-xs font-medium text-[#8CAE99]">Centros</span>
                </Link>
                <Link 
                  to="/tienda" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-base font-semibold py-2 px-3 hover:bg-neutral-50 rounded-xl transition-all flex items-center justify-between text-[#2C2C2C]"
                >
                  <span className="flex items-center gap-2">
                    <span>Tienda Omia</span>
                    <span className="bg-[#8CAE99] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">YOGA & PILATES</span>
                  </span>
                  <span className="text-xs font-medium text-[#8CAE99]">Productos</span>
                </Link>
                <Link 
                  to="/para-profes" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-base font-semibold py-2 px-3 hover:bg-neutral-50 rounded-xl transition-all flex items-center justify-between text-[#2C2C2C]"
                >
                  <span>Membresías para Profes</span>
                  <span className="text-xs font-medium text-[#8CAE99]">Planes</span>
                </Link>
                {isAuthenticated && (
                  <Link 
                    to="/favoritos" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-base font-semibold py-2 px-3 hover:bg-neutral-50 rounded-xl transition-all flex items-center justify-between text-[#2C2C2C]"
                  >
                    <span>Mis Favoritos</span>
                    <span className="text-xs font-medium text-red-400">♥</span>
                  </Link>
                )}
                
                <div className="border-t border-[#E5E5E5] pt-5 mt-2 flex flex-col gap-3">
                  {isAuthenticated ? (
                    <div className="flex items-center justify-between px-3">
                      <span className="text-sm text-[#5D5D5D] truncate max-w-[150px]">
                        Hola, {profile?.name || profile?.email}
                      </span>
                      <button 
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          logout();
                        }}
                        className="text-sm font-semibold text-red-500 hover:text-red-600 py-2 px-4 rounded-xl hover:bg-red-50/50 transition-all cursor-pointer"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          openAuth("login");
                        }} 
                        className="py-3 px-4 text-center rounded-full text-sm font-semibold border border-[#E5E5E5] hover:bg-neutral-50 transition-all cursor-pointer"
                      >
                        Ingresá
                      </button>
                      <button 
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          openAuth("register");
                        }} 
                        className="py-3 px-4 text-center bg-[#2C2C2C] hover:bg-black text-white rounded-full text-sm font-semibold transition-all cursor-pointer"
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

      {/* Main Content */}
      <main className="pt-20">
        <Outlet />
      </main>

      <footer className="bg-[#FDFBF7] py-12 px-6 border-t border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="text-xl font-serif italic text-[#2C2C2C]">Omia</span>
          <div className="flex gap-6 text-sm text-[#5D5D5D]">
            <a href="#" className="hover:text-[#2C2C2C]">Nosotros</a>
            <a href="#" className="hover:text-[#2C2C2C]">Términos</a>
            <a href="#" className="hover:text-[#2C2C2C]">Privacidad</a>
          </div>
        </div>
      </footer>

      <AIChat />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authMode} />
    </div>
  );
}
