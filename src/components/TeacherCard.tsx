import { useState, useEffect } from "react";
import { Star, MapPin, Heart, Share2 } from "lucide-react";
import { useFavorites } from "../hooks/useFavorites";
import { ReviewModal } from "./ReviewModal";
import { Link } from "react-router-dom";
import { motion } from "motion/react";

export interface Teacher {
  id: string;
  name: string;
  specialty: string;
  discipline?: string;
  location: string;
  rating: number;
  reviews: number;
  image: string;
  bio: string;
  price: string;
  availableDays?: string[];
  email?: string;
  phone?: string;
  images?: string[];
}

export function TeacherCard({ teacher, onToggleFavoriteOverride }: { teacher: Teacher; onToggleFavoriteOverride?: (id: string, isFavorited: boolean) => void }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(teacher.id);
  const [localTeacher, setLocalTeacher] = useState(teacher);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [heartPop, setHeartPop] = useState(false);

  useEffect(() => {
    setLocalTeacher(teacher);
  }, [teacher]);

  const handleShare = () => {
    const url = `${window.location.origin}/profesor/${localTeacher.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("¡Enlace copiado al portapapeles!");
    });
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    setHeartPop(true);
    setTimeout(() => setHeartPop(false), 300);
    if (onToggleFavoriteOverride) {
      onToggleFavoriteOverride(localTeacher.id, favorited);
    } else {
      toggleFavorite(localTeacher.id);
    }
  };

  return (
    <>
      <motion.div
        className="group bg-white border border-[#E5E5E5] rounded-[24px] overflow-hidden flex flex-col relative"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.10)" }}
      >
        <div className="relative h-64 overflow-hidden bg-[#F4F4F4]">
          <img
            src={localTeacher.image}
            alt={localTeacher.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-4 left-4 flex gap-2">
            <motion.div
              className="bg-white/90 backdrop-blur-sm p-2 rounded-full cursor-pointer hover:bg-white transition-colors z-10"
              onClick={handleFavorite}
              animate={heartPop ? { scale: [1, 1.35, 1] } : {}}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Heart className={`w-5 h-5 transition-colors ${favorited ? "fill-red-400 text-red-400" : "text-[#5D5D5D]"}`} />
            </motion.div>
            <div
              className="bg-white/90 backdrop-blur-sm p-2 rounded-full cursor-pointer hover:bg-white transition-colors z-10"
              onClick={(e) => { e.preventDefault(); handleShare(); }}
            >
              <Share2 className="w-5 h-5 text-[#5D5D5D]" />
            </div>
          </div>

          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 z-10">
            <Star className="w-4 h-4 fill-[#8CAE99] text-[#8CAE99]" />
            <span className="text-sm font-medium text-[#2C2C2C]">{localTeacher.rating}</span>
          </div>
        </div>
        <div className="p-6 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-medium text-[#2C2C2C]">{localTeacher.name}</h3>
                {localTeacher.discipline && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    localTeacher.discipline === "Pilates"
                      ? "bg-[#2C2C2C] text-white"
                      : localTeacher.discipline === "Yoga & Pilates"
                      ? "bg-[#8CAE99] text-white"
                      : "bg-[#8CAE99]/15 text-[#8CAE99]"
                  }`}>
                    {localTeacher.discipline}
                  </span>
                )}
              </div>
              <p className="text-[#8CAE99] text-sm font-medium">{localTeacher.specialty}</p>
            </div>
            <span className="text-[#5D5D5D] text-sm font-semibold">{localTeacher.price}</span>
          </div>
          <div className="flex items-center gap-2 text-[#5D5D5D] text-sm mb-2">
            <MapPin className="w-4 h-4" />
            <span>{localTeacher.location}</span>
            <span className="opacity-40">•</span>
            <span>{localTeacher.reviews} reseñas</span>
          </div>
          {localTeacher.availableDays && localTeacher.availableDays.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {localTeacher.availableDays.map(day => (
                <span key={day} className="px-2 py-0.5 bg-[#FDFBF7] text-[#8CAE99] border border-[#E5E5E5] text-xs font-medium rounded-md">
                  {day}
                </span>
              ))}
            </div>
          )}
          <p className="text-[#5D5D5D] text-sm leading-relaxed flex-grow">
            {localTeacher.bio}
          </p>
          <div className="flex gap-2 mt-6">
            <Link
              to={`/profesor/${localTeacher.id}`}
              className="flex-1 bg-[#FDFBF7] hover:bg-[#8CAE99] active:scale-[0.97] text-[#2C2C2C] hover:text-white border border-[#E5E5E5] hover:border-transparent py-3 rounded-full font-medium transition-all text-center"
            >
              Ver Perfil
            </Link>
            <motion.button
              onClick={() => setIsReviewOpen(true)}
              title="Dejar Reseña"
              className="px-4 bg-transparent border border-[#E5E5E5] hover:border-[#8CAE99] text-[#5D5D5D] hover:text-[#8CAE99] rounded-full transition-colors flex items-center justify-center"
              whileTap={{ scale: 0.92 }}
            >
              <Star className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {isReviewOpen && (
        <ReviewModal
          teacher={localTeacher}
          onClose={() => setIsReviewOpen(false)}
          onSubmitSuccess={(updatedTeacher) => setLocalTeacher(updatedTeacher)}
        />
      )}
    </>
  );
}
