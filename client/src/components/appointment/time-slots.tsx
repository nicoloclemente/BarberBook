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
  onBreakClick?: (time: { start: string; end: string }) => void;
  breaks?: { date: string; slots: { start: string; end: string }[] }[];
  user?: User;
}

export default function TimeSlots({ 
  appointments, 
  selectedDate, 
  onSlotClick, 
  isBarber = false, 
  onBreakClick, 
  breaks = [], 
  user 
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
    return appointments.some(appointment => {
      const appointmentDate = typeof appointment.date === 'string' 
        ? parseISO(appointment.date) 
        : appointment.date;
      
      const appointmentEndTime = addMinutes(appointmentDate, appointment.service.duration);
      
      return (
        time >= appointmentDate && time < appointmentEndTime
      );
    });
  };

  // Get breaks for the selected date
  const getDayBreaks = () => {
    // Verifiche di sicurezza più robuste
    if (!breaks) return [];
    if (!Array.isArray(breaks)) return [];
    if (breaks.length === 0) return [];
    if (!selectedDate) return [];
    
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

  // Check if a time slot is a break
  const isBreak = (time: Date) => {
    const formattedTime = format(time, 'HH:mm');
    const dayBreaks = getDayBreaks();
    
    if (!dayBreaks || !Array.isArray(dayBreaks) || dayBreaks.length === 0) {
      return false;
    }
    
    return dayBreaks.some(breakSlot => {
      if (!breakSlot || typeof breakSlot !== 'object') return false;
      
      const breakStart = breakSlot.start;
      const breakEnd = breakSlot.end;
      
      if (!breakStart || !breakEnd) return false;
      
      return formattedTime >= breakStart && formattedTime < breakEnd;
    });
  };

  // Legacy lunch break check (fallback if no breaks are defined)
  const isLunchBreak = (time: Date) => {
    const hour = time.getHours();
    return hour === 13 && getDayBreaks().length === 0;
  };

  // Format time as HH:MM
  const formatTime = (time: Date) => {
    return format(time, 'HH:mm');
  };

  // Handle click on a break slot
  const handleBreakClick = (time: Date) => {
    if (!isBarber || !onBreakClick) return;
    
    const formattedTime = format(time, 'HH:mm');
    const nextSlot = format(addMinutes(time, 30), 'HH:mm');
    
    onBreakClick({
      start: formattedTime,
      end: nextSlot
    });
  };

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
  
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3 mb-6">
      {timeSlots.map((timeSlot, index) => {
        const isOccupied = isSlotOccupied(timeSlot);
        const isOnBreak = isBreak(timeSlot);
        const isLunch = isLunchBreak(timeSlot);
        const isBreakOrLunch = isOnBreak || isLunch;
        
        return (
          <div
            key={index}
            className={cn(
              "timeslot relative",
              isOccupied 
                ? "unavailable" 
                : isBreakOrLunch 
                  ? "break" 
                  : "available"
            )}
            onClick={() => {
              if (isOccupied) return;
              
              if (isBreakOrLunch && isBarber && onBreakClick) {
                handleBreakClick(timeSlot);
              } else if (!isBreakOrLunch) {
                onSlotClick();
              }
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
                <span className="text-[10px] opacity-80 mr-1">Pausa</span>
                {isBarber && <Edit className="h-2.5 w-2.5 opacity-70" />}
              </div>
            )}
            
            {isBarber && isBreakOrLunch && (
              <Badge 
                variant="outline" 
                className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center opacity-80 border-amber-200"
              >
                <Edit className="h-2.5 w-2.5" />
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
