import { useContent } from "../contexts/ContentContext";
import { useState } from "react";
import { Sparkles, CheckCircle2, ShieldCheck, CreditCard, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlans, startSubscription } from "../hooks/usePlans";
import { motion } from "motion/react";
import { SEOMeta } from "../components/SEOMeta";

export function ForTeachers() {
  const [isPaying, setIsPaying] = useState(false);
  const navigate = useNavigate();
  const { formatPrice } = usePlans();
  const { t, list, pairs, img } = useContent();

  const handleSubscribe = async () => {
    setIsPaying(true);
    const error = await startSubscription("destacado");
    if (error) {
      alert(error);
      // Sin sesión o sin ficha cargada, el paso siguiente está en el panel.
      navigate("/perfil");
    }
    setIsPaying(false);
  };

  return (
    <div className="pt-32 pb-12 px-6 max-w-7xl mx-auto min-h-screen">
      <SEOMeta title={t("seo.teachers.title")} description={t("seo.teachers.description")} ogImage={img("seo.image")} keywords="publicar clases de yoga, marketing para profesores de yoga, membresias para instructores, landing page para profesores de yoga" />
      {/* Hero section */}
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <span className="text-xs bg-salvia/15 text-salvia-oscuro px-3.5 py-1.5 rounded-sm font-bold tracking-widest uppercase mb-4 inline-block">
          {t("para.hero.eyebrow")}
        </span>
        <h1 className="font-serif text-4xl md:text-6xl font-light tracking-tight mb-6 text-bosque leading-tight">
          {t("para.hero.title")}
        </h1>
        <p className="text-musgo text-lg leading-relaxed">
          {t("para.hero.subtitle")}
        </p>
      </div>

      {/* Feature Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {pairs("para.benefits").map(({ a: title, b: desc }, i) => {
          const Icon = [Sparkles, CreditCard, CheckCircle2][i % 3];
          return (
            <div key={i} className="bg-white border border-lino-oscuro p-8 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 bg-salvia/10 text-salvia-oscuro rounded-2xl flex items-center justify-center mb-6">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-bosque">{title}</h3>
                <p className="text-musgo text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pricing comparison section */}
      <div className="max-w-5xl mx-auto bg-lino border border-lino-oscuro rounded-3xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-between">
          <div>
            <span className="text-xs text-salvia-oscuro font-bold uppercase tracking-wider">{t("para.plan.eyebrow")}</span>
            <h2 className="text-3xl font-semibold text-bosque mt-2 mb-6">{t("para.plan.title")}</h2>
            
            <p className="text-musgo text-sm mb-8 leading-relaxed">
              {t("para.plan.desc")}
            </p>

            <ul className="space-y-4 text-bosque text-sm">
              {list("para.plan.features").map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-salvia-oscuro shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 flex items-center gap-2.5 text-xs text-musgo">
            <ShieldCheck className="w-4 h-4 text-salvia-oscuro" />
            <span>{t("para.plan.secure")}</span>
          </div>
        </div>

        <div className="md:col-span-5 bg-white border-l border-lino-oscuro p-8 md:p-12 flex flex-col justify-center items-center text-center">
          <span className="text-xs text-salvia-oscuro font-bold tracking-widest uppercase mb-1">Membresía Activa</span>
          <h3 className="text-xl font-medium text-bosque mb-4">Membresía Mensual</h3>
          
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-5xl font-bold text-bosque">{formatPrice("destacado")}</span>
            <span className="text-sm text-musgo font-medium">/ mes</span>
          </div>
          <span className="text-xs text-salvia-oscuro font-medium mb-8">Precio final en ARS</span>

          <button
            onClick={handleSubscribe}
            disabled={isPaying}
            className="w-full bg-[#009EE3] hover:bg-[#008CD0] text-white py-4 rounded-full font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isPaying ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-sm animate-spin" />
            ) : (
              <>
                <span>{t("para.plan.button")}</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
          
          <p className="text-xs text-musgo mt-4">
            {t("para.plan.footnote")}
          </p>
        </div>
      </div>

      {/* FAQ Block */}
      <div className="mt-24 max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-bosque text-center mb-8">Preguntas frecuentes</h2>
        <div className="space-y-6">
          {pairs("para.faq").map(({ a: q, b: ans }, i) => (
            <div key={i} className="bg-white border border-lino-oscuro p-6 rounded-2xl">
              <h4 className="font-semibold text-base text-bosque mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-salvia-oscuro" />
                {q}
              </h4>
              <p className="text-sm text-musgo leading-relaxed">{ans}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
