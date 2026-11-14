import { ModalA11y } from "./ModalA11y";
import { useState } from "react";
import { Star, X } from "lucide-react";
import { Teacher } from "./TeacherCard";
import { apiFetch } from "../lib/api";

interface ReviewModalProps {
  teacher: Teacher;
  onClose: () => void;
  onSubmitSuccess: (updatedTeacher: Teacher) => void;
}

export function ReviewModal({ teacher, onClose, onSubmitSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Por favor, agregá una calificación de estrellas.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/teachers/${teacher.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment, userName: "Usuario Registrado" })
      });
      
      const updatedTeacher = await res.json().catch(() => ({}));
      if (res.status === 401) {
        alert("Ingresá a tu cuenta para dejar una reseña.");
        return;
      }
      if (!res.ok) {
        alert(updatedTeacher.error || "Hubo un error al enviar la reseña.");
        return;
      }
      onSubmitSuccess(updatedTeacher);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Hubo un error al enviar la reseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <ModalA11y onClose={onClose} label={`Dejar una reseña a ${teacher.name}`} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-6 right-6 text-musgo hover:text-bosque transition-colors p-2 rounded-full hover:bg-black/5"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-medium text-bosque mb-2">Dejar reseña</h2>
        <p className="text-musgo mb-6">Compartí tu experiencia con {teacher.name}.</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6 flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110 p-1"
              >
                <Star 
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoverRating || rating) 
                      ? "fill-salvia text-salvia" 
                      : "text-lino-oscuro fill-lino"
                  }`} 
                />
              </button>
            ))}
          </div>

          <div className="mb-8">
            <textarea aria-label="¿Qué te pareció la clase? Contanos un poco sobre tu experiencia..."
              placeholder="¿Qué te pareció la clase? Contanos un poco sobre tu experiencia..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-lino border border-lino-oscuro focus:border-salvia focus:ring-1 focus:ring-salvia text-bosque rounded-2xl p-4 outline-none transition placeholder:text-musgo/50 h-32 resize-none"
              required
            />
          </div>

          <div className="flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-transparent hover:bg-black/5 text-bosque border border-lino-oscuro hover:border-transparent py-3 rounded-full font-medium transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-bosque hover:bg-bosque-profundo text-lino py-3 rounded-full font-medium transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-sm animate-spin" />
              ) : (
                "Enviar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
