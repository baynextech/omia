import { useEffect, useRef, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";

const HERO_VIDEOS = ["/videos/hero_1.mp4", "/videos/hero_2.mp4", "/videos/hero_3.mp4"];

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.14, delayChildren: 0.3 } } };
const item = { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } };

export function Hero() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Siempre intentar play apenas el componente monta
    v.muted = true;
    v.play().catch(() => {
      const retry = () => { v.play().catch(() => {}); };
      document.addEventListener("click", retry, { once: true });
    });
    const onEnded = () => setCurrentIdx(i => (i + 1) % HERO_VIDEOS.length);
    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, [currentIdx]);

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center bg-[#1C3829] overflow-hidden">
      {/* Video — siempre visible, key fuerza remount al cambiar src */}
      <video
        key={currentIdx}
        ref={videoRef}
        src={HERO_VIDEOS[currentIdx]}
        muted
        playsInline
        autoPlay
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1f14]/75 via-[#1C3829]/50 to-[#0d1f14]/70 z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f14]/60 via-transparent to-transparent z-10" />

      <motion.div
        className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-start justify-center py-32"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.span variants={item} className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#98A77C] uppercase mb-8 border border-[#98A77C]/40 px-4 py-2 rounded-sm bg-[#98A77C]/10 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-sm bg-[#98A77C]" />
          Yoga · Pilates · Bienestar · Buenos Aires
        </motion.span>

        <motion.h1 variants={item} className="text-4xl sm:text-5xl md:text-6xl font-serif font-light tracking-tight text-white max-w-2xl leading-[1.1] mb-6">
          Encontrá tu profe, <span className="italic text-[#C8D8B0]">tu centro</span> y tu práctica.
        </motion.h1>

        <motion.p variants={item} className="text-base md:text-lg text-white/70 max-w-xl font-light leading-relaxed mb-10">
          Conectá con los mejores instructores e institutos de Yoga & Pilates en Argentina. Leé opiniones reales, reservá tu lugar y equipate.
        </motion.p>

        <motion.div variants={item} className="flex flex-wrap items-center gap-3">
          <Link to="/directorio" className="group flex items-center gap-3 bg-[#98A77C] hover:bg-[#88976C] active:scale-[0.97] text-white px-7 py-4 rounded-sm font-semibold transition-all shadow-lg">
            <Search className="w-4 h-4" />
            <span>Buscá un Profe</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/estudios" className="flex items-center gap-2 bg-white/10 border border-white/25 hover:bg-white/20 active:scale-[0.97] text-white px-6 py-4 rounded-sm font-medium transition-all backdrop-blur-sm">
            Estudios e Institutos
          </Link>
        </motion.div>

        <motion.div variants={item} className="mt-16 flex flex-wrap items-center gap-8">
          {[{ n: "+200", label: "Profesores" }, { n: "+50", label: "Institutos" }, { n: "14", label: "Barrios" }].map(({ n, label }) => (
            <div key={label} className="flex flex-col">
              <span className="text-2xl font-serif italic text-[#C8D8B0] leading-none">{n}</span>
              <span className="text-xs text-white/50 font-medium mt-1 uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-50">
        <span className="text-white text-[10px] uppercase tracking-widest font-medium">Scroll</span>
        <div className="w-px h-12 bg-white/40 relative overflow-hidden">
          <motion.div className="absolute top-0 left-0 right-0 bg-white h-4" animate={{ y: ["-100%", "300%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />
        </div>
      </div>
    </section>
  );
}
