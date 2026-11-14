import { ModalA11y } from "./ModalA11y";
import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Teacher } from "./TeacherCard";
import { apiFetch } from "../lib/api";

interface BookingModalProps {
  teacher: Teacher;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({ teacher, onClose, onSuccess }: BookingModalProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calendar logic
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const weekDays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const isDateDisabled = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    // Assuming teacher.availableDays is an array like ['Lun', 'Mar', 'Mié']
    // Let's do a simple mapping if availableDays exists
    let isDayAllowed = true;
    if (teacher.availableDays && teacher.availableDays.length > 0) {
      const daysMap = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      isDayAllowed = teacher.availableDays.includes(daysMap[d.getDay()]);
    }
    return d <= today || !isDayAllowed; // Disable past dates, today, and unavailable days
  };

  const handleDateSelect = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    // Adjust timezone offsets or just build the string locally
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    setDate(`${year}-${month}-${dayStr}`);
  };
  
  const [contact, setContact] = useState<{ name?: string; phone?: string | null; email?: string | null; instagram?: string | null } | null>(null);
  const timeSlots = ["08:00", "10:00", "15:00", "18:00", "19:30"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await apiFetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacher.id,
          date,
          time
        })
      });
      
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        setContact(data.contact || {});
      } else {
        const data = await response.json().catch(() => ({}));
        alert(response.status === 401 ? "Ingresá a tu cuenta para reservar." : data.error || "No se pudo crear la reserva.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <ModalA11y onClose={onClose} label={`Reservar una clase con ${teacher.name}`} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-6 right-6 text-musgo hover:text-bosque transition-colors p-2 rounded-full hover:bg-black/5"
        >
          <X className="w-5 h-5" />
        </button>
        
        {contact ? (
          <div className="text-center py-4">
            <h2 className="text-2xl font-medium text-bosque mb-2">¡Solicitud enviada!</h2>
            <p className="text-musgo text-sm mb-6">
              Le avisamos a {teacher.name} por mail. Para <b>confirmar la clase y acordar el pago</b> escribile directo (el pago es entre ustedes, Omia no cobra comisión):
            </p>
            <div className="flex flex-col gap-3 mb-6">
              {contact.phone && (
                <a href={`https://wa.me/${contact.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${teacher.name}, te escribo desde Omia para reservar una clase el ${date} a las ${time}.`)}`} target="_blank" rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-[#1fb857] text-white py-3 rounded-full font-medium">Escribir por WhatsApp</a>
              )}
              {contact.email && <a href={`mailto:${contact.email}`} className="border border-lino-oscuro hover:bg-lino py-3 rounded-full font-medium text-bosque">{contact.email}</a>}
              {contact.instagram && <a href={`https://instagram.com/${contact.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="border border-lino-oscuro hover:bg-lino py-3 rounded-full font-medium text-bosque">Instagram {contact.instagram}</a>}
              {!contact.phone && !contact.email && !contact.instagram && <p className="text-sm text-musgo">Te va a contactar al mail con el que te registraste.</p>}
            </div>
            <button onClick={onSuccess} className="w-full bg-bosque hover:bg-bosque-profundo text-lino py-3 rounded-full font-medium">Listo</button>
          </div>
        ) : (<>
        <h2 className="text-2xl font-medium text-bosque mb-2">Solicitar clase</h2>
        <p className="text-musgo mb-6">con {teacher.name}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-bosque flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-salvia-oscuro" />
              Fecha
            </label>
            <div className="bg-lino border border-lino-oscuro rounded-2xl p-4">
              <div className="flex justify-between items-center mb-4">
                <button type="button" onClick={handlePrevMonth} aria-label="Mes anterior" className="p-1 hover:bg-lino-oscuro rounded-full transition-colors text-musgo">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="font-medium text-bosque">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </div>
                <button type="button" onClick={handleNextMonth} aria-label="Mes siguiente" className="p-1 hover:bg-lino-oscuro rounded-full transition-colors text-musgo">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-musgo py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isPast = isDateDisabled(day);
                  const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const yearStr = d.getFullYear();
                  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
                  const dayStr = String(d.getDate()).padStart(2, '0');
                  const dateString = `${yearStr}-${monthStr}-${dayStr}`;
                  const isSelected = date === dateString;

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isPast}
                      onClick={() => handleDateSelect(day)}
                      className={`h-8 w-full flex items-center justify-center rounded-sm text-sm transition
                        ${isPast ? "text-lino-oscuro cursor-not-allowed" : "hover:bg-lino-oscuro"}
                        ${isSelected ? "bg-bosque text-lino hover:bg-bosque-profundo" : "text-bosque"}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-bosque">Horario</label>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTime(t)}
                  className={`py-2 px-3 rounded-xl border text-sm font-medium transition ${
                    time === t 
                      ? "bg-bosque border-salvia text-lino shadow-sm" 
                      : "bg-lino border-lino-oscuro text-musgo hover:border-salvia"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={isSubmitting || !date || !time}
            className="w-full bg-bosque hover:bg-bosque-profundo disabled:bg-lino-oscuro disabled:text-musgo disabled:cursor-not-allowed text-lino py-4 rounded-full font-medium transition-colors mt-2"
          >
            {isSubmitting ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>
        </>)}
      </div>
    </div>
  );
}
