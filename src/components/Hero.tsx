import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

const HERO_IMAGES = [
  "/images/yoga_hero_1779994397642.png",
  "/images/yoga_man_1779999909154.png",
  "/images/yoga_woman_1779999926237.png",
  "/images/yoga_group_1779999945784.png"
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } }
};

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
};

export function Hero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full h-[600px] flex items-center justify-center bg-[#FDFBF7] overflow-hidden z-0">
      <div className="absolute inset-0 w-full h-full object-cover -z-10">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={currentImageIndex}
            src={HERO_IMAGES[currentImageIndex]}
            alt="Yoga practice"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
            referrerPolicy="no-referrer"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 0.8, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-[#FDFBF7] via-[#FDFBF7]/90 to-transparent/30 z-10" />
      </div>

      <motion.div
        className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-8 flex flex-col items-start gap-6"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.span variants={item} className="text-sm font-semibold tracking-widest text-[#8CAE99] uppercase flex items-center gap-2">
          <span>Omia</span>
          <span className="opacity-40">•</span>
          <span>Yoga, Pilates & Bienestar</span>
        </motion.span>

        <motion.h1 variants={item} className="text-5xl md:text-7xl font-sans font-light tracking-tight text-[#2C2C2C] max-w-2xl leading-tight">
          Encontrá tu centro, <br />
          <span className="italic font-serif">tu profe o instituto.</span>
        </motion.h1>

        <motion.p variants={item} className="text-lg text-[#5D5D5D] max-w-lg font-sans leading-relaxed">
          Conectá con los mejores instructores e institutos de <strong className="text-[#2C2C2C] font-semibold">Yoga & Pilates</strong> (Reformer, Mat, Barre). Leé opiniones reales, reservá tu lugar y equipate en nuestra tienda oficial.
        </motion.p>

        <motion.div variants={item} className="flex flex-wrap items-center gap-3 mt-2">
          <Link
            to="/directorio"
            className="bg-[#8CAE99] hover:bg-[#7a9d88] active:scale-[0.97] text-white px-7 py-3.5 rounded-full font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Buscá un Profe o Instituto</span>
          </Link>

          <Link
            to="/estudios"
            className="bg-white border border-[#2C2C2C]/20 hover:border-[#2C2C2C] active:scale-[0.97] text-[#2C2C2C] px-6 py-3.5 rounded-full font-medium transition-all shadow-xs"
          >
            Estudios e Institutos
          </Link>

          <Link
            to="/tienda"
            className="bg-[#2C2C2C] hover:bg-black active:scale-[0.97] text-white px-6 py-3.5 rounded-full font-medium transition-all shadow-xs flex items-center gap-2"
          >
            <span>Tienda Omia</span>
            <span className="text-[10px] bg-[#8CAE99] text-white font-bold px-2 py-0.5 rounded-full">Shop</span>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
