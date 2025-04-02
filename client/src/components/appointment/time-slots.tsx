import { useMemo, useEffect, useState } from "react";
import { AppointmentWithDetails, User } from "@shared/schema";
import { parseISO, format, addMinutes, formatISO, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Edit, Scissors, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TimeSlotsProps {
  appointments: AppointmentWithDetails[];
  selectedDate: Date;
  onSlotClick: () => void;
  isBarber?: boolean;
  breaks?: { date: string; slots: { start: string; end: string }[] }[];
  user?: User;
  onBreakClick?: (breakTime: { start: string; end: string }) => void;
}

export default function TimeSlots({ 
  appointments, 
  selectedDate, 
  onSlotClick, 
  isBarber = false, 
  breaks = [], 
  user,
  onBreakClick
}: TimeSlotsProps) {
  const [noWorkingHours, setNoWorkingHours] = useState(false);
  
  // Generate time slots based on the barber's working hours for the selected day
  const timeSlots = useMemo(() => {
    const slots: Date[] = [];
    setNoWorkingHours(false);
    
    // Ottieni gli orari di lavoro per il giorno selezionato
    if (!user || !user.workingHours) {
      // Fallback con orari predefiniti se non ci sono orari configurati
      const defaultStart = new Date(selectedDate);
      defaultStart.setHours(9, 0, 0, 0);
      
      const defaultEnd = new Date(selectedDate);
      defaultEnd.setHours(19, 0, 0, 0);
      
      let current = new Date(defaultStart);
      
      while (current <= defaultEnd) {
        slots.push(new Date(current));
        current = addMinutes(current, 30);
      }
      
      return slots;
    }
    
    // Ottieni il giorno della settimana (0 = domenica, 1 = lunedì, ...)
    const dayIndex = getDay(selectedDate);
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    const dayName = dayNames[dayIndex];
    
    // Ottieni gli orari di lavoro configurati per questo giorno
    type TimeSlot = { start: string; end: string; enabled: boolean };
    const workingHoursForDay = (user.workingHours[dayName] || []) as TimeSlot[];
    
    // Verifica se il barbiere lavora in questo giorno
    if (!Array.isArray(workingHoursForDay) || workingHoursForDay.length === 0 || 
        !workingHoursForDay.some(slot => slot.enabled)) {
      setNoWorkingHours(true);
      return slots; // Ritorna un array vuoto se il barbiere non lavora in questo giorno
    }
    
    // Per ogni fascia oraria configurata
    workingHoursForDay.forEach(timeRange => {
      if (!timeRange.enabled) return; // Salta le fasce orarie disabilitate
      
      // Converti gli orari di inizio e fine in Date
      const [startHour, startMinute] = timeRange.start.split(':').map(Number);
      const [endHour, endMinute] = timeRange.end.split(':').map(Number);
      
      const start = new Date(selectedDate);
      start.setHours(startHour, startMinute, 0, 0);
      
      const end = new Date(selectedDate);
      end.setHours(endHour, endMinute, 0, 0);
      
      // Genera gli slot ogni 30 minuti
      let current = new Date(start);
      
      while (current < end) {
        slots.push(new Date(current));
        current = addMinutes(current, 30);
      }
    });
    
    // Ordina gli slot cronologicamente
    return slots.sort((a, b) => a.getTime() - b.getTime());
  }, [selectedDate, user]);

  // Check if a time slot is occupied
  const isSlotOccupied = (time: Date) => {
    // Verifica che appointments sia valido e sia un array
    if (!appointments || !Array.isArray(appointments)) {
      console.log("TimeSlots: appointments non è un array valido");
      return false;
    }
    
    return appointments.some(appointment => {
      try {
        // VALIDAZIONE COMPLETA DELL'APPUNTAMENTO
        // Verifica che appointment sia un oggetto valido
        if (!appointment || typeof appointment !== 'object') {
          console.log("TimeSlots: appointment non è un oggetto valido", appointment);
          return false;
        }
        
        // Verifica che service esista e sia un oggetto
        if (!appointment.service || typeof appointment.service !== 'object') {
          console.log("TimeSlots: service non è un oggetto valido", appointment.service);
          // Creiamo un oggetto service di fallback
          appointment.service = { id: 0, name: "Servizio non disponibile", duration: 30, price: 0 };
        }
        
        // Verifica specifica per duration come suggerito dall'errore
        if (appointment.service.duration === undefined || appointment.service.duration === null) {
          console.log("TimeSlots: service.duration è undefined o null, impostiamo un valore di default", appointment.service);
          appointment.service.duration = 30; // Impostiamo un valore di default invece di saltare l'appuntamento
        }
        
        // Ottieni duration con valore di fallback
        const duration = typeof appointment.service.duration === 'number' 
          ? appointment.service.duration 
          : 30; // Fallback a 30 minuti se non è un numero valido
          
        // GESTIONE SICURA DELLA DATA
        let appointmentDate: Date;
        try {
          // Gestione più robusta dei vari tipi di date
          if (typeof appointment.date === 'string') {
            appointmentDate = parseISO(appointment.date);
          } else if (appointment.date instanceof Date) {
            appointmentDate = appointment.date;
          } else if (typeof appointment.date === 'object' && appointment.date) {
            // Tentativo di estrazione più sicuro per date serializzate
            try {
              // Se ha una proprietà toISOString, proviamo ad usarla
              if ('toISOString' in appointment.date && typeof appointment.date.toISOString === 'function') {
                appointmentDate = new Date(appointment.date.toISOString());
              } else if ('toString' in appointment.date && typeof appointment.date.toString === 'function') {
                // Altrimenti proviamo con toString
                appointmentDate = new Date(appointment.date.toString());
              } else {
                // Ultimo tentativo: conversione diretta
                appointmentDate = new Date(appointment.date as any);
              }
            } catch (e) {
              console.error("Errore nella conversione della data:", e);
              return false;
            }
          } else {
            console.log("TimeSlots: formato data non riconosciuto", appointment.date);
            return false; // Se non riusciamo a interpretare la data, lo slot non è occupato
          }
          
          // Verifica che la data sia valida
          if (isNaN(appointmentDate.getTime())) {
            console.log("TimeSlots: data appuntamento non valida", appointmentDate);
            return false;
          }
        } catch (e) {
          console.error("Errore nel parsing della data:", e);
          return false;
        }
        
        // Calcola l'ora di fine appuntamento in modo sicuro
        const appointmentEndTime = addMinutes(appointmentDate, duration);
        
        // Confronto degli orari
        const isOccupied = time >= appointmentDate && time < appointmentEndTime;
        
        // Log per debug se lo slot è occupato
        if (isOccupied) {
          console.log(`TimeSlots: Slot ${format(time, 'HH:mm')} occupato dall'appuntamento ID ${appointment.id}`);
        }
        
        return isOccupied;
      } catch (error) {
        console.error("Errore nel controllo dell'occupazione degli slot:", error);
        return false; // In caso di errore, lo slot non è considerato occupato per non bloccare l'UI
      }
    });
  };

  // Get breaks for the selected date
  const getDayBreaks = () => {
    // Verifiche di sicurezza più robuste
    if (!breaks) return [];
    if (!Array.isArray(breaks)) return [];
    if (breaks.length === 0) return [];
    if (!selectedDate) return [];
    
    console.log("TimeSlots - breaks:", breaks);
    
    // Formatta la data per la comparazione
    const formattedDate = formatISO(selectedDate, { representation: 'date' });
    
    try {
      // Cerca la pausa del giorno selezionato con controlli di sicurezza extra
      const dayBreaks = breaks.find(b => {
        // Verifica che l'elemento sia valido e abbia una proprietà date
        return b && typeof b === 'object' && 'date' in b && b.date === formattedDate;
      });
      
      // Verifica che dayBreaks esista, sia un oggetto e abbia la proprietà slots come array
      if (dayBreaks && 
          typeof dayBreaks === 'object' && 
          'slots' in dayBreaks && 
          Array.isArray(dayBreaks.slots)) {
        return dayBreaks.slots;
      }
      
      return [];
    } catch (error) {
      console.error("Errore nel recupero delle pause:", error);
      return [];
    }
  };
  
  // Versione sicura di getDayBreaks per l'uso interno nei rendering che restituisce un array vuoto invece di null
  const getSafeBreaks = () => {
    return getDayBreaks() || [];
  };

  // Check if a time slot is a break
  const isBreak = (time: Date) => {
    const formattedTime = format(time, 'HH:mm');
    const dayBreaks = getSafeBreaks();
    
    return dayBreaks.some(breakSlot => {
      if (!breakSlot || typeof breakSlot !== 'object') return false;
      
      const breakStart = breakSlot.start;
      const breakEnd = breakSlot.end;
      
      if (!breakStart || !breakEnd) return false;
      
      return formattedTime >= breakStart && formattedTime < breakEnd;
    });
  };

  // Rimuoviamo il fallback per le pause pranzo
  const isLunchBreak = (_time: Date) => {
    return false;
  };
  
  // Check if a time is within working hours
  const isWithinWorkingHours = (time: Date): boolean => {
    if (!user || !user.workingHours) return true; // Default to true if no working hours
    
    const dayIndex = getDay(time);
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    const dayName = dayNames[dayIndex];
    const workingHoursForDay = (user.workingHours[dayName] || []) as { start: string; end: string; enabled: boolean }[];
    
    if (!Array.isArray(workingHoursForDay) || workingHoursForDay.length === 0) {
      return false; // Closed day
    }
    
    const timeStr = format(time, 'HH:mm');
    
    return workingHoursForDay.some(range => {
      if (!range.enabled) return false;
      return timeStr >= range.start && timeStr < range.end;
    });
  };
  
  // Check if this is a closed day
  const isClosedDay = (): boolean => {
    if (!user || !user.workingHours) return false;
    
    const dayIndex = getDay(selectedDate);
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    const dayName = dayNames[dayIndex];
    const workingHoursForDay = (user.workingHours[dayName] || []) as { start: string; end: string; enabled: boolean }[];
    
    return !Array.isArray(workingHoursForDay) || 
           workingHoursForDay.length === 0 || 
           !workingHoursForDay.some(slot => slot.enabled);
  };

  // Format time as HH:MM
  const formatTime = (time: Date) => {
    return format(time, 'HH:mm');
  };

  // Le pause vanno gestite solo nella sezione apposita (Gestione Orari)

  if (noWorkingHours) {
    return (
      <div className="mb-6">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-800">
            Non ci sono orari di lavoro configurati per {format(selectedDate, 'EEEE')}.
            {isBarber && " Vai alla sezione 'Gestione Orari' per configurare gli orari di lavoro."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (timeSlots.length === 0) {
    return (
      <div className="mb-6">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-800">
            Nessuna disponibilità per questa giornata.
            {isBarber && " Verifica gli orari di lavoro nella sezione 'Gestione Orari'."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Aggiungiamo un avviso visivo se è un giorno di chiusura
  if (isClosedDay()) {
    return (
      <div className="mb-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-700" />
          <AlertDescription className="text-red-800">
            Questo è un giorno di chiusura. {format(selectedDate, 'EEEE')} non è configurato come giorno lavorativo.
            {isBarber && " Vai alla sezione 'Gestione Orari' per configurare gli orari di lavoro."}
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3 mt-4 mb-6 opacity-80">
          {timeSlots.map((timeSlot, index) => (
            <div
              key={index}
              className="timeslot relative closed-day cursor-not-allowed"
            >
              <span className="block text-sm font-medium">
                {formatTime(timeSlot)}
              </span>
              <span className="text-[10px] opacity-80">Chiuso</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3 mb-6">
      {timeSlots.map((timeSlot, index) => {
        const isOccupied = isSlotOccupied(timeSlot);
        const isOnBreak = isBreak(timeSlot);
        const isLunch = isLunchBreak(timeSlot);
        const isBreakOrLunch = isOnBreak || isLunch;
        const isInWorkingHours = isWithinWorkingHours(timeSlot);
        
        // Determinare la classe CSS corretta in base allo stato dello slot
        let slotClassName = "";
        
        if (isOccupied) {
          slotClassName = "unavailable cursor-not-allowed";
        } else if (isBreakOrLunch) {
          slotClassName = onBreakClick && isBarber 
            ? "break cursor-pointer" 
            : "break cursor-not-allowed";
        } else if (!isInWorkingHours) {
          slotClassName = "outside-working-hours cursor-not-allowed";
        } else {
          slotClassName = "working-hours cursor-pointer";
        }
        
        return (
          <div
            key={index}
            className={cn(
              "timeslot relative",
              slotClassName
            )}
            onClick={() => {
              // Se è una pausa e abbiamo la funzione di gestione delle pause
              if (isBreakOrLunch && onBreakClick) {
                // Troviamo la pausa corrispondente
                const time = formatTime(timeSlot);
                const dayBreaks = getSafeBreaks();
                const breakSlot = dayBreaks.find(b => 
                  time >= b.start && time < b.end
                );
                
                if (breakSlot) {
                  onBreakClick(breakSlot);
                }
                return;
              }
              
              // Ignoriamo i click su slot occupati, pause o fuori orario
              if (isOccupied || isBreakOrLunch || !isInWorkingHours) return;
              
              // Solo gli slot disponibili sono cliccabili
              onSlotClick();
            }}
          >
            <span className="block text-sm font-medium">
              {formatTime(timeSlot)}
            </span>
            {isOccupied && (
              <span className="text-[10px] opacity-80">Occupato</span>
            )}
            {isBreakOrLunch && (
              <div className="flex items-center justify-center mt-0.5">
                <span className="text-[10px] opacity-80">
                  Pausa{onBreakClick && isBarber ? " ✎" : ""}
                </span>
              </div>
            )}
            {!isOccupied && !isBreakOrLunch && !isInWorkingHours && (
              <span className="text-[10px] opacity-80">Chiuso</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
