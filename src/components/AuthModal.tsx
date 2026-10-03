import { useState } from "react";
import { X, Mail, Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

export function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"alumno" | "profesor" | "instituto">("alumno");
  const [isResetSent, setIsResetSent] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register, loginWithGithub } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "forgot") {
      if (!email) return;
      setIsResetSent(true);
      return;
    }

    if (!email || !password) return;

    setLoading(true);
    try {
      if (mode === "register") {
        const result = await register(email, password, name, role === "instituto" ? "profesor" : role);
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

  const handleModeChange = (newMode: "login" | "register" | "forgot") => {
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
          </h2>
          <p className="text-[#5D5D5D]">
            {mode === "login" && "Ingresá a tu cuenta para continuar"}
            {mode === "register" && "Unite a nuestra comunidad de bienestar"}
            {mode === "forgot" && !isResetSent && "Ingresá tu mail y te enviamos un link"}
            {mode === "forgot" && isResetSent && "¡Listo! Revisá tu casilla de correo"}
          </p>
        </div>

        {/* GitHub OAuth */}
        <button
          onClick={() => { onClose(); loginWithGithub(); }}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#24292F] hover:bg-[#1a1f24] text-white rounded-2xl font-medium transition-colors text-sm"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Continuar con GitHub
        </button>

        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[#E5E5E5]" />
          <span className="text-xs text-[#5D5D5D] font-medium">o con email</span>
          <div className="flex-1 h-px bg-[#E5E5E5]" />
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

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D5D5D]" />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F4EFE4] border border-[#E8E0D0] focus:border-[#98A77C] focus:ring-1 focus:ring-[#98A77C] text-[#2C2C2C] rounded-2xl pl-12 pr-4 py-3 outline-none transition-all placeholder:text-[#5D5D5D]/50"
                required
              />
            </div>

            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D5D5D]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleModeChange("forgot")}
                  className="text-sm text-[#5D5D5D] hover:text-[#98A77C] font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
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
            </button>
          </form>
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
