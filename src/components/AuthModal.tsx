import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Mail, Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch, apiJson } from "../lib/api";

// Config pública del servidor (ID de Google). Se pide una sola vez.
let configPromise: Promise<{ googleClientId: string | null }> | null = null;
const loadConfig = () => (configPromise ??= apiFetch("/api/config").then((r) => (r.ok ? r.json() : { googleClientId: null })).catch(() => ({ googleClientId: null })));

let gsiPromise: Promise<void> | null = null;
const loadGoogleScript = () => (gsiPromise ??= new Promise<void>((resolve, reject) => {
  const el = document.createElement("script");
  el.src = "https://accounts.google.com/gsi/client";
  el.async = true;
  el.onload = () => resolve();
  el.onerror = () => reject(new Error("gsi"));
  document.head.appendChild(el);
}));

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

export function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"alumno" | "profesor" | "instituto">("alumno");
  const [isResetSent, setIsResetSent] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const { login, register, loginWithGoogle, startSessionFrom } = useAuth();

  useEffect(() => { loadConfig().then((c) => setGoogleClientId(c.googleClientId)); }, []);

  // El modal queda montado: al abrirlo hay que respetar el modo pedido (ingresar o registrarse).
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError("");
    }
  }, [isOpen, initialMode]);

  // Botón propio «Continuar con Google»: abre la ventana de Google y vuelve con un token que el servidor valida.
  // (El botón que dibuja Google puede quedar invisible con bloqueadores de anuncios o de seguimiento.)
  const startGoogle = async () => {
    setError("");
    try {
      await loadGoogleScript();
    } catch {
      setError("No pudimos conectar con Google. Revisá tu conexión o desactivá el bloqueador de anuncios.");
      return;
    }
    const oauth = (window as any).google?.accounts?.oauth2;
    if (!oauth || !googleClientId) { setError("El ingreso con Google no está disponible ahora."); return; }
    const client = oauth.initTokenClient({
      client_id: googleClientId,
      scope: "openid email profile",
      callback: async (resp: { access_token?: string; error?: string }) => {
        if (!resp.access_token) {
          if (resp.error && resp.error !== "popup_closed") setError("No pudimos ingresar con Google. Probá de nuevo.");
          return;
        }
        // Al continuar con Google se acepta lo que dice el aviso que está debajo del botón (Términos y Privacidad).
        const result = await loginWithGoogle(resp.access_token, role, true, true);
        if (result.needsTerms && mode === "login") {
          setMode("register");
          setError("Para crear tu cuenta con Google, elegí cómo te registrás y aceptá los términos.");
        } else if (result.error) setError(result.error);
        else onClose();
      },
      error_callback: () => setError("Se cerró la ventana de Google antes de terminar."),
    });
    client.requestAccessToken({ prompt: "select_account" });
  };

  // Enlace del mail de recuperación: /?reset=<token>
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("reset");
    if (t && /^[0-9a-f]{64}$/.test(t)) {
      setResetToken(t);
      setMode("reset");
    }
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "forgot") {
      if (!email) return;
      setLoading(true);
      try {
        const { ok, data } = await apiJson("/api/auth/forgot-password", { email });
        if (!ok) { setError(data.error || "No pudimos enviar el mail. Probá más tarde."); return; }
        setIsResetSent(true);
      } finally { setLoading(false); }
      return;
    }

    if (mode === "reset") {
      if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
      setLoading(true);
      try {
        const { ok, data } = await apiJson("/api/auth/reset-password", { token: resetToken, password });
        if (!ok) { setError(data.error || "El enlace no es válido o venció"); return; }
        startSessionFrom(data);
        window.history.replaceState({}, "", window.location.pathname);
        onClose();
      } finally { setLoading(false); }
      return;
    }

    if (mode === "register" && !acceptTerms) {
      setError("Tenés que aceptar los Términos y la Política de privacidad");
      return;
    }

    if (!email || !password) return;

    setLoading(true);
    try {
      if (mode === "register") {
        const result = await register(email, password, name, role, acceptTerms);
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        const result = await login(email, password);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: "login" | "register" | "forgot" | "reset") => {
    setMode(newMode);
    setIsResetSent(false);
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[#5D5D5D] hover:text-[#2C2C2C] transition-colors p-2 rounded-sm hover:bg-black/5"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-medium text-[#2C2C2C] mb-2">
            {mode === "login" && "¡Hola de nuevo!"}
            {mode === "register" && "Creá tu cuenta"}
            {mode === "forgot" && "Recuperá tu cuenta"}
            {mode === "reset" && "Elegí una contraseña nueva"}
          </h2>
          <p className="text-[#5D5D5D]">
            {mode === "login" && "Ingresá a tu cuenta para continuar"}
            {mode === "register" && "Unite a nuestra comunidad de bienestar"}
            {mode === "forgot" && !isResetSent && "Ingresá tu mail y te enviamos un link"}
            {mode === "reset" && "Después de guardarla, ingresás directo a tu cuenta"}
            {mode === "forgot" && isResetSent && "¡Listo! Revisá tu casilla de correo"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === "forgot" && isResetSent ? (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleModeChange("login")}
              className="w-full bg-[#98A77C] hover:bg-[#88976C] text-white py-3 rounded-sm font-medium transition-colors"
            >
              Volver a ingresar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D5D5D]" />
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-2xl pl-12 pr-4 py-3 outline-none transition-all placeholder:text-[#5D5D5D]/50"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2 my-1">
                  <label className="text-xs font-semibold text-[#5D5D5D] uppercase tracking-wider pl-1">
                    Registrarme como:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["alumno", "profesor", "instituto"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
                          role === r
                            ? "bg-[#98A77C] text-white border-[#98A77C] shadow-sm"
                            : "bg-white text-[#5D5D5D] border-[#E8E0D0] hover:border-[#98A77C]/50"
                        }`}
                      >
                        {r === "alumno" ? "Alumno/a" : r === "profesor" ? "Profesor/a" : "Instituto"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {mode !== "reset" && (<div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D5D5D]" />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-2xl pl-12 pr-4 py-3 outline-none transition-all placeholder:text-[#5D5D5D]/50"
                required
              />
            </div>)}

            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D5D5D]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "Contraseña (mínimo 8 caracteres)" : mode === "reset" ? "Contraseña nueva (mínimo 8 caracteres)" : "Contraseña"}
                  minLength={mode === "register" || mode === "reset" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-2xl pl-12 pr-12 py-3 outline-none transition-all placeholder:text-[#5D5D5D]/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5D5D5D] hover:text-[#98A77C] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {mode === "login" && (
              <button type="button" onClick={() => handleModeChange("forgot")} className="text-right text-xs text-[#98A77C] hover:underline -mt-2">
                ¿Olvidaste tu contraseña?
              </button>
            )}

            {mode === "register" && (
              <label className="flex items-start gap-2 text-xs text-[#5D5D5D] leading-relaxed cursor-pointer">
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 accent-[#98A77C]" />
                <span>
                  Acepto los <Link to="/terminos" target="_blank" className="text-[#98A77C] underline">Términos y condiciones</Link> y la{" "}
                  <Link to="/privacidad" target="_blank" className="text-[#98A77C] underline">Política de privacidad</Link>.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#98A77C] hover:bg-[#88976C] text-white py-3 rounded-sm font-medium transition-colors mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-sm animate-spin" />
              )}
              {mode === "login" && "Ingresar"}
              {mode === "register" && "Registrarse"}
              {mode === "forgot" && "Enviar link"}
              {mode === "reset" && "Guardar contraseña"}
            </button>
          </form>
        )}

        {googleClientId && (mode === "login" || mode === "register") && (
          <div className="mt-5 flex flex-col items-center gap-3">
            <span className="text-xs text-[#5D5D5D]">o</span>
            <button type="button" onClick={startGoogle}
              className="w-full max-w-[320px] flex items-center justify-center gap-3 bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] text-[#3C4043] rounded-full py-2.5 text-sm font-medium transition-colors shadow-sm">
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Continuar con Google
            </button>
            <p className="text-[11px] text-[#5D5D5D] text-center leading-relaxed max-w-[320px]">
              Al continuar con Google aceptás los{" "}
              <Link to="/terminos" target="_blank" className="text-[#98A77C] underline">Términos</Link> y la{" "}
              <Link to="/privacidad" target="_blank" className="text-[#98A77C] underline">Política de privacidad</Link>.
            </p>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-[#5D5D5D]">
          {mode === "login" ? (
            <p>
              ¿No tenés una cuenta?{" "}
              <button type="button" onClick={() => handleModeChange("register")} className="text-[#98A77C] font-medium hover:underline">
                Registrate ahora
              </button>
            </p>
          ) : mode === "register" ? (
            <p>
              ¿Ya tenés una cuenta?{" "}
              <button type="button" onClick={() => handleModeChange("login")} className="text-[#98A77C] font-medium hover:underline">
                Ingresá
              </button>
            </p>
          ) : (
            <p>
              <button type="button" onClick={() => handleModeChange("login")} className="text-[#98A77C] font-medium hover:underline">
                Volver a ingresar
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
