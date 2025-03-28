import { useMemo } from "react";
import { AppointmentWithDetails } from "@shared/schema";
import { parseISO, format, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeSlotsProps {
  appointments: AppointmentWithDetails[];
  selectedDate: Date;
  onSlotClick: () => void;
}

export default function TimeSlots({ appointments, selectedDate, onSlotClick }: TimeSlotsProps) {
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

  // Check if a time slot is a lunch break (13:00-14:00)
  const isLunchBreak = (time: Date) => {
    const hour = time.getHours();
    return hour === 13;
  };

  // Format time as HH:MM
  const formatTime = (time: Date) => {
    return format(time, 'HH:mm');
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-6">
      {timeSlots.map((timeSlot, index) => {
        const isOccupied = isSlotOccupied(timeSlot);
        const isLunch = isLunchBreak(timeSlot);
        
        return (
          <div
            key={index}
            className={cn(
              "time-slot rounded p-2 text-center transition-all",
              isOccupied 
                ? "bg-error bg-opacity-10 cursor-not-allowed" 
                : isLunch 
                  ? "bg-warning bg-opacity-10 cursor-pointer" 
                  : "bg-neutral-light cursor-pointer hover:scale-105"
            )}
            onClick={() => !isOccupied && onSlotClick()}
          >
            <span className={cn(
              "block text-sm font-medium",
              isOccupied ? "text-error" : isLunch ? "text-warning" : ""
            )}>
              {formatTime(timeSlot)}
            </span>
            {isOccupied && (
              <span className="text-xs text-error">Occupato</span>
            )}
            {isLunch && (
              <span className="text-xs text-warning">Pausa</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
