import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Heart, LayoutDashboard, LogOut, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

// Cuenta iniciada en el menú de arriba: foto (o inicial) en un círculo, nombre y desplegable.
export function UserAvatar({ size = 36 }: { size?: number }) {
  const { profile } = useAuth();
  const [broken, setBroken] = useState(false);
  const name = profile?.name || profile?.email || "";
  const src = (profile as any)?.avatar_url || (profile as any)?.avatar || "";
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (src && !broken) {
    return <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} style={style} className="rounded-full object-cover border border-white/60 shrink-0" />;
  }
  return (
    <span style={style} className="rounded-full bg-[#98A77C] text-white flex items-center justify-center font-semibold shrink-0 uppercase">
      {name.trim().charAt(0) || <User size={size * 0.5} />}
    </span>
  );
}

export function UserMenu({ scrolled }: { scrolled: boolean }) {
  const { profile, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);

  const displayName = (profile?.name || profile?.email?.split("@")[0] || "Mi cuenta").trim();
  const item = "flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#2C2C2C] hover:bg-[#F4EFE4] transition-colors w-full text-left";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
          scrolled ? "bg-white border-[#E8E0D0] hover:bg-[#F4EFE4] text-[#2C2C2C]" : "bg-white/15 border-white/30 hover:bg-white/25 text-white"
        }`}
      >
        <UserAvatar />
        <span className="text-sm font-medium max-w-[140px] truncate">{displayName}</span>
        <ChevronDown className={`w-4 h-4 opacity-70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 bg-white border border-[#E8E0D0] rounded-2xl shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[#E8E0D0] bg-[#faf8f2]">
            <p className="text-sm font-semibold text-[#2C2C2C] truncate">{displayName}</p>
            <p className="text-xs text-[#5D5D5D] truncate">{profile?.email}</p>
          </div>
          <Link to="/perfil" onClick={() => setOpen(false)} className={item} role="menuitem"><User className="w-4 h-4 text-[#98A77C]" />Mi perfil</Link>
          <Link to="/favoritos" onClick={() => setOpen(false)} className={item} role="menuitem"><Heart className="w-4 h-4 text-[#98A77C]" />Favoritos</Link>
          {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className={item} role="menuitem"><LayoutDashboard className="w-4 h-4 text-[#98A77C]" />Panel de administración</Link>}
          <button onClick={() => { setOpen(false); logout(); }} className={`${item} border-t border-[#E8E0D0]`} role="menuitem"><LogOut className="w-4 h-4 text-[#98A77C]" />Salir</button>
        </div>
      )}
    </div>
  );
}
