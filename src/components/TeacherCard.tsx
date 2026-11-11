import { Photo } from "./Photo";
import { useState, useEffect } from "react";
import { Star, MapPin, Heart } from "lucide-react";
import { useFavorites } from "../hooks/useFavorites";
import { ReviewModal } from "./ReviewModal";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ProBadge } from "./ProBadge";
import { profileUrl } from "../lib/links";

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
  slug?: string | null;
  isPro?: boolean;
  isFeatured?: boolean;
  kind?: "profesor" | "instituto";
  schedule?: string | null;
  hours?: string | null;
  address?: string | null;
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
        className="group relative overflow-hidden rounded-sm bg-bosque cursor-pointer"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Image */}
        <div className="relative h-80 overflow-hidden">
          <Photo
            src={localTeacher.image}
            name={localTeacher.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-bosque via-bosque/20 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10">
            <div className="flex items-center gap-1.5 flex-wrap">
              {localTeacher.discipline && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider bg-bosque/80 backdrop-blur-sm text-salvia-claro border border-salvia/30">
                  {localTeacher.discipline}
                </span>
              )}
              {localTeacher.isPro && <ProBadge />}
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <motion.button
                className="bg-bosque/70 backdrop-blur-sm p-2 rounded-full cursor-pointer hover:bg-bosque transition-colors"
                onClick={handleFavorite}
                animate={heartPop ? { scale: [1, 1.35, 1] } : {}}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Heart className={`w-4 h-4 transition-colors ${favorited ? "fill-red-400 text-red-400" : "text-white/80"}`} />
              </motion.button>
            </div>
          </div>

          {/* Bottom info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-xl font-serif font-medium text-white leading-tight">{localTeacher.name}</h3>
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <Star className="w-3.5 h-3.5 fill-salvia text-salvia" />
                <span className="text-sm font-medium text-white">{localTeacher.rating}</span>
              </div>
            </div>
            <p className="text-salvia text-sm font-medium">{localTeacher.specialty}</p>
          </div>
        </div>

        {/* Card body */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-salvia text-xs">
              <MapPin className="w-3.5 h-3.5" />
              <span>{localTeacher.location}</span>
              <span className="opacity-40">·</span>
              <span>{localTeacher.reviews} reseñas</span>
            </div>
            <span className="text-salvia-claro text-sm font-semibold">{localTeacher.price}</span>
          </div>

          {localTeacher.availableDays && localTeacher.availableDays.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {localTeacher.availableDays.map(day => (
                <span key={day} className="px-2 py-0.5 bg-[#2a4d38] text-salvia text-xs font-medium rounded-sm border border-[#3a6048]/40">
                  {day}
                </span>
              ))}
            </div>
          )}

          <p className="text-[#7a9d85] text-sm leading-relaxed line-clamp-2 mb-5">{localTeacher.bio}</p>

          <div className="flex gap-2">
            <Link
              to={profileUrl(localTeacher)}
              className="flex-1 bg-bosque hover:bg-bosque-profundo active:scale-[0.97] text-lino py-3 rounded-full font-medium transition-all text-center text-sm"
            >
              Ver Perfil
            </Link>
            <motion.button
              onClick={(e) => { e.preventDefault(); setIsReviewOpen(true); }}
              title="Dejar Reseña"
              className="px-4 bg-[#2a4d38] border border-[#3a6048]/50 hover:border-salvia text-salvia hover:text-salvia rounded-full transition-colors flex items-center justify-center"
              whileTap={{ scale: 0.92 }}
            >
              <Star className="w-4 h-4" />
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
