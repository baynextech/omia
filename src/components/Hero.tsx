import { Search, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { apiFetch } from "../lib/api";
import { useContent, Rich, mediaUrl } from "../contexts/ContentContext";

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.14, delayChildren: 0.3 } } };
const item = { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } } };

export function Hero() {
  const { t } = useContent();
  const [stats, setStats] = useState({ teachers: 0, institutes: 0, zones: 0 });
  useEffect(() => {
    apiFetch("/api/stats").then((r) => (r.ok ? r.json() : null)).then((d) => d && setStats(d)).catch(() => {});
  }, []);

  return (
    <section className="relative w-full min-h-dvh flex items-center justify-center bg-bosque overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={mediaUrl(t("home.hero.video") || "/videos/hero_1.mp4")} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-bosque-profundo/75 via-bosque/50 to-bosque-profundo/70 z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-bosque-profundo/60 via-transparent to-transparent z-10" />

      <motion.div
        className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-start justify-center py-32"
        variants={container}
        initial="hidden"
        animate="visible"
      >

        <motion.h1 variants={item} className="text-4xl sm:text-5xl md:text-6xl font-serif tracking-tight text-white max-w-3xl leading-[1.05] mb-6 lg:text-7xl">
          <Rich text={t("home.hero.title")} em="text-salvia-claro" />
        </motion.h1>

        <motion.p variants={item} className="text-base md:text-lg text-white/80 max-w-xl leading-relaxed mb-10">
          {t("home.hero.subtitle")}
        </motion.p>

        <motion.div variants={item} className="flex flex-wrap items-center gap-3">
          <Link to="/directorio" className="group flex items-center gap-3 bg-lino hover:bg-white active:scale-[0.97] text-bosque px-7 py-4 rounded-full font-semibold transition shadow-lg">
            <Search className="w-4 h-4" aria-hidden="true" />
            <span>{t("home.hero.cta1")}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300 ease-(--ease-omia)" aria-hidden="true" />
          </Link>
          <Link to="/estudios" className="flex items-center gap-2 bg-white/10 border border-white/25 hover:bg-white/20 active:scale-[0.97] text-white px-6 py-4 rounded-full font-medium transition backdrop-blur-sm">
            {t("home.hero.cta2")}
          </Link>
        </motion.div>

        <motion.div variants={item} className="mt-16 flex flex-wrap items-center gap-8">
          {[{ n: stats.teachers, label: "Profesores" }, { n: stats.institutes, label: "Institutos" }, { n: stats.zones, label: "Barrios" }].filter(({ n }) => n > 0).map(({ n, label }) => (
            <div key={label} className="flex flex-col">
              <span className="text-3xl font-serif tabular-nums text-salvia-claro leading-none">{n}</span>
              <span className="text-xs text-white/70 font-medium mt-1.5">{label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

    </section>
  );
}
