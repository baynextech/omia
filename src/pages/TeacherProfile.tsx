import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { MapPin, Star, Heart, Share2, ArrowLeft, Mail, Phone, Sparkles, X, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Teacher } from "../components/TeacherCard";
import { useFavorites } from "../hooks/useFavorites";
import { ReviewModal } from "../components/ReviewModal";
import { BookingModal } from "../components/BookingModal";
import { useAuth } from "../contexts/AuthContext";
import { SEOMeta } from "../components/SEOMeta";

export function TeacherProfile() {
  const { id } = useParams();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();

  useEffect(() => {
    apiFetch(`/api/teachers/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("No encontrado");
        return res.json();
      })
      .then((data) => {
        setTeacher(data);
        // Registrar visita en el servidor
        apiFetch(`/api/teachers/${id}/visit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorName: user?.name || "Invitado" })
        }).catch(err => console.error("Error al registrar visita:", err));
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [id, user]);

  const handleShare = () => {
    const url = `${window.location.origin}/profesor/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("¡Enlace copiado al portapapeles!");
    });
  };

  if (isLoading) {
    return (
      <div className="py-24 px-6 max-w-7xl mx-auto flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#98A77C]/30 border-t-[#98A77C] rounded-sm animate-spin" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="py-24 px-6 max-w-7xl mx-auto text-center min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-medium text-[#2C2C2C] mb-4">Profesor no encontrado</h2>
        <Link to="/directorio" className="text-[#98A77C] hover:underline">
          Volver al directorio
        </Link>
      </div>
    );
  }

  const favorited = isFavorite(teacher.id);

  // Asegurar que tengamos una lista de imágenes para la galería
  const galleryImages = teacher.images && teacher.images.length > 0 
    ? teacher.images 
    : [teacher.image];

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex !== null) {
      setActivePhotoIndex((prev) => (prev === 0 ? galleryImages.length - 1 : (prev ?? 0) - 1));
    }
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex !== null) {
      setActivePhotoIndex((prev) => (prev === galleryImages.length - 1 ? 0 : (prev ?? 0) + 1));
    }
  };

  return (
    <div className="py-12 px-6 max-w-5xl mx-auto">
      <SEOMeta 
        title={`Clases de ${teacher.specialty} con ${teacher.name} en ${teacher.location}`}
        description={`Clases de ${teacher.discipline || "Yoga"} estilo ${teacher.specialty} dictadas por ${teacher.name} en ${teacher.location}. Tarifa: ${teacher.price}. Reservá tu sesión y consultá directamente.`}
        keywords={`clases de ${teacher.discipline || "yoga"}, ${teacher.name}, ${teacher.discipline || "yoga"} en ${teacher.location}, ${teacher.specialty}, profesor de ${teacher.discipline || "yoga"} ${teacher.location}`}
        ogImage={teacher.image}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Person",
          "name": teacher.name,
          "jobTitle": `Instructor de ${teacher.discipline || "Yoga & Pilates"}`,
          "description": teacher.bio,
          "image": teacher.image,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": teacher.location,
            "addressRegion": "Buenos Aires",
            "addressCountry": "AR"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": teacher.rating,
            "reviewCount": teacher.reviews
          }
        }}
      />
      <Link to="/directorio" className="inline-flex items-center gap-2 text-[#5D5D5D] hover:text-[#2C2C2C] mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver al directorio
      </Link>

      <div className="bg-white border border-[#E8E0D0] rounded-3xl overflow-hidden shadow-sm mb-8">
        
        {/* GALERÍA DE IMÁGENES TIPO AIRBNB */}
        <div className="relative">
          
          {/* Vista móvil (Imagen única o carrusel simple) */}
          <div className="block md:hidden h-72 sm:h-80 w-full relative overflow-hidden bg-[#F4F4F4]">
            <img 
              src={galleryImages[0]} 
              alt={`${teacher.name} - Portada`} 
              className="w-full h-full object-cover cursor-pointer" 
              onClick={() => setActivePhotoIndex(0)}
              referrerPolicy="no-referrer"
            />
            {galleryImages.length > 1 && (
              <button 
                onClick={() => setActivePhotoIndex(0)}
                className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>1 / {galleryImages.length} fotos</span>
              </button>
            )}
          </div>

          {/* Vista desktop (Grilla de Airbnb de hasta 5 imágenes) */}
          <div className="hidden md:block bg-[#F4F4F4]">
            {galleryImages.length === 1 ? (
              <div className="h-96 w-full relative overflow-hidden">
                <img 
                  src={galleryImages[0]} 
                  alt={teacher.name} 
                  className="w-full h-full object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-500" 
                  onClick={() => setActivePhotoIndex(0)}
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : galleryImages.length === 2 ? (
              <div className="grid grid-cols-2 gap-2 h-96 w-full overflow-hidden">
                {galleryImages.slice(0, 2).map((img, idx) => (
                  <img 
                    key={idx}
                    src={img} 
                    alt={`${teacher.name} - ${idx}`} 
                    className="w-full h-full object-cover cursor-pointer hover:brightness-95 transition-all" 
                    onClick={() => setActivePhotoIndex(idx)}
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            ) : galleryImages.length === 3 ? (
              <div className="grid grid-cols-3 gap-2 h-96 w-full overflow-hidden">
                <div className="col-span-2 h-full">
                  <img 
                    src={galleryImages[0]} 
                    alt={`${teacher.name} - 0`} 
                    className="w-full h-full object-cover cursor-pointer hover:brightness-95 transition-all" 
                    onClick={() => setActivePhotoIndex(0)}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="col-span-1 grid grid-rows-2 gap-2 h-full">
                  {galleryImages.slice(1, 3).map((img, idx) => (
                    <img 
                      key={idx}
                      src={img} 
                      alt={`${teacher.name} - ${idx + 1}`} 
                      className="w-full h-full object-cover cursor-pointer hover:brightness-95 transition-all" 
                      onClick={() => setActivePhotoIndex(idx + 1)}
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
              </div>
            ) : galleryImages.length === 4 ? (
              <div className="grid grid-cols-4 gap-2 h-96 w-full overflow-hidden">
                <div className="col-span-2 h-full">
                  <img 
                    src={galleryImages[0]} 
                    alt={`${teacher.name} - 0`} 
                    className="w-full h-full object-cover cursor-pointer hover:brightness-95 transition-all" 
                    onClick={() => setActivePhotoIndex(0)}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-2 h-full">
                  {galleryImages.slice(1, 4).map((img, idx) => (
                    <img 
                      key={idx}
                      src={img} 
                      alt={`${teacher.name} - ${idx + 1}`} 
                      className="w-full h-full object-cover cursor-pointer hover:brightness-95 transition-all" 
                      onClick={() => setActivePhotoIndex(idx + 1)}
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
              </div>
            ) : (
              // Airbnb clásico: 1 grande izquierda, 4 chicas derecha
              <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[450px] w-full overflow-hidden relative group/gallery">
                <div className="col-span-2 row-span-2 h-full">
                  <img 
                    src={galleryImages[0]} 
                    alt={`${teacher.name} - 0`} 
                    className="w-full h-full object-cover cursor-pointer hover:brightness-90 transition-all" 
                    onClick={() => setActivePhotoIndex(0)}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="col-span-1 row-span-1 h-full">
                  <img 
                    src={galleryImages[1]} 
                    alt={`${teacher.name} - 1`} 
                    className="w-full h-full object-cover cursor-pointer hover:brightness-90 transition-all" 
                    onClick={() => setActivePhotoIndex(1)}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="col-span-1 row-span-1 h-full">
                  <img 
                    src={galleryImages[2]} 
                    alt={`${teacher.name} - 2`} 
                    className="w-full h-full object-cover cursor-pointer hover:brightness-90 transition-all" 
                    onClick={() => setActivePhotoIndex(2)}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="col-span-1 row-span-1 h-full">
                  <img 
                    src={galleryImages[3]} 
                    alt={`${teacher.name} - 3`} 
                    className="w-full h-full object-cover cursor-pointer hover:brightness-90 transition-all" 
                    onClick={() => setActivePhotoIndex(3)}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="col-span-1 row-span-1 h-full">
                  <img 
                    src={galleryImages[4]} 
                    alt={`${teacher.name} - 4`} 
                    className="w-full h-full object-cover cursor-pointer hover:brightness-90 transition-all" 
                    onClick={() => setActivePhotoIndex(4)}
                    referrerPolicy="no-referrer"
                  />
                </div>

                <button 
                  onClick={() => setActivePhotoIndex(0)}
                  className="absolute bottom-6 right-6 bg-white hover:bg-neutral-100 text-[#2C2C2C] border border-[#E8E0D0] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-[#5D5D5D]" />
                  <span>Ver todas las fotos ({galleryImages.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* Botones de acción rápidos sobre la imagen */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button 
              onClick={(e) => {
                e.preventDefault();
                handleShare();
              }}
              title="Compartir perfil"
              className="bg-white/90 backdrop-blur-sm p-2.5 rounded-sm hover:bg-white transition-colors shadow-sm cursor-pointer"
            >
              <Share2 className="w-5 h-5 text-[#5D5D5D]" />
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                toggleFavorite(teacher.id);
              }}
              title={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
              className="bg-white/90 backdrop-blur-sm p-2.5 rounded-sm hover:bg-white transition-colors shadow-sm cursor-pointer"
            >
              <Heart className={`w-5 h-5 transition-colors ${favorited ? "fill-red-400 text-red-400" : "text-[#5D5D5D]"}`} />
            </button>
          </div>
        </div>

        <div className="p-8 sm:p-12">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-medium text-[#2C2C2C] mb-2">{teacher.name}</h1>
              <p className="text-[#98A77C] text-xl font-medium">{teacher.specialty}</p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <span className="text-lg font-medium text-[#2C2C2C] bg-[#F4EFE4] px-4 py-2 rounded-xl border border-[#E8E0D0]">
                {teacher.price}
              </span>
              <div className="flex items-center gap-1.5 text-[#5D5D5D]">
                <Star className="w-5 h-5 fill-[#98A77C] text-[#98A77C]" />
                <span className="font-medium text-[#2C2C2C]">{teacher.rating}</span>
                <span className="text-sm">({teacher.reviews} reseñas)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[#5D5D5D] mb-8">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>{teacher.location}</span>
            </div>
          </div>

          {teacher.availableDays && teacher.availableDays.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-[#2C2C2C] mb-3">Días disponibles</h3>
              <div className="flex flex-wrap gap-2">
                {teacher.availableDays.map(day => (
                  <span key={day} className="px-3 py-1 bg-[#F4EFE4] text-[#98A77C] border border-[#E8E0D0] text-sm font-medium rounded-lg">
                    {day}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-lg font-medium text-[#2C2C2C] mb-3">Sobre mí</h3>
            <p className="text-[#5D5D5D] leading-relaxed text-lg whitespace-pre-line">{teacher.bio}</p>
          </div>

          {/* SECCIÓN DE CONTACTO DIRECTO (EMAIL Y WHATSAPP) */}
          <div className="mb-10 p-6 sm:p-8 bg-[#F4EFE4] rounded-[24px] border border-[#E8E0D0] shadow-sm">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-[#98A77C]/10 text-[#98A77C] rounded-2xl shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#2C2C2C]">Contactá directamente</h3>
                <p className="text-sm text-[#5D5D5D] mt-0.5">
                  ¿Tenés consultas antes de reservar? Contactá a {teacher.name} por e-mail o WhatsApp.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <a 
                href={`mailto:${teacher.email || `profe_${teacher.id}@omiayoga.com`}?subject=Consulta sobre clases de yoga - Omia&body=Hola ${teacher.name}, vi tu perfil en Omia y quería hacerte una consulta.`}
                className="flex items-center justify-center gap-2.5 py-3.5 px-4 bg-white hover:bg-[#F4EFE4]/50 text-[#2C2C2C] rounded-sm font-semibold border border-[#E8E0D0] transition-all text-sm shadow-sm active:scale-98"
              >
                <Mail className="w-4 h-4 text-[#98A77C]" />
                <span className="truncate">Enviar E-mail ({teacher.email || `profe_${teacher.id}@omiayoga.com`})</span>
              </a>
              <a 
                href={`https://wa.me/${teacher.phone ? teacher.phone.replace(/\D/g, '') : '5491133445566'}?text=Hola%20${encodeURIComponent(teacher.name)}!%20Vi%20tu%20perfil%20en%20Omia%20y%20me%20gustaría%20hacerte%20una%20consulta%20por%20tus%20clases.%20Gracias!`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-sm font-semibold transition-all text-sm shadow-sm active:scale-98 cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span className="truncate">WhatsApp ({teacher.phone || "+54 9 11 3344-5566"})</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-[#E8E0D0]">
            <button 
              onClick={() => setIsBookingOpen(true)}
              className="flex-1 bg-[#2C2C2C] hover:bg-black text-white py-4 rounded-sm font-medium transition-colors text-lg cursor-pointer"
            >
              Reservar Sesión
            </button>
            <button 
              onClick={() => setIsReviewOpen(true)}
              className="flex-1 bg-transparent hover:bg-black/5 text-[#2C2C2C] border border-[#E8E0D0] hover:border-transparent py-4 rounded-sm font-medium transition-colors text-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Star className="w-5 h-5" /> Dejar Reseña
            </button>
          </div>
        </div>
      </div>

      {/* LIGHTBOX DE IMÁGENES */}
      {activePhotoIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-300"
          onClick={() => setActivePhotoIndex(null)}
        >
          {/* Botón cerrar */}
          <button 
            onClick={() => setActivePhotoIndex(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-sm transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Botón Anterior */}
          {galleryImages.length > 1 && (
            <button 
              onClick={handlePrevPhoto}
              className="absolute left-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-sm transition-all cursor-pointer"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Contenedor de la Imagen */}
          <div 
            className="relative max-w-4xl max-h-[80vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={galleryImages[activePhotoIndex]} 
              alt={`${teacher.name} - Galería ${activePhotoIndex}`} 
              className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
              referrerPolicy="no-referrer"
            />
            
            {/* Pie de foto / Indicador */}
            <div className="text-white/80 text-sm font-medium mt-4 text-center">
              Foto {activePhotoIndex + 1} de {galleryImages.length}
            </div>
          </div>

          {/* Botón Siguiente */}
          {galleryImages.length > 1 && (
            <button 
              onClick={handleNextPhoto}
              className="absolute right-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-sm transition-all cursor-pointer"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>
      )}

      {isReviewOpen && (
        <ReviewModal 
          teacher={teacher} 
          onClose={() => setIsReviewOpen(false)}
          onSubmitSuccess={(updatedTeacher) => setTeacher(updatedTeacher)}
        />
      )}

      {isBookingOpen && (
        <BookingModal 
          teacher={teacher}
          onClose={() => setIsBookingOpen(false)}
          onSuccess={() => {
            setIsBookingOpen(false);
            setBookingSuccess(true);
            setTimeout(() => setBookingSuccess(false), 4000);
          }}
        />
      )}

      {bookingSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#98A77C] text-white px-6 py-4 rounded-2xl shadow-lg animate-in slide-in-from-bottom-5 duration-300 flex items-center gap-2">
          <Star className="w-5 h-5 fill-white text-white" />
          <span className="font-medium">¡Reserva confirmada con éxito!</span>
        </div>
      )}
    </div>
  );
}
