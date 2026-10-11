import { Photo } from "../components/Photo";
import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { usePlans, startSubscription } from "../hooks/usePlans";
import { MapPin, Check, ArrowRight, Star, Heart } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Hero } from "../components/Hero";
import { MapZones } from "../components/MapZones";
import { SEOMeta } from "../components/SEOMeta";
import { TeacherCard, Teacher } from "../components/TeacherCard";
import { useAuth } from "../contexts/AuthContext";
import { AuthModal } from "../components/AuthModal";
import { motion } from "motion/react";


const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};

export function Home() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [locationFilter, setLocationFilter] = useState("Todos");
  const { isAuthenticated } = useAuth();
  const { formatPrice } = usePlans();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");

  const locations = ["Todos", "San Telmo", "Palermo", "Belgrano", "Recoleta"];

  useEffect(() => {
    apiFetch(`/api/teachers?location=${locationFilter}`)
      .then(res => res.json())
      .then(data => setTeachers(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, [locationFilter]);

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      setAuthMode("register");
      setIsAuthOpen(true);
      return;
    }
    const error = await startSubscription(planId);
    if (error) alert(error);
  };

  return (
    <>
      <SEOMeta
        title="Omia - Profesores, Institutos y Tienda de Yoga & Pilates"
        description="Encontrá los mejores profesores, instructores e institutos de Yoga y Pilates (Reformer, Mat, Barre) en Buenos Aires. Leé opiniones reales, reservá clases y equipate en nuestra tienda oficial."
        keywords="clases de yoga, profesores de yoga, instructores de pilates, pilates reformer, institutos de pilates, yoga buenos aires, yoga palermo, recoleta, belgrano, san telmo, tienda de yoga, mats de yoga"
        ogImage="/images/yoga_hero_1779994397642.png"
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebSite", "@id": "https://omia.site/#website", "url": "https://omia.site/", "name": "Omia Yoga & Pilates", "description": "La plataforma líder para conectar con profesores e institutos de Yoga & Pilates en Argentina.", "inLanguage": "es-AR" },
            { "@type": "Organization", "@id": "https://omia.site/#organization", "name": "Omia Bienestar", "url": "https://omia.site/", "logo": "https://omia.site/images/yoga_hero_1779994397642.png", "sameAs": ["https://instagram.com/omiayoga.ar"] }
          ]
        }}
      />

      <Hero />

      {/* Intro strip — editorial break */}
      <section className="bg-[#F4EFE4] py-20 px-6 border-b border-[#E0D8CC]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          {[
            { title: "Perfiles reales", desc: "Cada profe y cada instituto tiene su propia ficha, con reseñas de alumnos que tomaron clases." },
            { title: "Reservá sin comisiones", desc: "Contactá directamente con el profe. El 100% del pago va al instructor, sin intermediarios." },
            { title: "Encontrá tu zona", desc: "Buscá por barrio en Buenos Aires. Palermo, Belgrano, Recoleta y 11 zonas más." },
          ].map(({ title, desc }) => (
            <motion.div
              key={title}
              className="flex flex-col gap-3"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
            >
              <div className="w-8 h-px bg-[#98A77C]" />
              <h3 className="text-lg font-serif font-medium text-[#1C3829]">{title}</h3>
              <p className="text-[#5D5D5D] text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Map section */}
      <MapZones />

      {/* Teachers section */}
      <section className="bg-[#F4EFE4] pt-24 pb-12 overflow-hidden">

        {/* Header arriba, centrado con max-width */}
        <motion.div
          className="max-w-7xl mx-auto px-6 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <div>
            <p className="text-xs font-bold tracking-widest text-[#98A77C] uppercase mb-3">Directorio</p>
            <h2 className="text-4xl md:text-5xl font-serif font-light text-[#1C3829] leading-tight">
              Profesionales <span className="italic">destacados</span>
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-[#5D5D5D] text-sm max-w-xs leading-relaxed hidden md:block">
              Descubrí profes en tu zona. Leé reseñas y reservá tu próxima sesión.
            </p>
            <a href="/directorio" className="shrink-0 inline-flex items-center gap-2 text-sm font-semibold text-[#1C3829] hover:text-[#98A77C] transition-colors whitespace-nowrap">
              Ver todos <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>

        {teachers.length === 0 && (
          <div className="max-w-7xl mx-auto px-6">
            <div className="border border-dashed border-[#98A77C]/60 rounded-sm p-10 text-center bg-white/40">
              <p className="font-serif text-2xl text-[#1C3829] mb-2">Estamos sumando a los primeros profes de tu zona</p>
              <p className="text-[#5D5D5D] text-sm mb-6">¿Das clases de yoga o pilates? Creá tu ficha gratis y aparecé acá.</p>
              <button onClick={() => { setAuthMode("register"); setIsAuthOpen(true); }} className="inline-block bg-[#98A77C] hover:bg-[#88976C] text-white px-7 py-3 text-sm font-semibold transition-colors" style={{ borderRadius: 5 }}>
                Crear mi ficha
              </button>
            </div>
          </div>
        )}

        {/* Slider full width pegado al borde derecho */}
        <div className={teachers.length === 0 ? "hidden" : "overflow-x-auto pl-6 md:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]"} style={{ scrollbarWidth: "none" }}>
            <motion.div
              className="flex gap-4 pr-6"
              style={{ width: "max-content" }}
              initial={{ x: 80, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            >
              {teachers.map((t) => (
                <motion.div
                  key={t.id}
                  className="group relative overflow-hidden bg-[#1C3829] cursor-pointer shrink-0 flex flex-col"
                  style={{ width: 300, borderRadius: 5 }}
                  whileHover={{ y: -8, boxShadow: "0 24px 48px rgba(0,0,0,0.3)" }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <div className="relative overflow-hidden" style={{ height: 360 }}>
                    <Photo
                      src={t.image}
                      name={t.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C3829] via-transparent to-transparent" />
                    <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider bg-[#1C3829]/80 backdrop-blur-sm text-[#C8D8B0] border border-[#98A77C]/30" style={{ borderRadius: 3 }}>
                      {t.discipline}
                    </span>
                    <button className="absolute top-3 right-3 bg-[#1C3829]/70 backdrop-blur-sm p-2 opacity-0 group-hover:opacity-100 transition-all duration-200" style={{ borderRadius: 3 }}>
                      <Heart className="w-3.5 h-3.5 text-white/80" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-serif font-semibold text-white leading-tight">{t.name}</h3>
                          <p className="text-[#9DB085] text-xs mt-0.5">{t.specialty}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mb-0.5">
                          <Star className="w-3 h-3 fill-[#98A77C] text-[#98A77C]" />
                          <span className="text-xs font-bold text-white">{t.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[#9DB085] text-xs">
                        <MapPin className="w-3 h-3" />
                        <span>{t.location}</span>
                        <span className="opacity-40">·</span>
                        <span>{t.reviews} reseñas</span>
                      </div>
                      <span className="text-[#C8D8B0] text-xs font-bold">{t.price}</span>
                    </div>
                    <p className="text-[#7a9d85] text-xs leading-relaxed line-clamp-2">{t.bio}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {(t.availableDays || []).map(d => (
                        <span key={d} className="px-2 py-0.5 bg-[#2a4d38] text-[#9DB085] text-[10px] font-medium" style={{ borderRadius: 3 }}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-[#1C3829]/85 backdrop-blur-sm" style={{ borderRadius: 5 }}>
                    <div className="text-center px-6">
                      <p className="text-white font-serif text-xl mb-1">{t.name}</p>
                      <p className="text-[#9DB085] text-xs mb-6">{t.specialty}</p>
                      <a href={`/profesor/${t.id}`} className="inline-block bg-[#98A77C] hover:bg-[#88976C] text-white px-7 py-3 text-sm font-semibold transition-colors" style={{ borderRadius: 5 }}>
                        Ver Perfil
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
      </section>

      {/* Pricing section — dark */}
      <section className="bg-[#1C3829] py-24 px-6" id="planes-section">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <p className="text-xs font-bold tracking-widest text-[#98A77C] uppercase mb-4">Membresías</p>
            <h2 className="text-4xl md:text-5xl font-serif font-light text-[#F4EFE4] mb-5 leading-tight">
              Para Profesores<br />
              <span className="italic text-[#C8D8B0]">e Institutos</span>
            </h2>
            <p className="text-[#9DB085] max-w-2xl mx-auto text-sm leading-relaxed">
              Cobrá el 100% del valor de tus clases directamente a tus alumnos sin comisiones.
              Solamente pagás la pauta mensual para figurar en la plataforma.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {/* Plan Inicial */}
            <motion.div variants={fadeUp} className="bg-[#243d2d] border border-[#2a4d38] rounded-sm p-8 flex flex-col justify-between hover:-translate-y-1 transition-all duration-200">
              <div>
                <h3 className="text-lg font-serif font-medium text-[#F4EFE4] mb-2">Plan Inicial</h3>
                <p className="text-[#9DB085] text-xs mb-6 leading-relaxed">Para profesores independientes que recién comienzan.</p>
                <div className="flex items-baseline mb-8">
                  <span className="text-4xl font-light text-[#C8D8B0] font-mono">{formatPrice("inicial")}</span>
                  <span className="text-[#9DB085] ml-2 text-xs">/ mes</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "Landing page con URL propia",
                    "Aparecer en búsquedas de zona",
                    "1 foto de perfil",
                    "Cobros 100% directos",
                  ].map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[#9DB085]">
                      <Check className="w-4 h-4 text-[#98A77C] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleSubscribe("inicial")}
                className="w-full bg-transparent hover:bg-[#98A77C] active:scale-[0.97] text-[#9DB085] hover:text-white border border-[#3a6048] hover:border-[#98A77C] py-3 rounded-sm font-medium transition-all text-sm"
              >
                Elegir Inicial
              </button>
            </motion.div>

            {/* Plan Destacado */}
            <motion.div variants={fadeUp} className="bg-[#98A77C] border border-[#88976C] rounded-sm p-8 flex flex-col justify-between hover:-translate-y-1 transition-all duration-200 relative shadow-lg">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F4EFE4] text-[#1C3829] px-4 py-1 rounded-sm text-[10px] font-bold tracking-widest uppercase">
                Más popular
              </span>
              <div>
                <h3 className="text-lg font-serif font-medium text-white mb-2">Plan Destacado</h3>
                <p className="text-white/70 text-xs mb-6 leading-relaxed">Para instructores que buscan prioridad y estadísticas.</p>
                <div className="flex items-baseline mb-8">
                  <span className="text-4xl font-light text-white font-mono">{formatPrice("destacado")}</span>
                  <span className="text-white/60 ml-2 text-xs">/ mes</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "Todo lo del Plan Inicial",
                    "Insignia Pro dorada",
                    "Prioridad en IA (Chatbot)",
                    "Dashboard con estadísticas",
                    "Hasta 5 fotos en galería",
                  ].map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/90">
                      <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleSubscribe("destacado")}
                className="w-full bg-white hover:bg-[#F4EFE4] active:scale-[0.97] text-[#1C3829] py-3 rounded-sm font-semibold transition-all text-sm"
              >
                Suscribirme Pro
              </button>
            </motion.div>

            {/* Plan Institutos */}
            <motion.div variants={fadeUp} className="bg-[#243d2d] border border-[#2a4d38] rounded-sm p-8 flex flex-col justify-between hover:-translate-y-1 transition-all duration-200">
              <div>
                <h3 className="text-lg font-serif font-medium text-[#F4EFE4] mb-2">Plan Institutos</h3>
                <p className="text-[#9DB085] text-xs mb-6 leading-relaxed">Para centros, estudios de yoga y escuelas.</p>
                <div className="flex items-baseline mb-8">
                  <span className="text-4xl font-light text-[#C8D8B0] font-mono">{formatPrice("institucional")}</span>
                  <span className="text-[#9DB085] ml-2 text-xs">/ mes</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "Todo lo del Plan Destacado",
                    "Múltiples profes asociados",
                    "Sección destacada en mapa",
                    "IA entrenada con tus horarios",
                    "Soporte WhatsApp 24/7",
                  ].map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[#9DB085]">
                      <Check className="w-4 h-4 text-[#98A77C] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleSubscribe("institucional")}
                className="w-full bg-transparent hover:bg-[#98A77C] active:scale-[0.97] text-[#9DB085] hover:text-white border border-[#3a6048] hover:border-[#98A77C] py-3 rounded-sm font-medium transition-all text-sm"
              >
                Elegir Institutos
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA — warm cream */}
      <section className="bg-[#F4EFE4] py-28 px-6 text-center border-b border-[#E0D8CC]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-3xl mx-auto"
        >
          <p className="text-xs font-bold tracking-widest text-[#98A77C] uppercase mb-5">Unite</p>
          <h2 className="text-4xl md:text-6xl font-serif font-light text-[#1C3829] leading-tight mb-6">
            ¿Sos profe de yoga<br />
            <span className="italic">o tenés un estudio?</span>
          </h2>
          <p className="text-[#5D5D5D] max-w-lg mx-auto mb-10 text-sm leading-relaxed">
            Sumate a Omia y creá tu landing page profesional hoy mismo.
            Conectá directamente con alumnos sin intermediarios.
          </p>
          <button
            onClick={() => { setAuthMode("register"); setIsAuthOpen(true); }}
            className="inline-flex items-center gap-3 bg-[#1C3829] hover:bg-[#152e1f] active:scale-[0.97] text-white px-8 py-4 rounded-sm font-semibold transition-all text-sm"
          >
            Crear mi Perfil
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} initialMode={authMode} />
    </>
  );
}
