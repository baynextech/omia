import { useState, useEffect } from "react";
import { MapPin, Check } from "lucide-react";
import { Hero } from "../components/Hero";
import { SEOMeta } from "../components/SEOMeta";
import { TeacherCard, Teacher } from "../components/TeacherCard";
import { useAuth } from "../contexts/AuthContext";
import { AuthModal } from "../components/AuthModal";
import { motion } from "motion/react";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};

export function Home() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [locationFilter, setLocationFilter] = useState("Todos");
  const { isAuthenticated, user } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");

  const locations = ["Todos", "San Telmo", "Palermo", "Belgrano", "Recoleta"];

  useEffect(() => {
    fetch(`/api/teachers?location=${locationFilter}`)
      .then(res => res.json())
      .then(data => setTeachers(data))
      .catch(err => console.error(err));
  }, [locationFilter]);

  const handleSubscribe = async (planId: string, planName: string, planPrice: number) => {
    if (!isAuthenticated) {
      setAuthMode("register");
      setIsAuthOpen(true);
      return;
    }

    try {
      const res = await fetch("/api/payments/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "subscription",
          itemId: planId,
          title: `Suscripción Omia - ${planName}`,
          price: planPrice
        })
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error("Error setting up checkout:", err);
    }
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
            {
              "@type": "WebSite",
              "@id": "https://omia.com/#website",
              "url": "https://omia.com/",
              "name": "Omia Yoga & Pilates",
              "description": "La plataforma líder para conectar con profesores e institutos de Yoga & Pilates en Argentina.",
              "inLanguage": "es-AR"
            },
            {
              "@type": "Organization",
              "@id": "https://omia.com/#organization",
              "name": "Omia Bienestar",
              "url": "https://omia.com/",
              "logo": "https://omia.com/images/yoga_hero_1779994397642.png",
              "sameAs": [
                "https://instagram.com/omiayoga.ar"
              ]
            }
          ]
        }}
      />
      <Hero />

      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div
          className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4 text-[#2C2C2C]">
              Explorá Profesionales
            </h2>
            <p className="text-[#5D5D5D] max-w-2xl">
              Descubrí profes de yoga verificados en tu zona. Leé reseñas, compará estilos y reservá tu próxima sesión.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D5D5D]" />
              <select 
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full md:w-48 appearance-none bg-[#FDFBF7] border border-[#E5E5E5] rounded-full pl-10 pr-10 py-3 text-sm font-medium focus:outline-none focus:border-[#8CAE99] focus:ring-1 focus:ring-[#8CAE99] cursor-pointer"
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="#2C2C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {teachers.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {teachers.map(teacher => (
              <TeacherCard key={teacher.id} teacher={teacher} />
            ))}
          </motion.div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-[#5D5D5D]">Todavía no hay profes en esta zona.</p>
          </div>
        )}
      </section>

      {/* Planes de Precios para Profesionales e Institutos */}
      <section className="bg-[#FDFBF7] py-24 px-6 border-t border-b border-[#E5E5E5]" id="planes-section">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <h2 className="text-4xl font-serif italic text-[#2C2C2C] mb-4">
              Membresías para Profesores e Institutos
            </h2>
            <p className="text-[#5D5D5D] max-w-2xl mx-auto text-lg">
              Cobrá el 100% del valor de tus clases directamente a tus alumnos sin comisiones. Solamente pagás la pauta mensual para figurar en la plataforma y tener tu propia landing page personalizable.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {/* Plan Inicial */}
            <motion.div variants={fadeUp} className="bg-white border border-[#E5E5E5] rounded-3xl p-8 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative">
              <div>
                <h3 className="text-xl font-medium text-[#2C2C2C] mb-2">Plan Inicial</h3>
                <p className="text-[#5D5D5D] text-sm mb-6">Para profesores independientes que recién comienzan.</p>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-medium text-[#2C2C2C] font-mono">$39.900</span>
                  <span className="text-[#5D5D5D] ml-2 text-sm">/ mes</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span>Landing page con URL propia (e.g. omia.com/profesor/tu-id)</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span>Aparecer en búsquedas de zona</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span>Subir tus datos y 1 foto de perfil</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span>Cobros 100% directos de alumnos</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => handleSubscribe("inicial", "Plan Inicial", 39900)}
                className="w-full bg-[#FDFBF7] hover:bg-[#8CAE99] hover:text-white active:scale-[0.97] text-[#2C2C2C] border border-[#E5E5E5] py-3.5 rounded-full font-medium transition-all text-sm"
              >
                Elegir Inicial
              </button>
            </motion.div>

            {/* Plan Destacado / Pro */}
            <motion.div variants={fadeUp} className="bg-white border-2 border-[#8CAE99] rounded-3xl p-8 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative shadow-sm ring-4 ring-[#8CAE99]/5">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8CAE99] text-white px-4 py-1 rounded-full text-xs font-semibold tracking-wider uppercase">
                Más Recomendado
              </span>
              <div>
                <h3 className="text-xl font-medium text-[#2C2C2C] mb-2">Plan Destacado</h3>
                <p className="text-[#5D5D5D] text-sm mb-6">Para instructores que buscan prioridad y estadísticas.</p>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-medium text-[#2C2C2C] font-mono">$43.900</span>
                  <span className="text-[#5D5D5D] ml-2 text-sm">/ mes</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span className="font-medium text-[#2C2C2C]">Todo lo del Plan Inicial</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span>Insignia Pro Dorada de verificación</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span>Prioridad de recomendación por IA (Chatbot)</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span>Dashboard con visitas, impresiones y cobros</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span>Subir hasta 5 fotos para tu galería</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => handleSubscribe("destacado", "Plan Destacado Pro", 43900)}
                className="w-full bg-[#8CAE99] hover:bg-[#7a9d88] active:scale-[0.97] text-white py-3.5 rounded-full font-medium transition-all text-sm"
              >
                Suscribirme Pro
              </button>
            </motion.div>

            {/* Plan Institucional / Estudios */}
            <motion.div variants={fadeUp} className="bg-white border border-[#E5E5E5] rounded-3xl p-8 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative">
              <div>
                <h3 className="text-xl font-medium text-[#2C2C2C] mb-2">Plan Institutos</h3>
                <p className="text-[#5D5D5D] text-sm mb-6">Para centros, estudios de yoga y escuelas.</p>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-medium text-[#2C2C2C] font-mono">$49.900</span>
                  <span className="text-[#5D5D5D] ml-2 text-sm">/ mes</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span className="font-medium text-[#2C2C2C]">Todo lo del Plan Destacado</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span>Múltiples perfiles de profes asociados</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span>Sección de Estudios destacada en el mapa</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span>Asistente de IA entrenado con tus horarios</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-[#5D5D5D]">
                    <Check className="w-4 h-4 text-[#8CAE99] shrink-0 mt-0.5" />
                    <span>Soporte preferente por WhatsApp 24/7</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => handleSubscribe("institucional", "Plan Institutos", 49900)}
                className="w-full bg-[#FDFBF7] hover:bg-[#2C2C2C] hover:text-white active:scale-[0.97] text-[#2C2C2C] border border-[#E5E5E5] py-3.5 rounded-full font-medium transition-all text-sm"
              >
                Elegir Institutos
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Call to action for teachers */}
      <motion.section
        className="bg-[#8CAE99] py-20 px-6 text-center text-white"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6">
          ¿Sos profe de yoga o tenés un estudio?
        </h2>
        <p className="text-[#FDFBF7] max-w-2xl mx-auto mb-10 text-lg opacity-90">
          Sumate a Omia y creá tu landing page profesional hoy mismo. Conectá directamente con alumnos sin intermediarios.
        </p>
        <button
          onClick={() => {
            setAuthMode("register");
            setIsAuthOpen(true);
          }}
          className="bg-white text-[#8CAE99] hover:bg-[#FDFBF7] active:scale-[0.97] px-8 py-4 rounded-full font-medium transition-all shadow-sm"
        >
          Crear mi Perfil
        </button>
      </motion.section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} initialMode={authMode} />
    </>
  );
}
