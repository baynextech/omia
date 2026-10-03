import { useState } from "react";
import { Sparkles, CheckCircle2, ShieldCheck, CreditCard, HelpCircle } from "lucide-react";
import { motion } from "motion/react";
import { SEOMeta } from "../components/SEOMeta";

export function ForTeachers() {
  const [isPaying, setIsPaying] = useState(false);

  const handleSubscribe = async () => {
    setIsPaying(true);
    try {
      const response = await fetch("/api/payments/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "subscription",
          itemId: "premium-sub",
          title: "Membresía Omia Pro",
          price: "43900"
        })
      });
      const data = await response.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert("Error al procesar el cobro con Mercado Pago");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión con Mercado Pago");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="py-12 px-6 max-w-7xl mx-auto min-h-screen">
      <SEOMeta 
        title="Unite como Profesor de Yoga | Omia"
        description="Publicá tus clases de yoga, creá tu landing page personalizable y captá alumnos en tu zona sin pagar comisiones por clase. Omia es la red de yoga líder."
        keywords="publicar clases de yoga, marketing para profesores de yoga, membresias para instructores, landing page para profesores de yoga"
      />
      {/* Hero section */}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <span className="text-xs bg-[#8CAE99]/15 text-[#8CAE99] px-3.5 py-1.5 rounded-full font-bold tracking-widest uppercase mb-4 inline-block">
          Unite a la red de Omia
        </span>
        <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-6 text-[#2C2C2C] leading-tight">
          Conectá con más alumnos y multiplicá tu práctica.
        </h1>
        <p className="text-[#5D5D5D] text-lg leading-relaxed">
          Creamos el espacio digital más moderno, orgánico y recomendado por inteligencia artificial para instructores independientes de yoga en la Argentina.
        </p>
      </div>

      {/* Feature Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        <div className="bg-white border border-[#E5E5E5] p-8 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <div className="w-12 h-12 bg-[#8CAE99]/10 text-[#8CAE99] rounded-2xl flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-[#2C2C2C]">Recomendación Inteligente</h3>
            <p className="text-[#5D5D5D] text-sm leading-relaxed">
              Nuestra guía con IA recomienda activamente tu perfil, horarios y especialidad a los usuarios que buscan de forma natural (ej: "clases de yoga cerca de Belgrano").
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E5] p-8 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <div className="w-12 h-12 bg-[#8CAE99]/10 text-[#8CAE99] rounded-2xl flex items-center justify-center mb-6">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-[#2C2C2C]">Integración Mercado Pago</h3>
            <p className="text-[#5D5D5D] text-sm leading-relaxed">
              Recibí cobros de tus alumnos sin esfuerzo. Integración nativa con Mercado Pago Argentina para abonar tus planes y agendar alumnos con acreditación segura.
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E5] p-8 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <div className="w-12 h-12 bg-[#8CAE99]/10 text-[#8CAE99] rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-[#2C2C2C]">Estadísticas y Reseñas</h3>
            <p className="text-[#5D5D5D] text-sm leading-relaxed">
              Visualizá el alcance de tu perfil, recopilá calificaciones de cinco estrellas firmadas de forma transparente y ganá confianza dentro de la comunidad.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing comparison section */}
      <div className="max-w-5xl mx-auto bg-[#FDFBF7] border border-[#E5E5E5] rounded-3xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-between">
          <div>
            <span className="text-xs text-[#8CAE99] font-bold uppercase tracking-wider">Plan para Instructores</span>
            <h2 className="text-3xl font-semibold text-[#2C2C2C] mt-2 mb-6">Omia Pro Membership</h2>
            
            <p className="text-[#5D5D5D] text-sm mb-8 leading-relaxed">
              Súmate al único plan diseñado para dar visibilidad total a tu agenda. Sin contratos forzosos. Cancelás en cualquier momento con un clic en tu panel.
            </p>

            <ul className="space-y-4 text-[#2C2C2C] text-sm">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#8CAE99] shrink-0" />
                <span>Exposición destacada en la grilla y mapa de instructores.</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#8CAE99] shrink-0" />
                <span>Prioridad absoluta de recomendación en la IA conversacional.</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#8CAE99] shrink-0" />
                <span>Gestión directa de reservas y consultas ilimitadas.</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#8CAE99] shrink-0" />
                <span>Insignia Pro y optimización SEO de tu página personal.</span>
              </li>
            </ul>
          </div>

          <div className="mt-12 flex items-center gap-2.5 text-xs text-[#5D5D5D]">
            <ShieldCheck className="w-4 h-4 text-[#8CAE99]" />
            <span>Cobros gestionados en pesos argentinos mediante pasarela segura.</span>
          </div>
        </div>

        <div className="md:col-span-5 bg-white border-l border-[#E5E5E5] p-8 md:p-12 flex flex-col justify-center items-center text-center">
          <span className="text-xs text-[#8CAE99] font-bold tracking-widest uppercase mb-1">Membresía Activa</span>
          <h3 className="text-xl font-medium text-[#2C2C2C] mb-4">Membresía Mensual</h3>
          
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-5xl font-bold text-[#2C2C2C]">$43.900</span>
            <span className="text-sm text-[#5D5D5D] font-medium">/ mes</span>
          </div>
          <span className="text-xs text-[#8CAE99] font-medium mb-8">Precio final en ARS</span>

          <button
            onClick={handleSubscribe}
            disabled={isPaying}
            className="w-full bg-[#009EE3] hover:bg-[#008CD0] text-white py-4 rounded-full font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isPaying ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Unirme a Omia Pro</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
          
          <p className="text-xs text-[#5D5D5D] mt-4">
            Probá el primer mes. Si no estás conforme, te devolvemos el dinero de forma inmediata.
          </p>
        </div>
      </div>

      {/* FAQ Block */}
      <div className="mt-24 max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-[#2C2C2C] text-center mb-8">Preguntas frecuentes</h2>
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E5E5] p-6 rounded-2xl">
            <h4 className="font-semibold text-base text-[#2C2C2C] mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#8CAE99]" />
              ¿Necesito una cuenta especial de Mercado Pago?
            </h4>
            <p className="text-sm text-[#5D5D5D] leading-relaxed">
              No, para pagar tu membresía podés utilizar cualquier cuenta de Mercado Pago o tarjetas bancarias. Para recibir pagos de alumnos, solo necesitás asociar tu cuenta de Mercado Pago regular (sea vendedor o personal).
            </p>
          </div>
          <div className="bg-white border border-[#E5E5E5] p-6 rounded-2xl">
            <h4 className="font-semibold text-base text-[#2C2C2C] mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#8CAE99]" />
              ¿Hay costos extras o comisiones por clases vendidas?
            </h4>
            <p className="text-sm text-[#5D5D5D] leading-relaxed">
              Omia no cobra ninguna comisión extra sobre el valor de tu clase. El 100% de lo abonado por tus alumnos se acredita directamente a tu cuenta de Mercado Pago asociada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
