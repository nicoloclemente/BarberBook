import { useMemo } from "react";
import { AppointmentWithDetails, User } from "@shared/schema";
import { parseISO, format, addMinutes, formatISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Edit, Scissors } from "lucide-react";

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
  // Generate time slots from 9:00 to 19:00 with 30-minute intervals
  const timeSlots = useMemo(() => {
    const slots = [];
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    
    const end = new Date(selectedDate);
    end.setHours(19, 0, 0, 0);
    
    let current = new Date(start);
    
    while (current <= end) {
      slots.push(new Date(current));
      current = addMinutes(current, 30);
    }
    
    return slots;
  }, [selectedDate]);

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
