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
    const formattedDate = formatISO(selectedDate, { representation: 'date' });
    const dayBreaks = breaks.find(b => b.date === formattedDate);
    return dayBreaks?.slots || [];
  };

  // Check if a time slot is a break
  const isBreak = (time: Date) => {
    const formattedTime = format(time, 'HH:mm');
    const dayBreaks = getDayBreaks();
    
    return dayBreaks.some(breakSlot => {
      const breakStart = breakSlot.start;
      const breakEnd = breakSlot.end;
      
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
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-6">
      {timeSlots.map((timeSlot, index) => {
        const isOccupied = isSlotOccupied(timeSlot);
        const isOnBreak = isBreak(timeSlot);
        const isLunch = isLunchBreak(timeSlot);
        const isBreakOrLunch = isOnBreak || isLunch;
        
        return (
          <div
            key={index}
            className={cn(
              "time-slot rounded p-2 text-center transition-all relative",
              isOccupied 
                ? "bg-error bg-opacity-10 cursor-not-allowed" 
                : isBreakOrLunch 
                  ? "bg-warning bg-opacity-10 cursor-pointer" 
                  : "bg-neutral-light cursor-pointer hover:scale-105"
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
            <span className={cn(
              "block text-sm font-medium",
              isOccupied ? "text-error" : isBreakOrLunch ? "text-warning" : ""
            )}>
              {formatTime(timeSlot)}
            </span>
            {isOccupied && (
              <span className="text-xs text-error">Occupato</span>
            )}
            {isBreakOrLunch && (
              <div className="flex items-center justify-center">
                <span className="text-xs text-warning mr-1">Pausa</span>
                {isBarber && <Edit className="h-3 w-3 text-warning" />}
              </div>
            )}
            
            {isBarber && isBreakOrLunch && (
              <Badge 
                variant="outline" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center"
              >
                <Edit className="h-3 w-3" />
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
