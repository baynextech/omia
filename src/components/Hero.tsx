import { useState, useEffect } from "react";
import { Calendar, MessageSquare, MapPin, Search, Star, User, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

const HERO_IMAGES = [
  "/images/yoga_hero_1779994397642.png",
  "/images/yoga_man_1779999909154.png",
  "/images/yoga_woman_1779999926237.png",
  "/images/yoga_group_1779999945784.png"
];

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-[#FDFBF7] via-[#FDFBF7]/90 to-transparent/30 z-10" />
      </div>

      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-8 flex flex-col items-start gap-6">
        <span className="text-sm font-semibold tracking-widest text-[#8CAE99] uppercase flex items-center gap-2">
          <span>Omia</span>
          <span className="opacity-40">•</span>
          <span>Yoga, Pilates & Bienestar</span>
        </span>
        <h1 className="text-5xl md:text-7xl font-sans font-light tracking-tight text-[#2C2C2C] max-w-2xl leading-tight">
          Encontrá tu centro, <br />
          <span className="italic font-serif">tu profe o instituto.</span>
        </h1>
        <p className="text-lg text-[#5D5D5D] max-w-lg font-sans leading-relaxed">
          Conectá con los mejores instructores e institutos de <strong className="text-[#2C2C2C] font-semibold">Yoga & Pilates</strong> (Reformer, Mat, Barre). Leé opiniones reales, reservá tu lugar y equipate en nuestra tienda oficial.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <Link to="/directorio" className="bg-[#8CAE99] hover:bg-[#7a9d88] text-white px-7 py-3.5 rounded-full font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>Buscá un Profe o Instituto</span>
          </Link>

          <Link to="/estudios" className="bg-white border border-[#2C2C2C]/20 hover:border-[#2C2C2C] text-[#2C2C2C] px-6 py-3.5 rounded-full font-medium transition-colors shadow-xs">
            Estudios e Institutos
          </Link>

          <Link to="/tienda" className="bg-[#2C2C2C] hover:bg-black text-white px-6 py-3.5 rounded-full font-medium transition-colors shadow-xs flex items-center gap-2">
            <span>Tienda Omia</span>
            <span className="text-[10px] bg-[#8CAE99] text-white font-bold px-2 py-0.5 rounded-full">Shop</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
